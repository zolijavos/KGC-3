/**
 * Permission Interface Tests
 * Story 2.2: Role Assignment és RBAC
 * Task 1.4: Unit tesztek - permission enum completeness
 */

import { describe, it, expect } from 'vitest';
import {
  Permission,
  PermissionModule,
  RoleScope,
  getPermissionsByModule,
  getPermissionModule,
  getPermissionAction,
  isValidPermission,
  TOTAL_PERMISSION_COUNT,
} from './permission.interface';

describe('Permission Interface', () => {
  describe('Permission enum', () => {
    it('should have at least 45 permissions (ADR-032 requirement)', () => {
      const permissionCount = Object.keys(Permission).length;
      expect(permissionCount).toBeGreaterThanOrEqual(45);
    });

    it('should follow module:action naming convention', () => {
      const permissions = Object.values(Permission);
      for (const permission of permissions) {
        expect(permission).toMatch(/^[a-z]+:[a-z_]+$/);
      }
    });

    it('should have permissions for all required modules', () => {
      const modules = new Set(Object.values(Permission).map((p) => p.split(':')[0]));

      // ADR-032 required modules
      const requiredModules = [
        'rental',
        'service',
        'inventory',
        'sales',
        'finance',
        'partner',
        'user',
        'report',
        'admin',
      ];

      for (const module of requiredModules) {
        expect(modules.has(module)).toBe(true);
      }
    });

    it('should export TOTAL_PERMISSION_COUNT matching actual count', () => {
      expect(TOTAL_PERMISSION_COUNT).toBe(Object.keys(Permission).length);
    });
  });

  describe('PermissionModule enum', () => {
    it('should have all module types', () => {
      expect(PermissionModule.RENTAL).toBe('rental');
      expect(PermissionModule.SERVICE).toBe('service');
      expect(PermissionModule.INVENTORY).toBe('inventory');
      expect(PermissionModule.SALES).toBe('sales');
      expect(PermissionModule.FINANCE).toBe('finance');
      expect(PermissionModule.PARTNER).toBe('partner');
      expect(PermissionModule.USER).toBe('user');
      expect(PermissionModule.REPORT).toBe('report');
      expect(PermissionModule.ADMIN).toBe('admin');
    });
  });

  describe('RoleScope enum', () => {
    it('should have all scope types (ADR-032)', () => {
      expect(RoleScope.LOCATION).toBe('LOCATION');
      expect(RoleScope.TENANT).toBe('TENANT');
      expect(RoleScope.GLOBAL).toBe('GLOBAL');
    });
  });

  describe('getPermissionsByModule()', () => {
    it('should return all rental permissions', () => {
      const rentalPerms = getPermissionsByModule(PermissionModule.RENTAL);
      expect(rentalPerms).toContain(Permission.RENTAL_VIEW);
      expect(rentalPerms).toContain(Permission.RENTAL_CREATE);
      expect(rentalPerms).toContain(Permission.RENTAL_RETURN);
      expect(rentalPerms).toContain(Permission.RENTAL_CANCEL);
      expect(rentalPerms).toContain(Permission.RENTAL_DISCOUNT);
      expect(rentalPerms.length).toBe(5);
    });

    it('should return all user permissions', () => {
      const userPerms = getPermissionsByModule(PermissionModule.USER);
      expect(userPerms).toContain(Permission.USER_VIEW);
      expect(userPerms).toContain(Permission.USER_CREATE);
      expect(userPerms).toContain(Permission.USER_UPDATE);
      expect(userPerms).toContain(Permission.USER_DELETE);
      expect(userPerms).toContain(Permission.USER_ROLE_ASSIGN);
      expect(userPerms.length).toBe(5);
    });

    it('should return empty array for module with no permissions', () => {
      // Cast to any for testing edge case with non-existent module
      const perms = getPermissionsByModule('nonexistent' as PermissionModule);
      expect(perms).toEqual([]);
    });
  });

  describe('getPermissionModule()', () => {
    it('should extract module from permission code', () => {
      expect(getPermissionModule(Permission.RENTAL_VIEW)).toBe('rental');
      expect(getPermissionModule(Permission.USER_CREATE)).toBe('user');
      expect(getPermissionModule(Permission.ADMIN_CONFIG)).toBe('admin');
    });

    it('should throw for invalid permission format', () => {
      expect(() => getPermissionModule('invalid' as Permission)).toThrow('Invalid permission format');
    });
  });

  describe('getPermissionAction()', () => {
    it('should extract action from permission code', () => {
      expect(getPermissionAction(Permission.RENTAL_VIEW)).toBe('view');
      expect(getPermissionAction(Permission.USER_CREATE)).toBe('create');
      expect(getPermissionAction(Permission.USER_ROLE_ASSIGN)).toBe('role_assign');
    });

    it('should throw for invalid permission format', () => {
      expect(() => getPermissionAction('invalid' as Permission)).toThrow('Invalid permission format');
    });
  });

  describe('isValidPermission()', () => {
    it('should return true for valid permission', () => {
      expect(isValidPermission('rental:view')).toBe(true);
      expect(isValidPermission('user:create')).toBe(true);
      expect(isValidPermission('admin:config')).toBe(true);
    });

    it('should return false for invalid permission', () => {
      expect(isValidPermission('invalid:permission')).toBe(false);
      expect(isValidPermission('not_a_permission')).toBe(false);
      expect(isValidPermission('')).toBe(false);
    });
  });

  describe('Permission coverage by module', () => {
    it('should have rental module permissions (5)', () => {
      const perms = getPermissionsByModule(PermissionModule.RENTAL);
      expect(perms.length).toBe(5);
    });

    it('should have service module permissions (5)', () => {
      const perms = getPermissionsByModule(PermissionModule.SERVICE);
      expect(perms.length).toBe(5);
    });

    it('should have inventory module permissions (4)', () => {
      const perms = getPermissionsByModule(PermissionModule.INVENTORY);
      expect(perms.length).toBe(4);
    });

    it('should have sales module permissions (3)', () => {
      const perms = getPermissionsByModule(PermissionModule.SALES);
      expect(perms.length).toBe(3);
    });

    it('should have finance module permissions (3)', () => {
      const perms = getPermissionsByModule(PermissionModule.FINANCE);
      expect(perms.length).toBe(3);
    });

    it('should have partner module permissions (4)', () => {
      const perms = getPermissionsByModule(PermissionModule.PARTNER);
      expect(perms.length).toBe(4);
    });

    it('should have user module permissions (5)', () => {
      const perms = getPermissionsByModule(PermissionModule.USER);
      expect(perms.length).toBe(5);
    });

    it('should have report module permissions (3)', () => {
      const perms = getPermissionsByModule(PermissionModule.REPORT);
      expect(perms.length).toBe(3);
    });

    it('should have admin module permissions (3)', () => {
      const perms = getPermissionsByModule(PermissionModule.ADMIN);
      expect(perms.length).toBe(3);
    });
  });
});
