/**
 * AlertController Unit Tests
 * Story 9-6: Minimum stock alert
 *
 * Note: Using direct instantiation instead of NestJS TestingModule
 * because the service has repository dependencies that complicate DI mocking.
 */

import type { AlertService } from '@kgc/inventory';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AlertController } from './alert.controller';

type MockedAlertService = {
  [K in keyof AlertService]: Mock;
};

describe('AlertController', () => {
  let controller: AlertController;
  let mockAlertService: MockedAlertService;

  const mockRequest = {
    user: {
      id: 'user-123',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    },
  };

  const mockSetting = {
    id: 'setting-1',
    tenantId: 'tenant-123',
    productId: 'prod-1',
    minimumLevel: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    unit: 'db',
    isActive: true,
    createdAt: new Date(),
  };

  const mockAlert = {
    id: 'alert-1',
    tenantId: 'tenant-123',
    productId: 'prod-1',
    type: 'LOW_STOCK' as const,
    priority: 'HIGH' as const,
    status: 'ACTIVE' as const,
    currentQuantity: 5,
    minimumLevel: 10,
    deficit: 5,
    unit: 'db',
    message: 'Alacsony készletszint!',
    createdAt: new Date(),
  };

  const mockSummary = {
    totalActive: 10,
    criticalCount: 2,
    highCount: 3,
    mediumCount: 3,
    lowCount: 2,
    byType: {
      LOW_STOCK: 5,
      OUT_OF_STOCK: 2,
      OVERSTOCK: 1,
      EXPIRING_SOON: 1,
      WARRANTY_EXPIRING: 1,
    },
    byWarehouse: [],
  };

  beforeEach(() => {
    mockAlertService = {
      queryStockLevelSettings: vi.fn(),
      findSettingById: vi.fn(),
      findSettingByProduct: vi.fn(),
      createStockLevelSetting: vi.fn(),
      updateStockLevelSetting: vi.fn(),
      deleteStockLevelSetting: vi.fn(),
      queryAlerts: vi.fn(),
      findAlertById: vi.fn(),
      getAlertSummary: vi.fn(),
      acknowledgeAlert: vi.fn(),
      snoozeAlert: vi.fn(),
      resolveAlert: vi.fn(),
      resolveAlertsByProduct: vi.fn(),
      bulkCheckStockLevels: vi.fn(),
    } as unknown as MockedAlertService;

    // Direct instantiation with mock service
    controller = new AlertController(mockAlertService as unknown as AlertService);
  });

  // ============================================
  // STOCK LEVEL SETTINGS
  // ============================================

  describe('listSettings', () => {
    it('should return list of stock level settings', async () => {
      const queryResult = {
        items: [mockSetting],
        total: 1,
      };
      mockAlertService.queryStockLevelSettings.mockResolvedValue(queryResult);

      const result = await controller.listSettings(mockRequest);

      expect(result).toEqual({ data: queryResult });
      expect(mockAlertService.queryStockLevelSettings).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
      });
    });

    it('should pass filter parameters', async () => {
      const queryResult = { items: [], total: 0 };
      mockAlertService.queryStockLevelSettings.mockResolvedValue(queryResult);

      await controller.listSettings(mockRequest, 'prod-1', 'wh-1', 'true', '0', '50');

      expect(mockAlertService.queryStockLevelSettings).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        productId: 'prod-1',
        warehouseId: 'wh-1',
        isActive: true,
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('getSettingById', () => {
    it('should return setting by ID', async () => {
      mockAlertService.findSettingById.mockResolvedValue(mockSetting);

      const result = await controller.getSettingById(mockRequest, 'setting-1');

      expect(result).toEqual({ data: mockSetting });
    });

    it('should return error if not found', async () => {
      mockAlertService.findSettingById.mockResolvedValue(null);

      const result = await controller.getSettingById(mockRequest, 'invalid');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Készlet szint beállítás nem található' },
      });
    });
  });

  describe('getSettingByProduct', () => {
    it('should return setting by product', async () => {
      mockAlertService.findSettingByProduct.mockResolvedValue(mockSetting);

      const result = await controller.getSettingByProduct(mockRequest, 'prod-1');

      expect(result).toEqual({ data: mockSetting });
      expect(mockAlertService.findSettingByProduct).toHaveBeenCalledWith(
        'prod-1',
        'tenant-123',
        undefined
      );
    });

    it('should pass warehouse ID', async () => {
      mockAlertService.findSettingByProduct.mockResolvedValue(mockSetting);

      await controller.getSettingByProduct(mockRequest, 'prod-1', 'wh-1');

      expect(mockAlertService.findSettingByProduct).toHaveBeenCalledWith(
        'prod-1',
        'tenant-123',
        'wh-1'
      );
    });
  });

  describe('createSetting', () => {
    it('should create stock level setting', async () => {
      mockAlertService.createStockLevelSetting.mockResolvedValue(mockSetting);

      const input = {
        productId: 'prod-1',
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        unit: 'db',
        isActive: true,
      };
      const result = await controller.createSetting(mockRequest, input);

      expect(result).toEqual({ data: mockSetting });
      expect(mockAlertService.createStockLevelSetting).toHaveBeenCalledWith('tenant-123', input);
    });

    it('should return error on duplicate', async () => {
      mockAlertService.createStockLevelSetting.mockRejectedValue(
        new Error('A termékhez már létezik készletszint beállítás')
      );

      const input = {
        productId: 'prod-1',
        minimumLevel: 10,
        reorderPoint: 20,
        reorderQuantity: 50,
        unit: 'db',
        isActive: true,
      };
      const result = await controller.createSetting(mockRequest, input);

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A termékhez már létezik készletszint beállítás',
        },
      });
    });
  });

  describe('updateSetting', () => {
    it('should update setting', async () => {
      const updated = { ...mockSetting, minimumLevel: 15 };
      mockAlertService.updateStockLevelSetting.mockResolvedValue(updated);

      const result = await controller.updateSetting(mockRequest, 'setting-1', {
        minimumLevel: 15,
      });

      expect(result).toEqual({ data: updated });
    });

    it('should return NOT_FOUND error', async () => {
      mockAlertService.updateStockLevelSetting.mockRejectedValue(
        new Error('Készletszint beállítás nem található')
      );

      const result = await controller.updateSetting(mockRequest, 'invalid', {
        minimumLevel: 15,
      });

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Készletszint beállítás nem található' },
      });
    });
  });

  describe('deleteSetting', () => {
    it('should delete setting', async () => {
      mockAlertService.deleteStockLevelSetting.mockResolvedValue(undefined);

      const result = await controller.deleteSetting(mockRequest, 'setting-1');

      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // ALERTS
  // ============================================

  describe('listAlerts', () => {
    it('should return list of alerts', async () => {
      const queryResult = {
        alerts: [mockAlert],
        total: 1,
        offset: 0,
        limit: 20,
      };
      mockAlertService.queryAlerts.mockResolvedValue(queryResult);

      const result = await controller.listAlerts(mockRequest);

      expect(result).toEqual({ data: queryResult });
    });

    it('should pass filter parameters', async () => {
      const queryResult = { alerts: [], total: 0, offset: 0, limit: 20 };
      mockAlertService.queryAlerts.mockResolvedValue(queryResult);

      await controller.listAlerts(
        mockRequest,
        'prod-1',
        'wh-1',
        'LOW_STOCK',
        'HIGH',
        'ACTIVE',
        '2026-01-01',
        '2026-01-31',
        'priority',
        'desc',
        '0',
        '50'
      );

      expect(mockAlertService.queryAlerts).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        productId: 'prod-1',
        warehouseId: 'wh-1',
        type: 'LOW_STOCK',
        priority: 'HIGH',
        status: 'ACTIVE',
        createdAfter: new Date('2026-01-01'),
        createdBefore: new Date('2026-01-31'),
        sortBy: 'priority',
        sortOrder: 'desc',
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('getSummary', () => {
    it('should return alert summary', async () => {
      mockAlertService.getAlertSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockRequest);

      expect(result).toEqual({ data: mockSummary });
    });
  });

  describe('findAlertById', () => {
    it('should return alert by ID', async () => {
      mockAlertService.findAlertById.mockResolvedValue(mockAlert);

      const result = await controller.findAlertById(mockRequest, 'alert-1');

      expect(result).toEqual({ data: mockAlert });
    });

    it('should return error if not found', async () => {
      mockAlertService.findAlertById.mockResolvedValue(null);

      const result = await controller.findAlertById(mockRequest, 'invalid');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Alert nem található' },
      });
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge alert', async () => {
      const acknowledged = { ...mockAlert, status: 'ACKNOWLEDGED' as const };
      mockAlertService.acknowledgeAlert.mockResolvedValue(acknowledged);

      const result = await controller.acknowledge(mockRequest, 'alert-1');

      expect(result).toEqual({ data: acknowledged });
      expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(
        'alert-1',
        'tenant-123',
        'user-123',
        undefined
      );
    });

    it('should pass note', async () => {
      const acknowledged = { ...mockAlert, status: 'ACKNOWLEDGED' as const };
      mockAlertService.acknowledgeAlert.mockResolvedValue(acknowledged);

      await controller.acknowledge(mockRequest, 'alert-1', { note: 'Láttam' });

      expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(
        'alert-1',
        'tenant-123',
        'user-123',
        'Láttam'
      );
    });

    it('should return NOT_FOUND error', async () => {
      mockAlertService.acknowledgeAlert.mockRejectedValue(new Error('Alert nem található'));

      const result = await controller.acknowledge(mockRequest, 'invalid');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Alert nem található' },
      });
    });
  });

  describe('snooze', () => {
    it('should snooze alert', async () => {
      const snoozed = { ...mockAlert, status: 'SNOOZED' as const };
      mockAlertService.snoozeAlert.mockResolvedValue(snoozed);

      const result = await controller.snooze(mockRequest, 'alert-1', {
        snoozeDays: 7,
      });

      expect(result).toEqual({ data: snoozed });
      expect(mockAlertService.snoozeAlert).toHaveBeenCalledWith(
        'alert-1',
        'tenant-123',
        7,
        undefined
      );
    });

    it('should pass note', async () => {
      const snoozed = { ...mockAlert, status: 'SNOOZED' as const };
      mockAlertService.snoozeAlert.mockResolvedValue(snoozed);

      await controller.snooze(mockRequest, 'alert-1', {
        snoozeDays: 7,
        note: 'Egy hét múlva',
      });

      expect(mockAlertService.snoozeAlert).toHaveBeenCalledWith(
        'alert-1',
        'tenant-123',
        7,
        'Egy hét múlva'
      );
    });
  });

  describe('resolve', () => {
    it('should resolve alert', async () => {
      const resolved = { ...mockAlert, status: 'RESOLVED' as const };
      mockAlertService.resolveAlert.mockResolvedValue(resolved);

      const result = await controller.resolve(mockRequest, 'alert-1');

      expect(result).toEqual({ data: resolved });
      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-1',
        'tenant-123',
        undefined
      );
    });
  });

  describe('resolveByProduct', () => {
    it('should resolve all alerts for product', async () => {
      mockAlertService.resolveAlertsByProduct.mockResolvedValue(3);

      const result = await controller.resolveByProduct(mockRequest, 'prod-1');

      expect(result).toEqual({ data: { resolvedCount: 3 } });
      expect(mockAlertService.resolveAlertsByProduct).toHaveBeenCalledWith(
        'prod-1',
        'tenant-123',
        undefined
      );
    });

    it('should pass warehouse ID', async () => {
      mockAlertService.resolveAlertsByProduct.mockResolvedValue(2);

      await controller.resolveByProduct(mockRequest, 'prod-1', 'wh-1');

      expect(mockAlertService.resolveAlertsByProduct).toHaveBeenCalledWith(
        'prod-1',
        'tenant-123',
        'wh-1'
      );
    });
  });

  describe('bulkCheckStockLevels', () => {
    it('should bulk check stock levels', async () => {
      const checkResult = {
        checked: 5,
        alertsCreated: 2,
        results: [],
      };
      mockAlertService.bulkCheckStockLevels.mockResolvedValue(checkResult);

      const result = await controller.bulkCheckStockLevels(mockRequest, {
        createAlerts: true,
      });

      expect(result).toEqual({ data: checkResult });
    });

    it('should pass product IDs and warehouse', async () => {
      const checkResult = { checked: 1, alertsCreated: 0, results: [] };
      mockAlertService.bulkCheckStockLevels.mockResolvedValue(checkResult);

      await controller.bulkCheckStockLevels(mockRequest, {
        productIds: ['prod-1', 'prod-2'],
        warehouseId: 'wh-1',
        createAlerts: false,
      });

      expect(mockAlertService.bulkCheckStockLevels).toHaveBeenCalledWith('tenant-123', {
        productIds: ['prod-1', 'prod-2'],
        warehouseId: 'wh-1',
        createAlerts: false,
      });
    });
  });
});
