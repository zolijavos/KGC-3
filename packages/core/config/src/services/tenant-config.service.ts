import { Injectable, Inject, Scope } from '@nestjs/common';
import { ConfigService } from './config.service';
import { FeatureFlagService } from './feature-flag.service';
import {
  ConfigEntry,
  ConfigValueType,
  FeatureFlag,
  TypedConfigValue,
} from '../interfaces/config.interface';

export const TENANT_ID = 'TENANT_ID';

interface SetOptions {
  description?: string;
  isSystem?: boolean;
}

interface ConfigExport {
  tenantId: string;
  configs: Array<{ key: string; value: string; type: ConfigValueType; description?: string }>;
  featureFlags: Array<{ key: string; enabled: boolean; description?: string; metadata?: Record<string, unknown> }>;
  exportedAt: Date;
}

interface ConfigImportData {
  tenantId: string;
  configs: Array<{ key: string; value: string; type: ConfigValueType; description?: string }>;
  featureFlags: Array<{ key: string; enabled: boolean; description?: string; metadata?: Record<string, unknown> }>;
}

interface ImportResult {
  configsImported: number;
  featureFlagsImported: number;
  errors: string[];
}

/**
 * Tenant-specific configuration service
 * Provides tenant-scoped access to configuration values and feature flags
 * Supports inheritance from global configs with tenant override
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlagService: FeatureFlagService,
    @Inject(TENANT_ID) private readonly tenantId: string
  ) {}

  /**
   * Get the current tenant ID
   */
  getTenantId(): string {
    return this.tenantId;
  }

  /**
   * Get a string configuration value for the tenant
   */
  async getString(key: string, defaultValue?: string): Promise<TypedConfigValue<string>> {
    return this.configService.getString(key, defaultValue);
  }

  /**
   * Get string with fallback to global config
   */
  async getStringWithFallback(key: string, defaultValue?: string): Promise<TypedConfigValue<string>> {
    try {
      // Try tenant-specific first
      const tenantConfig = await this.configService.get(key, this.tenantId);
      if (tenantConfig) {
        return { value: tenantConfig.value, source: 'database' };
      }
    } catch {
      // Fall through to global
    }

    // Fall back to global
    return this.configService.getString(key, defaultValue);
  }

  /**
   * Get a number configuration value
   */
  async getNumber(key: string, defaultValue?: number): Promise<TypedConfigValue<number>> {
    return this.configService.getNumber(key, defaultValue);
  }

  /**
   * Get number with fallback to global
   */
  async getNumberWithFallback(key: string, defaultValue?: number): Promise<TypedConfigValue<number>> {
    try {
      const tenantConfig = await this.configService.get(key, this.tenantId);
      if (tenantConfig) {
        const parsed = parseFloat(tenantConfig.value);
        if (!isNaN(parsed)) {
          return { value: parsed, source: 'database' };
        }
      }
    } catch {
      // Fall through
    }
    return this.configService.getNumber(key, defaultValue);
  }

  /**
   * Get a boolean configuration value
   */
  async getBoolean(key: string, defaultValue?: boolean): Promise<TypedConfigValue<boolean>> {
    return this.configService.getBoolean(key, defaultValue);
  }

  /**
   * Get boolean with fallback to global
   */
  async getBooleanWithFallback(key: string, defaultValue?: boolean): Promise<TypedConfigValue<boolean>> {
    try {
      const tenantConfig = await this.configService.get(key, this.tenantId);
      if (tenantConfig) {
        const value = tenantConfig.value.toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(value)) {
          return { value: true, source: 'database' };
        }
        if (['false', '0', 'no', 'off'].includes(value)) {
          return { value: false, source: 'database' };
        }
      }
    } catch {
      // Fall through
    }
    return this.configService.getBoolean(key, defaultValue);
  }

  /**
   * Get a JSON configuration value
   */
  async getJson<T>(key: string, defaultValue?: T): Promise<TypedConfigValue<T>> {
    return this.configService.getJson<T>(key, defaultValue);
  }

  /**
   * Get JSON with fallback to global
   */
  async getJsonWithFallback<T>(key: string, defaultValue?: T): Promise<TypedConfigValue<T>> {
    try {
      const tenantConfig = await this.configService.get(key, this.tenantId);
      if (tenantConfig) {
        const parsed = JSON.parse(tenantConfig.value) as T;
        return { value: parsed, source: 'database' };
      }
    } catch {
      // Fall through
    }
    return this.configService.getJson<T>(key, defaultValue);
  }

  /**
   * Get raw configuration entry for tenant
   */
  async get(key: string): Promise<ConfigEntry | null> {
    return this.configService.get(key, this.tenantId);
  }

  /**
   * Set a tenant-specific configuration value
   */
  async set(
    key: string,
    value: string | number | boolean | object,
    type: ConfigValueType,
    options: SetOptions = {}
  ): Promise<ConfigEntry> {
    return this.configService.set(key, value, type, {
      ...options,
      tenantId: this.tenantId,
    });
  }

  /**
   * Delete a tenant-specific configuration
   */
  async delete(key: string): Promise<boolean> {
    return this.configService.delete(key, this.tenantId);
  }

  /**
   * List all tenant-specific configurations
   */
  async listConfigs(): Promise<ConfigEntry[]> {
    return this.configService.list(this.tenantId);
  }

  /**
   * Check if a configuration key exists for tenant
   */
  async has(key: string): Promise<boolean> {
    return this.configService.has(key, this.tenantId);
  }

  // ==================== Feature Flags ====================

  /**
   * Check if a feature is enabled for this tenant
   */
  async isFeatureEnabled(key: string, defaultValue?: boolean): Promise<boolean> {
    return this.featureFlagService.isEnabled(key, this.tenantId, defaultValue);
  }

  /**
   * Check feature with fallback to global
   */
  async isFeatureEnabledWithFallback(key: string, defaultValue = false): Promise<boolean> {
    // Check tenant-specific first
    const tenantFlag = await this.featureFlagService.get(key, this.tenantId);
    if (tenantFlag) {
      return tenantFlag.enabled;
    }

    // Fall back to global
    return this.featureFlagService.isEnabled(key, undefined, defaultValue);
  }

  /**
   * Enable a feature for this tenant
   */
  async enableFeature(
    key: string,
    metadata?: Record<string, unknown>
  ): Promise<FeatureFlag> {
    return this.featureFlagService.enable(key, this.tenantId, metadata);
  }

  /**
   * Disable a feature for this tenant
   */
  async disableFeature(key: string): Promise<FeatureFlag> {
    return this.featureFlagService.disable(key, this.tenantId);
  }

  /**
   * Toggle a feature for this tenant
   */
  async toggleFeature(key: string): Promise<FeatureFlag> {
    return this.featureFlagService.toggle(key, this.tenantId);
  }

  /**
   * List all feature flags for this tenant
   */
  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagService.list(this.tenantId);
  }

  /**
   * Delete a feature flag for this tenant
   */
  async deleteFeatureFlag(key: string): Promise<boolean> {
    return this.featureFlagService.delete(key, this.tenantId);
  }

  // ==================== Bulk Operations ====================

  /**
   * Export all tenant configuration and feature flags
   */
  async exportConfig(): Promise<ConfigExport> {
    const [configs, featureFlags] = await Promise.all([
      this.listConfigs(),
      this.listFeatureFlags(),
    ]);

    return {
      tenantId: this.tenantId,
      configs: configs.map((c) => {
        const config: ConfigExport['configs'][number] = {
          key: c.key,
          value: c.value,
          type: c.type,
        };
        if (c.description !== undefined) {
          config.description = c.description;
        }
        return config;
      }),
      featureFlags: featureFlags.map((f) => {
        const flag: ConfigExport['featureFlags'][number] = {
          key: f.key,
          enabled: f.enabled,
        };
        if (f.description !== undefined) {
          flag.description = f.description;
        }
        if (f.metadata !== undefined) {
          flag.metadata = f.metadata;
        }
        return flag;
      }),
      exportedAt: new Date(),
    };
  }

  /**
   * Import configuration and feature flags for tenant
   */
  async importConfig(data: ConfigImportData): Promise<ImportResult> {
    const errors: string[] = [];
    let configsImported = 0;
    let featureFlagsImported = 0;

    // Import configs
    for (const config of data.configs) {
      try {
        const options: SetOptions = {};
        if (config.description !== undefined) {
          options.description = config.description;
        }
        await this.set(config.key, config.value, config.type, options);
        configsImported++;
      } catch (error) {
        errors.push(`Config "${config.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import feature flags
    for (const flag of data.featureFlags) {
      try {
        if (flag.enabled) {
          await this.enableFeature(flag.key, flag.metadata);
        } else {
          await this.disableFeature(flag.key);
        }
        featureFlagsImported++;
      } catch (error) {
        errors.push(`Feature "${flag.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      configsImported,
      featureFlagsImported,
      errors,
    };
  }
}
