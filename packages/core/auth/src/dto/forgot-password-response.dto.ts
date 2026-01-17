/**
 * Forgot Password Response DTO - Response types for forgot-password endpoint
 * Story 1.5: Password Reset Flow
 * AC1: Success response
 * AC2: Same response for non-existent email (no enumeration)
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Forgot password response data schema
 */
export const forgotPasswordResponseDataSchema = z.object({
  message: z.string(),
});

/**
 * Full forgot password response schema
 */
export const forgotPasswordResponseSchema = z.object({
  data: forgotPasswordResponseDataSchema,
});

/**
 * Forgot password response data type
 */
export interface ForgotPasswordResponseData {
  message: string;
}

/**
 * Forgot password response type
 */
export interface ForgotPasswordResponse {
  data: ForgotPasswordResponseData;
}

/**
 * Forgot password response DTO (matches ForgotPasswordResponse)
 */
export type ForgotPasswordResponseDto = ForgotPasswordResponse;

/**
 * Standard message for forgot password (AC2: no email enumeration)
 * Same message whether email exists or not
 */
export const FORGOT_PASSWORD_MESSAGE =
  'Ha az email cím létezik a rendszerben, hamarosan kap egy jelszó-visszaállító linket.';
// Hungarian: If the email exists in the system, you will receive a password reset link shortly.
