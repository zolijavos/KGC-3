/**
 * Logout DTO - Input validation for logout endpoint
 * Story 1.3: Logout és Session Invalidation
 * AC4: Input validáció - 400 Bad Request for invalid/missing token
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';
import type { ValidationError } from './login.dto';

/**
 * Logout request validation schema (single device)
 */
export const logoutSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token megadása kötelező', // Hungarian: Refresh token is required
      invalid_type_error: 'Refresh token formátum érvénytelen', // Hungarian: Invalid refresh token format
    })
    .min(1, 'Refresh token nem lehet üres') // Hungarian: Refresh token cannot be empty
    .max(1000, 'Refresh token túl hosszú'), // Hungarian: Refresh token too long
});

/**
 * Logout DTO type inferred from schema
 */
export type LogoutDto = z.infer<typeof logoutSchema>;

/**
 * Validate logout input and return parsed data or error
 * @param data - Unknown input to validate
 * @returns Validation result with parsed data or error
 */
export function validateLogoutInput(
  data: unknown
): { success: true; data: LogoutDto } | { success: false; error: ValidationError } {
  const result = logoutSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC4)
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
