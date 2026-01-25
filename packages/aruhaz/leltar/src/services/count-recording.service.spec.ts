/**
 * Count Recording Service Tests - Story 24.2: Leltár Rögzítés
 * TEA (Test-Each-Action) approach with mock dependencies
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICounterSession } from '../interfaces/count-recording.interface';
import { CountingMode } from '../interfaces/count-recording.interface';
import type { IStockCount, IStockCountItem } from '../interfaces/stock-count.interface';
import type {
  IAuditService,
  ICounterSessionRepository,
  IStockCountItemRepository,
  IStockCountRepository,
  IUserRepository,
} from './count-recording.service';
import { CountRecordingService } from './count-recording.service';

// Valid UUIDs for testing
const STOCK_COUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440003';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440004';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440005';

describe('CountRecordingService', () => {
  let service: CountRecordingService;
  let mockSessionRepository: ICounterSessionRepository;
  let mockItemRepository: IStockCountItemRepository;
  let mockStockCountRepository: IStockCountRepository;
  let mockUserRepository: IUserRepository;
  let mockAuditService: IAuditService;

  const mockStockCount: IStockCount = {
    id: STOCK_COUNT_ID,
    tenantId: 'tenant-1',
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
    countedItems: 0,
    varianceCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = { id: USER_ID, name: 'Test User' };

  const mockSession: ICounterSession = {
    id: SESSION_ID,
    stockCountId: STOCK_COUNT_ID,
    userId: USER_ID,
    userName: 'Test User',
    isActive: true,
    itemsCounted: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
  };

  const mockItem: IStockCountItem = {
    id: ITEM_ID,
    stockCountId: STOCK_COUNT_ID,
    productId: PRODUCT_ID,
    productName: 'Test Product',
    sku: 'SKU-001',
    barcode: '1234567890',
    locationCode: 'A-01-01',
    bookQuantity: 100,
    recountRequired: false,
  };

  beforeEach(() => {
    mockSessionRepository = {
      create: vi.fn().mockResolvedValue(mockSession),
      findById: vi.fn().mockResolvedValue(mockSession),
      findActiveByStockCountId: vi.fn().mockResolvedValue([mockSession]),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...mockSession, ...data })),
    };

    mockItemRepository = {
      findById: vi.fn().mockResolvedValue(mockItem),
      findByStockCountId: vi.fn().mockResolvedValue([mockItem]),
      findByBarcode: vi.fn().mockResolvedValue(mockItem),
      findByProductId: vi.fn().mockResolvedValue(mockItem),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockItem, ...data })),
      findByFilter: vi.fn().mockResolvedValue([mockItem]),
    };

    mockStockCountRepository = {
      findById: vi.fn().mockResolvedValue(mockStockCount),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...mockStockCount, ...data })),
    };

    mockUserRepository = {
      findById: vi.fn().mockResolvedValue(mockUser),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new CountRecordingService(
      mockSessionRepository as unknown as ICounterSessionRepository,
      mockItemRepository as unknown as IStockCountItemRepository,
      mockStockCountRepository as unknown as IStockCountRepository,
      mockUserRepository as unknown as IUserRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  // ============================================
  // COUNTER SESSION TESTS
  // ============================================

  describe('startCounterSession', () => {
    it('should start counter session for active stock count', async () => {
      const result = await service.startCounterSession(STOCK_COUNT_ID, USER_ID);

      expect(result.stockCountId).toBe(STOCK_COUNT_ID);
      expect(result.userId).toBe(USER_ID);
      expect(result.isActive).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'COUNTER_SESSION_STARTED',
        'CounterSession',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error if stock count not found', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.startCounterSession(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Leltár nem található'
      );
    });

    it('should throw error if stock count not in progress', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'DRAFT',
      });

      await expect(service.startCounterSession(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Csak aktív leltárhoz csatlakozhat számláló'
      );
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.startCounterSession(STOCK_COUNT_ID, USER_ID)).rejects.toThrow(
        'Felhasználó nem található'
      );
    });

    it('should assign zone to session', async () => {
      // Mock create to pass through input data
      mockSessionRepository.create = vi
        .fn()
        .mockImplementation(session => Promise.resolve(session));

      const result = await service.startCounterSession(STOCK_COUNT_ID, USER_ID, 'A-Zone');

      expect(result.assignedZone).toBe('A-Zone');
    });
  });

  describe('endCounterSession', () => {
    it('should end counter session', async () => {
      const result = await service.endCounterSession(SESSION_ID);

      expect(result.isActive).toBe(false);
      expect(result.endedAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'COUNTER_SESSION_ENDED',
        'CounterSession',
        SESSION_ID,
        expect.any(Object)
      );
    });

    it('should throw error if session not found', async () => {
      mockSessionRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.endCounterSession(SESSION_ID)).rejects.toThrow('Session nem található');
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for stock count', async () => {
      const result = await service.getActiveSessions(STOCK_COUNT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBe(true);
    });
  });

  // ============================================
  // COUNT RECORDING TESTS
  // ============================================

  describe('recordCount', () => {
    it('should record count and calculate variance', async () => {
      const result = await service.recordCount({
        itemId: ITEM_ID,
        countedQuantity: 95,
        userId: USER_ID,
        mode: CountingMode.MANUAL,
      });

      expect(result.countedQuantity).toBe(95);
      expect(result.variance).toBe(-5); // 95 - 100 = -5
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'COUNT_RECORDED',
        'StockCountItem',
        ITEM_ID,
        expect.objectContaining({ variance: -5 })
      );
    });

    it('should throw error if item not found', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(
        service.recordCount({
          itemId: ITEM_ID,
          countedQuantity: 95,
          userId: USER_ID,
          mode: CountingMode.MANUAL,
        })
      ).rejects.toThrow('Tétel nem található');
    });

    it('should throw error if stock count not in progress', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'COMPLETED',
      });

      await expect(
        service.recordCount({
          itemId: ITEM_ID,
          countedQuantity: 95,
          userId: USER_ID,
          mode: CountingMode.MANUAL,
        })
      ).rejects.toThrow('Csak aktív (IN_PROGRESS) leltárhoz rögzíthető számlálás');
    });

    it('should record count with notes', async () => {
      const result = await service.recordCount({
        itemId: ITEM_ID,
        countedQuantity: 100,
        userId: USER_ID,
        mode: CountingMode.BARCODE_SCAN,
        notes: 'Újraszámolva',
      });

      expect(result.variance).toBe(0);
      expect(result.notes).toBe('Újraszámolva');
    });
  });

  describe('recordBatchCount', () => {
    it('should record batch counts', async () => {
      const result = await service.recordBatchCount({
        stockCountId: STOCK_COUNT_ID,
        userId: USER_ID,
        items: [{ productId: PRODUCT_ID, countedQuantity: 95 }],
      });

      expect(result).toHaveLength(1);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'BATCH_COUNT_RECORDED',
        'StockCount',
        STOCK_COUNT_ID,
        expect.objectContaining({ itemCount: 1 })
      );
    });

    it('should throw error if stock count not in progress for batch', async () => {
      mockStockCountRepository.findById = vi.fn().mockResolvedValue({
        ...mockStockCount,
        status: 'SUSPENDED',
      });

      await expect(
        service.recordBatchCount({
          stockCountId: STOCK_COUNT_ID,
          userId: USER_ID,
          items: [{ productId: PRODUCT_ID, countedQuantity: 95 }],
        })
      ).rejects.toThrow('Csak aktív (IN_PROGRESS) leltárhoz rögzíthető számlálás');
    });

    it('should skip unknown items and log them', async () => {
      mockItemRepository.findByProductId = vi.fn().mockResolvedValue(null);
      mockItemRepository.findByBarcode = vi.fn().mockResolvedValue(null);
      // Use valid UUID that doesn't exist in the repository
      const unknownProductId = '550e8400-e29b-41d4-a716-000000000099';

      const result = await service.recordBatchCount({
        stockCountId: STOCK_COUNT_ID,
        userId: USER_ID,
        items: [{ productId: unknownProductId, countedQuantity: 10 }],
      });

      expect(result).toHaveLength(0);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'BATCH_COUNT_RECORDED',
        'StockCount',
        STOCK_COUNT_ID,
        expect.objectContaining({ skippedCount: 1 })
      );
    });

    it('should find items by barcode', async () => {
      mockItemRepository.findByProductId = vi.fn().mockResolvedValue(null);
      mockItemRepository.findByBarcode = vi.fn().mockResolvedValue(mockItem);

      const result = await service.recordBatchCount({
        stockCountId: STOCK_COUNT_ID,
        userId: USER_ID,
        items: [{ barcode: '1234567890', countedQuantity: 98 }],
      });

      expect(result).toHaveLength(1);
      expect(mockItemRepository.findByBarcode).toHaveBeenCalledWith(STOCK_COUNT_ID, '1234567890');
    });
  });

  describe('findItemByBarcode', () => {
    it('should find item by barcode', async () => {
      const result = await service.findItemByBarcode(STOCK_COUNT_ID, '1234567890');

      expect(result).toEqual(mockItem);
    });

    it('should return null for unknown barcode', async () => {
      mockItemRepository.findByBarcode = vi.fn().mockResolvedValue(null);

      const result = await service.findItemByBarcode(STOCK_COUNT_ID, 'unknown');

      expect(result).toBeNull();
    });
  });

  describe('undoCount', () => {
    it('should undo count', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue({
        ...mockItem,
        countedQuantity: 95,
        variance: -5,
      });

      const result = await service.undoCount(ITEM_ID, USER_ID);

      expect(result.countedQuantity).toBeUndefined();
      expect(result.variance).toBeUndefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'COUNT_UNDONE',
        'StockCountItem',
        ITEM_ID,
        expect.objectContaining({ previousCount: 95 })
      );
    });

    it('should throw error if item not found', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.undoCount(ITEM_ID, USER_ID)).rejects.toThrow('Tétel nem található');
    });

    it('should throw error if item not counted', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue({
        ...mockItem,
        countedQuantity: undefined,
      });

      await expect(service.undoCount(ITEM_ID, USER_ID)).rejects.toThrow(
        'Tétel még nincs számlálva'
      );
    });
  });

  describe('markForRecount', () => {
    it('should mark item for recount', async () => {
      const result = await service.markForRecount(ITEM_ID, 'Kérdéses mennyiség');

      expect(result.recountRequired).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'RECOUNT_MARKED',
        'StockCountItem',
        ITEM_ID,
        { reason: 'Kérdéses mennyiség' }
      );
    });

    it('should throw error if item not found', async () => {
      mockItemRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(service.markForRecount(ITEM_ID, 'Reason')).rejects.toThrow(
        'Tétel nem található'
      );
    });
  });

  describe('getCountItems', () => {
    it('should return filtered items', async () => {
      const result = await service.getCountItems(STOCK_COUNT_ID, { uncountedOnly: true });

      expect(result).toHaveLength(1);
      expect(mockItemRepository.findByFilter).toHaveBeenCalledWith(STOCK_COUNT_ID, {
        uncountedOnly: true,
      });
    });
  });

  describe('getCountingProgress', () => {
    it('should return counting progress', async () => {
      mockItemRepository.findByStockCountId = vi
        .fn()
        .mockResolvedValue([
          mockItem,
          { ...mockItem, id: 'item-2', countedQuantity: 50, variance: 0 },
          { ...mockItem, id: 'item-3', countedQuantity: 45, variance: -5 },
        ]);

      const result = await service.getCountingProgress(STOCK_COUNT_ID);

      expect(result.totalItems).toBe(3);
      expect(result.countedItems).toBe(2);
      expect(result.varianceItems).toBe(1); // Only item-3 has variance
      expect(result.matchingItems).toBe(1); // item-2 matches
      expect(result.completionPercent).toBeCloseTo(66.67, 1);
      expect(result.activeCounters).toBe(1);
    });

    it('should handle empty stock count', async () => {
      mockItemRepository.findByStockCountId = vi.fn().mockResolvedValue([]);
      mockSessionRepository.findActiveByStockCountId = vi.fn().mockResolvedValue([]);

      const result = await service.getCountingProgress(STOCK_COUNT_ID);

      expect(result.totalItems).toBe(0);
      expect(result.completionPercent).toBe(0);
    });
  });
});
