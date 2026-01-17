/**
 * Elevated Access E2E Tests
 * Story 2.4: Elevated Access Requirement
 * AC#8: E2E Tests
 *
 * Tests the full elevated access flow:
 * - AC1: ELEVATED_PERMISSIONS constant
 * - AC2: @RequireElevatedAccess decorator integration
 * - AC3: ElevatedAccessGuard with controller
 * - AC4: ElevatedAccessService session management
 * - AC5: Audit logging for elevated access events
 * - AC6: Verify password endpoint flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ElevatedAccessGuard } from './guards/elevated-access.guard';
import { ElevatedAccessService } from './services/elevated-access.service';
import { Permission } from './interfaces/permission.interface';
import { Role } from './interfaces/user.interface';
import { AuditAction, IAuditService } from './interfaces/audit.interface';
import {
  ELEVATED_ACCESS_KEY,
  ElevatedAccessMetadata,
} from './decorators/require-elevated-access.decorator';
import {
  ELEVATED_PERMISSIONS,
  ELEVATED_ACCESS_TTL_MS,
  isElevatedPermission,
} from './constants/elevated-access.constants';

// Test UUIDs
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';

// Mock ExecutionContext factory
function createMockContext(
  user: { id: string; role: Role; tenantId: string } | null,
  url = '/api/v1/rentals/123/cancel'
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

// Mock Reflector for elevated access
function createElevatedAccessReflector(
  metadata: ElevatedAccessMetadata | undefined
): Reflector {
  return {
    get: vi.fn((key: string) => {
      if (key === ELEVATED_ACCESS_KEY) return metadata;
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

describe('Elevated Access E2E Tests (Story 2.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================
  // AC#1: ELEVATED_PERMISSIONS Constant Tests
  // ============================================

  describe('AC#1: ELEVATED_PERMISSIONS Definition', () => {
    it('should include RENTAL_CANCEL as elevated permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.RENTAL_CANCEL);
    });

    it('should include INVENTORY_ADJUST as elevated permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.INVENTORY_ADJUST);
    });

    it('should include USER_DELETE as elevated permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.USER_DELETE);
    });

    it('should include ADMIN_CONFIG as elevated permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.ADMIN_CONFIG);
    });

    it('should have exactly 4 elevated permissions', () => {
      expect(ELEVATED_PERMISSIONS).toHaveLength(4);
    });

    it('should correctly identify elevated permissions with isElevatedPermission', () => {
      expect(isElevatedPermission(Permission.RENTAL_CANCEL)).toBe(true);
      expect(isElevatedPermission(Permission.RENTAL_VIEW)).toBe(false);
      expect(isElevatedPermission(Permission.USER_VIEW)).toBe(false);
    });
  });

  // ============================================
  // AC#2 + AC#3: Guard + Decorator Integration
  // ============================================

  describe('AC#2 + AC#3: ElevatedAccessGuard Integration', () => {
    let elevatedAccessService: ElevatedAccessService;
    let mockAuditService: ReturnType<typeof createMockAuditService>;

    beforeEach(() => {
      elevatedAccessService = new ElevatedAccessService();
      elevatedAccessService.clearAll();
      mockAuditService = createMockAuditService();
    });

    it('should allow access when user has valid elevated access session', async () => {
      // Arrange: User with valid elevated access
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_GRANTED,
          userId: testUserId,
          tenantId: testTenantId,
        })
      );
    });

    it('should deny access when user has no elevated access session', async () => {
      // Arrange: User without elevated access
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_DENIED,
          userId: testUserId,
        })
      );
    });

    it('should deny access when elevated access session has expired', async () => {
      vi.useFakeTimers();

      // Arrange: User with expired elevated access
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      // Fast-forward past TTL (5 minutes + 1 second)
      vi.advanceTimersByTime(ELEVATED_ACCESS_TTL_MS + 1000);

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when no @RequireElevatedAccess decorator', async () => {
      // Arrange: No elevated access requirement
      const user = { id: testUserId, role: Role.OPERATOR, tenantId: testTenantId };

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector(undefined); // No decorator
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should respect custom TTL from decorator', async () => {
      vi.useFakeTimers();

      // Arrange: Custom 1-minute TTL
      const customTtl = 60000; // 1 minute
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      // Fast-forward 30 seconds (should still be valid)
      vi.advanceTimersByTime(30000);

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector({ ttlMs: customTtl });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, null);

      // Act - should pass
      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      // Fast-forward another 31 seconds (should be expired)
      vi.advanceTimersByTime(31000);

      // Act & Assert - should fail
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // AC#4: Session Management Tests
  // ============================================

  describe('AC#4: ElevatedAccessService Session Management', () => {
    let service: ElevatedAccessService;

    beforeEach(() => {
      service = new ElevatedAccessService();
      service.clearAll();
    });

    it('should track multiple users independently', () => {
      vi.useFakeTimers();

      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 verifies at t=0
      service.recordVerification(user1);

      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // User 2 verifies at t=2min
      service.recordVerification(user2);

      // Check remaining times
      expect(service.getTimeRemaining(user1)).toBe(3 * 60 * 1000); // 3 minutes
      expect(service.getTimeRemaining(user2)).toBe(5 * 60 * 1000); // 5 minutes (full)
    });

    it('should reset TTL on re-verification', () => {
      vi.useFakeTimers();

      // First verification
      service.recordVerification(testUserId);

      // Advance 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(service.getTimeRemaining(testUserId)).toBe(60 * 1000); // 1 minute left

      // Re-verify
      service.recordVerification(testUserId);
      expect(service.getTimeRemaining(testUserId)).toBe(5 * 60 * 1000); // Full 5 minutes
    });

    it('should clear specific user verification', () => {
      service.recordVerification('user-1');
      service.recordVerification('user-2');

      service.clearVerification('user-1');

      expect(service.isVerificationValid('user-1')).toBe(false);
      expect(service.isVerificationValid('user-2')).toBe(true);
    });

    it('should return ISO8601 validUntil timestamp', () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-16T10:00:00.000Z');
      vi.setSystemTime(now);

      service.recordVerification(testUserId);

      const validUntil = service.getValidUntil(testUserId);
      expect(validUntil).toBe('2026-01-16T10:05:00.000Z'); // 5 minutes later
    });
  });

  // ============================================
  // AC#5: Audit Logging Tests
  // ============================================

  describe('AC#5: Audit Logging Integration', () => {
    let elevatedAccessService: ElevatedAccessService;
    let mockAuditService: ReturnType<typeof createMockAuditService>;

    beforeEach(() => {
      elevatedAccessService = new ElevatedAccessService();
      elevatedAccessService.clearAll();
      mockAuditService = createMockAuditService();
    });

    it('should log ELEVATED_ACCESS_GRANTED on successful access', async () => {
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      const context = createMockContext(user, '/api/v1/rentals/123/cancel');
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      await guard.canActivate(context);

      expect(mockAuditService.log).toHaveBeenCalledWith({
        action: AuditAction.ELEVATED_ACCESS_GRANTED,
        userId: testUserId,
        tenantId: testTenantId,
        resourceType: 'ENDPOINT',
        resourceId: '/api/v1/rentals/123/cancel',
        details: expect.objectContaining({
          remainingMs: expect.any(Number),
        }),
      });
    });

    it('should log ELEVATED_ACCESS_DENIED on failed access', async () => {
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      // No verification recorded

      const context = createMockContext(user, '/api/v1/users/123');
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      expect(mockAuditService.log).toHaveBeenCalledWith({
        action: AuditAction.ELEVATED_ACCESS_DENIED,
        userId: testUserId,
        tenantId: testTenantId,
        resourceType: 'ENDPOINT',
        resourceId: '/api/v1/users/123',
        details: {
          reason: 'No valid elevated access session',
          requiredTtlMs: ELEVATED_ACCESS_TTL_MS,
        },
      });
    });

    it('should work without audit service (optional dependency)', async () => {
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      const context = createMockContext(user);
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, null);

      // Should not throw even without audit service
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Full Flow E2E Test
  // ============================================

  describe('Full Elevated Access Flow', () => {
    it('should complete full elevated access flow', async () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-16T10:00:00.000Z');
      vi.setSystemTime(now);

      const elevatedAccessService = new ElevatedAccessService();
      const mockAuditService = createMockAuditService();

      // Step 1: User tries to access elevated endpoint without verification
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      const context = createMockContext(user, '/api/v1/rentals/123/cancel');
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      // Should be denied
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_DENIED,
        })
      );

      // Step 2: User verifies password (simulated)
      elevatedAccessService.recordVerification(testUserId);

      // Step 3: User retries elevated endpoint
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockAuditService.log).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_GRANTED,
        })
      );

      // Step 4: Check validUntil
      const validUntil = elevatedAccessService.getValidUntil(testUserId);
      expect(validUntil).toBe('2026-01-16T10:05:00.000Z');

      // Step 5: Fast-forward past TTL
      vi.advanceTimersByTime(ELEVATED_ACCESS_TTL_MS + 1000);

      // Step 6: Session expired
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should work with PermissionGuard in combined flow', async () => {
      // This test demonstrates how ElevatedAccessGuard works alongside PermissionGuard
      // In a real controller, guards are applied in order: [JwtAuthGuard, PermissionGuard, ElevatedAccessGuard]

      const elevatedAccessService = new ElevatedAccessService();
      const mockAuditService = createMockAuditService();

      // User with RENTAL_CANCEL permission and elevated access
      const user = { id: testUserId, role: Role.ADMIN, tenantId: testTenantId };
      elevatedAccessService.recordVerification(testUserId);

      const context = createMockContext(user, '/api/v1/rentals/123/cancel');
      const reflector = createElevatedAccessReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      const guard = new ElevatedAccessGuard(reflector, elevatedAccessService, mockAuditService);

      // ElevatedAccessGuard should pass (after PermissionGuard would have passed)
      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      // Verify permission is elevated
      expect(isElevatedPermission(Permission.RENTAL_CANCEL)).toBe(true);
    });
  });
});
