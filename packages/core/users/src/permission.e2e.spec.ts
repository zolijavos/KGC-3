/**
 * Permission Guard E2E Tests
 * Story 2.3: Permission Check Middleware
 * AC#8: E2E Tests
 *
 * Tests the full permission checking flow through guard and interceptor.
 * Validates:
 * - AC1: @RequirePermission decorator
 * - AC2: PermissionGuard implementation
 * - AC3: 403 Forbidden response
 * - AC4: Constraint validation
 * - AC5: Module-level guard registration
 * - AC6: Multiple permissions support (ALL/ANY)
 * - AC7: Tenant context integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

import { PermissionGuard } from './guards/permission.guard';
import { ConstraintInterceptor } from './interceptors/constraint.interceptor';
import { Permission } from './interfaces/permission.interface';
import { Role } from './interfaces/user.interface';
import { AuditAction, IAuditService } from './interfaces/audit.interface';
import { PERMISSIONS_KEY, PERMISSION_LOGIC_KEY } from './decorators/require-permission.decorator';
import { CONSTRAINT_KEY, ConstraintMetadata } from './decorators/check-constraint.decorator';

// Test UUIDs
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';

// Mock ExecutionContext factory
function createMockContext(
  user: { id: string; role: Role; tenantId: string } | null,
  body: Record<string, unknown> = {},
  url = '/api/v1/rentals/123/discount'
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        body,
        url,
      }),
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

// Mock Reflector for permissions
function createPermissionReflector(
  permissions: Permission[] | undefined,
  logic: 'ALL' | 'ANY' | undefined
): Reflector {
  return {
    get: vi.fn((key: string) => {
      if (key === PERMISSIONS_KEY) return permissions;
      if (key === PERMISSION_LOGIC_KEY) return logic;
      return undefined;
    }),
  } as unknown as Reflector;
}

// Mock Reflector for constraints
function createConstraintReflector(
  constraintMetadata: ConstraintMetadata | undefined
): Reflector {
  return {
    get: vi.fn((key: string) => {
      if (key === CONSTRAINT_KEY) return constraintMetadata;
      return undefined;
    }),
  } as unknown as Reflector;
}

// Mock AuditService
function createMockAuditService(): IAuditService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock CallHandler
function createMockCallHandler() {
  return {
    handle: vi.fn().mockReturnValue(of({ success: true })),
  };
}

describe('Permission E2E Tests (Story 2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // E2E Test 1: Permission granted - happy path
  // ============================================

  describe('E2E 1: Permission granted - happy path', () => {
    it('should allow access when user has required permission (OPERATOR → rental:view)', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.RENTAL_VIEW], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow BOLTVEZETO to access rental:discount endpoint', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.RENTAL_DISCOUNT], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ============================================
  // E2E Test 2: Permission denied - 403 response
  // ============================================

  describe('E2E 2: Permission denied - 403 response', () => {
    it('should return 403 with correct error code when OPERATOR accesses admin:config', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.ADMIN_CONFIG], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act & Assert
      try {
        await guard.canActivate(context);
        expect.fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: 'PERMISSION_DENIED',
          message: expect.stringContaining('admin:config'),
        });
      }
    });

    it('should return 403 when TECHNIKUS tries to access rental:discount', async () => {
      // Arrange - TECHNIKUS does NOT have rental:discount
      const reflector = createPermissionReflector([Permission.RENTAL_DISCOUNT], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.TECHNIKUS,
        tenantId: testTenantId,
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // E2E Test 3: Multiple permissions - ALL logic
  // ============================================

  describe('E2E 3: Multiple permissions - ALL logic', () => {
    it('should allow when user has ALL required permissions', async () => {
      // Arrange - BOLTVEZETO has both
      const reflector = createPermissionReflector(
        [Permission.RENTAL_VIEW, Permission.RENTAL_DISCOUNT],
        'ALL'
      );
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny when user is missing one of ALL required permissions', async () => {
      // Arrange - OPERATOR has rental:view but NOT rental:discount
      const reflector = createPermissionReflector(
        [Permission.RENTAL_VIEW, Permission.RENTAL_DISCOUNT],
        'ALL'
      );
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // E2E Test 4: Multiple permissions - ANY logic
  // ============================================

  describe('E2E 4: Multiple permissions - ANY logic', () => {
    it('should allow when user has at least one of ANY required permissions', async () => {
      // Arrange - OPERATOR has rental:view but NOT admin:config
      const reflector = createPermissionReflector(
        [Permission.RENTAL_VIEW, Permission.ADMIN_CONFIG],
        'ANY'
      );
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny when user has NONE of ANY required permissions', async () => {
      // Arrange - OPERATOR has neither admin:config nor admin:system
      const reflector = createPermissionReflector(
        [Permission.ADMIN_CONFIG, Permission.ADMIN_SYSTEM],
        'ANY'
      );
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // E2E Test 5: Constraint violation
  // ============================================

  describe('E2E 5: Constraint violation', () => {
    it('should allow discount within limit (BOLTVEZETO ±20%)', () => {
      // Arrange
      const reflector = createConstraintReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      const interceptor = new ConstraintInterceptor(reflector);
      const context = createMockContext(
        { id: testUserId, role: Role.BOLTVEZETO, tenantId: testTenantId },
        { discountPercent: 15 }
      );
      const callHandler = createMockCallHandler();

      // Act
      interceptor.intercept(context, callHandler);

      // Assert
      expect(callHandler.handle).toHaveBeenCalled();
    });

    it('should reject discount exceeding limit (BOLTVEZETO 25% > 20%)', () => {
      // Arrange
      const reflector = createConstraintReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      const interceptor = new ConstraintInterceptor(reflector);
      const context = createMockContext(
        { id: testUserId, role: Role.BOLTVEZETO, tenantId: testTenantId },
        { discountPercent: 25 }
      );
      const callHandler = createMockCallHandler();

      // Act & Assert
      expect(() => interceptor.intercept(context, callHandler)).toThrow(ForbiddenException);
    });

    it('should allow higher discount for PARTNER_OWNER (100% limit)', () => {
      // Arrange
      const reflector = createConstraintReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      const interceptor = new ConstraintInterceptor(reflector);
      const context = createMockContext(
        { id: testUserId, role: Role.PARTNER_OWNER, tenantId: testTenantId },
        { discountPercent: 75 }
      );
      const callHandler = createMockCallHandler();

      // Act
      interceptor.intercept(context, callHandler);

      // Assert
      expect(callHandler.handle).toHaveBeenCalled();
    });

    it('should check absolute value for negative discounts (-25% exceeds ±20%)', () => {
      // Arrange
      const reflector = createConstraintReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      const interceptor = new ConstraintInterceptor(reflector);
      const context = createMockContext(
        { id: testUserId, role: Role.BOLTVEZETO, tenantId: testTenantId },
        { discountPercent: -25 } // Negative discount
      );
      const callHandler = createMockCallHandler();

      // Act & Assert
      expect(() => interceptor.intercept(context, callHandler)).toThrow(ForbiddenException);
    });
  });

  // ============================================
  // E2E Test 6: Missing JWT/User - 401/403 response
  // ============================================

  describe('E2E 6: Missing user - 403 response', () => {
    it('should return 403 when user is not present (no JWT)', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.RENTAL_VIEW], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext(null);

      // Act & Assert
      try {
        await guard.canActivate(context);
        expect.fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: 'PERMISSION_DENIED',
          message: expect.stringContaining('felhasználó'),
        });
      }
    });
  });

  // ============================================
  // E2E Test 7: Role inheritance test
  // ============================================

  describe('E2E 7: Role inheritance test', () => {
    it('should allow BOLTVEZETO to access OPERATOR permissions (inheritance)', async () => {
      // Arrange - BOLTVEZETO inherits from TECHNIKUS which inherits from OPERATOR
      // OPERATOR has rental:create
      const reflector = createPermissionReflector([Permission.RENTAL_CREATE], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow PARTNER_OWNER to access BOLTVEZETO permissions (inheritance)', async () => {
      // Arrange - PARTNER_OWNER inherits from BOLTVEZETO
      // BOLTVEZETO has rental:discount
      const reflector = createPermissionReflector([Permission.RENTAL_DISCOUNT], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.PARTNER_OWNER,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow TECHNIKUS to access service:warranty (direct permission)', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.SERVICE_WARRANTY], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.TECHNIKUS,
        tenantId: testTenantId,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should NOT allow OPERATOR to access TECHNIKUS permissions (no inheritance up)', async () => {
      // Arrange - OPERATOR does NOT inherit from TECHNIKUS
      const reflector = createPermissionReflector([Permission.SERVICE_WARRANTY], 'ALL');
      const guard = new PermissionGuard(reflector, null);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // E2E Test 8: Audit log verification
  // ============================================

  describe('E2E 8: Audit log verification', () => {
    it('should log PERMISSION_DENIED to audit service', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.ADMIN_CONFIG], 'ALL');
      const auditService = createMockAuditService();
      const guard = new PermissionGuard(reflector, auditService);
      const context = createMockContext(
        { id: testUserId, role: Role.OPERATOR, tenantId: testTenantId },
        {},
        '/api/v1/admin/config'
      );

      // Act
      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      // Assert
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PERMISSION_DENIED,
          userId: testUserId,
          tenantId: testTenantId,
          resourceType: 'ENDPOINT',
          resourceId: '/api/v1/admin/config',
          details: expect.objectContaining({
            requiredPermissions: [Permission.ADMIN_CONFIG],
            missingPermissions: [Permission.ADMIN_CONFIG],
            userRole: Role.OPERATOR,
            logic: 'ALL',
          }),
        })
      );
    });

    it('should include all missing permissions in audit log for ALL logic', async () => {
      // Arrange
      const reflector = createPermissionReflector(
        [Permission.ADMIN_CONFIG, Permission.ADMIN_SYSTEM, Permission.ADMIN_TENANT],
        'ALL'
      );
      const auditService = createMockAuditService();
      const guard = new PermissionGuard(reflector, auditService);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act
      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      // Assert
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            missingPermissions: expect.arrayContaining([
              Permission.ADMIN_CONFIG,
              Permission.ADMIN_SYSTEM,
              Permission.ADMIN_TENANT,
            ]),
          }),
        })
      );
    });

    it('should NOT call audit service when access is granted', async () => {
      // Arrange
      const reflector = createPermissionReflector([Permission.RENTAL_VIEW], 'ALL');
      const auditService = createMockAuditService();
      const guard = new PermissionGuard(reflector, auditService);
      const context = createMockContext({
        id: testUserId,
        role: Role.OPERATOR,
        tenantId: testTenantId,
      });

      // Act
      await guard.canActivate(context);

      // Assert
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });
});
