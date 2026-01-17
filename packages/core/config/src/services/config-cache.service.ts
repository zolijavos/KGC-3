import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { FeatureFlagService } from './feature-flag.service';
import { TypedConfigValue, ConfigValueType } from '../interfaces/config.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
}

interface ConfigCacheOptions {
  defaultTtl?: number; // milliseconds
  maxSize?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 1000;

/**
 * Caching layer for configuration values
 * Provides TTL-based caching with manual invalidation support
 */
@Injectable()
export class ConfigCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlagService: FeatureFlagService,
    options: ConfigCacheOptions = {}
  ) {
    this.defaultTtl = options.defaultTtl ?? DEFAULT_TTL;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }

  /**
   * Get a string configuration value with caching
   */
  async getString(
    key: string,
    defaultValue?: string,
    ttl?: number
  ): Promise<TypedConfigValue<string>> {
    const cacheKey = this.buildCacheKey('string', key);
    const cached = this.getFromCache<TypedConfigValue<string>>(cacheKey);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const value = await this.configService.getString(key, defaultValue);
    this.setInCache(cacheKey, value, ttl);
    return value;
  }

  /**
   * Get a number configuration value with caching
   */
  async getNumber(
    key: string,
    defaultValue?: number,
    ttl?: number
  ): Promise<TypedConfigValue<number>> {
    const cacheKey = this.buildCacheKey('number', key);
    const cached = this.getFromCache<TypedConfigValue<number>>(cacheKey);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const value = await this.configService.getNumber(key, defaultValue);
    this.setInCache(cacheKey, value, ttl);
    return value;
  }

  /**
   * Get a boolean configuration value with caching
   */
  async getBoolean(
    key: string,
    defaultValue?: boolean,
    ttl?: number
  ): Promise<TypedConfigValue<boolean>> {
    const cacheKey = this.buildCacheKey('boolean', key);
    const cached = this.getFromCache<TypedConfigValue<boolean>>(cacheKey);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const value = await this.configService.getBoolean(key, defaultValue);
    this.setInCache(cacheKey, value, ttl);
    return value;
  }

  /**
   * Get a JSON configuration value with caching
   */
  async getJson<T>(key: string, defaultValue?: T, ttl?: number): Promise<TypedConfigValue<T>> {
    const cacheKey = this.buildCacheKey('json', key);
    const cached = this.getFromCache<TypedConfigValue<T>>(cacheKey);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const value = await this.configService.getJson<T>(key, defaultValue);
    this.setInCache(cacheKey, value, ttl);
    return value;
  }

  /**
   * Check if a feature is enabled with caching
   */
  async isFeatureEnabled(
    key: string,
    tenantId?: string,
    defaultValue?: boolean,
    ttl?: number
  ): Promise<boolean> {
    const cacheKey = this.buildCacheKey('feature', key, tenantId);
    const cached = this.getFromCache<boolean>(cacheKey);

    if (cached !== undefined) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const value = await this.featureFlagService.isEnabled(key, tenantId, defaultValue);
    this.setInCache(cacheKey, value, ttl);
    return value;
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    // Find and remove all entries matching the key
    const keysToDelete: string[] = [];
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.includes(`:${key}`)) {
        keysToDelete.push(cacheKey);
      }
    }
    keysToDelete.forEach((k) => this.cache.delete(k));
  }

  /**
   * Invalidate cache entries matching a pattern
   * Pattern supports * as wildcard
   */
  invalidateByPattern(pattern: string): void {
    // Escape regex special characters except *, then replace * with .*
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    for (const cacheKey of this.cache.keys()) {
      // Extract the actual key from cache key (format: type:key or type:key:tenantId)
      const parts = cacheKey.split(':');
      const actualKey = parts.slice(1, -1).join(':') || (parts[1] ?? '');

      if (actualKey && regex.test(actualKey)) {
        keysToDelete.push(cacheKey);
      }
    }

    keysToDelete.forEach((k) => this.cache.delete(k));
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Force refresh a specific key
   */
  async forceRefresh(
    key: string,
    type: ConfigValueType
  ): Promise<TypedConfigValue<string | number | boolean | unknown>> {
    // Remove from cache
    this.invalidate(key);

    // Fetch fresh value
    switch (type) {
      case 'string':
        return this.getString(key);
      case 'number':
        return this.getNumber(key);
      case 'boolean':
        return this.getBoolean(key);
      case 'json':
        return this.getJson(key);
      default:
        return this.getString(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Warmup cache with all configuration values
   */
  async warmup(tenantId?: string): Promise<void> {
    const configs = await this.configService.list(tenantId);

    for (const config of configs) {
      const cacheKey = this.buildCacheKey(config.type, config.key, tenantId);
      const typedValue: TypedConfigValue<string> = {
        value: config.value,
        source: 'database',
      };
      this.setInCache(cacheKey, typedValue);
    }
  }

  /**
   * Build a cache key from type, key, and optional tenant
   */
  private buildCacheKey(type: string, key: string, tenantId?: string): string {
    if (tenantId) {
      return `${type}:${key}:${tenantId}`;
    }
    return `${type}:${key}`;
  }

  /**
   * Get value from cache if not expired
   */
  private getFromCache<T>(cacheKey: string): T | undefined {
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  private setInCache<T>(cacheKey: string, value: T, ttl?: number): void {
    const effectiveTtl = ttl ?? this.defaultTtl;

    // Don't cache with zero or negative TTL
    if (effectiveTtl <= 0) {
      return;
    }

    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + effectiveTtl,
    });
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    const keysToEvict = Math.ceil(this.maxSize * 0.1); // Evict 10%
    const iterator = this.cache.keys();

    for (let i = 0; i < keysToEvict; i++) {
      const result = iterator.next();
      if (!result.done) {
        this.cache.delete(result.value);
      }
    }
  }
}
