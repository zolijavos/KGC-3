/**
 * Dashboard Controller Tests
 * Epic 27: Story 27-1 - Dashboard Widgetek
 *
 * Test-Each-Action: Minden endpoint tesztelése
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardController } from '../controllers/dashboard.controller';

// ============================================
// Mock Types
// ============================================

enum WidgetType {
  COUNTER = 'COUNTER',
  CHART = 'CHART',
  TABLE = 'TABLE',
}

interface IWidgetConfig {
  id: string;
  tenantId: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  refreshInterval?: number;
  position: { row: number; col: number; width: number; height: number };
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface IWidgetData {
  widgetId: string;
  type: WidgetType;
  data: unknown;
  generatedAt: Date;
  cacheExpiresAt: Date;
}

// ============================================
// Mock Services
// ============================================

const mockDashboardWidgetService = {
  getDashboard: vi.fn(),
  getWidgetById: vi.fn(),
  createWidget: vi.fn(),
  updateWidget: vi.fn(),
  deleteWidget: vi.fn(),
  getWidgetData: vi.fn(),
};

// ============================================
// Test Suite
// ============================================

describe('DashboardController', () => {
  let controller: DashboardController;

  const testTenantId = 'tenant-001';
  const testUserId = 'user-001';

  const mockWidget: IWidgetConfig = {
    id: 'widget-001',
    tenantId: testTenantId,
    type: WidgetType.COUNTER,
    title: 'Napi bevétel',
    dataSource: 'revenue.daily',
    refreshInterval: 60,
    position: { row: 0, col: 0, width: 3, height: 2 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWidgetData: IWidgetData = {
    widgetId: 'widget-001',
    type: WidgetType.COUNTER,
    data: { value: 450000, previousValue: 420000 },
    generatedAt: new Date(),
    cacheExpiresAt: new Date(Date.now() + 60000),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new DashboardController(mockDashboardWidgetService as any);
  });

  // ============================================
  // GET /dashboard - Get all widgets
  // ============================================

  describe('GET /dashboard', () => {
    it('should return widgets for tenant', async () => {
      mockDashboardWidgetService.getDashboard.mockResolvedValue([mockWidget]);

      const result = await controller.getDashboard(testTenantId);

      expect(mockDashboardWidgetService.getDashboard).toHaveBeenCalledWith(testTenantId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('widget-001');
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getDashboard('')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array for tenant with no widgets', async () => {
      mockDashboardWidgetService.getDashboard.mockResolvedValue([]);

      const result = await controller.getDashboard(testTenantId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // POST /dashboard/widgets - Create widget
  // ============================================

  describe('POST /dashboard/widgets', () => {
    const createInput = {
      type: 'COUNTER' as const,
      title: 'Aktív bérlések',
      dataSource: 'rentals.active.count',
      position: { row: 0, col: 3, width: 3, height: 2 },
    };

    it('should create new widget', async () => {
      const newWidget = { ...mockWidget, id: 'widget-002', title: 'Aktív bérlések' };
      mockDashboardWidgetService.createWidget.mockResolvedValue(newWidget);

      const result = await controller.createWidget(createInput, testTenantId, testUserId);

      expect(mockDashboardWidgetService.createWidget).toHaveBeenCalledWith(
        createInput,
        testTenantId,
        testUserId
      );
      expect(result.title).toBe('Aktív bérlések');
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.createWidget(createInput, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.createWidget(createInput, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for position overlap', async () => {
      mockDashboardWidgetService.createWidget.mockRejectedValue(
        new Error('Widget position overlap detected')
      );

      await expect(controller.createWidget(createInput, testTenantId, testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for validation errors', async () => {
      mockDashboardWidgetService.createWidget.mockRejectedValue(
        new Error('Validation failed: title is required')
      );

      await expect(controller.createWidget(createInput, testTenantId, testUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // PATCH /dashboard/widgets/:id - Update widget
  // ============================================

  describe('PATCH /dashboard/widgets/:id', () => {
    const updateInput = {
      title: 'Módosított cím',
      refreshInterval: 120,
    };

    it('should update widget', async () => {
      const updatedWidget = { ...mockWidget, ...updateInput };
      mockDashboardWidgetService.updateWidget.mockResolvedValue(updatedWidget);

      const result = await controller.updateWidget(
        'widget-001',
        updateInput,
        testTenantId,
        testUserId
      );

      expect(mockDashboardWidgetService.updateWidget).toHaveBeenCalledWith(
        'widget-001',
        updateInput,
        testTenantId,
        testUserId
      );
      expect(result.title).toBe('Módosított cím');
      expect(result.refreshInterval).toBe(120);
    });

    it('should throw NotFoundException for non-existent widget', async () => {
      mockDashboardWidgetService.updateWidget.mockRejectedValue(new Error('Widget not found'));

      await expect(
        controller.updateWidget('invalid-id', updateInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for access denied', async () => {
      mockDashboardWidgetService.updateWidget.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.updateWidget('widget-001', updateInput, testTenantId, testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(
        controller.updateWidget('widget-001', updateInput, '', testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for position overlap', async () => {
      mockDashboardWidgetService.updateWidget.mockRejectedValue(
        new Error('Widget position overlap detected')
      );

      await expect(
        controller.updateWidget('widget-001', updateInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // DELETE /dashboard/widgets/:id - Delete widget
  // ============================================

  describe('DELETE /dashboard/widgets/:id', () => {
    it('should delete widget', async () => {
      mockDashboardWidgetService.deleteWidget.mockResolvedValue(undefined);

      // deleteWidget returns void, no result expected
      await controller.deleteWidget('widget-001', testTenantId, testUserId);

      expect(mockDashboardWidgetService.deleteWidget).toHaveBeenCalledWith(
        'widget-001',
        testTenantId,
        testUserId
      );
    });

    it('should throw NotFoundException for non-existent widget', async () => {
      mockDashboardWidgetService.deleteWidget.mockRejectedValue(new Error('Widget not found'));

      await expect(controller.deleteWidget('invalid-id', testTenantId, testUserId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException for access denied', async () => {
      mockDashboardWidgetService.deleteWidget.mockRejectedValue(new Error('Access denied'));

      await expect(controller.deleteWidget('widget-001', testTenantId, testUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.deleteWidget('widget-001', '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.deleteWidget('widget-001', testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // GET /dashboard/widgets/:id/data - Get widget data
  // ============================================

  describe('GET /dashboard/widgets/:id/data', () => {
    it('should return widget data', async () => {
      mockDashboardWidgetService.getWidgetData.mockResolvedValue(mockWidgetData);

      const result = await controller.getWidgetData('widget-001', testTenantId);

      expect(mockDashboardWidgetService.getWidgetData).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: 'widget-001',
          dateRange: 'THIS_MONTH',
        }),
        testTenantId
      );
      expect(result.widgetId).toBe('widget-001');
      expect(result.data).toEqual({ value: 450000, previousValue: 420000 });
    });

    it('should throw NotFoundException for non-existent widget', async () => {
      mockDashboardWidgetService.getWidgetData.mockRejectedValue(new Error('Widget not found'));

      await expect(controller.getWidgetData('invalid-id', testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException for access denied', async () => {
      mockDashboardWidgetService.getWidgetData.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getWidgetData('widget-001', testTenantId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getWidgetData('widget-001', '')).rejects.toThrow(BadRequestException);
    });

    it('should use custom date range when provided', async () => {
      mockDashboardWidgetService.getWidgetData.mockResolvedValue(mockWidgetData);
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await controller.getWidgetData('widget-001', testTenantId, undefined, startDate, endDate);

      expect(mockDashboardWidgetService.getWidgetData).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: 'widget-001',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }),
        testTenantId
      );
    });

    it('should use preset date range when provided', async () => {
      mockDashboardWidgetService.getWidgetData.mockResolvedValue(mockWidgetData);

      await controller.getWidgetData('widget-001', testTenantId, 'THIS_WEEK');

      expect(mockDashboardWidgetService.getWidgetData).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: 'widget-001',
          dateRange: 'THIS_WEEK',
        }),
        testTenantId
      );
    });
  });
});
