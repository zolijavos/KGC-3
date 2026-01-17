/**
 * ElevatedAccessGuard Tests
 * Story 2.4: Elevated Access Requirement
 * AC#3: ElevatedAccessGuard Implementation
 * AC#7: Guard Ordering
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ElevatedAccessGuard } from './elevated-access.guard';
import { ElevatedAccessService } from '../services/elevated-access.service';
import { Role } from '../interfaces/user.interface';
import { AuditAction, IAuditService } from '../interfaces/audit.interface';
import {
  ELEVATED_ACCESS_KEY,
  ElevatedAccessMetadata,
} from '../decorators/require-elevated-access.decorator';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

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
function createMockAuditService(): IAuditService {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock ElevatedAccessService
function createMockElevatedAccessService(
  isValid: boolean,
  timeRemaining: number = 0
): ElevatedAccessService {
  return {
    isVerificationValid: vi.fn().mockReturnValue(isValid),
    getTimeRemaining: vi.fn().mockReturnValue(timeRemaining),
    recordVerification: vi.fn(),
    getValidUntil: vi.fn().mockReturnValue(isValid ? new Date().toISOString() : null),
    clearVerification: vi.fn(),
    clearAll: vi.fn(),
  } as unknown as ElevatedAccessService;
}

describe('ElevatedAccessGuard', () => {
  let guard: ElevatedAccessGuard;
  let mockReflector: Reflector;
  let mockAuditService: IAuditService;
  let mockElevatedAccessService: ElevatedAccessService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No decorator (no elevated access requirement)', () => {
    it('should allow access when no @RequireElevatedAccess decorator is present', async () => {
      // Arrange
      mockReflector = createMockReflector(undefined);
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockElevatedAccessService.isVerificationValid).not.toHaveBeenCalled();
    });
  });

  describe('Valid elevated access', () => {
    it('should allow access when user has valid elevated access session', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(true, 180000); // 3 min remaining
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
        tenantId: 'tenant-1',
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockElevatedAccessService.isVerificationValid).toHaveBeenCalledWith(
        'user-1',
        ELEVATED_ACCESS_TTL_MS
      );
    });

    it('should use custom TTL from decorator metadata', async () => {
      // Arrange
      const customTtl = 60000; // 1 minute
      mockReflector = createMockReflector({ ttlMs: customTtl });
      mockElevatedAccessService = createMockElevatedAccessService(true, 30000);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-1',
      });

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockElevatedAccessService.isVerificationValid).toHaveBeenCalledWith(
        'user-1',
        customTtl
      );
    });
  });

  describe('Expired or missing elevated access', () => {
    it('should throw ForbiddenException when elevated access has expired', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has never verified', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-never-verified',
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should include correct error code in exception', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
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
          code: 'ELEVATED_ACCESS_REQUIRED',
          message: expect.stringContaining('hitelesítés'),
        });
      }
    });
  });

  describe('Missing user', () => {
    it('should throw ForbiddenException when user is not present', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user.id is missing', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: '',
        role: Role.OPERATOR,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Audit logging', () => {
    it('should log ELEVATED_ACCESS_GRANTED on successful verification', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(true, 180000);
      mockAuditService = createMockAuditService();
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-1',
      });

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_GRANTED,
          userId: 'user-1',
          tenantId: 'tenant-1',
          resourceType: 'ENDPOINT',
        })
      );
    });

    it('should log ELEVATED_ACCESS_DENIED on failed verification', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      mockAuditService = createMockAuditService();
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, mockAuditService);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.BOLTVEZETO,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ELEVATED_ACCESS_DENIED,
          userId: 'user-1',
          tenantId: 'tenant-1',
          resourceType: 'ENDPOINT',
        })
      );
    });

    it('should not fail when audit service is not available', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(true, 180000);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.PARTNER_OWNER,
        tenantId: 'tenant-1',
      });

      // Act & Assert - should not throw
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero TTL', async () => {
      // Arrange - zero TTL should always fail unless just verified
      mockReflector = createMockReflector({ ttlMs: 0 });
      mockElevatedAccessService = createMockElevatedAccessService(false);
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, null);
      const context = createMockExecutionContext({
        id: 'user-1',
        role: Role.SUPER_ADMIN,
        tenantId: 'tenant-1',
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should include request URL in audit log', async () => {
      // Arrange
      mockReflector = createMockReflector({ ttlMs: ELEVATED_ACCESS_TTL_MS });
      mockElevatedAccessService = createMockElevatedAccessService(true, 180000);
      mockAuditService = createMockAuditService();
      guard = new ElevatedAccessGuard(mockReflector, mockElevatedAccessService, mockAuditService);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.PARTNER_OWNER, tenantId: 'tenant-1' },
        '/api/v1/rentals/123/cancel'
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: '/api/v1/rentals/123/cancel',
        })
      );
    });
  });
});
