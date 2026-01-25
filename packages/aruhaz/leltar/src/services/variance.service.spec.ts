/**
 * Variance Service Tests - Story 24.3: Leltár Eltérés és Korrekció
 * TEA (Test-Each-Action) approach with mock dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IStockCount, IStockCountItem } from '../interfaces/stock-count.interface';
import type { IStockAdjustment } from '../interfaces/variance.interface';
import { AdjustmentStatus, VarianceReasonCategory } from '../interfaces/variance.interface';
import type {
  IAuditService,
  IInventoryService,
  IProductRepository,
  IStockAdjustmentRepository,
  IStockCountItemRepository,
  IStockCountRepository,
} from './variance.service';
import { VarianceService } from './variance.service';

// Valid UUIDs for testing
const STOCK_COUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440002';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440003';
const ADJUSTMENT_ID = '550e8400-e29b-41d4-a716-446655440004';
const USER_ID = '550e8400-e29b-41d4-a716-446655440005';
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440006';

describe('VarianceService', () => {
  let service: VarianceService;
  let mockItemRepository: IStockCountItemRepository;
  let mockAdjustmentRepository: IStockAdjustmentRepository;
  let mockStockCountRepository: IStockCountRepository;
  let mockInventoryService: IInventoryService;
  let mockProductRepository: IProductRepository;
  let mockAuditService: IAuditService;

  const mockStockCount: IStockCount = {
    id: STOCK_COUNT_ID,
    tenantId: TENANT_ID,
    locationId: 'loc-1',
    warehouseId: 'wh-1',
    countNumber: 'LC-2026-0001',
    type: 'FULL',
    status: 'IN_PROGRESS',
    name: 'Test Count',
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(),
    stockFrozen: false,
    responsibleUserId: USER_ID,
    totalItems: 10,
    countedItems: 5,
    varianceCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItem: IStockCountItem = {
    id: ITEM_ID,
    stockCountId: STOCK_COUNT_ID,
    productId: PRODUCT_ID,
    productName: 'Test Product',
    sku: 'SKU-001',
    locationCode: 'A-01-01',
    bookQuantity: 100,
    countedQuantity: 95,
    variance: -5,
    recountRequired: false,
  };

  const mockProduct = { id: PRODUCT_ID, name: 'Test Product', unitPrice: 1000 };

  const mockAdjustment: IStockAdjustment = {
    id: ADJUSTMENT_ID,
    tenantId: TENANT_ID,
    stockCountId: STOCK_COUNT_ID,
    adjustmentNumber: 'ADJ-2026-0001',
    status: 'PENDING' as AdjustmentStatus,
    itemCount: 2,
    totalVarianceValue: -5000,
    createdByUserId: USER_ID,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockItemRepository = {
      findById: vi.fn().mockResolvedValue(mockItem),
      findByStockCountId: vi.fn().mockResolvedValue([mockItem]),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockItem, ...data })),
    };

    mockAdjustmentRepository = {
      create: vi.fn().mockResolvedValue(mockAdjustment),
      findById: vi.fn().mockResolvedValue(mockAdjustment),
      findByStockCountId: vi.fn().mockResolvedValue([mockAdjustment]),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...mockAdjustment, ...data })),
      generateAdjustmentNumber: vi.fn().mockResolvedValue('ADJ-2026-0001'),
    };

    mockStockCountRepository = {
      findById: vi.fn().mockResolvedValue(mockStockCount),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...mockStockCount, ...data })),
    };

    mockInventoryService = {
      adjustStock: vi.fn().mockResolvedValue(undefined),
    };

    mockProductRepository = {
      findById: vi.fn().mockResolvedValue(mockProduct),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new VarianceService(
      mockItemRepository as unknown as IStockCountItemRepository,
      mockAdjustmentRepository as unknown as IStockAdjustmentRepository,
      mockStockCountRepository as unknown as IStockCountRepository,
      mockInventoryService as unknown as IInventoryService,
      mockProductRepository as unknown as IProductRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  // ============================================
  // VARIANCE QUERY TESTS
  // ============================================

  describe('getVariances', () => {
    it('should return variance details', async () => {
      const result = await service.getVariances(STOCK_COUNT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.variance).toBe(-5);
      expect(result[0]?.varianceType).toBe('SHORTAGE');
      expect(result[0]?.varianceValue).toBe(-5000); // -5 * 1000
    });

    it('should return overage for positive variance', async () => {
      mockItemRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([{ ...mockItem, countedQuantity: 110, variance: 10 }]);

      const result = await service.getVariances(STOCK_COUNT_ID);

      expect(result[0]?.varianceType).toBe('OVERAGE');
      expect(result[0]?.varianceValue).toBe(10000);
    });

    it('should filter out items without variance', async () => {
      mockItemRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([
          mockItem,
          { ...mockItem, id: 'item-2', countedQuantity: 100, variance: 0 },
        ]);

      const result = await service.getVariances(STOCK_COUNT_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe('documentVarianceReason', () => {
    it('should document variance reason', async () => {
      const result = await service.documentVarianceReason(
        ITEM_ID,
        VarianceReasonCategory.THEFT_DAMAGE,
        'Sérült csomagolás miatt hiány'
      );

      expect(result.reasonCategory).toBe(VarianceReasonCategory.THEFT_DAMAGE);
      expect(result.reasonDescription).toBe('Sérült csomagolás miatt hiány');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'VARIANCE_REASON_DOCUMENTED',
        'StockCountItem',
        ITEM_ID,
        expect.any(Object)
      );
    });

    it('should throw error if item not found', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(
        service.documentVarianceReason(ITEM_ID, VarianceReasonCategory.ADMIN_ERROR, 'Test leírás')
      ).rejects.toThrow('Tétel nem található');
    });

    it('should throw error if no variance exists', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue({
        ...mockItem,
        variance: 0,
      });

      await expect(
        service.documentVarianceReason(ITEM_ID, VarianceReasonCategory.ADMIN_ERROR, 'Test leírás')
      ).rejects.toThrow('Nincs eltérés a dokumentáláshoz');
    });
  });

  describe('getVarianceSummary', () => {
    it('should return variance summary', async () => {
      mockItemRepository.findByStockCountId = vi.fn().mockResolvedValue([
        { ...mockItem, variance: -5, countedQuantity: 95 },
        { ...mockItem, id: 'item-2', variance: 10, countedQuantity: 110 },
      ]);

      const result = await service.getVarianceSummary(STOCK_COUNT_ID);

      expect(result.totalVarianceItems).toBe(2);
      expect(result.shortageItems).toBe(1);
      expect(result.overageItems).toBe(1);
      expect(result.totalShortageValue).toBe(5000);
      expect(result.totalOverageValue).toBe(10000);
      expect(result.netVarianceValue).toBe(5000); // 10000 - 5000
    });
  });

  // ============================================
  // ADJUSTMENT TESTS
  // ============================================

  describe('createAdjustment', () => {
    it('should create adjustment', async () => {
      const result = await service.createAdjustment(STOCK_COUNT_ID, USER_ID);

      expect(result.adjustmentNumber).toBe('ADJ-2026-0001');
      expect(result.status).toBe('PENDING');
      expect(mockStockCountRepository.update).toHaveBeenCalledWith(
        STOCK_COUNT_ID,
        expect.objectContaining({ status: 'PENDING_ADJUSTMENT' })
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'ADJUSTMENT_CREATED',
        'StockAdjustment',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error if stock count not found', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.createAdjustment(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Leltár nem található'
      );
    });
  });

  describe('approveAdjustment', () => {
    it('should approve pending adjustment', async () => {
      const result = await service.approveAdjustment(ADJUSTMENT_ID, USER_ID);

      expect(result.status).toBe('APPROVED');
      expect(result.approvedByUserId).toBe(USER_ID);
      expect(result.approvedAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'ADJUSTMENT_APPROVED',
        'StockAdjustment',
        ADJUSTMENT_ID,
        { userId: USER_ID }
      );
    });

    it('should throw error if adjustment not found', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.approveAdjustment(ADJUSTMENT_ID, USER_ID)).rejects.toThrow(
        'Korrekció nem található'
      );
    });

    it('should throw error if not in PENDING status', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue({
        ...mockAdjustment,
        status: 'APPROVED',
      });

      await expect(service.approveAdjustment(ADJUSTMENT_ID, USER_ID)).rejects.toThrow(
        'Csak PENDING státuszú korrekció hagyható jóvá'
      );
    });
  });

  describe('rejectAdjustment', () => {
    it('should reject adjustment with reason', async () => {
      const result = await service.rejectAdjustment(
        ADJUSTMENT_ID,
        USER_ID,
        'Nem megfelelő dokumentáció'
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Nem megfelelő dokumentáció');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'ADJUSTMENT_REJECTED',
        'StockAdjustment',
        ADJUSTMENT_ID,
        expect.objectContaining({ reason: 'Nem megfelelő dokumentáció' })
      );
    });

    it('should throw error if not in PENDING status', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue({
        ...mockAdjustment,
        status: 'APPLIED',
      });

      await expect(service.rejectAdjustment(ADJUSTMENT_ID, USER_ID, 'Reason')).rejects.toThrow(
        'Csak PENDING státuszú korrekció utasítható el'
      );
    });
  });

  describe('applyAdjustment', () => {
    it('should apply approved adjustment', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue({
        ...mockAdjustment,
        status: 'APPROVED',
      });

      const result = await service.applyAdjustment(ADJUSTMENT_ID, USER_ID);

      expect(result.status).toBe('APPLIED');
      expect(result.appliedByUserId).toBe(USER_ID);
      expect(mockInventoryService.adjustStock).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'ADJUSTMENT_APPLIED',
        'StockAdjustment',
        ADJUSTMENT_ID,
        expect.any(Object)
      );
    });

    it('should throw error if not APPROVED status', async () => {
      await expect(service.applyAdjustment(ADJUSTMENT_ID, USER_ID)).rejects.toThrow(
        'Csak APPROVED státuszú korrekció hajtható végre'
      );
    });

    it('should throw error if stock count not found', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue({
        ...mockAdjustment,
        status: 'APPROVED',
      });
      mockStockCountRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.applyAdjustment(ADJUSTMENT_ID, USER_ID)).rejects.toThrow(
        'Leltár nem található'
      );
    });
  });

  describe('getAdjustment', () => {
    it('should return adjustment by ID', async () => {
      const result = await service.getAdjustment(ADJUSTMENT_ID);

      expect(result).toEqual(mockAdjustment);
    });

    it('should return null for unknown ID', async () => {
      mockAdjustmentRepository.findById = vi.fn().mockResolvedValue(null);

      const result = await service.getAdjustment('unknown-id');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // STOCK COUNT COMPLETION TESTS
  // ============================================

  describe('completeStockCount', () => {
    it('should complete stock count when all adjustments done', async () => {
      mockAdjustmentRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([{ ...mockAdjustment, status: 'APPLIED' }]);

      await service.completeStockCount(STOCK_COUNT_ID, USER_ID);

      expect(mockStockCountRepository.update).toHaveBeenCalledWith(
        STOCK_COUNT_ID,
        expect.objectContaining({
          status: 'COMPLETED',
          stockFrozen: false,
          actualEndDate: expect.any(Date),
        })
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_COUNT_COMPLETED',
        'StockCount',
        STOCK_COUNT_ID,
        { userId: USER_ID }
      );
    });

    it('should throw error if pending adjustments exist', async () => {
      mockAdjustmentRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([{ ...mockAdjustment, status: 'PENDING' }]);

      await expect(service.completeStockCount(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Vannak még végrehajtásra váró korrekciók'
      );
    });

    it('should throw error if stock count not found', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.completeStockCount(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Leltár nem található'
      );
    });

    it('should allow completion with rejected adjustments', async () => {
      mockAdjustmentRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([{ ...mockAdjustment, status: 'REJECTED' }]);

      await service.completeStockCount(STOCK_COUNT_ID, USER_ID);

      expect(mockStockCountRepository.update).toHaveBeenCalledWith(
        STOCK_COUNT_ID,
        expect.objectContaining({ status: 'COMPLETED' })
      );
    });
  });

  // ============================================
  // EXPORT TESTS
  // ============================================

  describe('exportVariances', () => {
    it('should export variances as CSV', async () => {
      const result = await service.exportVariances(STOCK_COUNT_ID, 'CSV');

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toContain('Cikkszám;Cikknév;Helykód');
      expect(content).toContain('SKU-001');
    });

    it('should escape special characters in CSV', async () => {
      mockItemRepository.findByStockCountId = vi.fn().mockResolvedValue([
        {
          ...mockItem,
          productName: 'Product; with "quotes"',
          variance: -5,
          countedQuantity: 95,
        },
      ]);

      const result = await service.exportVariances(STOCK_COUNT_ID, 'CSV');
      const content = result.toString('utf-8');

      // Should be properly escaped
      expect(content).toContain('"Product; with ""quotes"""');
    });

    it('should prevent formula injection', async () => {
      mockItemRepository.findByStockCountId = vi.fn().mockResolvedValue([
        {
          ...mockItem,
          productName: '=SUM(A1:A10)',
          variance: -5,
          countedQuantity: 95,
        },
      ]);

      const result = await service.exportVariances(STOCK_COUNT_ID, 'CSV');
      const content = result.toString('utf-8');

      // Formula should be prefixed with single quote
      expect(content).toContain("'=SUM(A1:A10)");
    });

    it('should throw error for XLSX format (not implemented)', async () => {
      await expect(service.exportVariances(STOCK_COUNT_ID, 'XLSX')).rejects.toThrow(
        'XLSX export még nincs implementálva'
      );
    });
  });
});
