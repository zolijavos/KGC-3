/**
 * Elevated Access Interface for dependency injection
 * Story 2.4: Elevated Access Requirement
 * AC#6: POST /api/v1/auth/verify-password endpoint
 *
 * This interface allows @kgc/auth to work with ElevatedAccessService
 * from @kgc/users without creating a circular dependency.
 */

/**
 * Injection token for elevated access service
 */
export const ELEVATED_ACCESS_SERVICE = 'ELEVATED_ACCESS_SERVICE';

/**
 * Interface for elevated access service
 * Implemented by ElevatedAccessService in @kgc/users
 */
export interface IElevatedAccessService {
  /**
   * Record a successful password verification for elevated access
   * @param userId - User ID
   */
  recordVerification(userId: string): void;

  /**
   * Check if user has valid elevated access session
   * @param userId - User ID
   * @param ttlMs - Optional custom TTL in milliseconds
   * @returns true if verification is still valid
   */
  isVerificationValid(userId: string, ttlMs?: number): boolean;

  /**
   * Get remaining time in elevated access session
   * @param userId - User ID
   * @param ttlMs - Optional custom TTL in milliseconds
   * @returns Remaining time in milliseconds (0 if expired or never verified)
   */
  getTimeRemaining(userId: string, ttlMs?: number): number;

  /**
   * Get ISO8601 timestamp when elevated access expires
   * @param userId - User ID
   * @param ttlMs - Optional custom TTL in milliseconds
   * @returns ISO8601 timestamp or null if not verified
   */
  getValidUntil(userId: string, ttlMs?: number): string | null;

  /**
   * Clear verification for a user (e.g., on logout)
   * @param userId - User ID
   */
  clearVerification(userId: string): void;
}
