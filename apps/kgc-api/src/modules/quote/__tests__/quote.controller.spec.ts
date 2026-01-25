/**
 * Unit Tests: QuoteController
 * Epic 18: Árajánlat (ADR-027)
 *
 * Controller tesztek RBAC és endpoint viselkedés validálásra
 * Prioritás: P0-P1 (Critical - RBAC biztonsági tesztek)
 */

import { AuthenticatedRequest } from '@kgc/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IWorksheet,
  IWorksheetItemRepository,
  IWorksheetRepository,
  WORKSHEET_ITEM_REPOSITORY,
  WORKSHEET_REPOSITORY,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from '../../service/repositories';
import { QuoteController } from '../quote.controller';
import { QUOTE_EMAIL_SERVICE, QUOTE_PDF_SERVICE } from '../quote.module';
import {
  EXPLODED_VIEW_REPOSITORY,
  IExplodedView,
  IExplodedViewHotspot,
  IExplodedViewRepository,
  IQuote,
  IQuoteItem,
  IQuoteItemRepository,
  IQuoteRepository,
  QUOTE_ITEM_REPOSITORY,
  QUOTE_REPOSITORY,
  QuoteStatus,
} from '../repositories';
import { QuoteEmailService } from '../services/quote-email.service';
import { QuotePdfService } from '../services/quote-pdf.service';

// Mock repositories - using Pick<> for type safety with mocked methods
const mockQuoteRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByNumber: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  changeStatus: vi.fn(),
  getNextSequence: vi.fn(),
  countByTenant: vi.fn(),
} satisfies Pick<
  IQuoteRepository,
  | 'findAll'
  | 'findById'
  | 'findByNumber'
  | 'create'
  | 'update'
  | 'changeStatus'
  | 'getNextSequence'
  | 'countByTenant'
>;

const mockItemRepository = {
  findById: vi.fn(),
  findByQuoteId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} satisfies Pick<
  IQuoteItemRepository,
  'findById' | 'findByQuoteId' | 'create' | 'update' | 'delete'
>;

// Mock PDF service
const mockPdfService = {
  generatePdf: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])), // %PDF
} satisfies Pick<QuotePdfService, 'generatePdf'>;

// Mock Email service (optional)
const mockEmailService = {
  sendQuote: vi.fn().mockResolvedValue(undefined),
} satisfies Pick<QuoteEmailService, 'sendQuote'>;

// Mock Worksheet repository (Epic 18-4)
const mockWorksheetRepository = {
  create: vi.fn(),
  getNextSequence: vi.fn(),
} satisfies Pick<IWorksheetRepository, 'create' | 'getNextSequence'>;

// Mock Worksheet item repository (Epic 18-4)
const mockWorksheetItemRepository = {
  create: vi.fn(),
} satisfies Pick<IWorksheetItemRepository, 'create'>;

// Mock Exploded View repository (Epic 18-2)
const mockExplodedViewRepository = {
  findByMachineModelId: vi.fn(),
  findByManufacturer: vi.fn(),
  searchMachineModels: vi.fn(),
  getHotspotParts: vi.fn(),
} satisfies Pick<
  IExplodedViewRepository,
  'findByMachineModelId' | 'findByManufacturer' | 'searchMachineModels' | 'getHotspotParts'
>;

// Mock exploded view factory
const createMockHotspot = (
  overrides: Partial<IExplodedViewHotspot> = {}
): IExplodedViewHotspot => ({
  id: 'hotspot-1',
  position: 'P001',
  x: 100,
  y: 100,
  width: 40,
  height: 40,
  itemId: 'product-1',
  itemCode: 'SKU-001',
  itemName: 'Test Part',
  unitPrice: 1000,
  stockQuantity: 50,
  ...overrides,
});

const createMockExplodedView = (overrides: Partial<IExplodedView> = {}): IExplodedView => ({
  id: 'ev-makita-abc123',
  tenantId: 'tenant-456',
  machineModelId: 'makita-abc123',
  machineModelName: 'Makita ABC-123',
  manufacturer: 'Makita',
  hotspots: [createMockHotspot()],
  version: '1.0.0',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock worksheet factory
const createMockWorksheet = (overrides: Partial<IWorksheet> = {}): IWorksheet => ({
  id: 'worksheet-1',
  tenantId: 'tenant-456',
  worksheetNumber: 'ML-2026-00001',
  type: WorksheetType.FIZETOS,
  status: WorksheetStatus.FELVEVE,
  priority: WorksheetPriority.NORMAL,
  partnerId: 'partner-1',
  deviceName: 'Test Device',
  faultDescription: 'Test fault',
  receivedAt: new Date(),
  createdBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock authenticated request factory
const createMockRequest = (
  overrides: Partial<AuthenticatedRequest['user']> = {}
): AuthenticatedRequest =>
  ({
    user: {
      id: 'user-123',
      tenantId: 'tenant-456',
      role: 'STORE_MANAGER',
      ...overrides,
    },
  }) as AuthenticatedRequest;

// Mock quote factory
const createMockQuote = (overrides: Partial<IQuote> = {}): IQuote => ({
  id: 'quote-1',
  tenantId: 'tenant-456',
  quoteNumber: 'AJ-2026-0001',
  partnerId: 'partner-1',
  status: QuoteStatus.DRAFT,
  validUntil: new Date('2026-02-08'),
  subtotal: 10000,
  discountAmount: 0,
  vatAmount: 2700,
  totalAmount: 12700,
  createdBy: 'user-123',
  updatedBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock quote item factory
const createMockItem = (overrides: Partial<IQuoteItem> = {}): IQuoteItem => ({
  id: 'item-1',
  quoteId: 'quote-1',
  itemType: 'PART',
  description: 'Test part',
  quantity: 2,
  unit: 'db',
  unitPrice: 5000,
  totalPrice: 10000,
  createdAt: new Date(),
  ...overrides,
});

describe('QuoteController', () => {
  let controller: QuoteController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteController],
      providers: [
        {
          provide: QUOTE_REPOSITORY,
          useValue: mockQuoteRepository,
        },
        {
          provide: QUOTE_ITEM_REPOSITORY,
          useValue: mockItemRepository,
        },
        {
          provide: EXPLODED_VIEW_REPOSITORY,
          useValue: mockExplodedViewRepository,
        },
        {
          provide: QUOTE_PDF_SERVICE,
          useValue: mockPdfService,
        },
        {
          provide: QUOTE_EMAIL_SERVICE,
          useValue: mockEmailService,
        },
        {
          provide: WORKSHEET_REPOSITORY,
          useValue: mockWorksheetRepository,
        },
        {
          provide: WORKSHEET_ITEM_REPOSITORY,
          useValue: mockWorksheetItemRepository,
        },
      ],
    }).compile();

    controller = module.get<QuoteController>(QuoteController);
  });

  describe('findAll()', () => {
    it('[P0] should use tenantId from JWT', async () => {
      const req = createMockRequest({ tenantId: 'jwt-tenant-id' });
      vi.mocked(mockQuoteRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockQuoteRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(req);

      expect(mockQuoteRepository.findAll).toHaveBeenCalledWith('jwt-tenant-id', expect.any(Object));
    });

    it('[P1] should apply status filter', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockQuoteRepository.countByTenant).mockResolvedValue(0);

      await controller.findAll(req, QuoteStatus.SENT);

      expect(mockQuoteRepository.findAll).toHaveBeenCalledWith(
        'tenant-456',
        expect.objectContaining({ status: QuoteStatus.SENT })
      );
    });

    it('[P1] should return quotes with total count', async () => {
      const req = createMockRequest();
      const mockQuotes = [createMockQuote()];
      vi.mocked(mockQuoteRepository.findAll).mockResolvedValue(mockQuotes);
      vi.mocked(mockQuoteRepository.countByTenant).mockResolvedValue(1);

      const result = await controller.findAll(req);

      expect(result).toEqual({ data: mockQuotes, total: 1 });
    });
  });

  describe('findById()', () => {
    it('[P0] should use tenantId from JWT for tenant isolation', async () => {
      const req = createMockRequest({ tenantId: 'secure-tenant' });
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(createMockQuote());
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue([]);

      await controller.findById('quote-1', req);

      expect(mockQuoteRepository.findById).toHaveBeenCalledWith('quote-1', 'secure-tenant');
    });

    it('[P0] should throw NotFoundException when quote not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(null);

      await expect(controller.findById('non-existent', req)).rejects.toThrow(NotFoundException);
    });

    it('[P1] should return quote with items', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote();
      const mockItems = [createMockItem()];
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);

      const result = await controller.findById('quote-1', req);

      expect(result.data).toEqual({ ...mockQuote, items: mockItems });
    });
  });

  describe('create()', () => {
    it('[P0] should use tenantId and userId from JWT', async () => {
      const req = createMockRequest({ id: 'creator-user', tenantId: 'creator-tenant' });
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test part',
            quantity: 1,
            unit: 'db',
            unitPrice: 1000,
          },
        ],
      };

      vi.mocked(mockQuoteRepository.getNextSequence).mockResolvedValue(1);
      vi.mocked(mockQuoteRepository.create).mockResolvedValue(
        createMockQuote({ tenantId: 'creator-tenant' })
      );
      vi.mocked(mockItemRepository.create).mockResolvedValue(createMockItem());

      await controller.create(req, input);

      expect(mockQuoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'creator-tenant',
          createdBy: 'creator-user',
        })
      );
    });

    it('[P1] should throw BadRequestException if no partnerId', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: '',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: 1,
            unit: 'db',
            unitPrice: 100,
          },
        ],
      };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException if no items', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [],
      };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should generate quote number correctly', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: 1,
            unit: 'db',
            unitPrice: 1000,
          },
        ],
      };

      vi.mocked(mockQuoteRepository.getNextSequence).mockResolvedValue(42);
      vi.mocked(mockQuoteRepository.create).mockResolvedValue(createMockQuote());
      vi.mocked(mockItemRepository.create).mockResolvedValue(createMockItem());

      await controller.create(req, input);

      expect(mockQuoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteNumber: expect.stringMatching(/^AJ-\d{4}-0042$/),
        })
      );
    });

    it('[P1] should calculate VAT at 27%', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: 10,
            unit: 'db',
            unitPrice: 1000,
          },
        ],
      };

      vi.mocked(mockQuoteRepository.getNextSequence).mockResolvedValue(1);
      vi.mocked(mockQuoteRepository.create).mockResolvedValue(createMockQuote());
      vi.mocked(mockItemRepository.create).mockResolvedValue(createMockItem());

      await controller.create(req, input);

      // 10 * 1000 = 10000, VAT = 2700, total = 12700
      expect(mockQuoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 10000,
          vatAmount: 2700,
          totalAmount: 12700,
        })
      );
    });
  });

  describe('update()', () => {
    it('[P1] should only update DRAFT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      await expect(controller.update('quote-1', req, { notes: 'Updated' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should update DRAFT quote successfully', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(
        createMockQuote({ notes: 'Updated' })
      );

      const result = await controller.update('quote-1', req, { notes: 'Updated' });

      expect(result.data.notes).toBe('Updated');
    });
  });

  describe('send()', () => {
    it('[P1] should only send DRAFT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.ACCEPTED })
      );

      await expect(controller.send('quote-1', req)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should change status to SENT', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      const result = await controller.send('quote-1', req);

      expect(mockQuoteRepository.changeStatus).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        QuoteStatus.SENT,
        'user-123'
      );
      expect(result.data.status).toBe(QuoteStatus.SENT);
    });
  });

  describe('accept()', () => {
    it('[P1] should only accept SENT or VIEWED quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );

      await expect(controller.accept('quote-1', req)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should change status to ACCEPTED', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.ACCEPTED })
      );

      const result = await controller.accept('quote-1', req);

      expect(result.data.status).toBe(QuoteStatus.ACCEPTED);
    });
  });

  describe('reject()', () => {
    it('[P1] should only reject SENT or VIEWED quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.ACCEPTED })
      );

      await expect(controller.reject('quote-1', req, {})).rejects.toThrow(BadRequestException);
    });

    it('[P1] should update rejection reason and change status', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(createMockQuote());
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.REJECTED })
      );

      const result = await controller.reject('quote-1', req, { rejectionReason: 'Too expensive' });

      expect(mockQuoteRepository.update).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        expect.objectContaining({ rejectionReason: 'Too expensive' })
      );
      expect(result.data.status).toBe(QuoteStatus.REJECTED);
    });
  });

  describe('convertToWorksheet()', () => {
    it('[P1] should only convert ACCEPTED quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      await expect(controller.convertToWorksheet('quote-1', req)).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should not convert already converted quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.ACCEPTED, convertedToWorksheetId: 'ws-1' })
      );

      await expect(controller.convertToWorksheet('quote-1', req)).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should change status to CONVERTED', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote({ status: QuoteStatus.ACCEPTED });
      const mockItems = [createMockItem()];
      const mockWorksheet = createMockWorksheet();

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockWorksheetRepository.getNextSequence).mockResolvedValue(1);
      vi.mocked(mockWorksheetRepository.create).mockResolvedValue(mockWorksheet);
      vi.mocked(mockWorksheetItemRepository.create).mockResolvedValue({
        id: 'ws-item-1',
        worksheetId: 'worksheet-1',
        tenantId: 'tenant-456',
        description: 'Test',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 27,
        netAmount: 1000,
        grossAmount: 1270,
        itemType: 'ALKATRESZ',
        isReserved: false,
        createdAt: new Date(),
      });
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(mockQuote);
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.CONVERTED })
      );

      const result = await controller.convertToWorksheet('quote-1', req);

      expect(result.data.quote.status).toBe(QuoteStatus.CONVERTED);
    });
  });

  describe('addItem()', () => {
    it('[P1] should only add items to DRAFT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      const input = {
        itemType: 'PART' as const,
        description: 'Test',
        quantity: 1,
        unit: 'db',
        unitPrice: 100,
      };

      await expect(controller.addItem('quote-1', req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should recalculate totals after adding item', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockItemRepository.create).mockResolvedValue(createMockItem({ totalPrice: 5000 }));
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue([
        createMockItem({ totalPrice: 10000 }),
        createMockItem({ totalPrice: 5000 }),
      ]);
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(createMockQuote());

      const input = {
        itemType: 'PART' as const,
        description: 'New item',
        quantity: 1,
        unit: 'db',
        unitPrice: 5000,
      };

      await controller.addItem('quote-1', req, input);

      // 15000 subtotal, 4050 VAT (27%), 19050 total
      expect(mockQuoteRepository.update).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        expect.objectContaining({
          subtotal: 15000,
          vatAmount: 4050,
          totalAmount: 19050,
        })
      );
    });
  });

  describe('removeItem()', () => {
    it('[P1] should only remove items from DRAFT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      await expect(controller.removeItem('quote-1', 'item-1', req)).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should throw NotFoundException if item not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockItemRepository.findById).mockResolvedValue(null);

      await expect(controller.removeItem('quote-1', 'item-1', req)).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should throw NotFoundException if item belongs to different quote', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockItemRepository.findById).mockResolvedValue(
        createMockItem({ quoteId: 'different-quote' })
      );

      await expect(controller.removeItem('quote-1', 'item-1', req)).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should recalculate totals after removing item', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );
      vi.mocked(mockItemRepository.findById).mockResolvedValue(
        createMockItem({ quoteId: 'quote-1' })
      );
      vi.mocked(mockItemRepository.delete).mockResolvedValue(undefined);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue([
        createMockItem({ totalPrice: 5000 }),
      ]);
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(createMockQuote());

      await controller.removeItem('quote-1', 'item-1', req);

      // 5000 subtotal, 1350 VAT (27%), 6350 total
      expect(mockQuoteRepository.update).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        expect.objectContaining({
          subtotal: 5000,
          vatAmount: 1350,
          totalAmount: 6350,
        })
      );
    });
  });

  describe('input validation', () => {
    it('[P1] should reject negative quantity in create', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: -1,
            unit: 'db',
            unitPrice: 100,
          },
        ],
      };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should reject zero quantity in create', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: 0,
            unit: 'db',
            unitPrice: 100,
          },
        ],
      };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should reject negative unitPrice in create', async () => {
      const req = createMockRequest();
      const input = {
        partnerId: 'partner-1',
        items: [
          {
            itemType: 'PART' as const,
            description: 'Test',
            quantity: 1,
            unit: 'db',
            unitPrice: -100,
          },
        ],
      };

      await expect(controller.create(req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should reject negative quantity in addItem', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );

      const input = {
        itemType: 'PART' as const,
        description: 'Test',
        quantity: -5,
        unit: 'db',
        unitPrice: 100,
      };

      await expect(controller.addItem('quote-1', req, input)).rejects.toThrow(BadRequestException);
    });

    it('[P1] should reject negative unitPrice in addItem', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );

      const input = {
        itemType: 'PART' as const,
        description: 'Test',
        quantity: 1,
        unit: 'db',
        unitPrice: -50,
      };

      await expect(controller.addItem('quote-1', req, input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatistics()', () => {
    it('[P1] should return correct statistics', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.countByTenant)
        .mockResolvedValueOnce(5) // draft
        .mockResolvedValueOnce(3) // sent
        .mockResolvedValueOnce(2) // accepted
        .mockResolvedValueOnce(1) // rejected
        .mockResolvedValueOnce(0) // expired
        .mockResolvedValueOnce(1) // converted
        .mockResolvedValueOnce(12); // total

      const result = await controller.getStatistics(req);

      expect(result.data).toEqual({
        draft: 5,
        sent: 3,
        accepted: 2,
        rejected: 1,
        expired: 0,
        converted: 1,
        total: 12,
        conversionRate: 25, // (2+1)/12 * 100 = 25%
      });
    });
  });

  describe('generatePdf()', () => {
    it('[P1] should throw NotFoundException when quote not found', async () => {
      const req = createMockRequest();
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as import('express').Response;
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(null);

      await expect(controller.generatePdf('non-existent', req, mockRes, {})).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should generate PDF and set correct headers', async () => {
      const req = createMockRequest();
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as unknown as import('express').Response;
      const mockQuote = createMockQuote();
      const mockItems = [createMockItem()];

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockPdfService.generatePdf).mockResolvedValue(
        new Uint8Array([0x25, 0x50, 0x44, 0x46])
      );

      await controller.generatePdf('quote-1', req, mockRes, { language: 'hu' });

      expect(mockPdfService.generatePdf).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('arajanlat-')
      );
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('sendEmail()', () => {
    it('[P1] should throw NotFoundException when quote not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(null);

      await expect(
        controller.sendEmail('non-existent', req, { recipientEmail: 'test@test.com' })
      ).rejects.toThrow(NotFoundException);
    });

    it('[P1] should only send email for DRAFT or SENT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.ACCEPTED })
      );

      await expect(
        controller.sendEmail('quote-1', req, { recipientEmail: 'test@test.com' })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should send email and update status from DRAFT to SENT', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote({ status: QuoteStatus.DRAFT });
      const mockItems = [createMockItem()];

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockPdfService.generatePdf).mockResolvedValue(
        new Uint8Array([0x25, 0x50, 0x44, 0x46])
      );
      vi.mocked(mockEmailService.sendQuote).mockResolvedValue(undefined);
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      const result = await controller.sendEmail('quote-1', req, {
        recipientEmail: 'test@test.com',
      });

      expect(mockEmailService.sendQuote).toHaveBeenCalled();
      expect(mockQuoteRepository.changeStatus).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        QuoteStatus.SENT,
        'user-123'
      );
      expect(result.data.success).toBe(true);
    });

    it('[P1] should not change status when already SENT', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote({ status: QuoteStatus.SENT });
      const mockItems = [createMockItem()];

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockPdfService.generatePdf).mockResolvedValue(
        new Uint8Array([0x25, 0x50, 0x44, 0x46])
      );
      vi.mocked(mockEmailService.sendQuote).mockResolvedValue(undefined);

      await controller.sendEmail('quote-1', req, { recipientEmail: 'test@test.com' });

      expect(mockQuoteRepository.changeStatus).not.toHaveBeenCalled();
    });
  });

  describe('convertToWorksheet()', () => {
    it('[P1] should throw NotFoundException when quote not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(null);

      await expect(controller.convertToWorksheet('non-existent', req)).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should only convert ACCEPTED quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.DRAFT })
      );

      await expect(controller.convertToWorksheet('quote-1', req)).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should not allow double conversion', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({
          status: QuoteStatus.ACCEPTED,
          convertedToWorksheetId: 'existing-worksheet',
        })
      );

      await expect(controller.convertToWorksheet('quote-1', req)).rejects.toThrow(
        BadRequestException
      );
    });

    it('[P1] should create worksheet from accepted quote', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote({ status: QuoteStatus.ACCEPTED });
      const mockItems = [
        createMockItem({
          itemType: 'PART',
          description: 'Part 1',
          quantity: 2,
          unitPrice: 1000,
          totalPrice: 2000,
        }),
        createMockItem({
          id: 'item-2',
          itemType: 'LABOR',
          description: 'Labor 1',
          quantity: 1,
          unitPrice: 5000,
          totalPrice: 5000,
        }),
      ];
      const mockWorksheet = createMockWorksheet();

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockWorksheetRepository.getNextSequence).mockResolvedValue(1);
      vi.mocked(mockWorksheetRepository.create).mockResolvedValue(mockWorksheet);
      vi.mocked(mockWorksheetItemRepository.create).mockResolvedValue({
        id: 'ws-item-1',
        worksheetId: 'worksheet-1',
        tenantId: 'tenant-456',
        description: 'Test',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 27,
        netAmount: 1000,
        grossAmount: 1270,
        itemType: 'ALKATRESZ',
        isReserved: false,
        createdAt: new Date(),
      });
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(mockQuote);
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.CONVERTED, convertedToWorksheetId: 'worksheet-1' })
      );

      const result = await controller.convertToWorksheet('quote-1', req);

      expect(mockWorksheetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-456',
          partnerId: 'partner-1',
          type: WorksheetType.FIZETOS,
          status: WorksheetStatus.FELVEVE,
          createdBy: 'user-123',
        })
      );
      expect(mockWorksheetItemRepository.create).toHaveBeenCalledTimes(2);
      expect(mockQuoteRepository.update).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        expect.objectContaining({ convertedToWorksheetId: 'worksheet-1' })
      );
      expect(mockQuoteRepository.changeStatus).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        QuoteStatus.CONVERTED,
        'user-123'
      );
      expect(result.data.worksheet.id).toBe('worksheet-1');
      expect(result.message).toContain('ML-2026-00001');
    });

    it('[P1] should map quote item types correctly to worksheet item types', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote({ status: QuoteStatus.ACCEPTED });
      const mockItems = [
        createMockItem({ itemType: 'PART' }),
        createMockItem({ id: 'item-2', itemType: 'LABOR' }),
        createMockItem({ id: 'item-3', itemType: 'OTHER' }),
      ];
      const mockWorksheet = createMockWorksheet();

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue(mockItems);
      vi.mocked(mockWorksheetRepository.getNextSequence).mockResolvedValue(1);
      vi.mocked(mockWorksheetRepository.create).mockResolvedValue(mockWorksheet);
      vi.mocked(mockWorksheetItemRepository.create).mockResolvedValue({
        id: 'ws-item-1',
        worksheetId: 'worksheet-1',
        tenantId: 'tenant-456',
        description: 'Test',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 27,
        netAmount: 1000,
        grossAmount: 1270,
        itemType: 'ALKATRESZ',
        isReserved: false,
        createdAt: new Date(),
      });
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(mockQuote);
      vi.mocked(mockQuoteRepository.changeStatus).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.CONVERTED })
      );

      await controller.convertToWorksheet('quote-1', req);

      // Check that PART -> ALKATRESZ
      expect(mockWorksheetItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'ALKATRESZ' })
      );
      // Check that LABOR -> MUNKADIJ
      expect(mockWorksheetItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'MUNKADIJ' })
      );
      // Check that OTHER -> EGYEB
      expect(mockWorksheetItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ itemType: 'EGYEB' })
      );
    });
  });

  // ============================================
  // EXPLODED VIEW TESTS (Story 18-2)
  // ============================================

  describe('searchMachineModels()', () => {
    it('[P1] should search machine models by manufacturer', async () => {
      const req = createMockRequest();
      const mockModels = [
        { id: 'model-1', name: 'Model 1', manufacturer: 'Makita' },
        { id: 'model-2', name: 'Model 2', manufacturer: 'Makita' },
      ];
      vi.mocked(mockExplodedViewRepository.searchMachineModels).mockResolvedValue(mockModels);

      const result = await controller.searchMachineModels(req, 'Makita');

      expect(mockExplodedViewRepository.searchMachineModels).toHaveBeenCalledWith('tenant-456', {
        manufacturer: 'Makita',
      });
      expect(result.data).toEqual(mockModels);
    });

    it('[P1] should search machine models by search term', async () => {
      const req = createMockRequest();
      vi.mocked(mockExplodedViewRepository.searchMachineModels).mockResolvedValue([]);

      await controller.searchMachineModels(req, undefined, 'drill');

      expect(mockExplodedViewRepository.searchMachineModels).toHaveBeenCalledWith('tenant-456', {
        searchTerm: 'drill',
      });
    });
  });

  describe('getExplodedView()', () => {
    it('[P1] should return exploded view by machine model', async () => {
      const req = createMockRequest();
      const mockView = createMockExplodedView();
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(mockView);

      const result = await controller.getExplodedView('makita-abc123', req);

      expect(mockExplodedViewRepository.findByMachineModelId).toHaveBeenCalledWith(
        'makita-abc123',
        'tenant-456'
      );
      expect(result.data).toEqual(mockView);
    });

    it('[P1] should throw NotFoundException when exploded view not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(null);

      await expect(controller.getExplodedView('unknown-model', req)).rejects.toThrow(
        NotFoundException
      );
    });

    it('[P1] should throw BadRequestException for empty machineModelId', async () => {
      const req = createMockRequest();

      await expect(controller.getExplodedView('  ', req)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExplodedViewsByManufacturer()', () => {
    it('[P1] should return exploded views by manufacturer', async () => {
      const req = createMockRequest();
      const mockViews = [createMockExplodedView(), createMockExplodedView({ id: 'ev-2' })];
      vi.mocked(mockExplodedViewRepository.findByManufacturer).mockResolvedValue(mockViews);

      const result = await controller.getExplodedViewsByManufacturer('Makita', req);

      expect(mockExplodedViewRepository.findByManufacturer).toHaveBeenCalledWith(
        'Makita',
        'tenant-456'
      );
      expect(result.data).toEqual(mockViews);
    });

    it('[P1] should throw BadRequestException for empty manufacturer', async () => {
      const req = createMockRequest();

      await expect(controller.getExplodedViewsByManufacturer('  ', req)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('addItemsFromExplodedView()', () => {
    it('[P1] should throw NotFoundException when quote not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(null);

      await expect(
        controller.addItemsFromExplodedView('non-existent', req, {
          machineModelId: 'model-1',
          selections: [{ hotspotId: 'hotspot-1', quantity: 1 }],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('[P1] should only add items to DRAFT quotes', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(
        createMockQuote({ status: QuoteStatus.SENT })
      );

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: 'model-1',
          selections: [{ hotspotId: 'hotspot-1', quantity: 1 }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw NotFoundException when exploded view not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(createMockQuote());
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(null);

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: 'unknown-model',
          selections: [{ hotspotId: 'hotspot-1', quantity: 1 }],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('[P1] should throw BadRequestException when hotspot not found', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(createMockQuote());
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(
        createMockExplodedView()
      );

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: 'makita-abc123',
          selections: [{ hotspotId: 'non-existent-hotspot', quantity: 1 }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should add items from exploded view selection', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote();
      const mockView = createMockExplodedView({
        hotspots: [
          createMockHotspot({
            id: 'hotspot-1',
            itemId: 'prod-1',
            itemName: 'Part 1',
            unitPrice: 1000,
          }),
          createMockHotspot({
            id: 'hotspot-2',
            itemId: 'prod-2',
            itemName: 'Part 2',
            unitPrice: 2000,
          }),
        ],
      });
      const mockItem = createMockItem();

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(mockView);
      vi.mocked(mockItemRepository.create).mockResolvedValue(mockItem);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue([mockItem, mockItem]);
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(mockQuote);

      const result = await controller.addItemsFromExplodedView('quote-1', req, {
        machineModelId: 'makita-abc123',
        selections: [
          { hotspotId: 'hotspot-1', quantity: 2 },
          { hotspotId: 'hotspot-2', quantity: 1 },
        ],
      });

      expect(mockItemRepository.create).toHaveBeenCalledTimes(2);
      expect(mockItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteId: 'quote-1',
          itemType: 'PART',
          productId: 'prod-1',
          quantity: 2,
          explodedPartNumber: 'P001',
        })
      );
      expect(result.data.itemCount).toBe(2);
      expect(result.message).toContain('2 tétel');
    });

    it('[P1] should recalculate quote totals after adding items', async () => {
      const req = createMockRequest();
      const mockQuote = createMockQuote();
      const mockView = createMockExplodedView();
      const mockItem = createMockItem({ totalPrice: 5000 });

      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(mockQuote);
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(mockView);
      vi.mocked(mockItemRepository.create).mockResolvedValue(mockItem);
      vi.mocked(mockItemRepository.findByQuoteId).mockResolvedValue([mockItem]);
      vi.mocked(mockQuoteRepository.update).mockResolvedValue(mockQuote);

      await controller.addItemsFromExplodedView('quote-1', req, {
        machineModelId: 'makita-abc123',
        selections: [{ hotspotId: 'hotspot-1', quantity: 1 }],
      });

      expect(mockQuoteRepository.update).toHaveBeenCalledWith(
        'quote-1',
        'tenant-456',
        expect.objectContaining({
          subtotal: 5000,
          vatAmount: 1350, // 5000 * 0.27
          totalAmount: 6350,
        })
      );
    });

    it('[P1] should reject zero or negative quantity', async () => {
      const req = createMockRequest();
      vi.mocked(mockQuoteRepository.findById).mockResolvedValue(createMockQuote());
      vi.mocked(mockExplodedViewRepository.findByMachineModelId).mockResolvedValue(
        createMockExplodedView()
      );

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: 'makita-abc123',
          selections: [{ hotspotId: 'hotspot-1', quantity: 0 }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException when no selections provided', async () => {
      const req = createMockRequest();

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: 'model-1',
          selections: [],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('[P1] should throw BadRequestException when machineModelId not provided', async () => {
      const req = createMockRequest();

      await expect(
        controller.addItemsFromExplodedView('quote-1', req, {
          machineModelId: '',
          selections: [{ hotspotId: 'hotspot-1', quantity: 1 }],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
