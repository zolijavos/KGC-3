/**
 * InvoiceController Unit Tests
 * Epic 10: Invoice Core - Számlázás
 *
 * TEA (Test-Each-Action) testing approach with mock services.
 */

import type {
  IInvoice,
  InvoiceRbacService,
  InvoiceService,
  StornoService,
} from '@kgc/sales-invoice';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaInvoiceRepository } from '../repositories/prisma-invoice.repository';
import type { InvoicePdfService, PdfGenerationResult } from '../services/invoice-pdf.service';
import { InvoiceController } from './invoice.controller';

type MockedInvoiceService = {
  [K in keyof InvoiceService]: Mock;
};

type MockedStornoService = {
  [K in keyof StornoService]: Mock;
};

type MockedRbacService = {
  [K in keyof InvoiceRbacService]: Mock;
};

type MockedPdfService = {
  [K in keyof InvoicePdfService]: Mock;
};

type MockedRepository = {
  findById: Mock;
  findMany: Mock;
  save: Mock;
  delete: Mock;
};

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let mockInvoiceService: MockedInvoiceService;
  let mockStornoService: MockedStornoService;
  let mockRbacService: MockedRbacService;
  let mockPdfService: MockedPdfService;
  let mockRepository: MockedRepository;

  const mockInvoice: IInvoice = {
    id: 'inv-1',
    tenantId: 'tenant-123',
    invoiceNumber: 'INV-2026-0001',
    prefix: 'INV',
    sequenceNumber: 1,
    type: 'STANDARD',
    status: 'DRAFT',
    partnerId: 'partner-1',
    partnerName: 'Test Partner Kft.',
    partnerAddress: '1234 Budapest, Test utca 1.',
    partnerTaxNumber: '12345678-2-42',
    invoiceDate: new Date('2026-01-15'),
    fulfillmentDate: new Date('2026-01-15'),
    dueDate: new Date('2026-01-30'),
    paymentMethod: 'TRANSFER',
    currency: 'HUF',
    netAmount: 10000,
    vatAmount: 2700,
    grossAmount: 12700,
    paidAmount: 0,
    isConfidential: false,
    visibleToRoles: [],
    items: [
      {
        id: 'item-1',
        lineNumber: 1,
        description: 'Test product',
        quantity: 1,
        unit: 'db',
        unitPriceNet: 10000,
        vatRate: 'RATE_27',
        vatPercentage: 27,
        discountPercent: 0,
        netAmount: 10000,
        vatAmount: 2700,
        grossAmount: 12700,
      },
    ],
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockInvoiceService = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      changeStatus: vi.fn(),
      recordPayment: vi.fn(),
    } as unknown as MockedInvoiceService;

    mockStornoService = {
      createStorno: vi.fn(),
      createPartialStorno: vi.fn(),
    } as unknown as MockedStornoService;

    mockRbacService = {
      canView: vi.fn().mockReturnValue(true),
      canEdit: vi.fn().mockReturnValue(true),
      canDelete: vi.fn().mockReturnValue(true),
      canIssue: vi.fn().mockReturnValue(true),
      canCancel: vi.fn().mockReturnValue(true),
      canRecordPayment: vi.fn().mockReturnValue(true),
    } as unknown as MockedRbacService;

    mockPdfService = {
      generatePdf: vi.fn(),
    } as unknown as MockedPdfService;

    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    controller = new InvoiceController(
      mockInvoiceService as unknown as InvoiceService,
      mockStornoService as unknown as StornoService,
      mockRbacService as unknown as InvoiceRbacService,
      mockPdfService as unknown as InvoicePdfService,
      mockRepository as unknown as PrismaInvoiceRepository
    );
  });

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  describe('list', () => {
    it('should return paginated list of invoices', async () => {
      const queryResult = {
        data: [mockInvoice],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockRepository.findMany.mockResolvedValue(queryResult);

      const result = await controller.list('tenant-123');

      expect(result).toEqual(queryResult);
      expect(mockRepository.findMany).toHaveBeenCalledWith(
        { tenantId: 'tenant-123' },
        { page: 1, pageSize: 20 }
      );
    });

    it('should pass all filter parameters', async () => {
      const queryResult = { data: [], total: 0, page: 2, pageSize: 10 };
      mockRepository.findMany.mockResolvedValue(queryResult);

      await controller.list(
        'tenant-123',
        'STANDARD',
        'DRAFT',
        'partner-1',
        '2026-01-01',
        '2026-01-31',
        'test',
        '2',
        '10'
      );

      expect(mockRepository.findMany).toHaveBeenCalledWith(
        {
          tenantId: 'tenant-123',
          type: 'STANDARD',
          status: 'DRAFT',
          partnerId: 'partner-1',
          dateFrom: new Date('2026-01-01'),
          dateTo: new Date('2026-01-31'),
          search: 'test',
        },
        { page: 2, pageSize: 10 }
      );
    });
  });

  describe('getById', () => {
    it('should return invoice by ID', async () => {
      mockRepository.findById.mockResolvedValue(mockInvoice);

      const result = await controller.getById('inv-1');

      expect(result).toEqual(mockInvoice);
      expect(mockRepository.findById).toHaveBeenCalledWith('inv-1');
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(controller.getById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new invoice', async () => {
      mockInvoiceService.create.mockResolvedValue(mockInvoice);

      const dto = {
        tenantId: 'tenant-123',
        partnerId: 'partner-1',
        partnerName: 'Test Partner Kft.',
        partnerAddress: '1234 Budapest, Test utca 1.',
        paymentMethod: 'TRANSFER',
        items: [
          {
            description: 'Test product',
            quantity: 1,
            unit: 'db',
            unitPriceNet: 10000,
            vatRate: 'RATE_27',
          },
        ],
        createdBy: 'user-1',
      };

      const result = await controller.create(dto);

      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceService.create).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      mockInvoiceService.create.mockResolvedValue(mockInvoice);

      const dto = {
        tenantId: 'tenant-123',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        partnerAddress: 'Address',
        partnerTaxNumber: '12345678-2-42',
        type: 'PROFORMA' as const,
        invoiceDate: '2026-01-15',
        fulfillmentDate: '2026-01-15',
        dueDate: '2026-01-30',
        paymentMethod: 'CASH',
        notes: 'Test notes',
        isConfidential: true,
        visibleToRoles: ['ADMIN'],
        items: [
          {
            description: 'Product',
            quantity: 2,
            unit: 'db',
            unitPriceNet: 5000,
            vatRate: 'RATE_27',
            productId: 'prod-1',
            discountPercent: 10,
          },
        ],
        createdBy: 'user-1',
      };

      await controller.create(dto);

      expect(mockInvoiceService.create).toHaveBeenCalled();
      const callArg = mockInvoiceService.create.mock.calls[0]?.[0];
      expect(callArg.partnerTaxNumber).toBe('12345678-2-42');
      expect(callArg.type).toBe('PROFORMA');
      expect(callArg.notes).toBe('Test notes');
      expect(callArg.isConfidential).toBe(true);
    });
  });

  describe('update', () => {
    it('should update invoice', async () => {
      const updated = { ...mockInvoice, notes: 'Updated notes' };
      mockInvoiceService.update.mockResolvedValue(updated);

      const result = await controller.update('inv-1', {
        notes: 'Updated notes',
        updatedBy: 'user-1',
      });

      expect(result).toEqual(updated);
      expect(mockInvoiceService.update).toHaveBeenCalledWith('inv-1', {
        notes: 'Updated notes',
        updatedBy: 'user-1',
      });
    });
  });

  describe('delete', () => {
    it('should delete draft invoice', async () => {
      mockInvoiceService.delete.mockResolvedValue(undefined);

      await controller.delete('inv-1');

      expect(mockInvoiceService.delete).toHaveBeenCalledWith('inv-1');
    });
  });

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  describe('issue', () => {
    it('should issue invoice (DRAFT -> ISSUED)', async () => {
      const issued = { ...mockInvoice, status: 'ISSUED' as const };
      mockInvoiceService.changeStatus.mockResolvedValue(issued);

      const result = await controller.issue('inv-1', 'user-1');

      expect(result).toEqual(issued);
      expect(mockInvoiceService.changeStatus).toHaveBeenCalledWith('inv-1', 'ISSUED', 'user-1');
    });
  });

  describe('markAsSent', () => {
    it('should mark invoice as sent', async () => {
      const sent = { ...mockInvoice, status: 'SENT' as const };
      mockInvoiceService.changeStatus.mockResolvedValue(sent);

      const result = await controller.markAsSent('inv-1', 'user-1');

      expect(result).toEqual(sent);
      expect(mockInvoiceService.changeStatus).toHaveBeenCalledWith('inv-1', 'SENT', 'user-1');
    });
  });

  describe('recordPayment', () => {
    it('should record payment on invoice', async () => {
      const paid = { ...mockInvoice, status: 'PAID' as const, paidAmount: 12700 };
      mockInvoiceService.recordPayment.mockResolvedValue(paid);

      const result = await controller.recordPayment('inv-1', {
        amount: 12700,
        userId: 'user-1',
        reference: 'PAY-001',
      });

      expect(result).toEqual(paid);
      expect(mockInvoiceService.recordPayment).toHaveBeenCalledWith(
        'inv-1',
        12700,
        'user-1',
        'PAY-001'
      );
    });
  });

  // ============================================
  // STORNO OPERATIONS
  // ============================================

  describe('createStorno', () => {
    it('should create full storno invoice', async () => {
      const storno = { ...mockInvoice, id: 'inv-2', type: 'STORNO' as const };
      mockStornoService.createStorno.mockResolvedValue(storno);

      const result = await controller.createStorno('inv-1', {
        reason: 'Téves számla',
        userId: 'user-1',
      });

      expect(result).toEqual(storno);
      expect(mockStornoService.createStorno).toHaveBeenCalledWith(
        'inv-1',
        'user-1',
        'Téves számla'
      );
    });

    it('should create partial storno invoice', async () => {
      const partialStorno = { ...mockInvoice, id: 'inv-3', type: 'STORNO' as const };
      mockStornoService.createPartialStorno.mockResolvedValue(partialStorno);

      const result = await controller.createStorno('inv-1', {
        reason: 'Részleges sztornó',
        userId: 'user-1',
        partialItems: [{ lineNumber: 1, quantity: 1 }],
      });

      expect(result).toEqual(partialStorno);
      expect(mockStornoService.createPartialStorno).toHaveBeenCalledWith(
        'inv-1',
        'user-1',
        'Részleges sztornó',
        [{ lineNumber: 1, quantity: 1 }]
      );
    });
  });

  // ============================================
  // PDF OPERATIONS
  // ============================================

  describe('downloadPdf', () => {
    it('should generate and return PDF', async () => {
      mockRepository.findById.mockResolvedValue(mockInvoice);
      const pdfResult: PdfGenerationResult = {
        buffer: Buffer.from('<html>PDF Content</html>'),
        filename: 'szamla_INV-2026-0001.pdf',
        mimeType: 'text/html',
        generatedAt: new Date(),
      };
      mockPdfService.generatePdf.mockResolvedValue(pdfResult);

      const mockResponse = {
        setHeader: vi.fn(),
        send: vi.fn(),
      };

      await controller.downloadPdf('inv-1', undefined, 'hu', mockResponse as never);

      expect(mockPdfService.generatePdf).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="szamla_INV-2026-0001.pdf"'
      );
      expect(mockResponse.send).toHaveBeenCalledWith(pdfResult.buffer);
    });

    it('should throw NotFoundException when invoice not found for PDF', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(controller.downloadPdf('invalid-id', undefined, 'hu')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should support duplicate flag', async () => {
      mockRepository.findById.mockResolvedValue(mockInvoice);
      mockPdfService.generatePdf.mockResolvedValue({
        buffer: Buffer.from('PDF'),
        filename: 'szamla_INV-2026-0001_masolat.pdf',
        mimeType: 'text/html',
        generatedAt: new Date(),
      });

      const mockResponse = {
        setHeader: vi.fn(),
        send: vi.fn(),
      };

      await controller.downloadPdf('inv-1', 'true', 'hu', mockResponse as never);

      expect(mockPdfService.generatePdf).toHaveBeenCalledWith(
        mockInvoice,
        expect.any(Object),
        expect.objectContaining({ isDuplicate: true, language: 'hu' })
      );
    });
  });

  // ============================================
  // RBAC OPERATIONS
  // ============================================

  describe('checkPermissions', () => {
    it('should return permission check results', async () => {
      mockRepository.findById.mockResolvedValue(mockInvoice);
      mockRbacService.canView.mockReturnValue(true);
      mockRbacService.canEdit.mockReturnValue(true);
      mockRbacService.canDelete.mockReturnValue(false);
      mockRbacService.canIssue.mockReturnValue(true);
      mockRbacService.canCancel.mockReturnValue(false);
      mockRbacService.canRecordPayment.mockReturnValue(true);

      const result = await controller.checkPermissions('inv-1', 'ADMIN,ACCOUNTANT');

      expect(result).toEqual({
        canView: true,
        canEdit: true,
        canDelete: false,
        canIssue: true,
        canCancel: false,
        canRecordPayment: true,
      });

      expect(mockRbacService.canView).toHaveBeenCalledWith(mockInvoice, ['ADMIN', 'ACCOUNTANT']);
    });

    it('should throw NotFoundException when invoice not found for permission check', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(controller.checkPermissions('invalid-id', 'ADMIN')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
