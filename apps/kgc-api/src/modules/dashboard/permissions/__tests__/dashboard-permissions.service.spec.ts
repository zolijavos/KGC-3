import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DashboardPermissionsService } from '../dashboard-permissions.service';
import type { DashboardSection, RoleCode, WidgetId } from '../dto/dashboard-permissions.dto';

/**
 * Dashboard Permissions Service Tests (Story 35-8)
 *
 * Unit tests for RBAC-based dashboard widget permissions
 * Based on RBAC Widget Spec (dashboard-rbac-widget-spec.md)
 *
 * Test Categories:
 * 1. Role-based widget access
 * 2. Multi-role permission union
 * 3. Section visibility calculation
 * 4. Widget count verification (per RBAC spec)
 * 5. Preset configuration
 */
describe('DashboardPermissionsService', () => {
  let service: DashboardPermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardPermissionsService],
    }).compile();

    service = module.get<DashboardPermissionsService>(DashboardPermissionsService);
  });

  describe('getWidgetAccessForRole', () => {
    it('[P1] should return FULL access for ADMIN on all widgets', () => {
      // GIVEN: Admin role and various widgets
      const testWidgets: WidgetId[] = [
        'EXEC_HEALTH',
        'FIN_GROSS_REV',
        'INV_SUMMARY',
        'SVC_WORKSHEETS',
      ];

      // WHEN: Getting access for each widget
      // THEN: All should return FULL
      testWidgets.forEach(widgetId => {
        expect(service.getWidgetAccessForRole(widgetId, 'ROLE_ADMIN')).toBe('FULL');
      });
    });

    it('[P1] should return NONE for RAKTAROS on finance widgets', () => {
      // GIVEN: Raktaros role and finance widgets
      const financeWidgets: WidgetId[] = [
        'FIN_GROSS_REV',
        'FIN_NET_REV',
        'FIN_RECEIVABLES',
        'FIN_PAYMENTS',
        'FIN_AGING',
      ];

      // WHEN: Getting access for finance widgets
      // THEN: All should return NONE
      financeWidgets.forEach(widgetId => {
        expect(service.getWidgetAccessForRole(widgetId, 'ROLE_STOCK')).toBe('NONE');
      });
    });

    it('[P1] should return FULL for RAKTAROS on inventory widgets', () => {
      // GIVEN: Raktaros role and inventory widgets
      const inventoryWidgets: WidgetId[] = [
        'INV_SUMMARY',
        'INV_UTILIZATION',
        'INV_ALERTS',
        'INV_MOVEMENT',
        'INV_HEATMAP',
      ];

      // WHEN: Getting access for inventory widgets
      // THEN: All should return FULL
      inventoryWidgets.forEach(widgetId => {
        expect(service.getWidgetAccessForRole(widgetId, 'ROLE_STOCK')).toBe('FULL');
      });
    });

    it('[P1] should return FULL for SZERELO on service worksheets', () => {
      // GIVEN: Szerelo role and worksheet widget
      const widgetId: WidgetId = 'SVC_WORKSHEETS';

      // WHEN: Getting access
      const access = service.getWidgetAccessForRole(widgetId, 'ROLE_TECHNICIAN');

      // THEN: Should return FULL
      expect(access).toBe('FULL');
    });

    it('[P1] should return READ for SZERELO on workload widget', () => {
      // GIVEN: Szerelo role and workload widget
      const widgetId: WidgetId = 'SVC_WORKLOAD';

      // WHEN: Getting access
      const access = service.getWidgetAccessForRole(widgetId, 'ROLE_TECHNICIAN');

      // THEN: Should return READ
      expect(access).toBe('READ');
    });

    it('[P1] should return NONE for PENZTAR on most widgets', () => {
      // GIVEN: Penztaros role and widgets they cannot see
      const hiddenWidgets: WidgetId[] = ['INV_SUMMARY', 'SVC_WORKSHEETS', 'PTR_TOP', 'ANA_ROI'];

      // WHEN: Getting access
      // THEN: All should return NONE
      hiddenWidgets.forEach(widgetId => {
        expect(service.getWidgetAccessForRole(widgetId, 'ROLE_CASHIER')).toBe('NONE');
      });
    });

    it('[P2] should return FULL for PENZTAROS on payments widget', () => {
      // GIVEN: Penztaros role and payments widget
      const widgetId: WidgetId = 'FIN_PAYMENTS';

      // WHEN: Getting access
      const access = service.getWidgetAccessForRole(widgetId, 'ROLE_CASHIER');

      // THEN: Should return FULL
      expect(access).toBe('FULL');
    });
  });

  describe('getHighestAccessLevel', () => {
    it('[P1] should return FULL when FULL is present', () => {
      expect(service.getHighestAccessLevel(['NONE', 'READ', 'FULL'])).toBe('FULL');
      expect(service.getHighestAccessLevel(['FULL', 'NONE'])).toBe('FULL');
    });

    it('[P1] should return READ when only READ and NONE are present', () => {
      expect(service.getHighestAccessLevel(['NONE', 'READ'])).toBe('READ');
      expect(service.getHighestAccessLevel(['READ', 'READ'])).toBe('READ');
    });

    it('[P1] should return NONE when only NONE is present', () => {
      expect(service.getHighestAccessLevel(['NONE', 'NONE'])).toBe('NONE');
      expect(service.getHighestAccessLevel(['NONE'])).toBe('NONE');
    });

    it('[P2] should return NONE for empty array', () => {
      expect(service.getHighestAccessLevel([])).toBe('NONE');
    });
  });

  describe('getWidgetAccessForRoles (multi-role)', () => {
    it('[P1] should use union of permissions for multiple roles', () => {
      // GIVEN: User with RAKTAROS and SZERELO roles
      const roles: RoleCode[] = ['ROLE_STOCK', 'ROLE_TECHNICIAN'];

      // WHEN: Getting access for various widgets
      // THEN: Should see both inventory (RAKTAROS) and service (SZERELO) widgets
      expect(service.getWidgetAccessForRoles('INV_SUMMARY', roles)).toBe('FULL');
      expect(service.getWidgetAccessForRoles('SVC_WORKSHEETS', roles)).toBe('FULL');
    });

    it('[P1] should elevate READ to FULL when one role has FULL', () => {
      // GIVEN: User with FINANCE (FULL on FIN_GROSS_REV) and CASHIER (READ on FIN_GROSS_REV)
      const roles: RoleCode[] = ['ROLE_FINANCE', 'ROLE_CASHIER'];

      // WHEN: Getting access for gross revenue widget
      const access = service.getWidgetAccessForRoles('FIN_GROSS_REV', roles);

      // THEN: Should return FULL (highest)
      expect(access).toBe('FULL');
    });

    it('[P1] should return NONE when no role has access', () => {
      // GIVEN: User with CASHIER and STOCK roles (neither has analytics access)
      const roles: RoleCode[] = ['ROLE_CASHIER', 'ROLE_STOCK'];

      // WHEN: Getting access for analytics widgets
      const access = service.getWidgetAccessForRoles('ANA_ROI', roles);

      // THEN: Should return NONE
      expect(access).toBe('NONE');
    });
  });

  describe('isValidRoleCode', () => {
    it('[P1] should return true for valid role codes', () => {
      const validRoles = [
        'ROLE_ADMIN',
        'ROLE_MANAGER',
        'ROLE_FINANCE',
        'ROLE_FRANCHISE_OWNER',
        'ROLE_STOCK',
        'ROLE_TECHNICIAN',
        'ROLE_SALES',
        'ROLE_CASHIER',
        'ROLE_FRANCHISE_EMP',
      ];

      validRoles.forEach(role => {
        expect(service.isValidRoleCode(role)).toBe(true);
      });
    });

    it('[P1] should return false for invalid role codes', () => {
      const invalidRoles = ['INVALID', 'ROLE_UNKNOWN', 'admin', 'ADMIN', ''];

      invalidRoles.forEach(role => {
        expect(service.isValidRoleCode(role)).toBe(false);
      });
    });
  });

  describe('getVisibleWidgets', () => {
    it('[P1] should return all 26 widgets for ADMIN', () => {
      // GIVEN: Admin role
      const roles = ['ROLE_ADMIN'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return all 26 widgets
      expect(widgets.length).toBe(26);
    });

    it('[P1] should return 8 widgets for RAKTAROS (per RBAC spec)', () => {
      // GIVEN: Raktaros role
      const roles = ['ROLE_STOCK'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return 8 widgets (EXEC: 3, INV: 5)
      expect(widgets.length).toBe(8);
    });

    it('[P1] should return 8 widgets for SZERELO (EXEC: 4, INV: 1, SVC: 3)', () => {
      // GIVEN: Szerelo role
      const roles = ['ROLE_TECHNICIAN'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return 8 widgets
      // EXEC: HEALTH(READ), INVENTORY(READ), SERVICE(FULL), ALERTS(READ) = 4
      // INV: SUMMARY(READ) = 1
      // SVC: WORKSHEETS(FULL), WORKLOAD(READ), WARRANTY(FULL) = 3
      expect(widgets.length).toBe(8);
    });

    it('[P1] should return 5 widgets for PENZTAROS (EXEC: 3, FIN: 2)', () => {
      // GIVEN: Penztaros role
      const roles = ['ROLE_CASHIER'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return 5 widgets
      // EXEC: HEALTH(READ), REVENUE(READ), ALERTS(READ) = 3
      // FIN: GROSS_REV(READ), PAYMENTS(FULL) = 2
      expect(widgets.length).toBe(5);
    });

    it('[P1] should return 13 widgets for ERTEKESITO (EXEC: 4, FIN: 2, INV: 3, PTR: 4)', () => {
      // GIVEN: Ertekesito role
      const roles = ['ROLE_SALES'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return 13 widgets
      // EXEC: HEALTH(READ), REVENUE(READ), INVENTORY(READ), ALERTS(READ) = 4
      // FIN: GROSS_REV(READ), RECEIVABLES(READ) = 2
      // INV: SUMMARY(READ), UTILIZATION(READ), ALERTS(FULL) = 3
      // PTR: SUMMARY(FULL), TOP(FULL), ACTIVITY(FULL), CREDIT(READ) = 4
      expect(widgets.length).toBe(13);
    });

    it('[P1] should return 14 widgets for PENZUGYES (per RBAC spec)', () => {
      // GIVEN: Penzugyes role
      const roles = ['ROLE_FINANCE'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return 14 widgets (EXEC: 3, FIN: 6, SVC: 1, PTR: 2, ANA: 2)
      expect(widgets.length).toBe(14);
    });

    it('[P1] should return widgets with correct properties', () => {
      // GIVEN: Any role
      const roles = ['ROLE_STOCK'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Each widget should have required properties
      widgets.forEach(widget => {
        expect(widget).toHaveProperty('widgetId');
        expect(widget).toHaveProperty('permissionCode');
        expect(widget).toHaveProperty('accessLevel');
        expect(widget).toHaveProperty('sectionId');
        expect(widget).toHaveProperty('name');
        expect(['FULL', 'READ']).toContain(widget.accessLevel);
      });
    });

    it('[P2] should return empty array for no valid roles', () => {
      // GIVEN: No valid roles
      const roles = ['INVALID_ROLE'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return empty array
      expect(widgets.length).toBe(0);
    });

    it('[P1] should handle multi-role union correctly', () => {
      // GIVEN: User with both RAKTAROS (8 widgets) and SZERELO (8 widgets)
      // Combined unique widgets should be calculated (some overlap in EXEC/INV)
      const roles = ['ROLE_STOCK', 'ROLE_TECHNICIAN'];

      // WHEN: Getting visible widgets
      const widgets = service.getVisibleWidgets(roles);

      // THEN: Should return union of both roles' widgets
      // RAKTAROS: EXEC_HEALTH, EXEC_INVENTORY, EXEC_ALERTS + 5 INV = 8
      // SZERELO: EXEC_HEALTH, EXEC_INVENTORY, EXEC_SERVICE, EXEC_ALERTS + 1 INV + 3 SVC = 8
      // Union: 4 EXEC + 5 INV + 3 SVC = 12
      expect(widgets.length).toBe(12);
    });
  });

  describe('getSectionVisibility', () => {
    it('[P1] should mark finance section as hidden for RAKTAROS', () => {
      // GIVEN: Raktaros widgets
      const widgets = service.getVisibleWidgets(['ROLE_STOCK']);

      // WHEN: Getting section visibility
      const sections = service.getSectionVisibility(widgets);

      // THEN: Finance section should not be visible
      const financeSection = sections.find(s => s.sectionId === 'finance');
      expect(financeSection?.isVisible).toBe(false);
      expect(financeSection?.visibleWidgetCount).toBe(0);
    });

    it('[P1] should mark inventory section as visible for RAKTAROS', () => {
      // GIVEN: Raktaros widgets
      const widgets = service.getVisibleWidgets(['ROLE_STOCK']);

      // WHEN: Getting section visibility
      const sections = service.getSectionVisibility(widgets);

      // THEN: Inventory section should be visible with 5 widgets
      const inventorySection = sections.find(s => s.sectionId === 'inventory');
      expect(inventorySection?.isVisible).toBe(true);
      expect(inventorySection?.visibleWidgetCount).toBe(5);
    });

    it('[P1] should show all sections for ADMIN', () => {
      // GIVEN: Admin widgets
      const widgets = service.getVisibleWidgets(['ROLE_ADMIN']);

      // WHEN: Getting section visibility
      const sections = service.getSectionVisibility(widgets);

      // THEN: All sections should be visible
      sections.forEach(section => {
        expect(section.isVisible).toBe(true);
        expect(section.visibleWidgetCount).toBeGreaterThan(0);
      });
    });

    it('[P1] should return correct section names', () => {
      // GIVEN: Admin widgets
      const widgets = service.getVisibleWidgets(['ROLE_ADMIN']);

      // WHEN: Getting section visibility
      const sections = service.getSectionVisibility(widgets);

      // THEN: Should include all sections with names
      const expectedSections: DashboardSection[] = [
        'executive',
        'finance',
        'inventory',
        'service',
        'partner',
        'analytics',
      ];
      expectedSections.forEach(sectionId => {
        const section = sections.find(s => s.sectionId === sectionId);
        expect(section).toBeDefined();
        expect(section?.name).toBeTruthy();
      });
    });
  });

  describe('getPresetForRoles', () => {
    it('[P1] should return ADMIN preset for admin role', () => {
      // GIVEN: Admin role
      const roles = ['ROLE_ADMIN'];

      // WHEN: Getting preset
      const preset = service.getPresetForRoles(roles);

      // THEN: Should return admin preset
      expect(preset.roleCode).toBe('ROLE_ADMIN');
      expect(preset.expandedSections).toContain('finance');
      expect(preset.expandedSections).toContain('inventory');
    });

    it('[P1] should return STOCK preset for raktaros role', () => {
      // GIVEN: Raktaros role
      const roles = ['ROLE_STOCK'];

      // WHEN: Getting preset
      const preset = service.getPresetForRoles(roles);

      // THEN: Should return stock preset
      expect(preset.roleCode).toBe('ROLE_STOCK');
      expect(preset.expandedSections).toContain('inventory');
      expect(preset.pinnedWidgets).toContain('INV_ALERTS');
    });

    it('[P1] should return TECHNICIAN preset for szerelo role', () => {
      // GIVEN: Szerelo role
      const roles = ['ROLE_TECHNICIAN'];

      // WHEN: Getting preset
      const preset = service.getPresetForRoles(roles);

      // THEN: Should return technician preset
      expect(preset.roleCode).toBe('ROLE_TECHNICIAN');
      expect(preset.expandedSections).toContain('service');
      expect(preset.pinnedWidgets).toContain('SVC_WORKSHEETS');
    });

    it('[P1] should return highest priority preset for multi-role', () => {
      // GIVEN: User with multiple roles (Manager has higher priority than Stock)
      const roles = ['ROLE_STOCK', 'ROLE_MANAGER'];

      // WHEN: Getting preset
      const preset = service.getPresetForRoles(roles);

      // THEN: Should return manager preset (higher priority)
      expect(preset.roleCode).toBe('ROLE_MANAGER');
    });

    it('[P2] should return default preset for invalid roles', () => {
      // GIVEN: Invalid roles
      const roles = ['INVALID_ROLE'];

      // WHEN: Getting preset
      const preset = service.getPresetForRoles(roles);

      // THEN: Should return default preset
      expect(preset).toBeDefined();
      expect(preset.defaultRefreshInterval).toBeGreaterThan(0);
    });

    it('[P1] should include refresh interval in presets', () => {
      // GIVEN: Various roles
      const testRoles = ['ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_CASHIER'];

      // WHEN/THEN: Each preset should have a refresh interval
      testRoles.forEach(role => {
        const preset = service.getPresetForRoles([role]);
        expect(preset.defaultRefreshInterval).toBeGreaterThan(0);
      });
    });
  });

  describe('getPermissions (full response)', () => {
    it('[P1] should return complete permissions response for ADMIN', async () => {
      // GIVEN: Admin role
      const roles = ['ROLE_ADMIN'];

      // WHEN: Getting full permissions
      const result = await service.getPermissions(roles);

      // THEN: Should return complete response
      expect(result).toHaveProperty('widgets');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('preset');
      expect(result).toHaveProperty('totalWidgets');
      expect(result).toHaveProperty('roles');

      expect(result.widgets.length).toBe(26);
      expect(result.totalWidgets).toBe(26);
      expect(result.roles).toContain('ROLE_ADMIN');
    });

    it('[P1] should return complete permissions response for RAKTAROS', async () => {
      // GIVEN: Raktaros role
      const roles = ['ROLE_STOCK'];

      // WHEN: Getting full permissions
      const result = await service.getPermissions(roles);

      // THEN: Should return correct counts
      expect(result.widgets.length).toBe(8);
      expect(result.totalWidgets).toBe(8);

      // Finance section should be hidden
      const financeSection = result.sections.find(s => s.sectionId === 'finance');
      expect(financeSection?.isVisible).toBe(false);

      // Inventory section should have 5 widgets
      const inventorySection = result.sections.find(s => s.sectionId === 'inventory');
      expect(inventorySection?.visibleWidgetCount).toBe(5);
    });

    it('[P1] should preserve roles in response', async () => {
      // GIVEN: Multiple roles
      const roles = ['ROLE_STOCK', 'ROLE_TECHNICIAN'];

      // WHEN: Getting full permissions
      const result = await service.getPermissions(roles);

      // THEN: Roles should be preserved in response
      expect(result.roles).toEqual(roles);
    });
  });

  describe('hasWidgetAccess', () => {
    it('[P1] should return true when user has access', () => {
      expect(service.hasWidgetAccess('EXEC_HEALTH', ['ROLE_ADMIN'])).toBe(true);
      expect(service.hasWidgetAccess('INV_SUMMARY', ['ROLE_STOCK'])).toBe(true);
      expect(service.hasWidgetAccess('SVC_WORKSHEETS', ['ROLE_TECHNICIAN'])).toBe(true);
    });

    it('[P1] should return false when user lacks access', () => {
      expect(service.hasWidgetAccess('FIN_GROSS_REV', ['ROLE_STOCK'])).toBe(false);
      expect(service.hasWidgetAccess('ANA_ROI', ['ROLE_CASHIER'])).toBe(false);
      expect(service.hasWidgetAccess('SVC_WORKSHEETS', ['ROLE_CASHIER'])).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('[P1] should return true when user has permission code', () => {
      expect(service.hasPermission('dashboard.exec.health', ['ROLE_ADMIN'])).toBe(true);
      expect(service.hasPermission('dashboard.inventory.summary', ['ROLE_STOCK'])).toBe(true);
    });

    it('[P1] should return false when user lacks permission code', () => {
      expect(service.hasPermission('dashboard.finance.gross_revenue', ['ROLE_STOCK'])).toBe(false);
    });

    it('[P2] should return false for unknown permission code', () => {
      expect(service.hasPermission('dashboard.unknown.widget', ['ROLE_ADMIN'])).toBe(false);
    });
  });

  describe('getWidgetsInSection', () => {
    it('[P1] should return all widgets in a section', () => {
      // GIVEN: Finance section
      const sectionId: DashboardSection = 'finance';

      // WHEN: Getting widgets in section
      const widgets = service.getWidgetsInSection(sectionId);

      // THEN: Should return 6 finance widgets
      expect(widgets.length).toBe(6);
      widgets.forEach(w => {
        expect(w.sectionId).toBe('finance');
      });
    });

    it('[P1] should return correct widget count per section', () => {
      // GIVEN: Expected widget counts per section (from RBAC spec)
      const expectedCounts: Record<DashboardSection, number> = {
        executive: 5,
        finance: 6,
        inventory: 5,
        service: 4,
        partner: 4,
        analytics: 2,
      };

      // WHEN/THEN: Each section should have expected widget count
      Object.entries(expectedCounts).forEach(([sectionId, expectedCount]) => {
        const widgets = service.getWidgetsInSection(sectionId as DashboardSection);
        expect(widgets.length).toBe(expectedCount);
      });
    });
  });

  describe('getTotalWidgetCountForRole', () => {
    it('[P1] should return correct widget counts per role', () => {
      // GIVEN: Expected counts based on the access matrix implementation
      // Counts verified by analyzing the WIDGET_ACCESS matrix
      const expectedCounts: Record<RoleCode, number> = {
        ROLE_ADMIN: 26, // All widgets
        ROLE_MANAGER: 26, // All widgets
        ROLE_FINANCE: 14, // EXEC:3, FIN:6, SVC:1, PTR:2, ANA:2
        ROLE_FRANCHISE_OWNER: 26, // All widgets
        ROLE_STOCK: 8, // EXEC:3, INV:5
        ROLE_TECHNICIAN: 8, // EXEC:4, INV:1, SVC:3
        ROLE_SALES: 13, // EXEC:4, FIN:2, INV:3, PTR:4
        ROLE_CASHIER: 5, // EXEC:3, FIN:2
        ROLE_FRANCHISE_EMP: 14, // Partial READ access across sections
      };

      // WHEN/THEN: Each role should have expected widget count
      Object.entries(expectedCounts).forEach(([role, expectedCount]) => {
        const count = service.getTotalWidgetCountForRole(role as RoleCode);
        expect(count).toBe(expectedCount);
      });
    });
  });
});
