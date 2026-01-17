import { Injectable, Inject } from '@nestjs/common';
import type { IFeatureFlagRepository, FeatureFlag } from '../interfaces/config.interface';

export const FEATURE_FLAG_REPOSITORY = 'FEATURE_FLAG_REPOSITORY';

/**
 * Service for managing feature flags
 * Supports global and tenant-specific feature flags
 */
@Injectable()
export class FeatureFlagService {
  constructor(
    @Inject(FEATURE_FLAG_REPOSITORY)
    private readonly repository: IFeatureFlagRepository
  ) {}

  /**
   * Check if a feature flag is enabled
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID for tenant-specific flags
   * @param defaultValue - Default value if flag not found (defaults to false)
   * @returns true if enabled, false otherwise
   */
  async isEnabled(key: string, tenantId?: string, defaultValue = false): Promise<boolean> {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      return false;
    }

    try {
      const flag = await this.repository.get(trimmedKey, tenantId);

      if (!flag) {
        return defaultValue;
      }

      return flag.enabled;
    } catch (error) {
      // TODO: Inject proper Logger service for production
      console.error(`Error checking feature flag "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Enable a feature flag
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID
   * @param metadata - Optional metadata
   */
  async enable(
    key: string,
    tenantId?: string,
    metadata?: Record<string, unknown>
  ): Promise<FeatureFlag> {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new Error('Feature flag key is required');
    }

    const flag: Parameters<typeof this.repository.set>[0] = {
      key: trimmedKey,
      enabled: true,
    };

    if (tenantId !== undefined) {
      flag.tenantId = tenantId;
    }
    if (metadata !== undefined) {
      flag.metadata = metadata;
    }

    return this.repository.set(flag);
  }

  /**
   * Disable a feature flag
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID
   */
  async disable(key: string, tenantId?: string): Promise<FeatureFlag> {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new Error('Feature flag key is required');
    }

    const flag: Parameters<typeof this.repository.set>[0] = {
      key: trimmedKey,
      enabled: false,
    };

    if (tenantId !== undefined) {
      flag.tenantId = tenantId;
    }

    return this.repository.set(flag);
  }

  /**
   * Toggle a feature flag
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID
   * @returns The updated feature flag
   */
  async toggle(key: string, tenantId?: string): Promise<FeatureFlag> {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new Error('Feature flag key is required');
    }

    const existing = await this.repository.get(trimmedKey, tenantId);
    const newEnabled = existing ? !existing.enabled : true;

    const flag: Parameters<typeof this.repository.set>[0] = {
      key: trimmedKey,
      enabled: newEnabled,
    };

    if (tenantId !== undefined) {
      flag.tenantId = tenantId;
    }
    if (existing?.metadata !== undefined) {
      flag.metadata = existing.metadata;
    }

    return this.repository.set(flag);
  }

  /**
   * List all feature flags
   * @param tenantId - Optional tenant ID to filter by
   */
  async list(tenantId?: string): Promise<FeatureFlag[]> {
    return this.repository.list(tenantId);
  }

  /**
   * Delete a feature flag
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID
   */
  async delete(key: string, tenantId?: string): Promise<boolean> {
    return this.repository.delete(key.trim(), tenantId);
  }

  /**
   * Get a feature flag by key
   * @param key - Feature flag key
   * @param tenantId - Optional tenant ID
   */
  async get(key: string, tenantId?: string): Promise<FeatureFlag | null> {
    return this.repository.get(key.trim(), tenantId);
  }
}
