/**
 * Password Reset Service - Token generation and validation for password reset
 * Story 1.5: Password Reset Flow
 * AC1: Reset token generation (64 char hex, 1h TTL)
 * AC3: Token validation and one-time use
 * AC5: Invalid/expired token handling
 * AC6: Rate limiting
 *
 * Security:
 * - Tokens stored as SHA-256 hash (not plain text)
 * - Crypto-random token generation
 * - One-time use tokens
 * - 1 hour TTL
 */

import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

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
  /** In-memory rate limiting (for email-based limiting) */
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  /** M1 fix: Cleanup interval ID for memory management */
  private cleanupIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null
  ) {
    // M1 fix: Start periodic cleanup of expired rate limit entries (every 5 minutes)
    this.cleanupIntervalId = setInterval(() => this.cleanupExpiredRateLimits(), 5 * 60 * 1000);
  }

  /**
   * M1 fix: NestJS lifecycle hook - cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
  }

  /**
   * M1 fix: Clean up expired rate limit entries to prevent memory leak
   * Called automatically every 5 minutes
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (value.resetAt < now) {
        this.rateLimitMap.delete(key);
      }
    }
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
   * @param email - Email address to check
   * @returns true if rate limited, false if allowed
   */
  checkRateLimit(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const existing = this.rateLimitMap.get(key);

    // Clean up expired entries
    if (existing && existing.resetAt < now) {
      this.rateLimitMap.delete(key);
      return false;
    }

    // Check if rate limited
    if (existing && existing.count >= FORGOT_PASSWORD_MAX_REQUESTS) {
      return true;
    }

    return false;
  }

  /**
   * Increment rate limit counter
   * @param email - Email address
   */
  incrementRateLimit(email: string): void {
    const now = Date.now();
    const key = email.toLowerCase();
    const existing = this.rateLimitMap.get(key);

    if (existing && existing.resetAt > now) {
      // Increment existing counter
      existing.count++;
    } else {
      // Create new counter
      this.rateLimitMap.set(key, {
        count: 1,
        resetAt: now + FORGOT_PASSWORD_WINDOW_MS,
      });
    }
  }

  /**
   * Get remaining time until rate limit resets (for error messages)
   * @param email - Email address
   * @returns Remaining time in minutes, or 0 if not rate limited
   */
  getRateLimitRemainingMinutes(email: string): number {
    const key = email.toLowerCase();
    const existing = this.rateLimitMap.get(key);

    if (!existing) {
      return 0;
    }

    const remainingMs = existing.resetAt - Date.now();
    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / 60000);
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
