/**
 * Password Reset Service - Token generation and validation for password reset
 * Story 1.5: Password Reset Flow
 * AC1: Reset token generation (64 char hex, 1h TTL)
 * AC3: Token validation and one-time use
 * AC5: Invalid/expired token handling
 * AC6: Rate limiting (via pluggable IRateLimiter)
 *
 * Security:
 * - Tokens stored as SHA-256 hash (not plain text)
 * - Crypto-random token generation
 * - One-time use tokens
 * - 1 hour TTL
 *
 * Rate Limiting:
 * - Uses pluggable IRateLimiter interface
 * - InMemoryRateLimiter for single instance (MVP)
 * - RedisRateLimiter for distributed (K8s/PM2 cluster)
 * - Configured via RATE_LIMITER DI token
 */

import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { IRateLimiter, RATE_LIMITER } from './rate-limiter.interface';
import { InMemoryRateLimiter } from './in-memory-rate-limiter';

/** Reset token TTL in milliseconds (1 hour) */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Reset token length in bytes (generates 64 hex chars) */
const TOKEN_BYTES = 32;

/** Rate limit: max requests per email within window */
export const FORGOT_PASSWORD_MAX_REQUESTS = 3;

/** Rate limit: window in milliseconds (15 minutes) */
export const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

/**
 * Result of token generation
 */
export interface GenerateTokenResult {
  /** Plain text token to send via email */
  plainToken: string;
  /** SHA-256 hash of token for database storage */
  tokenHash: string;
  /** Expiration date */
  expiresAt: Date;
}

/**
 * Token record from database
 */
export interface PasswordResetTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PasswordResetService implements OnModuleDestroy {
  /**
   * Pluggable rate limiter - supports in-memory (MVP) or Redis (production K8s)
   * Injected via RATE_LIMITER token, defaults to InMemoryRateLimiter if not provided
   */
  private readonly rateLimiter: IRateLimiter;

  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null,
    @Inject(RATE_LIMITER) @Optional() rateLimiter?: IRateLimiter | null
  ) {
    // Use injected rate limiter or create default InMemoryRateLimiter
    this.rateLimiter =
      rateLimiter ??
      new InMemoryRateLimiter({
        maxRequests: FORGOT_PASSWORD_MAX_REQUESTS,
        windowMs: FORGOT_PASSWORD_WINDOW_MS,
      });
  }

  /**
   * NestJS lifecycle hook - cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.rateLimiter.cleanup();
  }

  /**
   * Generate a cryptographically secure reset token
   * @returns GenerateTokenResult with plain token, hash, and expiry
   */
  generateToken(): GenerateTokenResult {
    // Generate 32 random bytes → 64 hex characters
    const plainToken = randomBytes(TOKEN_BYTES).toString('hex');

    // Hash token with SHA-256 for storage (never store plain token)
    const tokenHash = this.hashToken(plainToken);

    // Set expiry to 1 hour from now
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    return {
      plainToken,
      tokenHash,
      expiresAt,
    };
  }

  /**
   * Hash a token using SHA-256
   * @param plainToken - Plain text token
   * @returns SHA-256 hash as hex string
   */
  hashToken(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }

  /**
   * Store a password reset token in the database
   * @param userId - User ID
   * @param tokenHash - Hashed token
   * @param expiresAt - Expiration date
   */
  async storeToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    if (!this.prisma) {
      return;
    }

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Find a valid (not expired, not used) token
   * @param plainToken - Plain text token to look up
   * @returns Token record or null if not found/invalid
   */
  async findValidToken(plainToken: string): Promise<PasswordResetTokenRecord | null> {
    if (!this.prisma) {
      return null;
    }

    const tokenHash = this.hashToken(plainToken);

    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!token) {
      return null;
    }

    // Check if expired
    if (token.expiresAt < new Date()) {
      return null;
    }

    // Check if already used
    if (token.isUsed) {
      return null;
    }

    return token as PasswordResetTokenRecord;
  }

  /**
   * Mark a token as used
   * @param tokenId - Token ID
   */
  async markTokenAsUsed(tokenId: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Invalidate all unused tokens for a user
   * Called when password is successfully reset
   * @param userId - User ID
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Check rate limit for forgot password requests
   * Uses pluggable IRateLimiter (works with Redis for K8s or in-memory for single instance)
   *
   * @param email - Email address to check
   * @returns true if rate limited, false if allowed
   */
  async checkRateLimit(email: string): Promise<boolean> {
    try {
      const result = await this.rateLimiter.check(email);
      return result.isLimited;
    } catch (error) {
      // Fail open on error - don't rate limit
      console.warn('[PasswordResetService] Rate limit check failed, failing open:', error);
      return false;
    }
  }

  /**
   * Increment rate limit counter
   * Uses pluggable IRateLimiter (works with Redis for K8s or in-memory for single instance)
   *
   * @param email - Email address
   */
  async incrementRateLimit(email: string): Promise<void> {
    try {
      await this.rateLimiter.increment(email);
    } catch (error) {
      console.warn('[PasswordResetService] Failed to increment rate limit:', error);
    }
  }

  /**
   * Get remaining time until rate limit resets (for error messages)
   * @param email - Email address
   * @returns Remaining time in minutes, or 0 if not rate limited
   */
  async getRateLimitRemainingMinutes(email: string): Promise<number> {
    try {
      const result = await this.rateLimiter.check(email);
      return Math.ceil(result.resetInSeconds / 60);
    } catch {
      return 0;
    }
  }

  /**
   * Clean up expired tokens (maintenance task)
   * Can be called periodically via cron job
   */
  async cleanupExpiredTokens(): Promise<number> {
    if (!this.prisma) {
      return 0;
    }

    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
