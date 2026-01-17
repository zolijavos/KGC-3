import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService } from './feature-flag.service';
import {
  FeatureFlag,
  PLAN_DEFAULT_FEATURES,
} from '../interfaces/feature-flag.interface';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * TDD Tests for FeatureFlagService
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 8 teszt (TDD követelmény)
 */

// Valid UUID v4 format
const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Mock TenantService
const mockTenantService = {
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
};

// Mock tenant
const createMockTenant = (features: string[] = [], plan: string = 'standard') => ({
  id: VALID_TENANT_ID,
  name: 'KGC Szeged',
  slug: 'kgc-szeged',
  status: TenantStatus.ACTIVE,
  settings: {
    ...DEFAULT_TENANT_SETTINGS,
    features,
    plan,
  },
  parentTenantId: null,
  schemaName: 'tenant_kgc_szeged',
  schemaCreatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

describe('FeatureFlagService', () => {
  let featureFlagService: FeatureFlagService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantService.getTenantById.mockResolvedValue(createMockTenant());
    featureFlagService = new FeatureFlagService(mockTenantService as any);
  });

  // =========================================
  // FEATURE CHECK TESTS (3 tesztek)
  // =========================================
  describe('isFeatureEnabled()', () => {
    it('should return true for enabled feature', async () => {
      const tenant = createMockTenant([FeatureFlag.BERLES_KAUCIO], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const result = await featureFlagService.isFeatureEnabled(
        VALID_TENANT_ID,
        FeatureFlag.BERLES_KAUCIO
      );

      expect(result).toBe(true);
    });

    it('should return true for plan default features', async () => {
      const tenant = createMockTenant([], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      // BERLES is default for standard plan
      const result = await featureFlagService.isFeatureEnabled(
        VALID_TENANT_ID,
        FeatureFlag.BERLES
      );

      expect(result).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      const tenant = createMockTenant([], 'basic');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      // PREMIUM_REPORTING is not in basic plan
      const result = await featureFlagService.isFeatureEnabled(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_REPORTING
      );

      expect(result).toBe(false);
    });
  });

  // =========================================
  // GET FEATURES TESTS (2 tesztek)
  // =========================================
  describe('getEnabledFeatures()', () => {
    it('should return all enabled features for tenant', async () => {
      const customFeatures = [FeatureFlag.PREMIUM_AI];
      const tenant = createMockTenant(customFeatures, 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const features = await featureFlagService.getEnabledFeatures(VALID_TENANT_ID);

      // Should include plan defaults + custom features
      expect(features).toContain(FeatureFlag.BERLES);
      expect(features).toContain(FeatureFlag.PREMIUM_AI);
    });

    it('should return plan default features when no custom features', async () => {
      const tenant = createMockTenant([], 'basic');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const features = await featureFlagService.getEnabledFeatures(VALID_TENANT_ID);

      expect(features).toEqual(expect.arrayContaining(PLAN_DEFAULT_FEATURES.basic));
    });
  });

  // =========================================
  // ENABLE/DISABLE TESTS (2 tesztek)
  // =========================================
  describe('enableFeature()', () => {
    it('should enable a feature for tenant', async () => {
      const tenant = createMockTenant([], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);
      mockTenantService.updateTenant.mockResolvedValue({
        ...tenant,
        settings: {
          ...tenant.settings,
          features: [FeatureFlag.PREMIUM_REPORTING],
        },
      });

      const result = await featureFlagService.enableFeature(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_REPORTING
      );

      expect(result).toBe(true);
      expect(mockTenantService.updateTenant).toHaveBeenCalled();
    });
  });

  describe('disableFeature()', () => {
    it('should disable a feature for tenant', async () => {
      const tenant = createMockTenant([FeatureFlag.PREMIUM_REPORTING], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);
      mockTenantService.updateTenant.mockResolvedValue({
        ...tenant,
        settings: {
          ...tenant.settings,
          features: [],
        },
      });

      const result = await featureFlagService.disableFeature(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_REPORTING
      );

      expect(result).toBe(true);
      expect(mockTenantService.updateTenant).toHaveBeenCalled();
    });
  });

  // =========================================
  // VALIDATION TESTS (2 tesztek)
  // =========================================
  describe('validateFeatureFlag()', () => {
    it('should return true for valid feature flag', () => {
      const isValid = featureFlagService.validateFeatureFlag(FeatureFlag.BERLES);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid feature flag', () => {
      const isValid = featureFlagService.validateFeatureFlag('invalid:feature');
      expect(isValid).toBe(false);
    });
  });

  // =========================================
  // TENANT NOT FOUND TEST (1 teszt)
  // =========================================
  describe('error handling', () => {
    it('should throw error when tenant not found', async () => {
      mockTenantService.getTenantById.mockRejectedValue(
        new Error('Tenant nem található')
      );

      await expect(
        featureFlagService.isFeatureEnabled(VALID_TENANT_ID, FeatureFlag.BERLES)
      ).rejects.toThrow('Tenant nem található');
    });
  });

  // =========================================
  // ADDITIONAL TESTS FOR COVERAGE (5 tesztek)
  // =========================================
  describe('checkFeature()', () => {
    it('should return custom reason for custom feature', async () => {
      const tenant = createMockTenant([FeatureFlag.PREMIUM_AI], 'basic');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const result = await featureFlagService.checkFeature(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_AI
      );

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('custom');
    });

    it('should return plan reason for plan feature', async () => {
      const tenant = createMockTenant([], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const result = await featureFlagService.checkFeature(
        VALID_TENANT_ID,
        FeatureFlag.BERLES
      );

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('plan');
    });

    it('should return disabled for missing feature', async () => {
      const tenant = createMockTenant([], 'basic');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const result = await featureFlagService.checkFeature(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_AI
      );

      expect(result.enabled).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('getTenantFeatureStatus()', () => {
    it('should return complete tenant feature status', async () => {
      const customFeatures = [FeatureFlag.PREMIUM_AI];
      const tenant = createMockTenant(customFeatures, 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const status = await featureFlagService.getTenantFeatureStatus(VALID_TENANT_ID);

      expect(status.tenantId).toBe(VALID_TENANT_ID);
      expect(status.plan).toBe('standard');
      expect(status.customFeatures).toContain(FeatureFlag.PREMIUM_AI);
      expect(status.planFeatures).toEqual(expect.arrayContaining(PLAN_DEFAULT_FEATURES.standard));
    });
  });

  describe('updateFeatures()', () => {
    it('should batch update features', async () => {
      const tenant = createMockTenant([FeatureFlag.PREMIUM_AI], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);
      mockTenantService.updateTenant.mockResolvedValue(tenant);

      const result = await featureFlagService.updateFeatures(
        VALID_TENANT_ID,
        [FeatureFlag.PREMIUM_REPORTING], // enable
        [FeatureFlag.PREMIUM_AI] // disable
      );

      expect(mockTenantService.updateTenant).toHaveBeenCalled();
      expect(result).toContain(FeatureFlag.BERLES); // plan default
    });
  });

  describe('enableFeature() - already enabled', () => {
    it('should not duplicate feature when already enabled', async () => {
      const tenant = createMockTenant([FeatureFlag.PREMIUM_REPORTING], 'standard');
      mockTenantService.getTenantById.mockResolvedValue(tenant);

      const result = await featureFlagService.enableFeature(
        VALID_TENANT_ID,
        FeatureFlag.PREMIUM_REPORTING
      );

      expect(result).toBe(true);
      expect(mockTenantService.updateTenant).not.toHaveBeenCalled();
    });
  });
});
