import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigCacheService } from './config-cache.service';
import { ConfigService } from './config.service';
import { FeatureFlagService } from './feature-flag.service';
import { TypedConfigValue, ConfigEntry, FeatureFlag } from '../interfaces/config.interface';

describe('ConfigCacheService', () => {
  let cacheService: ConfigCacheService;
  let mockConfigService: Partial<ConfigService>;
  let mockFeatureFlagService: Partial<FeatureFlagService>;

  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  beforeEach(() => {
    vi.useFakeTimers();

    mockConfigService = {
      getString: vi.fn(),
      getNumber: vi.fn(),
      getBoolean: vi.fn(),
      getJson: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
    };

    mockFeatureFlagService = {
      isEnabled: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
    };

    cacheService = new ConfigCacheService(
      mockConfigService as ConfigService,
      mockFeatureFlagService as FeatureFlagService,
      { defaultTtl: DEFAULT_TTL }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getString()', () => {
    it('should cache string value on first call', async () => {
      const value: TypedConfigValue<string> = { value: 'cached-value', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      // First call - cache miss
      const result1 = await cacheService.getString('test-key');
      expect(result1.value).toBe('cached-value');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await cacheService.getString('test-key');
      expect(result2.value).toBe('cached-value');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(1); // Still 1, cached
    });

    it('should refresh cache after TTL expires', async () => {
      const value1: TypedConfigValue<string> = { value: 'value-1', source: 'database' };
      const value2: TypedConfigValue<string> = { value: 'value-2', source: 'database' };

      vi.mocked(mockConfigService.getString)
        .mockResolvedValueOnce(value1)
        .mockResolvedValueOnce(value2);

      // First call
      const result1 = await cacheService.getString('test-key');
      expect(result1.value).toBe('value-1');

      // Advance time past TTL
      vi.advanceTimersByTime(DEFAULT_TTL + 1000);

      // Second call - cache expired
      const result2 = await cacheService.getString('test-key');
      expect(result2.value).toBe('value-2');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(2);
    });

    it('should use custom TTL when provided', async () => {
      const customTtl = 1000; // 1 second
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      await cacheService.getString('test-key', undefined, customTtl);

      // Advance by less than custom TTL
      vi.advanceTimersByTime(500);
      await cacheService.getString('test-key');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(1);

      // Advance past custom TTL
      vi.advanceTimersByTime(600);
      await cacheService.getString('test-key');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNumber()', () => {
    it('should cache number value', async () => {
      const value: TypedConfigValue<number> = { value: 42, source: 'database' };
      vi.mocked(mockConfigService.getNumber).mockResolvedValue(value);

      const result1 = await cacheService.getNumber('max-items');
      const result2 = await cacheService.getNumber('max-items');

      expect(result1.value).toBe(42);
      expect(result2.value).toBe(42);
      expect(mockConfigService.getNumber).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBoolean()', () => {
    it('should cache boolean value', async () => {
      const value: TypedConfigValue<boolean> = { value: true, source: 'database' };
      vi.mocked(mockConfigService.getBoolean).mockResolvedValue(value);

      await cacheService.getBoolean('feature-enabled');
      await cacheService.getBoolean('feature-enabled');

      expect(mockConfigService.getBoolean).toHaveBeenCalledTimes(1);
    });
  });

  describe('getJson()', () => {
    it('should cache JSON value', async () => {
      const value: TypedConfigValue<{ name: string }> = { value: { name: 'test' }, source: 'database' };
      vi.mocked(mockConfigService.getJson).mockResolvedValue(value);

      const result1 = await cacheService.getJson<{ name: string }>('json-config');
      const result2 = await cacheService.getJson<{ name: string }>('json-config');

      expect(result1.value).toEqual({ name: 'test' });
      expect(result2.value).toEqual({ name: 'test' });
      expect(mockConfigService.getJson).toHaveBeenCalledTimes(1);
    });

    it('should pass default value when provided', async () => {
      const defaultValue = { fallback: true };
      const value: TypedConfigValue<{ fallback: boolean }> = { value: defaultValue, source: 'default' };
      vi.mocked(mockConfigService.getJson).mockResolvedValue(value);

      const result = await cacheService.getJson('missing-key', defaultValue);

      expect(result.value).toEqual(defaultValue);
      expect(mockConfigService.getJson).toHaveBeenCalledWith('missing-key', defaultValue);
    });
  });

  describe('isFeatureEnabled()', () => {
    it('should cache feature flag result', async () => {
      vi.mocked(mockFeatureFlagService.isEnabled).mockResolvedValue(true);

      const result1 = await cacheService.isFeatureEnabled('new-feature');
      const result2 = await cacheService.isFeatureEnabled('new-feature');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache for tenant-specific flags', async () => {
      vi.mocked(mockFeatureFlagService.isEnabled)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const global = await cacheService.isFeatureEnabled('feature');
      const tenant1 = await cacheService.isFeatureEnabled('feature', 'tenant-1');

      expect(global).toBe(true);
      expect(tenant1).toBe(false);
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate()', () => {
    it('should invalidate specific key', async () => {
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      // Populate cache
      await cacheService.getString('key-1');
      await cacheService.getString('key-2');

      // Invalidate one key
      cacheService.invalidate('key-1');

      // key-1 should be refetched, key-2 still cached
      await cacheService.getString('key-1');
      await cacheService.getString('key-2');

      expect(mockConfigService.getString).toHaveBeenCalledTimes(3); // 2 initial + 1 refetch
    });

    it('should invalidate by pattern', async () => {
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      // Populate cache
      await cacheService.getString('app.setting.1');
      await cacheService.getString('app.setting.2');
      await cacheService.getString('other.key');

      // Invalidate by pattern
      cacheService.invalidateByPattern('app.setting.*');

      // app.setting.* keys refetched, other.key still cached
      await cacheService.getString('app.setting.1');
      await cacheService.getString('app.setting.2');
      await cacheService.getString('other.key');

      // 3 initial + 2 refetch = 5
      expect(mockConfigService.getString).toHaveBeenCalledTimes(5);
    });
  });

  describe('clear()', () => {
    it('should clear all cached values', async () => {
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);
      vi.mocked(mockFeatureFlagService.isEnabled).mockResolvedValue(true);

      // Populate cache
      await cacheService.getString('key-1');
      await cacheService.isFeatureEnabled('feature-1');

      // Clear all
      cacheService.clear();

      // Both should be refetched
      await cacheService.getString('key-1');
      await cacheService.isFeatureEnabled('feature-1');

      expect(mockConfigService.getString).toHaveBeenCalledTimes(2);
      expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledTimes(2);
    });
  });

  describe('forceRefresh()', () => {
    it('should force refresh a specific key', async () => {
      const value1: TypedConfigValue<string> = { value: 'old-value', source: 'database' };
      const value2: TypedConfigValue<string> = { value: 'new-value', source: 'database' };

      vi.mocked(mockConfigService.getString)
        .mockResolvedValueOnce(value1)
        .mockResolvedValueOnce(value2);

      // Initial fetch
      const result1 = await cacheService.getString('test-key');
      expect(result1.value).toBe('old-value');

      // Force refresh
      const result2 = await cacheService.forceRefresh('test-key', 'string');
      expect(result2.value).toBe('new-value');

      // Subsequent call should return refreshed value from cache
      const result3 = await cacheService.getString('test-key');
      expect(result3.value).toBe('new-value');
      expect(mockConfigService.getString).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats()', () => {
    it('should track cache hits and misses', async () => {
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      // Initial stats
      let stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Miss
      await cacheService.getString('test-key');
      stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Hit
      await cacheService.getString('test-key');
      stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      // Hit ratio
      expect(stats.hitRatio).toBe(0.5);
    });

    it('should track cache size', async () => {
      const value: TypedConfigValue<string> = { value: 'cached', source: 'database' };
      vi.mocked(mockConfigService.getString).mockResolvedValue(value);

      await cacheService.getString('key-1');
      await cacheService.getString('key-2');

      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('warmup()', () => {
    it('should pre-populate cache with specified keys', async () => {
      const entries: ConfigEntry[] = [
        {
          key: 'config-1',
          value: 'value-1',
          type: 'string',
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          key: 'config-2',
          value: '42',
          type: 'number',
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockConfigService.list).mockResolvedValue(entries);

      await cacheService.warmup();

      // Should not call service again for cached keys
      vi.mocked(mockConfigService.getString).mockResolvedValue({
        value: 'value-1',
        source: 'database',
      });
      await cacheService.getString('config-1');

      // warmup uses list, then individual gets should use cache
      const stats = cacheService.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});
