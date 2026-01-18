/**
 * Stock Count Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StockCountService } from './stock-count.service';
import type {
  IStockCountRepository,
  IStockCountItemRepository,
  IInventoryQueryRepository,
  IAuditService,
} from './stock-count.service';
import type { IStockCount, IStockCountItem } from '../interfaces/stock-count.interface';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440002';
const WAREHOUSE_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440004';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440005';
const COUNT_ID = '550e8400-e29b-41d4-a716-446655440006';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440007';

describe('StockCountService', () => {
  let service: StockCountService;
  let mockRepository: IStockCountRepository;
  let mockItemRepository: IStockCountItemRepository;
  let mockInventoryRepository: IInventoryQueryRepository;
  let mockAuditService: IAuditService;

  const mockStockCount: IStockCount = {
    id: COUNT_ID,
    tenantId: TENANT_ID,
    locationId: LOCATION_ID,
    warehouseId: WAREHOUSE_ID,
    countNumber: 'LC-2026-0001',
    type: 'FULL',
    status: 'DRAFT',
    name: 'Éves leltár 2026',
    scheduledStartDate: new Date('2026-01-20'),
    scheduledEndDate: new Date('2026-01-22'),
    stockFrozen: false,
    responsibleUserId: USER_ID,
    totalItems: 0,
    countedItems: 0,
    varianceCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItem: IStockCountItem = {
    id: ITEM_ID,
    stockCountId: COUNT_ID,
    productId: PRODUCT_ID,
    productName: 'Test Product',
    sku: 'SKU-001',
    locationCode: 'A-01-01',
    bookQuantity: 100,
    recountRequired: false,
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockStockCount),
      findById: vi.fn().mockResolvedValue(mockStockCount),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockStockCount, ...data })),
      findByFilter: vi.fn().mockResolvedValue([mockStockCount]),
      generateCountNumber: vi.fn().mockResolvedValue('LC-2026-0001'),
    };

    mockItemRepository = {
      createBatch: vi.fn().mockResolvedValue([mockItem]),
      findByStockCountId: vi.fn().mockResolvedValue([mockItem]),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockItem, ...data })),
    };

    mockInventoryRepository = {
      getProductsForCount: vi.fn().mockResolvedValue([
        {
          productId: PRODUCT_ID,
          productName: 'Test Product',
          sku: 'SKU-001',
          locationCode: 'A-01-01',
          quantity: 100,
          unitPrice: 1000,
        },
      ]),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new StockCountService(
      mockRepository as unknown as IStockCountRepository,
      mockItemRepository as unknown as IStockCountItemRepository,
      mockInventoryRepository as unknown as IInventoryQueryRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  describe('createStockCount', () => {
    it('should create a new stock count', async () => {
      const input = {
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        warehouseId: WAREHOUSE_ID,
        type: 'FULL' as const,
        name: 'Éves leltár 2026',
        scheduledStartDate: new Date('2026-01-20'),
        scheduledEndDate: new Date('2026-01-22'),
        responsibleUserId: USER_ID,
      };

      const result = await service.createStockCount(input);

      expect(result).toBeDefined();
      expect(result.status).toBe('DRAFT');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_COUNT_CREATED',
        'StockCount',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error for invalid date range', async () => {
      const input = {
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        warehouseId: WAREHOUSE_ID,
        type: 'FULL' as const,
        name: 'Test',
        scheduledStartDate: new Date('2026-01-22'),
        scheduledEndDate: new Date('2026-01-20'), // Invalid
        responsibleUserId: USER_ID,
      };

      await expect(service.createStockCount(input)).rejects.toThrow();
    });
  });

  describe('startStockCount', () => {
    it('should start stock count and generate sheet', async () => {
      const result = await service.startStockCount(COUNT_ID);

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.actualStartDate).toBeDefined();
      expect(mockItemRepository.createBatch).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_COUNT_STARTED',
        'StockCount',
        COUNT_ID,
        expect.any(Object)
      );
    });

    it('should throw error if not DRAFT status', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'IN_PROGRESS',
      });

      await expect(service.startStockCount(COUNT_ID)).rejects.toThrow(
        'Csak DRAFT státuszú leltár indítható'
      );
    });
  });

  describe('suspendStockCount', () => {
    it('should suspend active stock count', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'IN_PROGRESS',
      });

      const result = await service.suspendStockCount(COUNT_ID, 'Ebédszünet');

      expect(result.status).toBe('SUSPENDED');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_COUNT_SUSPENDED',
        'StockCount',
        COUNT_ID,
        { reason: 'Ebédszünet' }
      );
    });

    it('should throw error if not IN_PROGRESS', async () => {
      await expect(service.suspendStockCount(COUNT_ID, 'Reason')).rejects.toThrow(
        'Csak IN_PROGRESS státuszú leltár függeszthető fel'
      );
    });
  });

  describe('resumeStockCount', () => {
    it('should resume suspended stock count', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'SUSPENDED',
      });

      const result = await service.resumeStockCount(COUNT_ID);

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw error if not SUSPENDED', async () => {
      await expect(service.resumeStockCount(COUNT_ID)).rejects.toThrow(
        'Csak SUSPENDED státuszú leltár folytatható'
      );
    });
  });

  describe('getStockCount', () => {
    it('should return stock count by ID', async () => {
      const result = await service.getStockCount(COUNT_ID);

      expect(result).toEqual(mockStockCount);
    });

    it('should return null for unknown ID', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      const result = await service.getStockCount(unknownId);

      expect(result).toBeNull();
    });
  });

  describe('listStockCounts', () => {
    it('should list stock counts by filter', async () => {
      const result = await service.listStockCounts({ tenantId: TENANT_ID });

      expect(result).toHaveLength(1);
      expect(mockRepository.findByFilter).toHaveBeenCalled();
    });
  });

  describe('generateCountSheet', () => {
    it('should generate count sheet from inventory', async () => {
      const result = await service.generateCountSheet(COUNT_ID);

      expect(result).toHaveLength(1);
      expect(mockInventoryRepository.getProductsForCount).toHaveBeenCalled();
      expect(mockItemRepository.createBatch).toHaveBeenCalled();
    });
  });

  describe('toggleStockFreeze', () => {
    it('should freeze stock', async () => {
      const result = await service.toggleStockFreeze(COUNT_ID, true);

      expect(result.stockFrozen).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_FROZEN',
        'StockCount',
        COUNT_ID,
        {}
      );
    });

    it('should unfreeze stock', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        stockFrozen: true,
      });

      const result = await service.toggleStockFreeze(COUNT_ID, false);

      expect(result.stockFrozen).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_UNFROZEN',
        'StockCount',
        COUNT_ID,
        {}
      );
    });

    it('should throw error for completed stock count', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'COMPLETED',
      });

      await expect(service.toggleStockFreeze(COUNT_ID, true)).rejects.toThrow(
        'Lezárt leltáron nem módosítható a fagyasztás'
      );
    });
  });

  describe('cancelStockCount', () => {
    it('should cancel stock count', async () => {
      const result = await service.cancelStockCount(COUNT_ID, 'Hibás beállítások');

      expect(result.status).toBe('CANCELLED');
      expect(result.stockFrozen).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'STOCK_COUNT_CANCELLED',
        'StockCount',
        COUNT_ID,
        { reason: 'Hibás beállítások' }
      );
    });

    it('should throw error for completed stock count', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'COMPLETED',
      });

      await expect(service.cancelStockCount(COUNT_ID, 'Reason')).rejects.toThrow(
        'Lezárt vagy visszavont leltár nem vonható vissza'
      );
    });
  });
});
