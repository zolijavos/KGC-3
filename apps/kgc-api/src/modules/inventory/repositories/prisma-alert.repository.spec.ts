/**
 * Unit tests for PrismaAlertRepository
 * Story INV-S5: PrismaAlertRepository
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaAlertRepository } from './prisma-alert.repository';

// Mock Prisma Client
const mockPrismaClient = {
  stockLevelSetting: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  stockAlert: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

describe('PrismaAlertRepository', () => {
  let repository: PrismaAlertRepository;
  const tenantId = 'tenant-123';
  const productId = 'prod-456';
  const warehouseId = 'wh-789';

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaAlertRepository(mockPrismaClient as never);
  });

  // ============================================
  // STOCK LEVEL SETTING TESTS
  // ============================================

  describe('createStockLevelSetting()', () => {
    it('should create a stock level setting', async () => {
      const settingData = {
        tenantId,
        productId,
        warehouseId,
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        unit: 'db',
        isActive: true,
      };

      mockPrismaClient.stockLevelSetting.create.mockResolvedValue({
        id: 'sls-uuid-1',
        ...settingData,
        maximumLevel: null,
        leadTimeDays: null,
        createdAt: new Date(),
        updatedAt: null,
      });

      const result = await repository.createStockLevelSetting(settingData);

      expect(result.id).toBe('sls-uuid-1');
      expect(result.minimumLevel).toBe(10);
      expect(result.reorderPoint).toBe(20);
      expect(mockPrismaClient.stockLevelSetting.create).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      const settingData = {
        tenantId,
        productId,
        minimumLevel: 5,
        reorderPoint: 10,
        reorderQuantity: 25,
        maximumLevel: 100,
        unit: 'db',
        leadTimeDays: 7,
        isActive: true,
      };

      mockPrismaClient.stockLevelSetting.create.mockResolvedValue({
        id: 'sls-uuid-2',
        ...settingData,
        warehouseId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.createStockLevelSetting(settingData);

      expect(result.maximumLevel).toBe(100);
      expect(result.leadTimeDays).toBe(7);
      expect(result.warehouseId).toBeUndefined();
    });
  });

  describe('findStockLevelSettingById()', () => {
    it('should return setting when found', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
        productId,
        warehouseId: null,
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        maximumLevel: null,
        unit: 'db',
        leadTimeDays: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: null,
      });

      const result = await repository.findStockLevelSettingById('sls-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('sls-uuid-1');
    });

    it('should return null when not found', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue(null);

      const result = await repository.findStockLevelSettingById('non-existent', tenantId);

      expect(result).toBeNull();
    });
  });

  describe('findStockLevelSettingByProduct()', () => {
    it('should find by product and warehouse', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
        productId,
        warehouseId,
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        maximumLevel: null,
        unit: 'db',
        leadTimeDays: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: null,
      });

      const result = await repository.findStockLevelSettingByProduct(
        productId,
        tenantId,
        warehouseId
      );

      expect(result).not.toBeNull();
      expect(mockPrismaClient.stockLevelSetting.findFirst).toHaveBeenCalledWith({
        where: { productId, tenantId, warehouseId },
      });
    });

    it('should find global setting when no warehouse specified', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
        productId,
        warehouseId: null,
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        maximumLevel: null,
        unit: 'db',
        leadTimeDays: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: null,
      });

      await repository.findStockLevelSettingByProduct(productId, tenantId);

      expect(mockPrismaClient.stockLevelSetting.findFirst).toHaveBeenCalledWith({
        where: { productId, tenantId, warehouseId: null },
      });
    });
  });

  describe('queryStockLevelSettings()', () => {
    it('should filter and paginate', async () => {
      mockPrismaClient.stockLevelSetting.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLevelSetting.count.mockResolvedValue(100);

      const result = await repository.queryStockLevelSettings({
        tenantId,
        isActive: true,
        offset: 10,
        limit: 20,
      });

      expect(result.total).toBe(100);
      expect(mockPrismaClient.stockLevelSetting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          skip: 10,
          take: 20,
        })
      );
    });
  });

  describe('updateStockLevelSetting()', () => {
    it('should update allowed fields', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
        productId,
      });
      mockPrismaClient.stockLevelSetting.update.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
        productId,
        warehouseId: null,
        minimumLevel: 15,
        reorderPoint: 25,
        reorderQuantity: 50,
        maximumLevel: null,
        unit: 'db',
        leadTimeDays: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.updateStockLevelSetting('sls-uuid-1', tenantId, {
        minimumLevel: 15,
        reorderPoint: 25,
      });

      expect(result.minimumLevel).toBe(15);
      expect(result.reorderPoint).toBe(25);
    });

    it('should throw error when not found', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue(null);

      await expect(
        repository.updateStockLevelSetting('non-existent', tenantId, { minimumLevel: 10 })
      ).rejects.toThrow('StockLevelSetting not found');
    });
  });

  describe('deleteStockLevelSetting()', () => {
    it('should delete when found', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue({
        id: 'sls-uuid-1',
        tenantId,
      });
      mockPrismaClient.stockLevelSetting.delete.mockResolvedValue({});

      await repository.deleteStockLevelSetting('sls-uuid-1', tenantId);

      expect(mockPrismaClient.stockLevelSetting.delete).toHaveBeenCalledWith({
        where: { id: 'sls-uuid-1' },
      });
    });

    it('should throw error when not found', async () => {
      mockPrismaClient.stockLevelSetting.findFirst.mockResolvedValue(null);

      await expect(repository.deleteStockLevelSetting('non-existent', tenantId)).rejects.toThrow(
        'StockLevelSetting not found'
      );
    });
  });

  // ============================================
  // ALERT CRUD TESTS
  // ============================================

  describe('createAlert()', () => {
    it('should create an alert with type mapping', async () => {
      const alertData = {
        tenantId,
        productId,
        warehouseId,
        type: 'LOW_STOCK' as const,
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const,
        currentQuantity: 5,
        minimumLevel: 10,
        unit: 'db',
        message: 'Low stock alert',
        inventoryItemId: 'inv-item-1',
      };

      mockPrismaClient.stockAlert.create.mockResolvedValue({
        id: 'alert-uuid-1',
        tenantId,
        productId,
        warehouseId,
        inventoryItemId: 'inv-item-1',
        type: 'LOW_STOCK', // Prisma type
        priority: 'HIGH',
        status: 'ACTIVE',
        currentQuantity: 5,
        thresholdQuantity: 10,
        message: 'Low stock alert',
        productName: null,
        warehouseName: null,
        deficit: null,
        details: null,
        isAcknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        snoozedUntil: null,
        lastNotifiedAt: null,
        createdAt: new Date(),
      });

      const result = await repository.createAlert(alertData);

      expect(result.id).toBe('alert-uuid-1');
      expect(result.type).toBe('LOW_STOCK');
      expect(result.priority).toBe('HIGH');
    });

    it('should throw error when warehouseId is missing', async () => {
      const alertData = {
        tenantId,
        productId,
        // warehouseId missing
        type: 'LOW_STOCK' as const,
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const,
        currentQuantity: 5,
        minimumLevel: 10,
        unit: 'db',
        message: 'Low stock alert',
        inventoryItemId: 'inv-item-1',
      };

      await expect(repository.createAlert(alertData)).rejects.toThrow('warehouseId is required');
    });

    it('should throw error when inventoryItemId is missing', async () => {
      const alertData = {
        tenantId,
        productId,
        warehouseId,
        type: 'LOW_STOCK' as const,
        priority: 'HIGH' as const,
        status: 'ACTIVE' as const,
        currentQuantity: 5,
        minimumLevel: 10,
        unit: 'db',
        message: 'Low stock alert',
        // inventoryItemId missing
      };

      await expect(repository.createAlert(alertData)).rejects.toThrow(
        'inventoryItemId is required'
      );
    });
  });

  describe('findAlertById()', () => {
    it('should return alert when found', async () => {
      mockPrismaClient.stockAlert.findFirst.mockResolvedValue({
        id: 'alert-uuid-1',
        tenantId,
        productId,
        warehouseId,
        inventoryItemId: 'inv-item-1',
        type: 'OUT_OF_STOCK',
        priority: 'CRITICAL',
        status: 'ACTIVE',
        currentQuantity: 0,
        thresholdQuantity: 10,
        message: 'Out of stock',
        productName: 'Test Product',
        warehouseName: 'Main Warehouse',
        deficit: 10,
        details: null,
        isAcknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        snoozedUntil: null,
        lastNotifiedAt: null,
        createdAt: new Date(),
      });

      const result = await repository.findAlertById('alert-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('OUT_OF_STOCK');
      expect(result?.productName).toBe('Test Product');
    });

    it('should return null when not found', async () => {
      mockPrismaClient.stockAlert.findFirst.mockResolvedValue(null);

      const result = await repository.findAlertById('non-existent', tenantId);

      expect(result).toBeNull();
    });
  });

  describe('findActiveAlertForProduct()', () => {
    it('should find active alert for product', async () => {
      mockPrismaClient.stockAlert.findFirst.mockResolvedValue({
        id: 'alert-uuid-1',
        tenantId,
        productId,
        warehouseId,
        inventoryItemId: 'inv-item-1',
        type: 'LOW_STOCK',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        currentQuantity: 8,
        thresholdQuantity: 10,
        message: 'Low stock',
        productName: null,
        warehouseName: null,
        deficit: null,
        details: null,
        isAcknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        snoozedUntil: null,
        lastNotifiedAt: null,
        createdAt: new Date(),
      });

      const result = await repository.findActiveAlertForProduct(productId, tenantId, warehouseId);

      expect(result).not.toBeNull();
      expect(mockPrismaClient.stockAlert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId,
            tenantId,
            status: 'ACTIVE',
            warehouseId,
          }),
        })
      );
    });
  });

  describe('updateAlert()', () => {
    it('should update alert status', async () => {
      mockPrismaClient.stockAlert.findFirst.mockResolvedValue({
        id: 'alert-uuid-1',
        tenantId,
      });
      mockPrismaClient.stockAlert.update.mockResolvedValue({
        id: 'alert-uuid-1',
        tenantId,
        productId,
        warehouseId,
        inventoryItemId: 'inv-item-1',
        type: 'LOW_STOCK',
        priority: 'MEDIUM',
        status: 'ACKNOWLEDGED',
        currentQuantity: 8,
        thresholdQuantity: 10,
        message: 'Low stock',
        productName: null,
        warehouseName: null,
        deficit: null,
        details: null,
        isAcknowledged: true,
        acknowledgedBy: 'user-1',
        acknowledgedAt: new Date(),
        snoozedUntil: null,
        lastNotifiedAt: null,
        createdAt: new Date(),
      });

      const result = await repository.updateAlert('alert-uuid-1', tenantId, {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: 'user-1',
        acknowledgedAt: new Date(),
      });

      expect(result.status).toBe('ACKNOWLEDGED');
    });

    it('should throw error when not found', async () => {
      mockPrismaClient.stockAlert.findFirst.mockResolvedValue(null);

      await expect(
        repository.updateAlert('non-existent', tenantId, { status: 'RESOLVED' })
      ).rejects.toThrow('StockAlert not found');
    });
  });

  // ============================================
  // QUERY & SUMMARY TESTS
  // ============================================

  describe('queryAlerts()', () => {
    it('should filter by type', async () => {
      mockPrismaClient.stockAlert.findMany.mockResolvedValue([]);
      mockPrismaClient.stockAlert.count.mockResolvedValue(0);

      await repository.queryAlerts({ tenantId, type: 'LOW_STOCK' });

      expect(mockPrismaClient.stockAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'LOW_STOCK' }),
        })
      );
    });

    it('should filter by priority and status', async () => {
      mockPrismaClient.stockAlert.findMany.mockResolvedValue([]);
      mockPrismaClient.stockAlert.count.mockResolvedValue(0);

      await repository.queryAlerts({
        tenantId,
        priority: ['HIGH', 'CRITICAL'],
        status: 'ACTIVE',
      });

      expect(mockPrismaClient.stockAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { in: ['HIGH', 'CRITICAL'] },
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaClient.stockAlert.findMany.mockResolvedValue([]);
      mockPrismaClient.stockAlert.count.mockResolvedValue(50);

      const result = await repository.queryAlerts({
        tenantId,
        offset: 10,
        limit: 20,
      });

      expect(result.offset).toBe(10);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(50);
    });
  });

  describe('getAlertSummary()', () => {
    it('should aggregate alerts by priority and type', async () => {
      mockPrismaClient.stockAlert.findMany.mockResolvedValue([
        { type: 'LOW_STOCK', priority: 'HIGH', warehouseId: 'wh-1', warehouseName: 'Warehouse 1' },
        {
          type: 'LOW_STOCK',
          priority: 'MEDIUM',
          warehouseId: 'wh-1',
          warehouseName: 'Warehouse 1',
        },
        {
          type: 'OUT_OF_STOCK',
          priority: 'CRITICAL',
          warehouseId: 'wh-2',
          warehouseName: 'Warehouse 2',
        },
        { type: 'EXPIRING', priority: 'LOW', warehouseId: 'wh-1', warehouseName: 'Warehouse 1' },
      ]);

      const result = await repository.getAlertSummary(tenantId);

      expect(result.totalActive).toBe(4);
      expect(result.criticalCount).toBe(1);
      expect(result.highCount).toBe(1);
      expect(result.mediumCount).toBe(1);
      expect(result.lowCount).toBe(1);
      expect(result.byType.LOW_STOCK).toBe(2);
      expect(result.byType.OUT_OF_STOCK).toBe(1);
      expect(result.byWarehouse).toHaveLength(2);
    });
  });

  describe('resolveAlertsByProduct()', () => {
    it('should resolve all active alerts for product', async () => {
      mockPrismaClient.stockAlert.updateMany.mockResolvedValue({ count: 3 });

      const count = await repository.resolveAlertsByProduct(productId, tenantId);

      expect(count).toBe(3);
      expect(mockPrismaClient.stockAlert.updateMany).toHaveBeenCalledWith({
        where: {
          productId,
          tenantId,
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED' },
      });
    });

    it('should filter by warehouse when provided', async () => {
      mockPrismaClient.stockAlert.updateMany.mockResolvedValue({ count: 1 });

      await repository.resolveAlertsByProduct(productId, tenantId, warehouseId);

      expect(mockPrismaClient.stockAlert.updateMany).toHaveBeenCalledWith({
        where: {
          productId,
          tenantId,
          status: 'ACTIVE',
          warehouseId,
        },
        data: { status: 'RESOLVED' },
      });
    });
  });
});
