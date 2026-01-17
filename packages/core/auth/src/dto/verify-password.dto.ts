/**
 * Verify Password DTO - Input validation for elevated access verification
 * Story 2.4: Elevated Access Requirement
 * AC#6: POST /api/v1/auth/verify-password endpoint
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';
import type { ValidationError } from './login.dto';

/**
 * Verify password request validation schema
 * User must provide current password to gain elevated access
 */
export const verifyPasswordSchema = z.object({
  password: z
    .string({
      required_error: 'Jelszó megadása kötelező', // Hungarian: Password is required
      invalid_type_error: 'Jelszó formátum érvénytelen', // Hungarian: Invalid password format
    })
    .min(1, 'Jelszó nem lehet üres') // Hungarian: Password cannot be empty
    .max(128, 'Jelszó túl hosszú'), // Hungarian: Password too long
});

/**
 * Verify Password DTO type inferred from schema
 */
export type VerifyPasswordDto = z.infer<typeof verifyPasswordSchema>;

/**
 * Validate verify password input and return parsed data or error
 * @param data - Unknown input to validate
 * @returns Validation result with parsed data or error
 */
export function validateVerifyPasswordInput(
  data: unknown
): { success: true; data: VerifyPasswordDto } | { success: false; error: ValidationError } {
  const result = verifyPasswordSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format
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
