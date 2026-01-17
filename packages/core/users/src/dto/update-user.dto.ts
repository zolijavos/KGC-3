/**
 * Update User DTO - Input validation for user updates
 * Story 2.1: User CRUD Operations
 * AC4: User Módosítás - name, role, locationId, status modifiable; email immutable
 * AC7: Input Validáció - Zod validation with Hungarian error messages
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';
import { Role, UserStatus } from '../interfaces/user.interface';

/**
 * Valid role values for Zod enum
 */
const roleValues = [
  Role.OPERATOR,
  Role.TECHNIKUS,
  Role.BOLTVEZETO,
  Role.ACCOUNTANT,
  Role.PARTNER_OWNER,
  Role.CENTRAL_ADMIN,
  Role.DEVOPS_ADMIN,
  Role.SUPER_ADMIN,
] as const;

/**
 * Valid status values for update (ACTIVE, INACTIVE, LOCKED, PENDING_VERIFICATION)
 */
const updateStatusValues = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.LOCKED,
  UserStatus.PENDING_VERIFICATION,
] as const;

/**
 * Update user request validation schema
 * AC4: name, role, locationId, status modifiable; email NOT modifiable
 * Note: email field is explicitly NOT included - it's immutable
 */
export const updateUserSchema = z
  .object({
    name: z
      .string({
        invalid_type_error: 'Név formátum érvénytelen', // Hungarian: Invalid name format
      })
      .min(2, 'A névnek minimum 2 karakter hosszúnak kell lennie') // Hungarian: Name must be at least 2 characters
      .max(100, 'Név túl hosszú (max 100 karakter)') // Hungarian: Name too long
      .optional(),

    role: z
      .enum(roleValues, {
        errorMap: () => ({ message: 'Érvénytelen szerepkör' }), // Hungarian: Invalid role
      })
      .optional(),

    locationId: z
      .string()
      .uuid('Érvénytelen helyszín ID formátum') // Hungarian: Invalid location ID format
      .nullable()
      .optional(),

    status: z
      .enum(updateStatusValues, {
        errorMap: () => ({ message: 'Érvénytelen státusz' }), // Hungarian: Invalid status
      })
      .optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return data.name !== undefined || data.role !== undefined ||
             data.locationId !== undefined || data.status !== undefined;
    },
    {
      message: 'Legalább egy módosítandó mező szükséges', // Hungarian: At least one field required
    }
  );

/**
 * Update User DTO type inferred from schema
 */
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

/**
 * Validation error type per AC7
 */
export interface UpdateUserValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Validate update user input and return parsed data or error
 * AC7: 400 Bad Request válasz with field-level errors
 */
export function validateUpdateUserInput(
  data: unknown
): { success: true; data: UpdateUserDto } | { success: false; error: UpdateUserValidationError } {
  const result = updateUserSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our error format (AC7)
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root';
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
