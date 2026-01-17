/**
 * Reset Password Response DTO - Response types for reset-password endpoint
 * Story 1.5: Password Reset Flow
 * AC3: Success response
 * AC5: Error response for invalid token
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Reset password response data schema
 */
export const resetPasswordResponseDataSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Full reset password response schema
 */
export const resetPasswordResponseSchema = z.object({
  data: resetPasswordResponseDataSchema,
});

/**
 * Reset password response data type
 */
export interface ResetPasswordResponseData {
  success: boolean;
  message: string;
}

/**
 * Reset password response type
 */
export interface ResetPasswordResponse {
  data: ResetPasswordResponseData;
}

/**
 * Reset password response DTO (matches ResetPasswordResponse)
 */
export type ResetPasswordResponseDto = ResetPasswordResponse;

/**
 * Error codes for password reset (AC5)
 */
export enum PasswordResetErrorCode {
  /** Token not found, expired, or already used */
  INVALID_TOKEN = 'INVALID_TOKEN',
  /** Password doesn't meet policy requirements */
  PASSWORD_POLICY_ERROR = 'PASSWORD_POLICY_ERROR',
  /** Too many requests (rate limited) */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Input validation failed */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Error response for password reset
 */
export interface PasswordResetErrorResponse {
  error: {
    code: PasswordResetErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

/**
 * Standard messages for reset password
 */
export const RESET_PASSWORD_MESSAGES = {
  SUCCESS: 'Jelszó sikeresen módosítva. Mostantól bejelentkezhet az új jelszavával.',
  // Hungarian: Password successfully changed. You can now log in with your new password.

  INVALID_TOKEN: 'Érvénytelen vagy lejárt token. Kérjen új jelszó-visszaállító linket.',
  // Hungarian: Invalid or expired token. Please request a new password reset link.

  RATE_LIMITED: 'Túl sok kérés. Kérjük, próbálja újra 15 perc múlva.',
  // Hungarian: Too many requests. Please try again in 15 minutes.
} as const;
