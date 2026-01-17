/**
 * Create User DTO - Input validation for user creation
 * Story 2.1: User CRUD Operations
 * AC1: User Létrehozás - required/optional fields
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
 * Valid status values for Zod enum (only ACTIVE and PENDING_VERIFICATION allowed on create)
 */
const createStatusValues = [UserStatus.ACTIVE, UserStatus.PENDING_VERIFICATION] as const;

/**
 * Create user request validation schema
 * AC1: email, name required; role, locationId, status optional
 * Note: tenantId is injected from authenticated user context (security)
 */
export const createUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email megadása kötelező', // Hungarian: Email is required
      invalid_type_error: 'Email formátum érvénytelen', // Hungarian: Invalid email format
    })
    .email('Érvénytelen email cím') // Hungarian: Invalid email address
    .max(255, 'Email túl hosszú (max 255 karakter)') // Hungarian: Email too long
    .transform((email) => email.toLowerCase()), // M4 fix: Normalize email to lowercase

  name: z
    .string({
      required_error: 'Név megadása kötelező', // Hungarian: Name is required
      invalid_type_error: 'Név formátum érvénytelen', // Hungarian: Invalid name format
    })
    .min(2, 'A névnek minimum 2 karakter hosszúnak kell lennie') // Hungarian: Name must be at least 2 characters
    .max(100, 'Név túl hosszú (max 100 karakter)'), // Hungarian: Name too long

  // tenantId is optional in request - will be injected from auth context
  tenantId: z
    .string()
    .uuid('Érvénytelen tenant ID formátum') // Hungarian: Invalid tenant ID format
    .optional(),

  role: z
    .enum(roleValues, {
      errorMap: () => ({ message: 'Érvénytelen szerepkör' }), // Hungarian: Invalid role
    })
    .optional()
    .default(Role.OPERATOR),

  locationId: z
    .string()
    .uuid('Érvénytelen helyszín ID formátum') // Hungarian: Invalid location ID format
    .optional()
    .nullable(),

  status: z
    .enum(createStatusValues, {
      errorMap: () => ({ message: 'Érvénytelen státusz (csak ACTIVE vagy PENDING_VERIFICATION)' }),
    })
    .optional()
    .default(UserStatus.ACTIVE),
});

/**
 * Create User DTO type inferred from schema
 */
export type CreateUserDto = z.infer<typeof createUserSchema>;

/**
 * Validation error type per AC7
 */
export interface CreateUserValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Validate create user input and return parsed data or error
 * AC7: 400 Bad Request válasz with field-level errors
 */
export function validateCreateUserInput(
  data: unknown
): { success: true; data: CreateUserDto } | { success: false; error: CreateUserValidationError } {
  const result = createUserSchema.safeParse(data);

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
