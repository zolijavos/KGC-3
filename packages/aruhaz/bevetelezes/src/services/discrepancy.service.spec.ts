import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DiscrepancyService,
  IDiscrepancyRepository,
  ISupplierNotificationService,
} from './discrepancy.service';
import { IReceiptRepository, IReceiptItemRepository } from './receipt.service';
import { IAuditService } from './avizo.service';
import { IDiscrepancy, DiscrepancyType, ReceiptStatus } from '../interfaces/receipt.interface';

const mockDiscrepancyRepository: IDiscrepancyRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByReceiptId: vi.fn(),
  findUnresolvedByReceiptId: vi.fn(),
  update: vi.fn(),
};

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

const mockSupplierNotificationService: ISupplierNotificationService = {
  notifyDiscrepancy: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('DiscrepancyService', () => {
  let service: DiscrepancyService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockReceiptItemId = '00000000-0000-0000-0000-000000000001';

  const mockReceipt = {
    id: 'receipt-1',
    tenantId: mockTenantId,
    receiptNumber: 'BEV-2026-0001',
    supplierId: 'supplier-1',
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

  const mockReceiptItem = {
    id: mockReceiptItemId,
    receiptId: 'receipt-1',
    tenantId: mockTenantId,
    productId: 'product-1',
    productCode: 'MAK-001',
    productName: 'Akkumulátor',
    expectedQuantity: 10,
    receivedQuantity: 8,
    unitPrice: 15000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDiscrepancy: IDiscrepancy = {
    id: 'discrepancy-1',
    receiptId: 'receipt-1',
    receiptItemId: mockReceiptItemId,
    tenantId: mockTenantId,
    type: DiscrepancyType.SHORTAGE,
    expectedQuantity: 10,
    actualQuantity: 8,
    difference: -2,
    supplierNotified: false,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscrepancyService(
      mockDiscrepancyRepository,
      mockReceiptRepository,
      mockReceiptItemRepository,
      mockSupplierNotificationService,
      mockAuditService,
    );
  });

  it('should create a discrepancy', async () => {
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockReceiptItemRepository.findByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockReceiptItem,
    ]);
    (mockDiscrepancyRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiscrepancy);
    (mockReceiptRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);

    const result = await service.createDiscrepancy(
      'receipt-1',
      {
        receiptItemId: mockReceiptItemId,
        type: 'SHORTAGE',
        expectedQuantity: 10,
        actualQuantity: 8,
        reason: 'Hiány a szállítmányban',
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.type).toBe(DiscrepancyType.SHORTAGE);
    expect(result.difference).toBe(-2);
    expect(mockReceiptRepository.update).toHaveBeenCalledWith('receipt-1', {
      hasDiscrepancy: true,
      status: ReceiptStatus.DISCREPANCY,
    });
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'discrepancy_created',
      }),
    );
  });

  it('should not create discrepancy for completed receipt', async () => {
    const completedReceipt = { ...mockReceipt, status: ReceiptStatus.COMPLETED };
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(completedReceipt);

    await expect(
      service.createDiscrepancy(
        'receipt-1',
        {
          receiptItemId: mockReceiptItemId,
          type: 'SHORTAGE',
          expectedQuantity: 10,
          actualQuantity: 8,
        },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Cannot add discrepancy to completed receipt');
  });

  it('should throw error when receipt item not found', async () => {
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockReceiptItemRepository.findByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(
      service.createDiscrepancy(
        'receipt-1',
        {
          receiptItemId: '00000000-0000-0000-0000-999999999999',
          type: 'SHORTAGE',
          expectedQuantity: 10,
          actualQuantity: 8,
        },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Receipt item not found');
  });

  it('should resolve discrepancy without supplier notification', async () => {
    (mockDiscrepancyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiscrepancy);
    (mockDiscrepancyRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockDiscrepancy, ...data }),
    );
    (mockDiscrepancyRepository.findUnresolvedByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockReceiptRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);

    const result = await service.resolveDiscrepancy(
      'discrepancy-1',
      {
        resolutionNote: 'Beszállító jóváírást küld',
        notifySupplier: false,
      },
      mockTenantId,
      mockUserId,
    );

    expect(result.resolvedAt).toBeDefined();
    expect(result.resolvedBy).toBe(mockUserId);
    expect(mockSupplierNotificationService.notifyDiscrepancy).not.toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'discrepancy_resolved',
      }),
    );
  });

  it('should resolve discrepancy with supplier notification', async () => {
    (mockDiscrepancyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiscrepancy);
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockDiscrepancyRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockDiscrepancy, ...data }),
    );
    (mockDiscrepancyRepository.findUnresolvedByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockReceiptRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);

    await service.resolveDiscrepancy(
      'discrepancy-1',
      {
        resolutionNote: 'Reklamáció elindítva',
        notifySupplier: true,
      },
      mockTenantId,
      mockUserId,
    );

    expect(mockSupplierNotificationService.notifyDiscrepancy).toHaveBeenCalledWith(
      mockReceipt.supplierId,
      mockReceipt.supplierName,
      mockDiscrepancy,
      mockReceipt.receiptNumber,
    );
  });

  it('should update receipt status when all discrepancies resolved', async () => {
    (mockDiscrepancyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiscrepancy);
    (mockDiscrepancyRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
      async (id, data) => ({ ...mockDiscrepancy, ...data }),
    );
    (mockDiscrepancyRepository.findUnresolvedByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockReceiptRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);

    await service.resolveDiscrepancy(
      'discrepancy-1',
      {
        resolutionNote: 'Rendezve',
        notifySupplier: false,
      },
      mockTenantId,
      mockUserId,
    );

    expect(mockReceiptRepository.update).toHaveBeenCalledWith('receipt-1', {
      status: ReceiptStatus.IN_PROGRESS,
      hasDiscrepancy: false,
    });
  });

  it('should not allow resolving already resolved discrepancy', async () => {
    const resolvedDiscrepancy = {
      ...mockDiscrepancy,
      resolvedAt: new Date(),
      resolvedBy: 'user-2',
    };
    (mockDiscrepancyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedDiscrepancy);

    await expect(
      service.resolveDiscrepancy(
        'discrepancy-1',
        {
          resolutionNote: 'Test',
          notifySupplier: false,
        },
        mockTenantId,
        mockUserId,
      ),
    ).rejects.toThrow('Discrepancy already resolved');
  });

  it('should throw error on tenant mismatch', async () => {
    (mockDiscrepancyRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDiscrepancy);

    await expect(
      service.resolveDiscrepancy(
        'discrepancy-1',
        {
          resolutionNote: 'Test',
          notifySupplier: false,
        },
        'other-tenant',
        mockUserId,
      ),
    ).rejects.toThrow('Access denied');
  });

  it('should get discrepancies by receipt', async () => {
    (mockReceiptRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockReceipt);
    (mockDiscrepancyRepository.findByReceiptId as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockDiscrepancy,
    ]);

    const result = await service.getDiscrepanciesByReceipt('receipt-1', mockTenantId);

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe(DiscrepancyType.SHORTAGE);
  });
});
