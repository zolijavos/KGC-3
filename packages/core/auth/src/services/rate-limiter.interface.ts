/**
 * Rate Limiter Interface - Abstraction for distributed rate limiting
 * Story 1.5: Password Reset Flow - AC6 Rate Limiting
 *
 * Implementations:
 * - InMemoryRateLimiter: Single instance deployment (MVP)
 * - RedisRateLimiter: Distributed deployment (K8s, PM2 cluster)
 *
 * @see ADR-XXX Rate Limiting Strategy (TODO: create ADR if needed)
 */

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is rate limited */
  isLimited: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Time until rate limit resets (seconds) */
  resetInSeconds: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Rate limiter interface for pluggable rate limiting strategies
 */
export interface IRateLimiter {
  /**
   * Check if a key is rate limited (without incrementing)
   * @param key - Unique identifier (e.g., email, IP)
   * @returns Rate limit result
   */
  check(key: string): Promise<RateLimitResult>;

  /**
   * Increment the rate limit counter and check limit
   * @param key - Unique identifier
   * @returns Rate limit result after increment
   */
  increment(key: string): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a key (e.g., after successful operation)
   * @param key - Unique identifier
   */
  reset(key: string): Promise<void>;

  /**
   * Clean up resources (for memory management)
   */
  cleanup(): void;
}

/**
 * Rate limiter provider token for NestJS DI
 */
export const RATE_LIMITER = 'RATE_LIMITER';
