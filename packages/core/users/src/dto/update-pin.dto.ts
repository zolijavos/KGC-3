/**
 * Update PIN DTO - Input validation for PIN change
 * Story 2.6: User Profile Management
 * AC#4: PUT /users/me/pin - PIN code modification
 * AC#5: Input validation with Zod
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/**
 * PIN validation regex: 4-6 digits
 */
const PIN_REGEX = /^\d{4,6}$/;

/**
 * Update PIN request validation schema
 * Requires current PIN for verification and new PIN to set
 *
 * SECURITY: For first PIN setup (when user has no existing PIN),
 * password is required for identity verification.
 */
export const updatePinSchema = z.object({
  currentPin: z
    .string({
      required_error: 'Jelenlegi PIN megadása kötelező', // Current PIN is required
      invalid_type_error: 'A PIN formátuma érvénytelen', // Invalid PIN format
    })
    .regex(PIN_REGEX, 'A jelenlegi PIN 4-6 számjegy'), // Current PIN must be 4-6 digits

  newPin: z
    .string({
      required_error: 'Új PIN megadása kötelező', // New PIN is required
      invalid_type_error: 'A PIN formátuma érvénytelen', // Invalid PIN format
    })
    .regex(PIN_REGEX, 'Az új PIN 4-6 számjegy'), // New PIN must be 4-6 digits

  password: z
    .string({
      invalid_type_error: 'A jelszó formátuma érvénytelen', // Invalid password format
    })
    .min(1, 'A jelszó megadása kötelező az első PIN beállításához') // Password required for first PIN setup
    .optional(), // Optional - only required for first PIN setup (when user has no existing PIN)
});

/**
 * Update PIN DTO type inferred from schema
 */
export type UpdatePinDto = z.infer<typeof updatePinSchema>;

/**
 * Update PIN response type
 */
export interface UpdatePinResponse {
  success: boolean;
  message: string;
}

/**
 * Validation error type for PIN update
 */
export interface UpdatePinValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields?: Record<string, string>;
}

/**
 * Validate update PIN input and return parsed data or error
 * @param data - Unknown input to validate
 * @returns Validation result with parsed data or error
 */
export function validateUpdatePinInput(
  data: unknown
):
  | { success: true; data: UpdatePinDto }
  | { success: false; error: UpdatePinValidationError } {
  const result = updatePinSchema.safeParse(data);

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
export { PIN_REGEX };
