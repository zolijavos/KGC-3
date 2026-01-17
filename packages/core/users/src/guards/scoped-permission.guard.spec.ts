/**
 * ScopedPermissionGuard Tests
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#3: ScopedPermissionGuard Implementation
 * AC#4: Resource Context Extraction
 * AC#6: Guard Ordering Integration
 * AC#8: GLOBAL Scope Read-Only Override
 *
 * TDD Red-Green-Refactor approach
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';
import { ScopedPermissionService } from '../services/scoped-permission.service';
import { ScopedPermissionGuard } from './scoped-permission.guard';
import {
  SCOPE_REQUIREMENT_KEY,
  ScopeRequirementMetadata,
} from '../decorators/require-scope.decorator';
import { AuditAction, IAuditService, AUDIT_SERVICE } from '../interfaces/audit.interface';

// Mock types
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

// Helper to create mock ExecutionContext
function createMockExecutionContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as const,
  } as ExecutionContext;
}

// Helper to create mock Reflector
function createMockReflector(
  metadata: ScopeRequirementMetadata | undefined
): Reflector {
  return {
    get: vi.fn().mockReturnValue(metadata),
    getAll: vi.fn(),
    getAllAndMerge: vi.fn(),
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;
}

// Helper to create mock AuditService
function createMockAuditService(): IAuditService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ScopedPermissionGuard', () => {
  let scopedPermissionService: ScopedPermissionService;

  beforeEach(() => {
    scopedPermissionService = new ScopedPermissionService();
  });

  describe('canActivate()', () => {
    describe('no decorator metadata', () => {
      it('should allow access when no @RequireScope decorator', async () => {
        const reflector = createMockReflector(undefined);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: { id: 'user-1', role: Role.OPERATOR, tenantId: 'tenant-1' },
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('missing user', () => {
      it('should throw ForbiddenException when user is null', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({ user: null });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toMatchObject({
          response: { code: 'SCOPE_VIOLATION' },
        });
      });

      it('should throw ForbiddenException when user is undefined', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({});

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when user has no role', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: { id: 'user-1', role: '', tenantId: 'tenant-1' },
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('LOCATION scope validation', () => {
      it('should allow OPERATOR in same location', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny OPERATOR in different location', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-other' },
          headers: {},
          body: {},
          method: 'GET',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toMatchObject({
          response: { code: 'SCOPE_VIOLATION' },
        });
      });
    });

    describe('TENANT scope validation', () => {
      it('should allow PARTNER_OWNER in same tenant', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny PARTNER_OWNER in different tenant', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-other' },
          headers: {},
          body: {},
          method: 'GET',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      });

      it('should allow cross-location access for PARTNER_OWNER', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { tenantId: 'tenant-1', locationId: 'location-other' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('GLOBAL scope validation', () => {
      it('should allow SUPER_ADMIN cross-tenant read access', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.GLOBAL,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.SUPER_ADMIN,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-other' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny SUPER_ADMIN cross-tenant write by default', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.GLOBAL,
          allowGlobalWrite: false,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.SUPER_ADMIN,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-other' },
          headers: {},
          body: { tenantId: 'tenant-other' },
          method: 'POST',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(context)).rejects.toMatchObject({
          response: { code: 'CROSS_TENANT_WRITE_DENIED' },
        });
      });

      it('should allow SUPER_ADMIN cross-tenant write when allowGlobalWrite=true', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.GLOBAL,
          allowGlobalWrite: true,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.SUPER_ADMIN,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-other' },
          headers: {},
          body: {},
          method: 'POST',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should allow SUPER_ADMIN same-tenant write', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.GLOBAL,
          allowGlobalWrite: false,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.SUPER_ADMIN,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-1' },
          headers: {},
          body: {},
          method: 'POST',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('resource context extraction', () => {
      it('should extract tenantId from URL params', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should extract tenantId from headers (override URL params)', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        // Header tenant (tenant-1) overrides URL param (tenant-wrong)
        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
          },
          params: { tenantId: 'tenant-wrong' },
          headers: { 'x-resource-tenant-id': 'tenant-1' },
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should extract tenantId from body when not in params/headers', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.TENANT,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.PARTNER_OWNER,
            tenantId: 'tenant-1',
          },
          params: {},
          headers: {},
          body: { tenantId: 'tenant-1' },
          method: 'POST',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should extract locationId from URL params', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('audit logging', () => {
      it('should log SCOPE_GRANTED on successful access', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const auditService = createMockAuditService();
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          auditService
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        await guard.canActivate(context);

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.SCOPE_GRANTED,
            userId: 'user-1',
            tenantId: 'tenant-1',
          })
        );
      });

      it('should log SCOPE_DENIED on access denial', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const auditService = createMockAuditService();
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          auditService
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-other' },
          headers: {},
          body: {},
          method: 'GET',
        });

        try {
          await guard.canActivate(context);
        } catch {
          // Expected
        }

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.SCOPE_DENIED,
            userId: 'user-1',
            tenantId: 'tenant-1',
          })
        );
      });

      it('should work without audit service (optional dependency)', async () => {
        const metadata: ScopeRequirementMetadata = {
          minimumScope: RoleScope.LOCATION,
        };
        const reflector = createMockReflector(metadata);
        const guard = new ScopedPermissionGuard(
          reflector,
          scopedPermissionService,
          null // No audit service
        );

        const context = createMockExecutionContext({
          user: {
            id: 'user-1',
            role: Role.OPERATOR,
            tenantId: 'tenant-1',
            locationId: 'location-1',
          },
          params: { locationId: 'location-1' },
          headers: {},
          body: {},
          method: 'GET',
        });

        // Should not throw
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('HTTP methods for write detection', () => {
      const writeMethodScenarios = [
        { method: 'POST', isWrite: true },
        { method: 'PUT', isWrite: true },
        { method: 'PATCH', isWrite: true },
        { method: 'DELETE', isWrite: true },
        { method: 'GET', isWrite: false },
        { method: 'HEAD', isWrite: false },
        { method: 'OPTIONS', isWrite: false },
      ];

      writeMethodScenarios.forEach(({ method, isWrite }) => {
        it(`should treat ${method} as ${isWrite ? 'write' : 'read'} operation`, async () => {
          const metadata: ScopeRequirementMetadata = {
            minimumScope: RoleScope.GLOBAL,
            allowGlobalWrite: false,
          };
          const reflector = createMockReflector(metadata);
          const guard = new ScopedPermissionGuard(
            reflector,
            scopedPermissionService,
            null
          );

          const context = createMockExecutionContext({
            user: {
              id: 'user-1',
              role: Role.SUPER_ADMIN,
              tenantId: 'tenant-1',
            },
            params: { tenantId: 'tenant-other' },
            headers: {},
            body: { tenantId: 'tenant-other' },
            method,
          });

          if (isWrite) {
            // Cross-tenant write should be denied for SUPER_ADMIN
            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
          } else {
            // Cross-tenant read should be allowed
            const result = await guard.canActivate(context);
            expect(result).toBe(true);
          }
        });
      });
    });
  });
});
