/**
 * PermissionGuard Tests
 * Story 2.3: Permission Check Middleware
 * AC#2: PermissionGuard Implementation
 * AC#3: 403 Forbidden Response
 * AC#6: Multiple Permissions Support
 * AC#7: Tenant Context Integration
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';
import { RoleService } from '../services/role.service';
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';
import { PERMISSIONS_KEY, PERMISSION_LOGIC_KEY } from '../decorators/require-permission.decorator';
import { AuditAction, IAuditService } from '../interfaces/audit.interface';

// C1v2 FIX: Create shared PermissionService for tests
let permissionService: PermissionService;

function getPermissionService(): PermissionService {
  if (!permissionService) {
    const roleService = new RoleService();
    permissionService = new PermissionService(roleService);
  }
  return permissionService;
}

// Mock ExecutionContext factory
function createMockExecutionContext(
  user: { id: string; role: Role; tenantId: string } | null,
  url = '/api/v1/test'
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
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

// Mock Reflector factory
function createMockReflector(
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

// Mock AuditService
function createMockAuditService(): IAuditService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: Reflector;
  let mockAuditService: IAuditService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No decorator (no permission requirement)', () => {
    it('should allow access when no @RequirePermission decorator is present', async () => {
      // Arrange
      mockReflector = createMockReflector(undefined, undefined);
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access when permissions array is empty', async () => {
      // Arrange
      mockReflector = createMockReflector([], undefined);
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Single permission - granted', () => {
    it('should allow access when user has the required permission', async () => {
      // Arrange - OPERATOR has RENTAL_VIEW
      mockReflector = createMockReflector([Permission.RENTAL_VIEW], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Single permission - denied', () => {
    it('should throw ForbiddenException when user lacks permission', async () => {
      // Arrange - OPERATOR does not have ADMIN_CONFIG
      mockReflector = createMockReflector([Permission.ADMIN_CONFIG], 'ALL');
      mockAuditService = createMockAuditService();
      guard = new PermissionGuard(mockReflector, getPermissionService(), mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should include permission in error message', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.ADMIN_CONFIG], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
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
  });

  describe('Multiple permissions - ALL logic (AND)', () => {
    it('should allow access when user has ALL required permissions', async () => {
      // Arrange - BOLTVEZETO has both RENTAL_VIEW and RENTAL_DISCOUNT
      mockReflector = createMockReflector(
        [Permission.RENTAL_VIEW, Permission.RENTAL_DISCOUNT],
        'ALL'
      );
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user is missing ONE permission (ALL logic)', async () => {
      // Arrange - OPERATOR has RENTAL_VIEW but NOT RENTAL_DISCOUNT
      mockReflector = createMockReflector(
        [Permission.RENTAL_VIEW, Permission.RENTAL_DISCOUNT],
        'ALL'
      );
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Multiple permissions - ANY logic (OR)', () => {
    it('should allow access when user has at least ONE required permission', async () => {
      // Arrange - OPERATOR has USER_VIEW=false, RENTAL_VIEW=true
      mockReflector = createMockReflector(
        [Permission.USER_VIEW, Permission.RENTAL_VIEW],
        'ANY'
      );
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user has NONE of the required permissions (ANY logic)', async () => {
      // Arrange - OPERATOR has neither ADMIN_CONFIG nor ADMIN_SYSTEM
      mockReflector = createMockReflector(
        [Permission.ADMIN_CONFIG, Permission.ADMIN_SYSTEM],
        'ANY'
      );
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Missing user', () => {
    it('should throw ForbiddenException when user is not present', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.RENTAL_VIEW], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with correct error code when user is missing', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.RENTAL_VIEW], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext(null);

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

  describe('Audit logging on denial', () => {
    it('should log to audit service when permission is denied', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.ADMIN_CONFIG], 'ALL');
      mockAuditService = createMockAuditService();
      guard = new PermissionGuard(mockReflector, getPermissionService(), mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PERMISSION_DENIED,
          userId: 'user-1',
          tenantId: 'tenant-1',
          resourceType: 'ENDPOINT',
        })
      );
    });

    it('should include missing permissions in audit details', async () => {
      // Arrange
      mockReflector = createMockReflector(
        [Permission.ADMIN_CONFIG, Permission.ADMIN_SYSTEM],
        'ALL'
      );
      mockAuditService = createMockAuditService();
      guard = new PermissionGuard(mockReflector, getPermissionService(), mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            missingPermissions: expect.arrayContaining([
              Permission.ADMIN_CONFIG,
              Permission.ADMIN_SYSTEM,
            ]),
          }),
        })
      );
    });

    it('should not fail if audit service is not provided', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.ADMIN_CONFIG], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert - should throw ForbiddenException, not an error about null audit service
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Role inheritance', () => {
    it('should respect role inheritance (TECHNIKUS inherits from OPERATOR)', async () => {
      // Arrange - OPERATOR has RENTAL_VIEW, TECHNIKUS inherits from OPERATOR
      mockReflector = createMockReflector([Permission.RENTAL_VIEW], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.TECHNIKUS,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should respect role inheritance (BOLTVEZETO inherits from TECHNIKUS)', async () => {
      // Arrange - TECHNIKUS has SERVICE_WARRANTY, BOLTVEZETO inherits
      mockReflector = createMockReflector([Permission.SERVICE_WARRANTY], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should respect role inheritance (PARTNER_OWNER inherits from BOLTVEZETO)', async () => {
      // Arrange - BOLTVEZETO has RENTAL_DISCOUNT, PARTNER_OWNER inherits
      mockReflector = createMockReflector([Permission.RENTAL_DISCOUNT], 'ALL');
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Tenant context', () => {
    it('should have access to tenant context from request user', async () => {
      // Arrange
      mockReflector = createMockReflector([Permission.RENTAL_VIEW], 'ALL');
      mockAuditService = createMockAuditService();
      guard = new PermissionGuard(mockReflector, getPermissionService(), mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-specific-123',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Default logic behavior', () => {
    it('should default to ALL logic when logic is not specified', async () => {
      // Arrange - undefined logic, multiple permissions
      mockReflector = createMockReflector(
        [Permission.RENTAL_VIEW, Permission.RENTAL_DISCOUNT],
        undefined
      );
      guard = new PermissionGuard(mockReflector, getPermissionService(), null);
      // OPERATOR has RENTAL_VIEW but NOT RENTAL_DISCOUNT
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert - should deny because ALL logic requires both permissions
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
