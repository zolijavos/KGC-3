/**
 * Forgot Password DTO - Input validation for forgot-password endpoint
 * Story 1.5: Password Reset Flow
 * AC1: Forgot password request validation
 * AC7: Input validation with Zod
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Forgot password request validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: 'Email megadása kötelező', // Hungarian: Email is required
      invalid_type_error: 'Email formátum érvénytelen', // Hungarian: Invalid email format
    })
    .email('Érvénytelen email cím') // Hungarian: Invalid email address
    .max(255, 'Email túl hosszú'), // Hungarian: Email too long
});

/**
 * Forgot Password DTO type inferred from schema
 */
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

/**
 * Validation error type for forgot password
 */
export interface ForgotPasswordValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Validate forgot password input and return parsed data or error
 */
export function validateForgotPasswordInput(
  data: unknown
): { success: true; data: ForgotPasswordDto } | { success: false; error: ForgotPasswordValidationError } {
  const result = forgotPasswordSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC7)
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    fields[path] = issue.message;
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Érvénytelen bemenet', // Hungarian: Invalid input
      fields,
    },
  };
}
