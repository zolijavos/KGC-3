/**
 * @RequireElevatedAccess Decorator
 * Story 2.4: Elevated Access Requirement
 * AC#2: @RequireElevatedAccess Decorator
 *
 * Decorator to mark endpoints that require elevated access (re-authentication).
 * Used with ElevatedAccessGuard to enforce 5-minute re-auth requirement.
 *
 * @example
 * // Default 5 minute TTL
 * @Post(':id/cancel')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ElevatedAccessGuard)
 * @RequirePermission(Permission.RENTAL_CANCEL)
 * @RequireElevatedAccess()
 * async cancelRental(@Param('id') id: string) { ... }
 *
 * @example
 * // Custom 1 minute TTL for extra sensitive operation
 * @Delete(':id')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ElevatedAccessGuard)
 * @RequirePermission(Permission.USER_DELETE)
 * @RequireElevatedAccess(60 * 1000)
 * async deleteUser(@Param('id') id: string) { ... }
 */

import { SetMetadata } from '@nestjs/common';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

/** Metadata key for storing elevated access configuration */
export const ELEVATED_ACCESS_KEY = 'elevated_access';

/**
 * Elevated access metadata structure
 */
export interface ElevatedAccessMetadata {
  /** Time-to-live for elevated access in milliseconds */
  ttlMs: number;
}

/** Minimum allowed TTL (1 second) */
const MIN_TTL_MS = 1000;

/** Maximum allowed TTL (1 hour) */
const MAX_TTL_MS = 60 * 60 * 1000;

/**
 * @RequireElevatedAccess decorator
 * Marks endpoint as requiring recent password verification (elevated access)
 *
 * @param ttlMs - Custom TTL in milliseconds (default: 5 minutes / 300000ms)
 *               Must be between 1 second and 1 hour
 * @returns MethodDecorator that sets elevated access metadata
 * @throws Error if TTL is invalid (negative, zero, or exceeds limits)
 *
 * @example
 * // Default 5 minute TTL
 * @RequireElevatedAccess()
 *
 * @example
 * // Custom 1 minute TTL for extra sensitive operation
 * @RequireElevatedAccess(60 * 1000)
 */
export function RequireElevatedAccess(
  ttlMs: number = ELEVATED_ACCESS_TTL_MS
): MethodDecorator {
  // Validate TTL parameter
  if (ttlMs < MIN_TTL_MS) {
    throw new Error(
      `RequireElevatedAccess: TTL must be at least ${MIN_TTL_MS}ms (1 second), got ${ttlMs}ms`
    );
  }
  if (ttlMs > MAX_TTL_MS) {
    throw new Error(
      `RequireElevatedAccess: TTL must not exceed ${MAX_TTL_MS}ms (1 hour), got ${ttlMs}ms`
    );
  }

  const metadata: ElevatedAccessMetadata = { ttlMs };
  return SetMetadata(ELEVATED_ACCESS_KEY, metadata);
}
