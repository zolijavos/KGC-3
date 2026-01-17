/**
 * Refresh Token DTO - Input validation for refresh endpoint
 * Story 1.2: Token Refresh
 * AC5: Input validáció - 400 Bad Request for invalid/missing token
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';
import type { ValidationError } from './login.dto';

/**
 * Refresh token request validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token megadása kötelező', // Hungarian: Refresh token is required
      invalid_type_error: 'Refresh token formátum érvénytelen', // Hungarian: Invalid refresh token format
    })
    .min(1, 'Refresh token nem lehet üres') // Hungarian: Refresh token cannot be empty
    .max(1000, 'Refresh token túl hosszú'), // Hungarian: Refresh token too long
});

/**
 * Refresh Token DTO type inferred from schema
 */
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

/**
 * Validate refresh token input and return parsed data or error
 * @param data - Unknown input to validate
 * @returns Validation result with parsed data or error
 */
export function validateRefreshInput(
  data: unknown
): { success: true; data: RefreshTokenDto } | { success: false; error: ValidationError } {
  const result = refreshTokenSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC5)
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
