/**
 * In-Memory Rate Limiter - Single instance rate limiting
 * Story 1.5: Password Reset Flow - AC6 Rate Limiting
 *
 * WARNING: This implementation only works for SINGLE INSTANCE deployments!
 * For distributed deployments (K8s, PM2 cluster), use RedisRateLimiter instead.
 *
 * Limitations:
 * - Rate limits are NOT shared across instances
 * - In a 3-pod K8s deployment, attackers can bypass by hitting different pods
 * - Memory grows with unique keys (mitigated by periodic cleanup)
 *
 * Use cases:
 * - MVP/development with single instance
 * - Testing environments
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { IRateLimiter, RateLimitResult, RateLimiterConfig } from './rate-limiter.interface';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class InMemoryRateLimiter implements IRateLimiter, OnModuleDestroy {
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupIntervalId: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly config: RateLimiterConfig) {
    // Periodic cleanup every 5 minutes
    this.cleanupIntervalId = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    this.cleanup();
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = key.toLowerCase();
    const entry = this.store.get(normalizedKey);

    // No entry or expired entry
    if (!entry || entry.resetAt < now) {
      return {
        isLimited: false,
        remaining: this.config.maxRequests,
        resetInSeconds: 0,
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

    return {
      isLimited: entry.count >= this.config.maxRequests,
      remaining,
      resetInSeconds,
    };
  }

  async increment(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const normalizedKey = key.toLowerCase();
    let entry = this.store.get(normalizedKey);

    // Clean up expired entry
    if (entry && entry.resetAt < now) {
      this.store.delete(normalizedKey);
      entry = undefined;
    }

    if (entry) {
      // Increment existing counter
      entry.count++;
    } else {
      // Create new entry
      entry = {
        count: 1,
        resetAt: now + this.config.windowMs,
      };
      this.store.set(normalizedKey, entry);
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

    return {
      isLimited: entry.count > this.config.maxRequests, // > not >= because we just incremented
      remaining,
      resetInSeconds,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key.toLowerCase());
  }

  cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  /**
   * Remove expired entries to prevent memory leak
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }
}
