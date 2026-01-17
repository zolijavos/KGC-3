/**
 * Update Profile DTO - Input validation for profile update
 * Story 2.6: User Profile Management
 * AC#2: PUT /users/me - Update name, phone, avatarUrl
 * AC#5: Input validation with Zod
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * Hungarian phone validation regex
 * Formats: +36 20 123 4567, 06201234567, +36-30-1234567
 * Supports: 20, 30, 31, 50, 70 prefixes
 */
const HUNGARIAN_PHONE_REGEX = /^(\+36|06)[ -]?(20|30|31|50|70)[ -]?\d{3}[ -]?\d{4}$/;

/**
 * Update profile request validation schema
 * All fields are optional - only provided fields are updated
 */
export const updateProfileSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'A név formátuma érvénytelen', // Invalid name format
    })
    .min(2, 'A név legalább 2 karakter') // Name must be at least 2 characters
    .max(255, 'A név maximum 255 karakter') // Name must be at most 255 characters
    .optional(),

  phone: z
    .string({
      invalid_type_error: 'A telefonszám formátuma érvénytelen', // Invalid phone format
    })
    .regex(HUNGARIAN_PHONE_REGEX, 'Érvénytelen magyar telefonszám formátum (+36/06 20/30/31/50/70 XXX XXXX)')
    .or(z.literal('')) // Allow empty string
    .nullish()
    .transform((val) => (val === '' ? null : val)), // Transform empty string to null

  avatarUrl: z
    .string({
      invalid_type_error: 'Az avatar URL formátuma érvénytelen', // Invalid avatar URL format
    })
    .url('Érvénytelen URL formátum') // Invalid URL format
    .max(500, 'Az URL maximum 500 karakter') // URL must be at most 500 characters
    .or(z.literal('')) // Allow empty string
    .nullish()
    .transform((val) => (val === '' ? null : val)), // Transform empty string to null
});

/**
 * Update Profile DTO type inferred from schema
 */
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

/**
 * Validation error type
 */
export interface UpdateProfileValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields?: Record<string, string>;
}

/**
 * Validate update profile input and return parsed data or error
 * @param data - Unknown input to validate
 * @returns Validation result with parsed data or error
 */
export function validateUpdateProfileInput(
  data: unknown
):
  | { success: true; data: UpdateProfileDto }
  | { success: false; error: UpdateProfileValidationError } {
  const result = updateProfileSchema.safeParse(data);

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
      message: 'Érvénytelen bemenet', // Invalid input
      fields,
    },
  };
}

/**
 * Export the regex for testing
 */
export { HUNGARIAN_PHONE_REGEX };
