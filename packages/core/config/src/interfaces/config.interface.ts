/**
 * Configuration value types
 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json';

/**
 * Configuration entry interface
 */
export interface ConfigEntry {
  key: string;
  value: string;
  type: ConfigValueType;
  description?: string;
  isSystem: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feature flag interface
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Config repository interface for dependency injection
 */
export interface IConfigRepository {
  get(key: string, tenantId?: string): Promise<ConfigEntry | null>;
  set(entry: Omit<ConfigEntry, 'createdAt' | 'updatedAt'>): Promise<ConfigEntry>;
  delete(key: string, tenantId?: string): Promise<boolean>;
  list(tenantId?: string): Promise<ConfigEntry[]>;
}

/**
 * Feature flag repository interface
 */
export interface IFeatureFlagRepository {
  get(key: string, tenantId?: string): Promise<FeatureFlag | null>;
  set(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  delete(key: string, tenantId?: string): Promise<boolean>;
  list(tenantId?: string): Promise<FeatureFlag[]>;
}

/**
 * Typed config value getters
 */
export interface TypedConfigValue<T> {
  value: T;
  source: 'database' | 'default' | 'env';
}
