/**
 * Login DTO - Input validation for login endpoint
 * Story 1.1: JWT Login Endpoint
 * AC5: Input validáció - 400 Bad Request for invalid input
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email megadása kötelező', // Hungarian: Email is required
      invalid_type_error: 'Email formátum érvénytelen', // Hungarian: Invalid email format
    })
    .email('Érvénytelen email cím') // Hungarian: Invalid email address
    .max(255, 'Email túl hosszú'), // Hungarian: Email too long

  password: z
    .string({
      required_error: 'Jelszó megadása kötelező', // Hungarian: Password is required
      invalid_type_error: 'Jelszó formátum érvénytelen', // Hungarian: Invalid password format
    })
    .min(8, 'A jelszónak minimum 8 karakter hosszúnak kell lennie') // Hungarian: Password must be at least 8 characters
    .max(128, 'Jelszó túl hosszú'), // Hungarian: Password too long
});

/**
 * Login DTO type inferred from schema
 */
export type LoginDto = z.infer<typeof loginSchema>;

/**
 * Validate login input and return parsed data or error
 */
export function validateLoginInput(
  data: unknown
): { success: true; data: LoginDto } | { success: false; error: ValidationError } {
  const result = loginSchema.safeParse(data);

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

/**
 * Validation error type per AC5
 */
export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}
