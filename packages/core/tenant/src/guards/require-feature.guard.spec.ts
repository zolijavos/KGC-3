import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireFeatureGuard } from './require-feature.guard';
import { FeatureFlag } from '../interfaces/feature-flag.interface';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * TDD Tests for RequireFeatureGuard
 * RED phase - minimum 4 teszt
 */

const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Mock tenant
const mockTenant = {
  id: VALID_TENANT_ID,
  name: 'KGC Szeged',
  slug: 'kgc-szeged',
  status: TenantStatus.ACTIVE,
  settings: {
    ...DEFAULT_TENANT_SETTINGS,
    features: [FeatureFlag.BERLES],
    plan: 'standard',
  },
};

// Mock FeatureFlagService
const mockFeatureFlagService = {
  isFeatureEnabled: vi.fn(),
};

// Mock Reflector
const mockReflector = {
  get: vi.fn(),
  getAllAndOverride: vi.fn(),
};

// Helper to create mock ExecutionContext
function createMockContext(tenant: typeof mockTenant | null = mockTenant): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        tenant,
      }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('RequireFeatureGuard', () => {
  let guard: RequireFeatureGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);
    mockReflector.getAllAndOverride.mockReturnValue(FeatureFlag.BERLES);
    guard = new RequireFeatureGuard(
      mockReflector as unknown as Reflector,
      mockFeatureFlagService as any
    );
  });

  // =========================================
  // ALLOW ACCESS TESTS (2 tesztek)
  // =========================================
  describe('canActivate() - allow', () => {
    it('should allow access when feature is enabled', async () => {
      const context = createMockContext();
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFeatureFlagService.isFeatureEnabled).toHaveBeenCalledWith(
        VALID_TENANT_ID,
        FeatureFlag.BERLES
      );
    });

    it('should allow access when no feature is required', async () => {
      const context = createMockContext();
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  // =========================================
  // DENY ACCESS TESTS (2 tesztek)
  // =========================================
  describe('canActivate() - deny', () => {
    it('should deny access when feature is disabled', async () => {
      const context = createMockContext();
      mockFeatureFlagService.isFeatureEnabled.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when tenant is not set', async () => {
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
