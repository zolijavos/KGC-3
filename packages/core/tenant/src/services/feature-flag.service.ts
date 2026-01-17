import { Injectable } from '@nestjs/common';
import { TenantService } from './tenant.service';
import {
  FeatureFlag,
  PlanType,
  PLAN_DEFAULT_FEATURES,
  isValidFeatureFlag,
  FeatureCheckResult,
} from '../interfaces/feature-flag.interface';

/**
 * FeatureFlagService - Tenant-level feature flag management
 * @kgc/tenant - Feature flag infrastructure
 *
 * Felelősségek:
 * - Feature flag ellenőrzés tenant szinten
 * - Plan-based default feature kezelés
 * - Custom feature enable/disable
 * - Feature dependency kezelés
 */
@Injectable()
export class FeatureFlagService {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const enabledFeatures = await this.getEnabledFeatures(tenantId);
    return enabledFeatures.includes(feature);
  }

  /**
   * Get all enabled features for a tenant
   * Combines plan defaults + custom features
   */
  async getEnabledFeatures(tenantId: string): Promise<FeatureFlag[]> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return [];
    }
    const plan = (tenant.settings?.plan as PlanType) ?? 'basic';
    const customFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];

    // Get plan default features
    const planFeatures = PLAN_DEFAULT_FEATURES[plan] ?? PLAN_DEFAULT_FEATURES.basic;

    // Combine and deduplicate
    const allFeatures = [...new Set([...planFeatures, ...customFeatures])];

    return allFeatures;
  }

  /**
   * Get detailed feature check result
   */
  async checkFeature(
    tenantId: string,
    feature: FeatureFlag
  ): Promise<FeatureCheckResult> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return { feature, enabled: false };
    }
    const plan = (tenant.settings?.plan as PlanType) ?? 'basic';
    const customFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];
    const planFeatures = PLAN_DEFAULT_FEATURES[plan] ?? PLAN_DEFAULT_FEATURES.basic;

    // Check custom features first
    if (customFeatures.includes(feature)) {
      return { feature, enabled: true, reason: 'custom' };
    }

    // Check plan features
    if (planFeatures.includes(feature)) {
      return { feature, enabled: true, reason: 'plan' };
    }

    return { feature, enabled: false };
  }

  /**
   * Enable a feature for a tenant
   */
  async enableFeature(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return false;
    }
    const currentFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];

    // Don't add if already present
    if (currentFeatures.includes(feature)) {
      return true;
    }

    const updatedFeatures = [...currentFeatures, feature];

    await this.tenantService.updateTenant(tenantId, {
      settings: {
        ...tenant.settings,
        features: updatedFeatures,
      },
    });

    return true;
  }

  /**
   * Disable a feature for a tenant
   */
  async disableFeature(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return false;
    }
    const currentFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];

    const updatedFeatures = currentFeatures.filter((f) => f !== feature);

    await this.tenantService.updateTenant(tenantId, {
      settings: {
        ...tenant.settings,
        features: updatedFeatures,
      },
    });

    return true;
  }

  /**
   * Validate if a string is a valid feature flag
   */
  validateFeatureFlag(flag: string): boolean {
    return isValidFeatureFlag(flag);
  }

  /**
   * Get tenant feature status
   */
  async getTenantFeatureStatus(tenantId: string): Promise<{
    tenantId: string;
    plan: PlanType;
    planFeatures: FeatureFlag[];
    customFeatures: FeatureFlag[];
    allEnabledFeatures: FeatureFlag[];
  } | null> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return null;
    }
    const plan = (tenant.settings?.plan as PlanType) ?? 'basic';
    const customFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];
    const planFeatures = PLAN_DEFAULT_FEATURES[plan] ?? PLAN_DEFAULT_FEATURES.basic;

    return {
      tenantId,
      plan,
      planFeatures,
      customFeatures,
      allEnabledFeatures: await this.getEnabledFeatures(tenantId),
    };
  }

  /**
   * Batch update features
   */
  async updateFeatures(
    tenantId: string,
    enableFeatures: FeatureFlag[] = [],
    disableFeatures: FeatureFlag[] = []
  ): Promise<FeatureFlag[]> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      return [];
    }
    const currentFeatures = (tenant.settings?.features as FeatureFlag[]) ?? [];

    // Remove disabled features, add enabled features
    let updatedFeatures = currentFeatures.filter(
      (f) => !disableFeatures.includes(f)
    );
    updatedFeatures = [
      ...new Set([...updatedFeatures, ...enableFeatures]),
    ];

    await this.tenantService.updateTenant(tenantId, {
      settings: {
        ...tenant.settings,
        features: updatedFeatures,
      },
    });

    return this.getEnabledFeatures(tenantId);
  }
}
