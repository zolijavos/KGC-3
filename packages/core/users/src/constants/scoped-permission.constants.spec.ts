/**
 * Scoped Permission Constants Tests
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#1: RoleScope Interface és Utility Functions
 *
 * TDD Red-Green-Refactor approach
 */

import { describe, it, expect } from 'vitest';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';
import {
  ROLE_SCOPE_MAP,
  getScopeForRole,
  isLocationScopedRole,
  isTenantScopedRole,
  isGlobalScopedRole,
} from './scoped-permission.constants';

describe('Scoped Permission Constants', () => {
  describe('ROLE_SCOPE_MAP', () => {
    it('should contain all 8 roles', () => {
      const allRoles = Object.values(Role);
      expect(allRoles.length).toBe(8);

      for (const role of allRoles) {
        expect(ROLE_SCOPE_MAP[role]).toBeDefined();
      }
    });

    it('should map LOCATION scope roles correctly', () => {
      expect(ROLE_SCOPE_MAP[Role.OPERATOR]).toBe(RoleScope.LOCATION);
      expect(ROLE_SCOPE_MAP[Role.TECHNIKUS]).toBe(RoleScope.LOCATION);
      expect(ROLE_SCOPE_MAP[Role.BOLTVEZETO]).toBe(RoleScope.LOCATION);
    });

    it('should map TENANT scope roles correctly', () => {
      expect(ROLE_SCOPE_MAP[Role.ACCOUNTANT]).toBe(RoleScope.TENANT);
      expect(ROLE_SCOPE_MAP[Role.PARTNER_OWNER]).toBe(RoleScope.TENANT);
    });

    it('should map GLOBAL scope roles correctly', () => {
      expect(ROLE_SCOPE_MAP[Role.CENTRAL_ADMIN]).toBe(RoleScope.GLOBAL);
      expect(ROLE_SCOPE_MAP[Role.DEVOPS_ADMIN]).toBe(RoleScope.GLOBAL);
      expect(ROLE_SCOPE_MAP[Role.SUPER_ADMIN]).toBe(RoleScope.GLOBAL);
    });
  });

  describe('getScopeForRole()', () => {
    it('should return LOCATION for OPERATOR', () => {
      expect(getScopeForRole(Role.OPERATOR)).toBe(RoleScope.LOCATION);
    });

    it('should return LOCATION for TECHNIKUS', () => {
      expect(getScopeForRole(Role.TECHNIKUS)).toBe(RoleScope.LOCATION);
    });

    it('should return LOCATION for BOLTVEZETO', () => {
      expect(getScopeForRole(Role.BOLTVEZETO)).toBe(RoleScope.LOCATION);
    });

    it('should return TENANT for ACCOUNTANT', () => {
      expect(getScopeForRole(Role.ACCOUNTANT)).toBe(RoleScope.TENANT);
    });

    it('should return TENANT for PARTNER_OWNER', () => {
      expect(getScopeForRole(Role.PARTNER_OWNER)).toBe(RoleScope.TENANT);
    });

    it('should return GLOBAL for CENTRAL_ADMIN', () => {
      expect(getScopeForRole(Role.CENTRAL_ADMIN)).toBe(RoleScope.GLOBAL);
    });

    it('should return GLOBAL for DEVOPS_ADMIN', () => {
      expect(getScopeForRole(Role.DEVOPS_ADMIN)).toBe(RoleScope.GLOBAL);
    });

    it('should return GLOBAL for SUPER_ADMIN', () => {
      expect(getScopeForRole(Role.SUPER_ADMIN)).toBe(RoleScope.GLOBAL);
    });
  });

  describe('isLocationScopedRole()', () => {
    it('should return true for OPERATOR', () => {
      expect(isLocationScopedRole(Role.OPERATOR)).toBe(true);
    });

    it('should return true for TECHNIKUS', () => {
      expect(isLocationScopedRole(Role.TECHNIKUS)).toBe(true);
    });

    it('should return true for BOLTVEZETO', () => {
      expect(isLocationScopedRole(Role.BOLTVEZETO)).toBe(true);
    });

    it('should return false for ACCOUNTANT', () => {
      expect(isLocationScopedRole(Role.ACCOUNTANT)).toBe(false);
    });

    it('should return false for PARTNER_OWNER', () => {
      expect(isLocationScopedRole(Role.PARTNER_OWNER)).toBe(false);
    });

    it('should return false for GLOBAL scope roles', () => {
      expect(isLocationScopedRole(Role.CENTRAL_ADMIN)).toBe(false);
      expect(isLocationScopedRole(Role.DEVOPS_ADMIN)).toBe(false);
      expect(isLocationScopedRole(Role.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('isTenantScopedRole()', () => {
    it('should return true for ACCOUNTANT', () => {
      expect(isTenantScopedRole(Role.ACCOUNTANT)).toBe(true);
    });

    it('should return true for PARTNER_OWNER', () => {
      expect(isTenantScopedRole(Role.PARTNER_OWNER)).toBe(true);
    });

    it('should return false for LOCATION scope roles', () => {
      expect(isTenantScopedRole(Role.OPERATOR)).toBe(false);
      expect(isTenantScopedRole(Role.TECHNIKUS)).toBe(false);
      expect(isTenantScopedRole(Role.BOLTVEZETO)).toBe(false);
    });

    it('should return false for GLOBAL scope roles', () => {
      expect(isTenantScopedRole(Role.CENTRAL_ADMIN)).toBe(false);
      expect(isTenantScopedRole(Role.DEVOPS_ADMIN)).toBe(false);
      expect(isTenantScopedRole(Role.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('isGlobalScopedRole()', () => {
    it('should return true for CENTRAL_ADMIN', () => {
      expect(isGlobalScopedRole(Role.CENTRAL_ADMIN)).toBe(true);
    });

    it('should return true for DEVOPS_ADMIN', () => {
      expect(isGlobalScopedRole(Role.DEVOPS_ADMIN)).toBe(true);
    });

    it('should return true for SUPER_ADMIN', () => {
      expect(isGlobalScopedRole(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for LOCATION scope roles', () => {
      expect(isGlobalScopedRole(Role.OPERATOR)).toBe(false);
      expect(isGlobalScopedRole(Role.TECHNIKUS)).toBe(false);
      expect(isGlobalScopedRole(Role.BOLTVEZETO)).toBe(false);
    });

    it('should return false for TENANT scope roles', () => {
      expect(isGlobalScopedRole(Role.ACCOUNTANT)).toBe(false);
      expect(isGlobalScopedRole(Role.PARTNER_OWNER)).toBe(false);
    });
  });
});
