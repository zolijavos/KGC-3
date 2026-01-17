/**
 * Reset Password DTO - Input validation for reset-password endpoint
 * Story 1.5: Password Reset Flow
 * AC3: Reset password with valid token
 * AC4: Password policy validation
 * AC7: Input validation with Zod
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Password policy schema - AC4 requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export const passwordPolicySchema = z
  .string({
    required_error: 'Jelszó megadása kötelező', // Hungarian: Password is required
    invalid_type_error: 'Jelszó formátum érvénytelen', // Hungarian: Invalid password format
  })
  .min(8, 'A jelszónak minimum 8 karakter hosszúnak kell lennie') // Hungarian: Password must be at least 8 characters
  .max(128, 'Jelszó túl hosszú') // Hungarian: Password too long
  .regex(/[A-Z]/, 'Legalább 1 nagybetű szükséges') // Hungarian: At least 1 uppercase letter required
  .regex(/[0-9]/, 'Legalább 1 szám szükséges'); // Hungarian: At least 1 number required

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({
      required_error: 'Token megadása kötelező', // Hungarian: Token is required
      invalid_type_error: 'Token formátum érvénytelen', // Hungarian: Invalid token format
    })
    .min(1, 'Token megadása kötelező'), // Hungarian: Token is required

  newPassword: passwordPolicySchema,
});

/**
 * Reset Password DTO type inferred from schema
 */
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

/**
 * Validation error type for reset password
 */
export interface ResetPasswordValidationError {
  code: 'VALIDATION_ERROR' | 'PASSWORD_POLICY_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Validate reset password input and return parsed data or error
 */
export function validateResetPasswordInput(
  data: unknown
): { success: true; data: ResetPasswordDto } | { success: false; error: ResetPasswordValidationError } {
  const result = resetPasswordSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC7)
  const fields: Record<string, string> = {};
  let hasPasswordPolicyError = false;

  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    fields[path] = issue.message;

    // Check if this is a password policy error
    if (path === 'newPassword' && issue.code !== 'invalid_type' && issue.code !== 'too_small') {
      hasPasswordPolicyError = true;
    }
  }

  return {
    success: false,
    error: {
      code: hasPasswordPolicyError ? 'PASSWORD_POLICY_ERROR' : 'VALIDATION_ERROR',
      message: hasPasswordPolicyError
        ? 'A jelszó nem felel meg a biztonsági követelményeknek' // Hungarian: Password doesn't meet security requirements
        : 'Érvénytelen bemenet', // Hungarian: Invalid input
      fields,
    },
  };
}
