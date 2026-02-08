import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AdminPermissionsController } from '../admin-permissions.controller';
import { AdminPermissionsService } from '../admin-permissions.service';
import { WidgetRoleEnum } from '../dto/admin-permissions.dto';

/**
 * Unit tests for AdminPermissionsController (Story 45-1)
 *
 * Direct instantiation tests (no NestJS Test module overhead)
 * The controller is tested without guards since we focus on business logic
 */
describe('AdminPermissionsController', () => {
  let controller: AdminPermissionsController;
  let mockService: {
    getAdminPermissions: Mock;
    updatePermissions: Mock;
    resetToDefaults: Mock;
  };

  const mockRequest = {
    user: {
      id: 'test-user-uuid',
      tenantId: 'test-tenant-uuid',
      roles: ['ROLE_ADMIN'],
    },
  };

  beforeEach(() => {
    mockService = {
      getAdminPermissions: vi.fn(),
      updatePermissions: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    // Direct instantiation - bypasses guard decorators
    controller = new AdminPermissionsController(mockService as unknown as AdminPermissionsService);
  });

  describe('getAdminPermissions', () => {
    it('should return widget permissions matrix', async () => {
      const mockResponse = {
        widgets: [
          {
            id: 'revenue-kpi',
            name: 'Bevétel KPI',
            category: 'finance',
            roles: { OPERATOR: false, STORE_MANAGER: true, ADMIN: true },
          },
        ],
      };
      mockService.getAdminPermissions.mockResolvedValue(mockResponse);

      const result = await controller.getAdminPermissions(mockRequest);

      expect(result.data).toEqual(mockResponse);
      expect(mockService.getAdminPermissions).toHaveBeenCalledWith('test-tenant-uuid');
    });

    it('should use default tenant when user has no tenantId', async () => {
      mockService.getAdminPermissions.mockResolvedValue({ widgets: [] });

      await controller.getAdminPermissions({ user: {} });

      expect(mockService.getAdminPermissions).toHaveBeenCalledWith('default-tenant');
    });
  });

  describe('updatePermissions', () => {
    it('should update permissions and return success', async () => {
      const mockResponse = {
        success: true,
        updatedCount: 2,
        message: '2 jogosultság sikeresen mentve',
      };
      mockService.updatePermissions.mockResolvedValue(mockResponse);

      const updateDto = {
        permissions: [
          { widgetId: 'revenue-kpi', role: WidgetRoleEnum.OPERATOR, enabled: true },
          { widgetId: 'stock-summary', role: WidgetRoleEnum.STORE_MANAGER, enabled: false },
        ],
      };

      const result = await controller.updatePermissions(mockRequest, updateDto);

      expect(result.data).toEqual(mockResponse);
      expect(mockService.updatePermissions).toHaveBeenCalledWith(
        'test-tenant-uuid',
        'test-user-uuid',
        updateDto.permissions
      );
    });

    it('should use default values when user context missing', async () => {
      mockService.updatePermissions.mockResolvedValue({
        success: true,
        updatedCount: 1,
        message: '1 jogosultság sikeresen mentve',
      });

      const updateDto = {
        permissions: [{ widgetId: 'revenue-kpi', role: WidgetRoleEnum.OPERATOR, enabled: true }],
      };

      await controller.updatePermissions({ user: {} }, updateDto);

      expect(mockService.updatePermissions).toHaveBeenCalledWith(
        'default-tenant',
        'system',
        updateDto.permissions
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset permissions and return success', async () => {
      const mockResponse = {
        success: true,
        updatedCount: 5,
        message: 'Jogosultságok visszaállítva az alapértelmezettekre',
      };
      mockService.resetToDefaults.mockResolvedValue(mockResponse);

      const result = await controller.resetToDefaults(mockRequest);

      expect(result.data).toEqual(mockResponse);
      expect(mockService.resetToDefaults).toHaveBeenCalledWith(
        'test-tenant-uuid',
        'test-user-uuid'
      );
    });
  });
});
