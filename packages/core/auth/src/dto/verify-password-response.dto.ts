/**
 * Verify Password Response DTO - Response structures for elevated access verification
 * Story 2.4: Elevated Access Requirement
 * AC#6: POST /api/v1/auth/verify-password endpoint
 */

import { z } from 'zod';

/**
 * Successful verify password response schema
 */
export const verifyPasswordResponseSchema = z.object({
  data: z.object({
    success: z.literal(true),
    validUntil: z.string(), // ISO8601 timestamp when elevated access expires
    message: z.string(),
  }),
});

/**
 * Type definition for response
 */
export type VerifyPasswordResponseDto = z.infer<typeof verifyPasswordResponseSchema>;

/**
 * Interface for use in service/controller (matches Zod schema)
 */
export interface VerifyPasswordResponse {
  data: {
    success: true;
    validUntil: string; // ISO8601 timestamp
    message: string;
  };
}

/**
 * Response messages in Hungarian (per project requirements)
 */
export const VERIFY_PASSWORD_MESSAGES = {
  SUCCESS: 'Emelt szintű hozzáférés megerősítve', // Elevated access confirmed
  INVALID_PASSWORD: 'Érvénytelen jelszó', // Invalid password
} as const;

/**
 * Error codes for verify password endpoint
 */
export const VerifyPasswordErrorCode = {
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;
