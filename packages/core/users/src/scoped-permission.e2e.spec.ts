/**
 * Scoped Permission E2E Tests
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#9: E2E Tests
 *
 * Tests the full scoped permission flow:
 * - AC1: RoleScope Interface és Utility Functions
 * - AC2: @RequireScope Decorator integration
 * - AC3: ScopedPermissionGuard with controller
 * - AC4: Resource Context Extraction
 * - AC5: ScopedPermissionService functions
 * - AC6: Guard ordering integration
 * - AC7: Audit logging for scope events
 * - AC8: GLOBAL Scope read-only override
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ScopedPermissionGuard } from './guards/scoped-permission.guard';
import { ScopedPermissionService } from './services/scoped-permission.service';
import { RoleScope } from './interfaces/permission.interface';
import { Role } from './interfaces/user.interface';
import { AuditAction, IAuditService } from './interfaces/audit.interface';
import {
  SCOPE_REQUIREMENT_KEY,
  ScopeRequirementMetadata,
} from './decorators/require-scope.decorator';
import {
  ROLE_SCOPE_MAP,
  getScopeForRole,
  isLocationScopedRole,
  isTenantScopedRole,
  isGlobalScopedRole,
} from './constants/scoped-permission.constants';

// Test UUIDs
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';
const otherTenantId = '00000000-0000-0000-0000-000000000003';
const testLocationId = '00000000-0000-0000-0000-000000000010';
const otherLocationId = '00000000-0000-0000-0000-000000000011';

// Mock Request interface
interface MockRequest {
  user?: {
    id: string;
    role: string;
    tenantId: string;
    locationId?: string | null;
  } | null;
  params?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  method?: string;
  url?: string;
}

// Mock ExecutionContext factory
function createMockContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

// Mock Reflector for scope requirements
function createScopeReflector(
  metadata: ScopeRequirementMetadata | undefined
): Reflector {
  return {
    get: vi.fn((key: string) => {
      if (key === SCOPE_REQUIREMENT_KEY) return metadata;
      return undefined;
    }),
  } as unknown as Reflector;
}

// Mock AuditService
function createMockAuditService(): IAuditService & { log: ReturnType<typeof vi.fn> } {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Scoped Permission E2E Tests (Story 2.5)', () => {
  let scopedPermissionService: ScopedPermissionService;
  let mockAuditService: ReturnType<typeof createMockAuditService>;

  beforeEach(() => {
    vi.clearAllMocks();
    scopedPermissionService = new ScopedPermissionService();
    mockAuditService = createMockAuditService();
  });

  // ============================================
  // AC#1: RoleScope Interface és Utility Functions
  // ============================================

  describe('AC#1: RoleScope Constants and Functions', () => {
    it('should map all 8 roles to correct scopes', () => {
      expect(ROLE_SCOPE_MAP[Role.OPERATOR]).toBe(RoleScope.LOCATION);
      expect(ROLE_SCOPE_MAP[Role.TECHNIKUS]).toBe(RoleScope.LOCATION);
      expect(ROLE_SCOPE_MAP[Role.BOLTVEZETO]).toBe(RoleScope.LOCATION);
      expect(ROLE_SCOPE_MAP[Role.ACCOUNTANT]).toBe(RoleScope.TENANT);
      expect(ROLE_SCOPE_MAP[Role.PARTNER_OWNER]).toBe(RoleScope.TENANT);
      expect(ROLE_SCOPE_MAP[Role.CENTRAL_ADMIN]).toBe(RoleScope.GLOBAL);
      expect(ROLE_SCOPE_MAP[Role.DEVOPS_ADMIN]).toBe(RoleScope.GLOBAL);
      expect(ROLE_SCOPE_MAP[Role.SUPER_ADMIN]).toBe(RoleScope.GLOBAL);
    });

    it('should identify LOCATION scoped roles correctly', () => {
      expect(isLocationScopedRole(Role.OPERATOR)).toBe(true);
      expect(isLocationScopedRole(Role.TECHNIKUS)).toBe(true);
      expect(isLocationScopedRole(Role.BOLTVEZETO)).toBe(true);
      expect(isLocationScopedRole(Role.PARTNER_OWNER)).toBe(false);
      expect(isLocationScopedRole(Role.SUPER_ADMIN)).toBe(false);
    });

    it('should identify TENANT scoped roles correctly', () => {
      expect(isTenantScopedRole(Role.ACCOUNTANT)).toBe(true);
      expect(isTenantScopedRole(Role.PARTNER_OWNER)).toBe(true);
      expect(isTenantScopedRole(Role.OPERATOR)).toBe(false);
    });

    it('should identify GLOBAL scoped roles correctly', () => {
      expect(isGlobalScopedRole(Role.CENTRAL_ADMIN)).toBe(true);
      expect(isGlobalScopedRole(Role.DEVOPS_ADMIN)).toBe(true);
      expect(isGlobalScopedRole(Role.SUPER_ADMIN)).toBe(true);
      expect(isGlobalScopedRole(Role.PARTNER_OWNER)).toBe(false);
    });
  });

  // ============================================
  // AC#3 + AC#9: Guard E2E Tests - 7.1 to 7.10
  // ============================================

  describe('7.1: Same tenant access - LOCATION scope user', () => {
    it('should allow OPERATOR to access resources in same tenant', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { tenantId: testTenantId, locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SCOPE_GRANTED,
          userId: testUserId,
        })
      );
    });
  });

  describe('7.2: Same location access - LOCATION scope user', () => {
    it('should allow BOLTVEZETO to access resources in same location', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.BOLTVEZETO,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('7.3: Different location access denied - LOCATION scope user', () => {
    it('should deny OPERATOR from accessing resources in different location', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: { code: 'SCOPE_VIOLATION' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SCOPE_DENIED,
        })
      );
    });

    it('should deny TECHNIKUS from accessing resources in different location', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.TECHNIKUS,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7.4: Cross-location access - TENANT scope user', () => {
    it('should allow PARTNER_OWNER to access all locations within tenant', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { tenantId: testTenantId, locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow ACCOUNTANT to access all locations within tenant', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.ACCOUNTANT,
          tenantId: testTenantId,
        },
        params: { tenantId: testTenantId, locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('7.5: Cross-tenant access denied - TENANT scope user', () => {
    it('should deny PARTNER_OWNER from accessing other tenant resources', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny ACCOUNTANT from accessing other tenant resources', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.ACCOUNTANT,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7.6: Cross-tenant read access - GLOBAL scope user', () => {
    it('should allow SUPER_ADMIN to read other tenant resources', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow CENTRAL_ADMIN to read other tenant resources', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.CENTRAL_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow DEVOPS_ADMIN to read other tenant resources', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.DEVOPS_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('7.7: Cross-tenant write denied - GLOBAL scope user', () => {
    it('should deny SUPER_ADMIN cross-tenant write by default', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: { data: 'test' },
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
        allowGlobalWrite: false,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: { code: 'CROSS_TENANT_WRITE_DENIED' },
      });
    });

    it('should deny SUPER_ADMIN cross-tenant PUT operation', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'PUT',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
        allowGlobalWrite: false,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny SUPER_ADMIN cross-tenant DELETE operation', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'DELETE',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
        allowGlobalWrite: false,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN cross-tenant write when allowGlobalWrite=true', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId },
        headers: {},
        body: {},
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
        allowGlobalWrite: true,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('7.8: Combined PermissionGuard + ScopedPermissionGuard', () => {
    it('should allow access when both permission and scope checks pass', async () => {
      // This tests the guard integration - scope guard runs after permission guard
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.BOLTVEZETO,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny when scope check fails (simulating after permission passed)', async () => {
      // Permission guard would pass (BOLTVEZETO has RENTAL_VIEW)
      // But scope check should fail - different location
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.BOLTVEZETO,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('7.9: Resource ID from URL param', () => {
    it('should extract tenantId from URL params', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
        },
        params: { tenantId: testTenantId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
        resourceIdParam: 'tenantId',
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should extract locationId from URL params', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
        resourceIdParam: 'locationId',
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('7.10: Resource ID from request body', () => {
    it('should extract tenantId from request body', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
        },
        params: {},
        headers: {},
        body: { tenantId: testTenantId, data: 'test' },
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should extract locationId from request body', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: {},
        headers: {},
        body: { locationId: testLocationId },
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny when body tenantId does not match user tenant', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
        },
        params: {},
        headers: {},
        body: { tenantId: otherTenantId },
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // AC#7: Audit Logging Tests
  // ============================================

  describe('AC#7: Audit Logging Integration', () => {
    it('should log SCOPE_GRANTED with full context on success', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      await guard.canActivate(context);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SCOPE_GRANTED,
          userId: testUserId,
          tenantId: testTenantId,
          resourceType: 'SCOPE_CHECK',
        })
      );
    });

    it('should log SCOPE_DENIED with reason on failure', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: otherLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SCOPE_DENIED,
          userId: testUserId,
          tenantId: testTenantId,
        })
      );
    });

    it('should work without audit service (optional dependency)', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: { locationId: testLocationId },
        headers: {},
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.LOCATION,
      });

      // No audit service
      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        null
      );

      // Should not throw
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should allow access when no @RequireScope decorator present', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.OPERATOR,
          tenantId: testTenantId,
          locationId: testLocationId,
        },
        params: {},
        headers: {},
        body: {},
        method: 'GET',
      });

      // No scope requirement
      const reflector = createScopeReflector(undefined);

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should use header override for tenantId when both URL and header present', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.PARTNER_OWNER,
          tenantId: testTenantId,
        },
        params: { tenantId: otherTenantId }, // Would fail
        headers: { 'x-resource-tenant-id': testTenantId }, // Override - should pass
        body: {},
        method: 'GET',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.TENANT,
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow same-tenant write for GLOBAL scope users', async () => {
      const context = createMockContext({
        user: {
          id: testUserId,
          role: Role.SUPER_ADMIN,
          tenantId: testTenantId,
        },
        params: { tenantId: testTenantId },
        headers: {},
        body: {},
        method: 'POST',
      });

      const reflector = createScopeReflector({
        minimumScope: RoleScope.GLOBAL,
        allowGlobalWrite: false, // But same tenant, so should pass
      });

      const guard = new ScopedPermissionGuard(
        reflector,
        scopedPermissionService,
        mockAuditService
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
