import { Injectable, Inject } from '@nestjs/common';
import type {
  IConfigRepository,
  ConfigEntry,
  ConfigValueType,
  TypedConfigValue,
} from '../interfaces/config.interface';

export const CONFIG_REPOSITORY = 'CONFIG_REPOSITORY';

interface SetOptions {
  tenantId?: string;
  description?: string;
  isSystem?: boolean;
}

/**
 * Service for managing configuration values
 * Supports typed getters and tenant-specific configurations
 */
@Injectable()
export class ConfigService {
  constructor(
    @Inject(CONFIG_REPOSITORY)
    private readonly repository: IConfigRepository
  ) {}

  /**
   * Get a string configuration value
   */
  async getString(key: string, defaultValue?: string): Promise<TypedConfigValue<string>> {
    const entry = await this.repository.get(key.trim());

    if (!entry) {
      if (defaultValue !== undefined) {
        return { value: defaultValue, source: 'default' };
      }
      throw new Error(`Config key "${key}" not found`);
    }

    return { value: entry.value, source: 'database' };
  }

  /**
   * Get a number configuration value
   */
  async getNumber(key: string, defaultValue?: number): Promise<TypedConfigValue<number>> {
    const entry = await this.repository.get(key.trim());

    if (!entry) {
      if (defaultValue !== undefined) {
        return { value: defaultValue, source: 'default' };
      }
      throw new Error(`Config key "${key}" not found`);
    }

    const parsed = parseFloat(entry.value);

    if (isNaN(parsed)) {
      throw new Error(`Config key "${key}" is not a valid number`);
    }

    return { value: parsed, source: 'database' };
  }

  /**
   * Get a boolean configuration value
   */
  async getBoolean(key: string, defaultValue?: boolean): Promise<TypedConfigValue<boolean>> {
    const entry = await this.repository.get(key.trim());

    if (!entry) {
      if (defaultValue !== undefined) {
        return { value: defaultValue, source: 'default' };
      }
      throw new Error(`Config key "${key}" not found`);
    }

    const value = entry.value.toLowerCase();
    const truthyValues = ['true', '1', 'yes', 'on'];
    const falsyValues = ['false', '0', 'no', 'off'];

    if (truthyValues.includes(value)) {
      return { value: true, source: 'database' };
    }

    if (falsyValues.includes(value)) {
      return { value: false, source: 'database' };
    }

    throw new Error(`Config key "${key}" is not a valid boolean`);
  }

  /**
   * Get a JSON configuration value
   */
  async getJson<T>(key: string, defaultValue?: T): Promise<TypedConfigValue<T>> {
    const entry = await this.repository.get(key.trim());

    if (!entry) {
      if (defaultValue !== undefined) {
        return { value: defaultValue, source: 'default' };
      }
      throw new Error(`Config key "${key}" not found`);
    }

    try {
      const parsed = JSON.parse(entry.value) as T;
      return { value: parsed, source: 'database' };
    } catch {
      throw new Error(`Config key "${key}" is not valid JSON`);
    }
  }

  /**
   * Set a configuration value
   */
  async set(
    key: string,
    value: string | number | boolean | object,
    type: ConfigValueType,
    options: SetOptions = {}
  ): Promise<ConfigEntry> {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new Error('Config key is required');
    }

    let stringValue: string;

    if (type === 'json' && typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const entry: Parameters<typeof this.repository.set>[0] = {
      key: trimmedKey,
      value: stringValue,
      type,
      isSystem: options.isSystem ?? false,
    };

    if (options.tenantId !== undefined) {
      entry.tenantId = options.tenantId;
    }
    if (options.description !== undefined) {
      entry.description = options.description;
    }

    return this.repository.set(entry);
  }

  /**
   * Delete a configuration entry
   */
  async delete(key: string, tenantId?: string): Promise<boolean> {
    return this.repository.delete(key.trim(), tenantId);
  }

  /**
   * List all configuration entries
   */
  async list(tenantId?: string): Promise<ConfigEntry[]> {
    return this.repository.list(tenantId);
  }

  /**
   * Check if a configuration key exists
   */
  async has(key: string, tenantId?: string): Promise<boolean> {
    const entry = await this.repository.get(key.trim(), tenantId);
    return entry !== null;
  }

  /**
   * Get raw configuration entry
   */
  async get(key: string, tenantId?: string): Promise<ConfigEntry | null> {
    return this.repository.get(key.trim(), tenantId);
  }
}
