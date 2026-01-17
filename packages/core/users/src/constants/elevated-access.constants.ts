/**
 * Elevated Access Constants
 * Story 2.4: Elevated Access Requirement
 * AC#1: ELEVATED_PERMISSIONS Definition
 *
 * Defines permissions that require elevated access (re-authentication within 5 minutes).
 * Per ADR-032: Elevated Access (Kritikus Műveletek)
 */

import { Permission } from '../interfaces/permission.interface';

/**
 * Permissions that require elevated access (re-authentication within 5 minutes)
 * Per ADR-032: Elevated Access (Kritikus Műveletek)
 *
 * These are critical operations that could cause:
 * - Data loss (rental:cancel, user:delete)
 * - Audit/compliance issues (inventory:adjust)
 * - Security vulnerabilities (admin:config)
 */
export const ELEVATED_PERMISSIONS: readonly Permission[] = [
  Permission.RENTAL_CANCEL, // Bérlés törlése - visszavonhatatlan
  Permission.INVENTORY_ADJUST, // Készlet korrekció - audit kritikus
  Permission.USER_DELETE, // Felhasználó törlése - személyes adatok
  Permission.ADMIN_CONFIG, // Rendszer konfiguráció - biztonsági beállítások
] as const;

/**
 * Elevated access TTL in milliseconds (5 minutes)
 * User must re-authenticate within this time window for elevated operations
 */
export const ELEVATED_ACCESS_TTL_MS = 5 * 60 * 1000; // 300000ms

/**
 * Elevated access TTL in seconds (for API response)
 */
export const ELEVATED_ACCESS_TTL_SECONDS = 5 * 60; // 300s

/**
 * Check if a permission requires elevated access
 *
 * @param permission - The permission to check
 * @returns true if the permission requires elevated access (re-authentication)
 *
 * @example
 * if (isElevatedPermission(Permission.RENTAL_CANCEL)) {
 *   // Require re-authentication
 * }
 */
export function isElevatedPermission(permission: Permission): boolean {
  return ELEVATED_PERMISSIONS.includes(permission);
}
