/**
 * Redis Rate Limiter - Distributed rate limiting for K8s/cluster deployments
 * Story 1.5: Password Reset Flow - AC6 Rate Limiting
 *
 * REQUIRED for distributed deployments (K8s, PM2 cluster)!
 * Without this, attackers can bypass rate limits by hitting different pods.
 *
 * Prerequisites:
 * 1. Install ioredis: pnpm add ioredis
 * 2. Configure REDIS_URL environment variable
 * 3. Register this provider in the module with RATE_LIMITER token
 *
 * Algorithm: Sliding window using Redis MULTI/EXEC
 * - Atomic increment and expiry setting
 * - Consistent across all instances
 *
 * @example
 * // In auth.module.ts
 * providers: [
 *   {
 *     provide: RATE_LIMITER,
 *     useFactory: (configService: ConfigService) => {
 *       if (configService.get('RATE_LIMITER_TYPE') === 'redis') {
 *         return new RedisRateLimiter(configService.get('REDIS_URL'), {...});
 *       }
 *       return new InMemoryRateLimiter({...});
 *     },
 *     inject: [ConfigService],
 *   },
 * ]
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { IRateLimiter, RateLimitResult, RateLimiterConfig } from './rate-limiter.interface';

// Type for Redis client (ioredis) - chainable multi interface
// Using explicit types to avoid requiring ioredis as a dependency until needed
interface RedisMulti {
  incr(key: string): RedisMulti;
  pexpire(key: string, ms: number): RedisMulti;
  pttl(key: string): RedisMulti;
  exec(): Promise<Array<[Error | null, unknown]>>;
}

type RedisClient = {
  multi(): RedisMulti;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  quit(): Promise<'OK'>;
};

@Injectable()
export class RedisRateLimiter implements IRateLimiter, OnModuleDestroy {
  private readonly keyPrefix = 'ratelimit:';

  constructor(
    private readonly redis: RedisClient,
    private readonly config: RateLimiterConfig
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = this.keyPrefix + key.toLowerCase();
    const countStr = await this.redis.get(redisKey);

    if (!countStr) {
      return {
        isLimited: false,
        remaining: this.config.maxRequests,
        resetInSeconds: 0,
      };
    }

    const count = parseInt(countStr, 10);
    const remaining = Math.max(0, this.config.maxRequests - count);

    return {
      isLimited: count >= this.config.maxRequests,
      remaining,
      resetInSeconds: Math.ceil(this.config.windowMs / 1000), // Approximate
    };
  }

  async increment(key: string): Promise<RateLimitResult> {
    const redisKey = this.keyPrefix + key.toLowerCase();

    // Atomic increment with expiry
    const results = await this.redis
      .multi()
      .incr(redisKey)
      .pexpire(redisKey, this.config.windowMs)
      .pttl(redisKey)
      .exec();

    // Handle potential errors in transaction
    if (!results || results.some(([err]: [Error | null, unknown]) => err !== null)) {
      // Fail open - don't rate limit on Redis errors
      console.error('[RedisRateLimiter] Redis transaction failed, failing open');
      return {
        isLimited: false,
        remaining: this.config.maxRequests,
        resetInSeconds: 0,
      };
    }

    const count = results[0]?.[1] as number;
    const ttlMs = results[2]?.[1] as number;
    const remaining = Math.max(0, this.config.maxRequests - count);
    const resetInSeconds = Math.max(0, Math.ceil(ttlMs / 1000));

    return {
      isLimited: count > this.config.maxRequests,
      remaining,
      resetInSeconds,
    };
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.keyPrefix + key.toLowerCase();
    await this.redis.del(redisKey);
  }

  cleanup(): void {
    // Redis handles TTL automatically, no cleanup needed
  }
}

/**
 * Factory function to create Redis rate limiter
 * Use this when Redis dependency is available
 *
 * @example
 * import Redis from 'ioredis';
 *
 * const redis = new Redis(process.env.REDIS_URL);
 * const limiter = createRedisRateLimiter(redis, {
 *   maxRequests: 3,
 *   windowMs: 15 * 60 * 1000,
 * });
 */
export function createRedisRateLimiter(
  redisClient: RedisClient,
  config: RateLimiterConfig
): RedisRateLimiter {
  return new RedisRateLimiter(redisClient, config);
}
