import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReceiptService,
  IReceiptRepository,
  IReceiptItemRepository,
  IInventoryService,
} from './receipt.service';
import { IAvizoRepository, IAvizoItemRepository, IAuditService } from './avizo.service';
import { IReceipt, ReceiptStatus } from '../interfaces/receipt.interface';
import { IAvizo, AvizoStatus } from '../interfaces/avizo.interface';
import { CreateReceiptDto } from '../dto/receipt.dto';

const mockReceiptRepository: IReceiptRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByAvizoId: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockReceiptItemRepository: IReceiptItemRepository = {
  createMany: vi.fn(),
  findByReceiptId: vi.fn(),
  update: vi.fn(),
};

const mockAvizoRepository: IAvizoRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findBySupplier: vi.fn(),
  findPending: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockAvizoItemRepository: IAvizoItemRepository = {
  createMany: vi.fn(),
  findByAvizoId: vi.fn(),
  update: vi.fn(),
};

const mockInventoryService: IInventoryService = {
  increaseStock: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('ReceiptService', () => {
  let service: ReceiptService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockSupplierId = '00000000-0000-0000-0000-000000000001';
  const mockProductId = '00000000-0000-0000-0000-000000000002';
  const mockAvizoId = '00000000-0000-0000-0000-000000000003';

  const mockReceipt: IReceipt = {
    id: 'receipt-1',
    tenantId: mockTenantId,
    receiptNumber: 'BEV-2026-0001',
    supplierId: mockSupplierId,
    supplierName: 'Makita Kft.',
    receivedDate: new Date(),
    status: ReceiptStatus.IN_PROGRESS,
    totalItems: 1,
    totalQuantity: 10,
    hasDiscrepancy: false,
    processedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAvizo: IAvizo = {
    id: mockAvizoId,
    tenantId: mockTenantId,
    avizoNumber: 'AV-2026-0001',
    supplierId: mockSupplierId,
    supplierName: 'Makita Kft.',
    expectedDate: new Date(),
    status: AvizoStatus.PENDING,
    totalItems: 1,
    totalQuantity: 10,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCreateDto: CreateReceiptDto = {
    supplierId: mockSupplierId,
    supplierName: 'Makita Kft.',
    items: [
      {
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Akkumulátor 18V',
        expectedQuantity: 10,
        receivedQuantity: 10,
        unitPrice: 15000,
        locationCode: 'A-1-1',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReceiptService(
      mockReceiptRepository,
      mockReceiptItemRepository,
      mockAvizoRepository,
      mockAvizoItemRepository,
      mockInventoryService,
      mockAuditService,
    );
  });

  it('should create a receipt without discrepancy', async () => {
    (mockReceiptRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (mockReceiptRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockReceiptItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await service.createReceipt(validCreateDto, mockTenantId, mockUserId);

    expect(result.hasDiscrepancy).toBe(false);
    expect(result.status).toBe(ReceiptStatus.IN_PROGRESS);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receipt_created',
      }),
    );
  });

  it('should create a receipt with discrepancy when quantity differs beyond tolerance', async () => {
    const dtoWithDiscrepancy: CreateReceiptDto = {
      ...validCreateDto,
      items: [
        {
          ...validCreateDto.items[0]!,
          expectedQuantity: 100,
          receivedQuantity: 90, // 10% difference, beyond 0.5%
        },
      ],
    };

    const receiptWithDiscrepancy = { ...mockReceipt, hasDiscrepancy: true, status: ReceiptStatus.DISCREPANCY };
    (mockReceiptRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (mockReceiptRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(receiptWithDiscrepancy);
    (mockReceiptItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.createReceipt(dtoWithDiscrepancy, mockTenantId, mockUserId);

    expect(mockReceiptRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hasDiscrepancy: true,
        status: ReceiptStatus.DISCREPANCY,
      }),
    );
  });

  it('should validate avizo when provided', async () => {
    const dtoWithAvizo: CreateReceiptDto = {
      ...validCreateDto,
      avizoId: mockAvizoId,
    };

    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAvizo);
    (mockAvizoItemRepository.findByAvizoId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockReceiptRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (mockReceiptRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockReceiptItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await service.createReceipt(dtoWithAvizo, mockTenantId, mockUserId);

    expect(mockAvizoRepository.findById).toHaveBeenCalledWith(mockAvizoId);
  });

  it('should throw error when avizo already received', async () => {
    const receivedAvizo = { ...mockAvizo, status: AvizoStatus.RECEIVED };
    (mockAvizoRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(receivedAvizo);

    const dtoWithAvizo: CreateReceiptDto = {
      ...validCreateDto,
      avizoId: mockAvizoId,
    };

    await expect(service.createReceipt(dtoWithAvizo, mockTenantId, mockUserId)).rejects.toThrow(
      'Avizo already fully received',
    );
  });

  it('should complete receipt and update inventory', async () => {
    const receiptItems = [
      {
        id: 'item-1',
        receiptId: 'receipt-1',
        tenantId: mockTenantId,
        productId: mockProductId,
        productCode: 'MAK-001',
        productName: 'Akkumulátor',
        expectedQuantity: 10,
        receivedQuantity: 10,
        unitPrice: 15000,
        locationCode: 'A-1-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockReceiptItemRepository.findByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue(receiptItems);
    (mockReceiptRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockReceipt, ...data }),
    );

    const result = await service.completeReceipt('receipt-1', mockTenantId, mockUserId);

    expect(result.status).toBe(ReceiptStatus.COMPLETED);
    expect(mockInventoryService.increaseStock).toHaveBeenCalledWith(
      mockTenantId,
      mockProductId,
      10,
      'A-1-1',
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'receipt_completed',
      }),
    );
  });

  it('should not complete receipt with unresolved discrepancies', async () => {
    const receiptWithDiscrepancy = { ...mockReceipt, status: ReceiptStatus.DISCREPANCY };
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(receiptWithDiscrepancy);

    await expect(service.completeReceipt('receipt-1', mockTenantId, mockUserId)).rejects.toThrow(
      'Receipt has unresolved discrepancies',
    );
  });

  it('should check tolerance correctly', () => {
    // Within tolerance (0.5%)
    expect(service.checkTolerance(100, 100)).toBe(true);
    expect(service.checkTolerance(100, 100.5)).toBe(true);
    expect(service.checkTolerance(100, 99.5)).toBe(true);

    // Outside tolerance
    expect(service.checkTolerance(100, 101)).toBe(false);
    expect(service.checkTolerance(100, 99)).toBe(false);

    // Edge case: zero expected
    expect(service.checkTolerance(0, 0)).toBe(true);
    expect(service.checkTolerance(0, 1)).toBe(false);
  });

  it('should throw error on tenant mismatch', async () => {
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);

    await expect(service.getReceiptById('receipt-1', 'other-tenant')).rejects.toThrow('Access denied');
  });
});
