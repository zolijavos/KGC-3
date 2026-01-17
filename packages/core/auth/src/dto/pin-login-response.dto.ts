/**
 * PIN Login Response DTO - Response structure for PIN login endpoint
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC1: Successful PIN login response (kiosk token, 4h TTL)
 */

import { z } from 'zod';

/**
 * Successful PIN login response schema
 * Note: No refresh token for kiosk mode (shorter session)
 */
export const pinLoginResponseSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    expiresIn: z.number().int().positive(), // 14400 seconds (4h)
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      role: z.string(),
    }),
  }),
});

/**
 * Type definitions
 */
export type PinLoginResponseDto = z.infer<typeof pinLoginResponseSchema>;

/**
 * Interface for use in service/controller (matches Zod schema)
 * AC1: Kiosk token response (no refresh token)
 */
export interface PinLoginResponse {
  data: {
    accessToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

/**
 * PIN Login error codes
 */
export enum PinLoginErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 400 - invalid input
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS', // 401 - wrong PIN or no PIN
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED', // 403 - device not registered
  PIN_LOCKOUT = 'PIN_LOCKOUT', // 429 - too many attempts
}
