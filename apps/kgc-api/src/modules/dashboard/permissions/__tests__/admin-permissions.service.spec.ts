import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AdminPermissionsService } from '../admin-permissions.service';
import { WidgetRoleEnum } from '../dto/admin-permissions.dto';

/**
 * Unit tests for AdminPermissionsService (Story 45-1)
 */
describe('AdminPermissionsService', () => {
  let service: AdminPermissionsService;
  let mockPrismaClient: {
    dashboardWidgetPermission: {
      findMany: Mock;
      deleteMany: Mock;
      createMany: Mock;
    };
    $transaction: Mock;
  };

  const testTenantId = 'test-tenant-uuid';
  const testUserId = 'test-user-uuid';

  beforeEach(async () => {
    mockPrismaClient = {
      dashboardWidgetPermission: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    // Setup $transaction to execute the callback
    mockPrismaClient.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrismaClient) => Promise<unknown>) => {
        return callback(mockPrismaClient);
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPermissionsService,
        {
          provide: 'PRISMA_CLIENT',
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<AdminPermissionsService>(AdminPermissionsService);
  });

  describe('getAdminPermissions', () => {
    it('should return all widgets with default permissions when no db overrides', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([]);

      const result = await service.getAdminPermissions(testTenantId);

      expect(result.widgets).toBeDefined();
      expect(result.widgets.length).toBeGreaterThan(0);

      // Check that finance widgets have correct default permissions
      const revenueKpi = result.widgets.find(w => w.id === 'revenue-kpi');
      expect(revenueKpi).toBeDefined();
      expect(revenueKpi?.roles.OPERATOR).toBe(false);
      expect(revenueKpi?.roles.STORE_MANAGER).toBe(true);
      expect(revenueKpi?.roles.ADMIN).toBe(true); // ADMIN always true
    });

    it('should merge database permissions with defaults', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([
        { widgetId: 'revenue-kpi', role: 'OPERATOR', enabled: true },
      ]);

      const result = await service.getAdminPermissions(testTenantId);

      const revenueKpi = result.widgets.find(w => w.id === 'revenue-kpi');
      expect(revenueKpi?.roles.OPERATOR).toBe(true); // Overridden from DB
      expect(revenueKpi?.roles.STORE_MANAGER).toBe(true); // Default
    });

    it('should always set ADMIN role to true regardless of db value', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([
        { widgetId: 'revenue-kpi', role: 'ADMIN', enabled: false },
      ]);

      const result = await service.getAdminPermissions(testTenantId);

      const revenueKpi = result.widgets.find(w => w.id === 'revenue-kpi');
      expect(revenueKpi?.roles.ADMIN).toBe(true); // Always true per story requirement
    });

    it('should include all widget categories', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([]);

      const result = await service.getAdminPermissions(testTenantId);

      const categories = [...new Set(result.widgets.map(w => w.category))];
      expect(categories).toContain('finance');
      expect(categories).toContain('inventory');
      expect(categories).toContain('service');
      expect(categories).toContain('partner');
    });
  });

  describe('updatePermissions', () => {
    it('should update permissions using batch transaction and return success', async () => {
      mockPrismaClient.dashboardWidgetPermission.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.dashboardWidgetPermission.createMany.mockResolvedValue({ count: 2 });

      const updates = [
        { widgetId: 'revenue-kpi', role: WidgetRoleEnum.OPERATOR, enabled: true },
        { widgetId: 'stock-summary', role: WidgetRoleEnum.STORE_MANAGER, enabled: false },
      ];

      const result = await service.updatePermissions(testTenantId, testUserId, updates);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should skip ADMIN role updates', async () => {
      mockPrismaClient.dashboardWidgetPermission.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.dashboardWidgetPermission.createMany.mockResolvedValue({ count: 1 });

      const updates = [
        { widgetId: 'revenue-kpi', role: WidgetRoleEnum.ADMIN, enabled: false },
        { widgetId: 'stock-summary', role: WidgetRoleEnum.OPERATOR, enabled: true },
      ];

      const result = await service.updatePermissions(testTenantId, testUserId, updates);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1); // Only OPERATOR was updated
    });

    it('should return zero count when only ADMIN role updates', async () => {
      const updates = [{ widgetId: 'revenue-kpi', role: WidgetRoleEnum.ADMIN, enabled: false }];

      const result = await service.updatePermissions(testTenantId, testUserId, updates);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should reject invalid widget IDs', async () => {
      const updates = [
        { widgetId: 'invalid-widget-id', role: WidgetRoleEnum.OPERATOR, enabled: true },
      ];

      await expect(service.updatePermissions(testTenantId, testUserId, updates)).rejects.toThrow(
        'Érvénytelen widget azonosítók'
      );
    });

    it('should call batch operations in transaction', async () => {
      mockPrismaClient.dashboardWidgetPermission.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.dashboardWidgetPermission.createMany.mockResolvedValue({ count: 1 });

      await service.updatePermissions(testTenantId, testUserId, [
        { widgetId: 'revenue-kpi', role: WidgetRoleEnum.OPERATOR, enabled: true },
      ]);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockPrismaClient.dashboardWidgetPermission.deleteMany).toHaveBeenCalled();
      expect(mockPrismaClient.dashboardWidgetPermission.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantId: testTenantId,
            widgetId: 'revenue-kpi',
            role: 'OPERATOR',
            enabled: true,
            updatedBy: testUserId,
          }),
        ]),
      });
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return all widgets for ADMIN role', async () => {
      const result = await service.getPermissionsForRole(testTenantId, WidgetRoleEnum.ADMIN);

      const catalog = service.getWidgetCatalog();
      expect(result.length).toBe(catalog.length);
    });

    it('should return only default widgets for OPERATOR when no db overrides', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionsForRole(testTenantId, WidgetRoleEnum.OPERATOR);

      // Default OPERATOR widgets: welcome-card, empty-state, stock-summary, stock-utilization, stock-alerts, notification-panel
      expect(result).toContain('stock-summary');
      expect(result).toContain('notification-panel');
      expect(result).not.toContain('revenue-kpi'); // Not in OPERATOR defaults
    });

    it('should apply db overrides for non-ADMIN roles', async () => {
      mockPrismaClient.dashboardWidgetPermission.findMany.mockResolvedValue([
        { widgetId: 'revenue-kpi', enabled: true },
      ]);

      const result = await service.getPermissionsForRole(testTenantId, WidgetRoleEnum.OPERATOR);

      expect(result).toContain('revenue-kpi'); // Added via db override
    });
  });

  describe('resetToDefaults', () => {
    it('should delete all custom permissions for tenant', async () => {
      mockPrismaClient.dashboardWidgetPermission.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.resetToDefaults(testTenantId, testUserId);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(5);
      expect(mockPrismaClient.dashboardWidgetPermission.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: testTenantId },
      });
    });
  });

  describe('isValidWidgetId', () => {
    it('should return true for valid widget IDs', () => {
      expect(service.isValidWidgetId('revenue-kpi')).toBe(true);
      expect(service.isValidWidgetId('stock-summary')).toBe(true);
      expect(service.isValidWidgetId('notification-panel')).toBe(true);
    });

    it('should return false for invalid widget IDs', () => {
      expect(service.isValidWidgetId('non-existent')).toBe(false);
      expect(service.isValidWidgetId('')).toBe(false);
      expect(service.isValidWidgetId('REVENUE-KPI')).toBe(false); // Case sensitive
    });
  });

  describe('getWidgetCatalog', () => {
    it('should return a copy of widget catalog', () => {
      const catalog1 = service.getWidgetCatalog();
      const catalog2 = service.getWidgetCatalog();

      expect(catalog1).toEqual(catalog2);
      expect(catalog1).not.toBe(catalog2); // Different array instances
    });

    it('should include required widget properties', () => {
      const catalog = service.getWidgetCatalog();

      for (const widget of catalog) {
        expect(widget.id).toBeDefined();
        expect(widget.name).toBeDefined();
        expect(widget.category).toBeDefined();
        expect(widget.defaultRoles).toBeDefined();
        expect(Array.isArray(widget.defaultRoles)).toBe(true);
      }
    });
  });
});
