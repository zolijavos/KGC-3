/**
 * Logout Response DTO - Response structures for logout endpoints
 * Story 1.3: Logout és Session Invalidation
 * AC1: Single device logout response
 * AC2: Logout all devices response
 *
 * Code Review Fix (LOW): Added error codes and message constants
 * to eliminate magic strings (G-L1)
 */

import { z } from 'zod';

// ============================================
// Error Codes (G-L1: Magic Strings Fix)
// ============================================

/**
 * Logout error codes for consistent error handling
 * Used by both auth.service.ts (throwing) and auth.controller.ts (catching)
 */
export enum LogoutErrorCode {
  /** JWT validation failed or wrong token type */
  INVALID_TOKEN = 'INVALID_TOKEN',
  /** Token not found in database */
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  /** Token belongs to different user (P1 security fix) */
  TOKEN_NOT_OWNED = 'TOKEN_NOT_OWNED',
}

/**
 * Internal error messages thrown by AuthService
 * These are checked by AuthController to determine HTTP status
 */
export const LOGOUT_ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid token',
  TOKEN_NOT_FOUND: 'Token not found',
  TOKEN_NOT_OWNED: 'Token not owned',
} as const;

/**
 * User-facing messages (Hungarian)
 */
export const LOGOUT_MESSAGES = {
  /** Single device logout success */
  SUCCESS: 'Sikeres kijelentkezés', // Hungarian: Successful logout
  /** Logout all devices success with count */
  SUCCESS_ALL: (count: number) =>
    `Sikeres kijelentkezés minden eszközről (${count} session)`, // Hungarian: Successful logout from all devices
  /** Error: Invalid token format */
  ERROR_INVALID_TOKEN: 'Érvénytelen refresh token', // Hungarian: Invalid refresh token
  /** Error: Token not found */
  ERROR_TOKEN_NOT_FOUND: 'Refresh token nem található', // Hungarian: Refresh token not found
  /** Error: Token ownership mismatch */
  ERROR_TOKEN_NOT_OWNED: 'A token nem ehhez a felhasználóhoz tartozik', // Hungarian: Token does not belong to this user
} as const;

/**
 * Successful single device logout response schema
 */
export const logoutResponseSchema = z.object({
  data: z.object({
    success: z.literal(true),
    message: z.string(),
  }),
});

/**
 * Successful logout all devices response schema
 */
export const logoutAllResponseSchema = z.object({
  data: z.object({
    success: z.literal(true),
    revokedCount: z.number().int().nonnegative(),
    message: z.string(),
  }),
});

/**
 * Type definitions
 */
export type LogoutResponseDto = z.infer<typeof logoutResponseSchema>;
export type LogoutAllResponseDto = z.infer<typeof logoutAllResponseSchema>;

/**
 * Interface for use in service/controller (matches Zod schema)
 * AC1: Single device logout response
 */
export interface LogoutResponse {
  data: {
    success: true;
    message: string;
  };
}

/**
 * Interface for logout all devices response
 * AC2: Logout all devices response with revoked count
 */
export interface LogoutAllResponse {
  data: {
    success: true;
    revokedCount: number;
    message: string;
  };
}
