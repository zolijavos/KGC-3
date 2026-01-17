/**
 * Permission Service Tests - TDD Red-Green-Refactor
 * Story 2.2: Role Assignment és RBAC
 * AC#4: Kompozit jogok (direkt + örökölt)
 *
 * Tests role-permission mapping per ADR-032:
 * - Direct permissions per role
 * - Inherited permissions from role hierarchy
 * - Permission constraints (e.g., discount_limit)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from './permission.service';
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';

describe('PermissionService', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService();
  });

  // ============================================
  // getDirectPermissions() tests
  // ============================================

  describe('getDirectPermissions()', () => {
    it('should return OPERATOR direct permissions', () => {
      const permissions = permissionService.getDirectPermissions(Role.OPERATOR);

      // OPERATOR base permissions per ADR-032
      expect(permissions).toContain(Permission.RENTAL_VIEW);
      expect(permissions).toContain(Permission.RENTAL_CREATE);
      expect(permissions).toContain(Permission.RENTAL_RETURN);
      expect(permissions).toContain(Permission.SERVICE_VIEW);
      expect(permissions).toContain(Permission.SERVICE_CREATE);
      expect(permissions).toContain(Permission.INVENTORY_VIEW);
      expect(permissions).toContain(Permission.SALES_VIEW);
      expect(permissions).toContain(Permission.SALES_CREATE);
    });

    it('should NOT include rental:discount for OPERATOR', () => {
      const permissions = permissionService.getDirectPermissions(Role.OPERATOR);
      expect(permissions).not.toContain(Permission.RENTAL_DISCOUNT);
    });

    it('should return TECHNIKUS direct permissions', () => {
      const permissions = permissionService.getDirectPermissions(Role.TECHNIKUS);

      // TECHNIKUS adds service warranty per ADR-032
      expect(permissions).toContain(Permission.SERVICE_WARRANTY);
      expect(permissions).toContain(Permission.WARRANTY_VIEW);
      expect(permissions).toContain(Permission.WARRANTY_CREATE);
    });

    it('should return BOLTVEZETO direct permissions', () => {
      const permissions = permissionService.getDirectPermissions(Role.BOLTVEZETO);

      // BOLTVEZETO adds discounts and finance per ADR-032
      expect(permissions).toContain(Permission.RENTAL_DISCOUNT);
      expect(permissions).toContain(Permission.RENTAL_CANCEL);
      expect(permissions).toContain(Permission.FINANCE_VIEW);
      expect(permissions).toContain(Permission.FINANCE_REPORTS);
      expect(permissions).toContain(Permission.INVENTORY_TRANSFER);
      expect(permissions).toContain(Permission.USER_VIEW);
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.REPORT_OPERATIONAL);
    });

    it('should return ACCOUNTANT direct permissions (finance focused)', () => {
      const permissions = permissionService.getDirectPermissions(Role.ACCOUNTANT);

      // ACCOUNTANT is finance focused, read-only for most modules
      expect(permissions).toContain(Permission.RENTAL_VIEW);
      expect(permissions).toContain(Permission.FINANCE_VIEW);
      expect(permissions).toContain(Permission.FINANCE_REPORTS);
      expect(permissions).toContain(Permission.REPORT_FINANCIAL);
      // Should NOT have create permissions
      expect(permissions).not.toContain(Permission.RENTAL_CREATE);
      expect(permissions).not.toContain(Permission.SALES_CREATE);
    });

    it('should return PARTNER_OWNER direct permissions', () => {
      const permissions = permissionService.getDirectPermissions(Role.PARTNER_OWNER);

      // PARTNER_OWNER has full tenant control
      expect(permissions).toContain(Permission.RENTAL_DISCOUNT);
      expect(permissions).toContain(Permission.USER_VIEW);
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.USER_UPDATE);
      expect(permissions).toContain(Permission.USER_DELETE);
      expect(permissions).toContain(Permission.USER_ROLE_ASSIGN);
      expect(permissions).toContain(Permission.FINANCE_CLOSE);
      expect(permissions).toContain(Permission.AUDIT_VIEW);
    });

    it('should return CENTRAL_ADMIN direct permissions (read-only global)', () => {
      const permissions = permissionService.getDirectPermissions(Role.CENTRAL_ADMIN);

      // CENTRAL_ADMIN is read-only for most, but can view cross-tenant
      expect(permissions).toContain(Permission.RENTAL_VIEW);
      expect(permissions).toContain(Permission.SERVICE_VIEW);
      expect(permissions).toContain(Permission.INVENTORY_VIEW);
      expect(permissions).toContain(Permission.INVENTORY_TRANSFER);
      expect(permissions).toContain(Permission.FINANCE_VIEW);
      expect(permissions).toContain(Permission.FINANCE_REPORTS);
      expect(permissions).toContain(Permission.REPORT_CROSS_TENANT);
      expect(permissions).toContain(Permission.USER_VIEW);
      expect(permissions).toContain(Permission.USER_CREATE);
    });

    it('should return DEVOPS_ADMIN direct permissions (system admin)', () => {
      const permissions = permissionService.getDirectPermissions(Role.DEVOPS_ADMIN);

      // DEVOPS_ADMIN has system configuration access
      expect(permissions).toContain(Permission.ADMIN_CONFIG);
      expect(permissions).toContain(Permission.ADMIN_TENANT);
      expect(permissions).toContain(Permission.AUDIT_VIEW);
      expect(permissions).toContain(Permission.AUDIT_EXPORT);
      expect(permissions).toContain(Permission.USER_VIEW);
      expect(permissions).toContain(Permission.USER_CREATE);
    });

    it('should return SUPER_ADMIN direct permissions (full access)', () => {
      const permissions = permissionService.getDirectPermissions(Role.SUPER_ADMIN);

      // SUPER_ADMIN has all permissions
      expect(permissions).toContain(Permission.ADMIN_SYSTEM);
      expect(permissions).toContain(Permission.ADMIN_TENANT);
      expect(permissions).toContain(Permission.ADMIN_CONFIG);
      expect(permissions).toContain(Permission.USER_ROLE_ASSIGN);
    });
  });

  // ============================================
  // getAllPermissions() tests - includes inherited
  // ============================================

  describe('getAllPermissions()', () => {
    it('should return only direct permissions for OPERATOR (no inheritance)', () => {
      const direct = permissionService.getDirectPermissions(Role.OPERATOR);
      const all = permissionService.getAllPermissions(Role.OPERATOR);

      expect(all).toEqual(direct);
    });

    it('should include OPERATOR permissions for TECHNIKUS', () => {
      const all = permissionService.getAllPermissions(Role.TECHNIKUS);

      // TECHNIKUS inherits from OPERATOR
      expect(all).toContain(Permission.RENTAL_VIEW);
      expect(all).toContain(Permission.RENTAL_CREATE);
      expect(all).toContain(Permission.SERVICE_VIEW);
      // Plus TECHNIKUS direct permissions
      expect(all).toContain(Permission.SERVICE_WARRANTY);
    });

    it('should include full chain for BOLTVEZETO', () => {
      const all = permissionService.getAllPermissions(Role.BOLTVEZETO);

      // BOLTVEZETO inherits TECHNIKUS -> OPERATOR
      expect(all).toContain(Permission.RENTAL_VIEW); // from OPERATOR
      expect(all).toContain(Permission.SERVICE_WARRANTY); // from TECHNIKUS
      expect(all).toContain(Permission.RENTAL_DISCOUNT); // BOLTVEZETO direct
    });

    it('should include full chain for PARTNER_OWNER', () => {
      const all = permissionService.getAllPermissions(Role.PARTNER_OWNER);

      // PARTNER_OWNER inherits BOLTVEZETO -> TECHNIKUS -> OPERATOR
      expect(all).toContain(Permission.RENTAL_VIEW); // from OPERATOR
      expect(all).toContain(Permission.SERVICE_WARRANTY); // from TECHNIKUS
      expect(all).toContain(Permission.RENTAL_DISCOUNT); // from BOLTVEZETO
      expect(all).toContain(Permission.USER_ROLE_ASSIGN); // PARTNER_OWNER direct
    });

    it('should return only direct for ACCOUNTANT (parallel hierarchy)', () => {
      const direct = permissionService.getDirectPermissions(Role.ACCOUNTANT);
      const all = permissionService.getAllPermissions(Role.ACCOUNTANT);

      // ACCOUNTANT has no inheritance chain
      expect(all).toEqual(direct);
    });

    it('should return only direct for CENTRAL_ADMIN (parallel hierarchy)', () => {
      const direct = permissionService.getDirectPermissions(Role.CENTRAL_ADMIN);
      const all = permissionService.getAllPermissions(Role.CENTRAL_ADMIN);

      // CENTRAL_ADMIN has no inheritance chain
      expect(all).toEqual(direct);
    });

    it('should return only direct for DEVOPS_ADMIN (parallel hierarchy)', () => {
      const direct = permissionService.getDirectPermissions(Role.DEVOPS_ADMIN);
      const all = permissionService.getAllPermissions(Role.DEVOPS_ADMIN);

      // DEVOPS_ADMIN has no inheritance chain
      expect(all).toEqual(direct);
    });

    it('should return complete permission set for SUPER_ADMIN', () => {
      const all = permissionService.getAllPermissions(Role.SUPER_ADMIN);

      // SUPER_ADMIN has all operational permissions through inheritance
      expect(all).toContain(Permission.RENTAL_VIEW);
      expect(all).toContain(Permission.SERVICE_WARRANTY);
      expect(all).toContain(Permission.RENTAL_DISCOUNT);
      expect(all).toContain(Permission.ADMIN_SYSTEM);
    });

    it('should not have duplicates in returned permissions', () => {
      const all = permissionService.getAllPermissions(Role.SUPER_ADMIN);
      const unique = [...new Set(all)];

      expect(all.length).toBe(unique.length);
    });
  });

  // ============================================
  // hasPermission() tests
  // ============================================

  describe('hasPermission()', () => {
    it('should return true for direct OPERATOR permissions', () => {
      expect(permissionService.hasPermission(Role.OPERATOR, Permission.RENTAL_VIEW)).toBe(true);
      expect(permissionService.hasPermission(Role.OPERATOR, Permission.RENTAL_CREATE)).toBe(true);
    });

    it('should return false for OPERATOR non-permissions', () => {
      expect(permissionService.hasPermission(Role.OPERATOR, Permission.RENTAL_DISCOUNT)).toBe(false);
      expect(permissionService.hasPermission(Role.OPERATOR, Permission.ADMIN_SYSTEM)).toBe(false);
    });

    it('should return true for inherited permissions', () => {
      // TECHNIKUS inherits OPERATOR permissions
      expect(permissionService.hasPermission(Role.TECHNIKUS, Permission.RENTAL_VIEW)).toBe(true);
      // BOLTVEZETO inherits TECHNIKUS -> OPERATOR
      expect(permissionService.hasPermission(Role.BOLTVEZETO, Permission.SERVICE_WARRANTY)).toBe(true);
    });

    it('should return true for SUPER_ADMIN on any permission', () => {
      expect(permissionService.hasPermission(Role.SUPER_ADMIN, Permission.RENTAL_VIEW)).toBe(true);
      expect(permissionService.hasPermission(Role.SUPER_ADMIN, Permission.ADMIN_SYSTEM)).toBe(true);
      expect(permissionService.hasPermission(Role.SUPER_ADMIN, Permission.SERVICE_WARRANTY)).toBe(true);
    });

    it('should handle parallel hierarchy correctly', () => {
      // ACCOUNTANT should NOT have BOLTVEZETO permissions
      expect(permissionService.hasPermission(Role.ACCOUNTANT, Permission.RENTAL_CREATE)).toBe(false);
      // But should have finance permissions
      expect(permissionService.hasPermission(Role.ACCOUNTANT, Permission.FINANCE_VIEW)).toBe(true);
    });
  });

  // ============================================
  // getConstraint() tests
  // ============================================

  describe('getConstraint()', () => {
    it('should return discount_limit constraint for BOLTVEZETO', () => {
      const constraint = permissionService.getConstraint(
        Role.BOLTVEZETO,
        Permission.RENTAL_DISCOUNT,
        'discount_limit'
      );

      expect(constraint).toBe(20); // ±20% per ADR-032
    });

    it('should return discount_limit constraint for PARTNER_OWNER', () => {
      const constraint = permissionService.getConstraint(
        Role.PARTNER_OWNER,
        Permission.RENTAL_DISCOUNT,
        'discount_limit'
      );

      expect(constraint).toBe(100); // 100% (unlimited) per ADR-032
    });

    it('should return undefined for non-existent constraint', () => {
      const constraint = permissionService.getConstraint(
        Role.OPERATOR,
        Permission.RENTAL_VIEW,
        'discount_limit'
      );

      expect(constraint).toBeUndefined();
    });

    it('should return undefined for role without that permission', () => {
      const constraint = permissionService.getConstraint(
        Role.OPERATOR,
        Permission.RENTAL_DISCOUNT,
        'discount_limit'
      );

      expect(constraint).toBeUndefined();
    });
  });

  // ============================================
  // getRolesWithPermission() tests
  // ============================================

  describe('getRolesWithPermission()', () => {
    it('should return all roles with RENTAL_VIEW permission', () => {
      const roles = permissionService.getRolesWithPermission(Permission.RENTAL_VIEW);

      expect(roles).toContain(Role.OPERATOR);
      expect(roles).toContain(Role.TECHNIKUS);
      expect(roles).toContain(Role.BOLTVEZETO);
      expect(roles).toContain(Role.PARTNER_OWNER);
      expect(roles).toContain(Role.CENTRAL_ADMIN);
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.ACCOUNTANT);
    });

    it('should return only privileged roles for ADMIN_SYSTEM', () => {
      const roles = permissionService.getRolesWithPermission(Permission.ADMIN_SYSTEM);

      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).not.toContain(Role.OPERATOR);
      expect(roles).not.toContain(Role.BOLTVEZETO);
    });

    it('should include inherited roles for SERVICE_WARRANTY', () => {
      const roles = permissionService.getRolesWithPermission(Permission.SERVICE_WARRANTY);

      // Direct: TECHNIKUS
      // Inherited: BOLTVEZETO, PARTNER_OWNER, SUPER_ADMIN
      expect(roles).toContain(Role.TECHNIKUS);
      expect(roles).toContain(Role.BOLTVEZETO);
      expect(roles).toContain(Role.PARTNER_OWNER);
      expect(roles).toContain(Role.SUPER_ADMIN);
      // Not included
      expect(roles).not.toContain(Role.OPERATOR);
      expect(roles).not.toContain(Role.ACCOUNTANT);
    });
  });
});
