/**
 * User Query DTO - Input validation for user list query params
 * Story 2.1: User CRUD Operations
 * AC2: User Listázás és Keresés - pagination, search, filter
 *
 * Uses Zod for validation (project-context.md requirement)
 */

import { z } from 'zod';
import { Role, UserStatus } from '../interfaces/user.interface';

/**
 * UUID validation schema - reusable for :id parameters
 */
export const uuidSchema = z.string().uuid('Érvénytelen UUID formátum'); // Hungarian: Invalid UUID format

/**
 * Validate UUID format for :id parameters
 * @param id - String to validate
 * @returns Validation result
 */
export function validateUuid(
  id: string
): { success: true; data: string } | { success: false; error: { code: string; message: string } } {
  const result = uuidSchema.safeParse(id);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Érvénytelen azonosító formátum', // Hungarian: Invalid identifier format
    },
  };
}

/**
 * Valid role values for filter
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
 * Valid status values for filter
 */
const statusValues = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.LOCKED,
  UserStatus.PENDING_VERIFICATION,
] as const;

/**
 * Default pagination values
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_OFFSET = 0;

/**
 * User list query validation schema
 * AC2: pagination, search, filters
 */
export const userQuerySchema = z.object({
  // Pagination
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return DEFAULT_LIMIT;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1) return DEFAULT_LIMIT;
      return Math.min(num, MAX_LIMIT);
    }),

  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return DEFAULT_OFFSET;
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0) return DEFAULT_OFFSET;
      return num;
    }),

  // Search (email or name, case-insensitive)
  search: z
    .string()
    .max(255, 'Keresési kifejezés túl hosszú') // Hungarian: Search term too long
    .optional(),

  // Filters
  role: z
    .enum(roleValues, {
      errorMap: () => ({ message: 'Érvénytelen szerepkör filter' }), // Hungarian: Invalid role filter
    })
    .optional(),

  status: z
    .enum(statusValues, {
      errorMap: () => ({ message: 'Érvénytelen státusz filter' }), // Hungarian: Invalid status filter
    })
    .optional(),

  locationId: z
    .string()
    .uuid('Érvénytelen helyszín ID formátum') // Hungarian: Invalid location ID format
    .optional(),
});

/**
 * User Query DTO type inferred from schema
 */
export type UserQueryDto = z.infer<typeof userQuerySchema>;

/**
 * Validation error type
 */
export interface UserQueryValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

/**
 * Validate user query input and return parsed data or error
 */
export function validateUserQueryInput(
  data: unknown
): { success: true; data: UserQueryDto } | { success: false; error: UserQueryValidationError } {
  const result = userQuerySchema.safeParse(data);

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
      message: 'Érvénytelen lekérdezési paraméterek', // Hungarian: Invalid query parameters
      fields,
    },
  };
}
