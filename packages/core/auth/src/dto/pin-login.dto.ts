/**
 * PIN Login DTO - Input validation for PIN login endpoint
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC4: PIN input validáció - 400 Bad Request for invalid input
 * AC5: Device ID validáció - 400 Bad Request for invalid/missing deviceId
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';

/** UUID regex for device ID validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PIN login request validation schema
 * AC4: PIN must be 4-6 numeric digits
 * AC5: deviceId must be a valid UUID
 */
export const pinLoginSchema = z.object({
  pin: z
    .string({
      required_error: 'PIN kód megadása kötelező', // Hungarian: PIN is required
      invalid_type_error: 'PIN kód formátum érvénytelen', // Hungarian: Invalid PIN format
    })
    .regex(/^\d{4,6}$/, 'A PIN kód 4-6 számjegyből kell álljon'), // Hungarian: PIN must be 4-6 digits

  deviceId: z
    .string({
      required_error: 'Eszköz azonosító megadása kötelező', // Hungarian: Device ID is required
      invalid_type_error: 'Eszköz azonosító formátum érvénytelen', // Hungarian: Invalid device ID format
    })
    .regex(UUID_REGEX, 'Érvénytelen eszköz azonosító formátum'), // Hungarian: Invalid device ID format
});

/**
 * PIN Login DTO type inferred from schema
 */
export type PinLoginDto = z.infer<typeof pinLoginSchema>;

/**
 * Validate PIN login input and return parsed data or error
 */
export function validatePinLoginInput(
  data: unknown
): { success: true; data: PinLoginDto } | { success: false; error: PinValidationError } {
  const result = pinLoginSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC4, AC5)
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
 * PIN validation error type per AC4, AC5
 */
export interface PinValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}
