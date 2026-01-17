/**
 * ScopedPermissionService Tests
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#5: ScopedPermissionService Functions
 *
 * TDD Red-Green-Refactor approach
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';
import {
  ScopedPermissionService,
  ScopeCheckUser,
  ResourceContext,
} from './scoped-permission.service';

describe('ScopedPermissionService', () => {
  let service: ScopedPermissionService;

  beforeEach(() => {
    service = new ScopedPermissionService();
  });

  // Test helper factory functions
  const createUser = (overrides: Partial<ScopeCheckUser> = {}): ScopeCheckUser => ({
    id: 'user-123',
    role: Role.OPERATOR,
    tenantId: 'tenant-abc',
    locationId: 'location-xyz',
    ...overrides,
  });

  const createResource = (overrides: Partial<ResourceContext> = {}): ResourceContext => ({
    tenantId: 'tenant-abc',
    locationId: 'location-xyz',
    ...overrides,
  });

  describe('getScopeForRole()', () => {
    it('should return LOCATION for OPERATOR', () => {
      expect(service.getScopeForRole(Role.OPERATOR)).toBe(RoleScope.LOCATION);
    });

    it('should return LOCATION for TECHNIKUS', () => {
      expect(service.getScopeForRole(Role.TECHNIKUS)).toBe(RoleScope.LOCATION);
    });

    it('should return LOCATION for BOLTVEZETO', () => {
      expect(service.getScopeForRole(Role.BOLTVEZETO)).toBe(RoleScope.LOCATION);
    });

    it('should return TENANT for ACCOUNTANT', () => {
      expect(service.getScopeForRole(Role.ACCOUNTANT)).toBe(RoleScope.TENANT);
    });

    it('should return TENANT for PARTNER_OWNER', () => {
      expect(service.getScopeForRole(Role.PARTNER_OWNER)).toBe(RoleScope.TENANT);
    });

    it('should return GLOBAL for CENTRAL_ADMIN', () => {
      expect(service.getScopeForRole(Role.CENTRAL_ADMIN)).toBe(RoleScope.GLOBAL);
    });

    it('should return GLOBAL for DEVOPS_ADMIN', () => {
      expect(service.getScopeForRole(Role.DEVOPS_ADMIN)).toBe(RoleScope.GLOBAL);
    });

    it('should return GLOBAL for SUPER_ADMIN', () => {
      expect(service.getScopeForRole(Role.SUPER_ADMIN)).toBe(RoleScope.GLOBAL);
    });
  });

  describe('requiresLocationScope()', () => {
    it('should return true for OPERATOR', () => {
      expect(service.requiresLocationScope(Role.OPERATOR)).toBe(true);
    });

    it('should return true for TECHNIKUS', () => {
      expect(service.requiresLocationScope(Role.TECHNIKUS)).toBe(true);
    });

    it('should return true for BOLTVEZETO', () => {
      expect(service.requiresLocationScope(Role.BOLTVEZETO)).toBe(true);
    });

    it('should return false for ACCOUNTANT', () => {
      expect(service.requiresLocationScope(Role.ACCOUNTANT)).toBe(false);
    });

    it('should return false for PARTNER_OWNER', () => {
      expect(service.requiresLocationScope(Role.PARTNER_OWNER)).toBe(false);
    });

    it('should return false for GLOBAL scope roles', () => {
      expect(service.requiresLocationScope(Role.CENTRAL_ADMIN)).toBe(false);
      expect(service.requiresLocationScope(Role.DEVOPS_ADMIN)).toBe(false);
      expect(service.requiresLocationScope(Role.SUPER_ADMIN)).toBe(false);
    });
  });

  describe('hasGlobalScope()', () => {
    it('should return false for LOCATION scope roles', () => {
      expect(service.hasGlobalScope(Role.OPERATOR)).toBe(false);
      expect(service.hasGlobalScope(Role.TECHNIKUS)).toBe(false);
      expect(service.hasGlobalScope(Role.BOLTVEZETO)).toBe(false);
    });

    it('should return false for TENANT scope roles', () => {
      expect(service.hasGlobalScope(Role.ACCOUNTANT)).toBe(false);
      expect(service.hasGlobalScope(Role.PARTNER_OWNER)).toBe(false);
    });

    it('should return true for CENTRAL_ADMIN', () => {
      expect(service.hasGlobalScope(Role.CENTRAL_ADMIN)).toBe(true);
    });

    it('should return true for DEVOPS_ADMIN', () => {
      expect(service.hasGlobalScope(Role.DEVOPS_ADMIN)).toBe(true);
    });

    it('should return true for SUPER_ADMIN', () => {
      expect(service.hasGlobalScope(Role.SUPER_ADMIN)).toBe(true);
    });
  });

  describe('canAccessTenant()', () => {
    it('should allow access when no resource tenant specified', () => {
      const user = createUser();
      expect(service.canAccessTenant(user, null)).toBe(true);
      expect(service.canAccessTenant(user, undefined)).toBe(true);
    });

    it('should allow access when user tenant matches resource tenant', () => {
      const user = createUser({ tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-abc')).toBe(true);
    });

    it('should deny access when user tenant differs from resource tenant for LOCATION scope', () => {
      const user = createUser({ role: Role.OPERATOR, tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-other')).toBe(false);
    });

    it('should deny access when user tenant differs from resource tenant for TENANT scope', () => {
      const user = createUser({ role: Role.PARTNER_OWNER, tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-other')).toBe(false);
    });

    it('should allow cross-tenant access for GLOBAL scope (CENTRAL_ADMIN)', () => {
      const user = createUser({ role: Role.CENTRAL_ADMIN, tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-other')).toBe(true);
    });

    it('should allow cross-tenant access for GLOBAL scope (DEVOPS_ADMIN)', () => {
      const user = createUser({ role: Role.DEVOPS_ADMIN, tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-other')).toBe(true);
    });

    it('should allow cross-tenant access for GLOBAL scope (SUPER_ADMIN)', () => {
      const user = createUser({ role: Role.SUPER_ADMIN, tenantId: 'tenant-abc' });
      expect(service.canAccessTenant(user, 'tenant-other')).toBe(true);
    });
  });

  describe('canAccessLocation()', () => {
    it('should allow access when no resource location specified', () => {
      const user = createUser();
      expect(service.canAccessLocation(user, 'tenant-abc', null)).toBe(true);
      expect(service.canAccessLocation(user, 'tenant-abc', undefined)).toBe(true);
    });

    it('should deny access when tenant check fails', () => {
      const user = createUser({ role: Role.OPERATOR, tenantId: 'tenant-abc' });
      expect(service.canAccessLocation(user, 'tenant-other', 'location-xyz')).toBe(false);
    });

    it('should allow access when user location matches resource location (LOCATION scope)', () => {
      const user = createUser({
        role: Role.OPERATOR,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-xyz')).toBe(true);
    });

    it('should deny access when user location differs (LOCATION scope)', () => {
      const user = createUser({
        role: Role.OPERATOR,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-other')).toBe(false);
    });

    it('should deny access when user has no locationId (LOCATION scope)', () => {
      const user = createUser({
        role: Role.OPERATOR,
        tenantId: 'tenant-abc',
        locationId: null,
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-xyz')).toBe(false);
    });

    it('should allow cross-location access for TENANT scope (PARTNER_OWNER)', () => {
      const user = createUser({
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-other')).toBe(true);
    });

    it('should allow cross-location access for TENANT scope (ACCOUNTANT)', () => {
      const user = createUser({
        role: Role.ACCOUNTANT,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-other')).toBe(true);
    });

    it('should allow cross-location access for GLOBAL scope', () => {
      const user = createUser({
        role: Role.CENTRAL_ADMIN,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-abc', 'location-other')).toBe(true);
    });

    it('should allow cross-tenant cross-location access for GLOBAL scope', () => {
      const user = createUser({
        role: Role.SUPER_ADMIN,
        tenantId: 'tenant-abc',
        locationId: 'location-xyz',
      });
      expect(service.canAccessLocation(user, 'tenant-other', 'location-other')).toBe(true);
    });
  });

  describe('checkScope()', () => {
    describe('minimum scope validation', () => {
      it('should deny LOCATION user when TENANT scope required', () => {
        const user = createUser({ role: Role.OPERATOR });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.TENANT);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Insufficient scope');
      });

      it('should deny LOCATION user when GLOBAL scope required', () => {
        const user = createUser({ role: Role.OPERATOR });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.GLOBAL);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Insufficient scope');
      });

      it('should deny TENANT user when GLOBAL scope required', () => {
        const user = createUser({ role: Role.PARTNER_OWNER });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.GLOBAL);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Insufficient scope');
      });

      it('should allow TENANT user when LOCATION scope required', () => {
        const user = createUser({ role: Role.PARTNER_OWNER });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.LOCATION);

        expect(result.allowed).toBe(true);
      });

      it('should allow GLOBAL user when LOCATION scope required', () => {
        const user = createUser({ role: Role.SUPER_ADMIN });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.LOCATION);

        expect(result.allowed).toBe(true);
      });

      it('should allow GLOBAL user when TENANT scope required', () => {
        const user = createUser({ role: Role.CENTRAL_ADMIN });
        const resource = createResource();

        const result = service.checkScope(user, resource, RoleScope.TENANT);

        expect(result.allowed).toBe(true);
      });
    });

    describe('tenant validation', () => {
      it('should deny when user tenant differs and not GLOBAL scope', () => {
        const user = createUser({ role: Role.PARTNER_OWNER, tenantId: 'tenant-abc' });
        const resource = createResource({ tenantId: 'tenant-other' });

        const result = service.checkScope(user, resource, RoleScope.TENANT);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Tenant access denied');
      });

      it('should allow when user tenant matches', () => {
        const user = createUser({ role: Role.PARTNER_OWNER, tenantId: 'tenant-abc' });
        const resource = createResource({ tenantId: 'tenant-abc' });

        const result = service.checkScope(user, resource, RoleScope.TENANT);

        expect(result.allowed).toBe(true);
      });
    });

    describe('location validation', () => {
      it('should deny LOCATION scope user when location differs', () => {
        const user = createUser({
          role: Role.OPERATOR,
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });
        const resource = createResource({
          tenantId: 'tenant-abc',
          locationId: 'location-other',
        });

        const result = service.checkScope(user, resource, RoleScope.LOCATION);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Location access denied');
      });

      it('should allow LOCATION scope user when location matches', () => {
        const user = createUser({
          role: Role.OPERATOR,
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });
        const resource = createResource({
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });

        const result = service.checkScope(user, resource, RoleScope.LOCATION);

        expect(result.allowed).toBe(true);
      });
    });

    describe('combined scenarios', () => {
      it('should allow OPERATOR in same tenant and location', () => {
        const user = createUser({
          role: Role.OPERATOR,
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });
        const resource = createResource({
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });

        expect(service.checkScope(user, resource, RoleScope.LOCATION).allowed).toBe(true);
      });

      it('should allow PARTNER_OWNER across locations in same tenant', () => {
        const user = createUser({
          role: Role.PARTNER_OWNER,
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });
        const resource = createResource({
          tenantId: 'tenant-abc',
          locationId: 'location-other',
        });

        expect(service.checkScope(user, resource, RoleScope.TENANT).allowed).toBe(true);
      });

      it('should allow SUPER_ADMIN across tenants', () => {
        const user = createUser({
          role: Role.SUPER_ADMIN,
          tenantId: 'tenant-abc',
          locationId: 'location-xyz',
        });
        const resource = createResource({
          tenantId: 'tenant-other',
          locationId: 'location-other',
        });

        expect(service.checkScope(user, resource, RoleScope.GLOBAL).allowed).toBe(true);
      });
    });
  });
});
