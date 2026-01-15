/**
 * Login Throttle Guard - Rate limiting for login endpoint
 * Story 1.1: JWT Login Endpoint
 * AC4: Rate limiting (5 requests/minute/IP)
 *
 * Returns 429 Too Many Requests when limit exceeded
 * Includes X-RateLimit-Reset header with wait time
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  /**
   * Get tracker for rate limiting (uses IP address)
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Get IP from request (supports proxies via x-forwarded-for)
    const forwardedFor = req['headers'] as Record<string, string> | undefined;
    const ip =
      forwardedFor?.['x-forwarded-for']?.split(',')[0]?.trim() ??
      (req['ip'] as string) ??
      'unknown';
    return ip;
  }

  /**
   * Handle rate limit exceeded
   * AC4: Return 429 with X-RateLimit-Reset header
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: { limit: number; ttl: number; totalHits: number }
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();

    // Calculate time until rate limit resets
    const resetTime = Math.ceil(throttlerLimitDetail.ttl / 1000);

    // Add rate limit headers (AC4)
    response.setHeader('X-RateLimit-Limit', throttlerLimitDetail.limit.toString());
    response.setHeader('X-RateLimit-Remaining', '0');
    response.setHeader('X-RateLimit-Reset', resetTime.toString());

    throw new ThrottlerException(
      `Túl sok bejelentkezési kísérlet. Próbálja újra ${resetTime} másodperc múlva.`
      // Hungarian: Too many login attempts. Try again in X seconds.
    );
  }
}
