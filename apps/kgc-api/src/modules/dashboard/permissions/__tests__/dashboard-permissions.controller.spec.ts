import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPermissionsController } from '../dashboard-permissions.controller';
import { DashboardPermissionsService } from '../dashboard-permissions.service';
import type { DashboardPermissionsResponseDto } from '../dto/dashboard-permissions.dto';

/**
 * Dashboard Permissions Controller Tests (Story 35-8)
 *
 * Unit tests for the permissions endpoint
 * Priority: P1 (High - PR to main)
 */
describe('DashboardPermissionsController', () => {
  let controller: DashboardPermissionsController;
  let mockService: {
    getPermissions: ReturnType<typeof vi.fn>;
  };

  const mockPermissionsResponse: DashboardPermissionsResponseDto = {
    widgets: [
      {
        widgetId: 'EXEC_HEALTH',
        permissionCode: 'dashboard.exec.health',
        accessLevel: 'FULL',
        sectionId: 'executive',
        name: 'Uzleti Egeszseg',
      },
    ],
    sections: [
      {
        sectionId: 'executive',
        isVisible: true,
        visibleWidgetCount: 1,
        name: 'Osszegzes',
      },
    ],
    preset: {
      roleCode: 'ROLE_ADMIN',
      expandedSections: ['finance', 'inventory'],
      pinnedWidgets: ['EXEC_HEALTH', 'EXEC_ALERTS'],
      defaultRefreshInterval: 60,
    },
    totalWidgets: 1,
    roles: ['ROLE_ADMIN'],
  };

  beforeEach(() => {
    // Create mock service with vi.fn() methods
    mockService = {
      getPermissions: vi.fn().mockResolvedValue(mockPermissionsResponse),
    };

    // Direct instantiation - no NestJS TestingModule needed
    controller = new DashboardPermissionsController(
      mockService as unknown as DashboardPermissionsService
    );
  });

  describe('GET /dashboard/permissions', () => {
    it('[P1] should return permissions wrapped in data object', async () => {
      // GIVEN: Request with user roles
      const req = {
        user: {
          id: 'user-1',
          roles: ['ROLE_ADMIN'],
        },
      };

      // WHEN: Getting permissions
      const result = await controller.getPermissions(req);

      // THEN: Should return data wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockPermissionsResponse);
    });

    it('[P1] should call service with user roles', async () => {
      // GIVEN: Request with specific roles
      const req = {
        user: {
          id: 'user-1',
          roles: ['ROLE_STOCK', 'ROLE_TECHNICIAN'],
        },
      };

      // WHEN: Getting permissions
      await controller.getPermissions(req);

      // THEN: Service should be called with those roles
      expect(mockService.getPermissions).toHaveBeenCalledWith(['ROLE_STOCK', 'ROLE_TECHNICIAN']);
    });

    it('[P1] should use default role when user has no roles', async () => {
      // GIVEN: Request with no roles
      const req = {
        user: {
          id: 'user-1',
          roles: [],
        },
      };

      // WHEN: Getting permissions
      await controller.getPermissions(req);

      // THEN: Service should be called with default role
      expect(mockService.getPermissions).toHaveBeenCalledWith(['ROLE_FRANCHISE_EMP']);
    });

    it('[P1] should use default role when user is undefined', async () => {
      // GIVEN: Request with no user
      const req = {};

      // WHEN: Getting permissions
      await controller.getPermissions(req);

      // THEN: Service should be called with default role
      expect(mockService.getPermissions).toHaveBeenCalledWith(['ROLE_FRANCHISE_EMP']);
    });

    it('[P1] should use default role when roles is undefined', async () => {
      // GIVEN: Request with user but no roles property
      const req = {
        user: {
          id: 'user-1',
        },
      };

      // WHEN: Getting permissions
      await controller.getPermissions(req);

      // THEN: Service should be called with default role
      expect(mockService.getPermissions).toHaveBeenCalledWith(['ROLE_FRANCHISE_EMP']);
    });

    it('[P2] should pass through service response unchanged', async () => {
      // GIVEN: Service returns specific response
      const expectedResponse: DashboardPermissionsResponseDto = {
        ...mockPermissionsResponse,
        totalWidgets: 8,
        roles: ['ROLE_STOCK'],
      };
      mockService.getPermissions.mockResolvedValue(expectedResponse);

      const req = {
        user: {
          roles: ['ROLE_STOCK'],
        },
      };

      // WHEN: Getting permissions
      const result = await controller.getPermissions(req);

      // THEN: Response should match service response
      expect(result.data).toEqual(expectedResponse);
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Request with user roles
      const req = {
        user: {
          roles: ['ROLE_ADMIN'],
        },
      };

      // WHEN: Getting permissions
      const result = await controller.getPermissions(req);

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('widgets');
      expect(result.data).toHaveProperty('sections');
      expect(result.data).toHaveProperty('preset');
      expect(result.data).toHaveProperty('totalWidgets');
      expect(result.data).toHaveProperty('roles');
    });
  });
});
