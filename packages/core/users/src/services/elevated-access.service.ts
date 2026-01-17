/**
 * ElevatedAccessService
 * Story 2.4: Elevated Access Requirement
 * AC#5: Elevated Access Session Storage
 *
 * Service for managing elevated access (re-authentication) sessions.
 * Uses in-memory storage with automatic TTL expiration.
 *
 * For production with multiple instances, consider Redis.
 *
 * @example
 * // Record successful password verification
 * elevatedAccessService.recordVerification(userId);
 *
 * // Check if user has valid elevated access
 * if (elevatedAccessService.isVerificationValid(userId)) {
 *   // Allow elevated operation
 * } else {
 *   // Require re-authentication
 * }
 *
 * // Clear on logout
 * elevatedAccessService.clearVerification(userId);
 */

import { Injectable } from '@nestjs/common';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

@Injectable()
export class ElevatedAccessService {
  /** In-memory storage: userId -> lastVerifiedAt timestamp */
  private readonly verifications = new Map<string, Date>();

  /** Counter for cleanup interval (cleanup every 100 operations) */
  private operationCount = 0;

  /** Cleanup interval - run cleanup every N operations */
  private readonly CLEANUP_INTERVAL = 100;

  /**
   * Record successful password verification
   * @param userId - User ID to record verification for
   */
  recordVerification(userId: string): void {
    this.verifications.set(userId, new Date());
    this.maybeCleanup();
  }

  /**
   * Cleanup expired entries to prevent memory leak
   * Runs periodically based on operation count
   */
  private maybeCleanup(): void {
    this.operationCount++;
    if (this.operationCount >= this.CLEANUP_INTERVAL) {
      this.operationCount = 0;
      this.cleanupExpired();
    }
  }

  /**
   * Remove all expired entries from the verifications map
   * Uses default TTL for expiration check
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [userId, timestamp] of this.verifications) {
      if (now - timestamp.getTime() > ELEVATED_ACCESS_TTL_MS) {
        this.verifications.delete(userId);
      }
    }
  }

  /**
   * Check if user has valid elevated access
   * @param userId - User ID to check
   * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
   * @returns true if verification is still valid
   */
  isVerificationValid(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): boolean {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    return now < expiresAt;
  }

  /**
   * Get time until verification expires
   * @param userId - User ID to check
   * @param ttlMs - Time-to-live in milliseconds
   * @returns Remaining time in milliseconds, or 0 if expired/not found
   */
  getTimeRemaining(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): number {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return 0;
    }

    const now = new Date();
    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    const remaining = expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  /**
   * Get expiration timestamp for response
   * @param userId - User ID
   * @param ttlMs - Time-to-live in milliseconds
   * @returns ISO8601 timestamp or null
   */
  getValidUntil(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): string | null {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return null;
    }

    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    return expiresAt.toISOString();
  }

  /**
   * Clear verification for user (on logout)
   * @param userId - User ID to clear
   */
  clearVerification(userId: string): void {
    this.verifications.delete(userId);
  }

  /**
   * Clear all verifications (for testing/admin)
   */
  clearAll(): void {
    this.verifications.clear();
  }
}
