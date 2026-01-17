/**
 * Assign Role DTO - Zod validation for role assignment
 * Story 2.2: Role Assignment és RBAC
 * AC#1: PUT /users/:id/role endpoint
 * AC#8: Zod DTO validation
 */

import { z } from 'zod';
import { Role, UserErrorCode } from '../interfaces/user.interface';

/**
 * Assign Role Input Schema
 * Validates the role assignment request body
 */
export const AssignRoleSchema = z
  .object({
    role: z.nativeEnum(Role, {
      errorMap: () => ({
        message: 'Érvénytelen szerepkör. Használjon: OPERATOR, TECHNIKUS, BOLTVEZETO, ACCOUNTANT, PARTNER_OWNER, CENTRAL_ADMIN, DEVOPS_ADMIN, SUPER_ADMIN',
      }),
    }),
    reason: z
      .string()
      .min(5, { message: 'Az indoklásnak legalább 5 karakter hosszúnak kell lennie' })
      .max(500, { message: 'Az indoklás maximum 500 karakter lehet' })
      .optional(),
  })
  .strict();

/**
 * Type inferred from schema
 */
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;

/**
 * Role assignment response type
 */
export interface AssignRoleResponse {
  success: boolean;
  data: {
    userId: string;
    previousRole: Role;
    newRole: Role;
    assignedBy: string;
    assignedAt: Date;
    reason?: string;
  };
}

/**
 * Validation result type
 */
export type AssignRoleValidationResult =
  | { success: true; data: AssignRoleInput }
  | { success: false; error: { code: string; message: string; details?: z.ZodIssue[] } };

/**
 * Validate role assignment input
 * @param input - The input to validate
 * @returns Validation result with typed data or error
 */
export function validateAssignRoleInput(input: unknown): AssignRoleValidationResult {
  const result = AssignRoleSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: {
      code: UserErrorCode.VALIDATION_ERROR,
      message: 'Érvénytelen bemenet', // Hungarian: Invalid input
      details: result.error.issues,
    },
  };
}

/**
 * Role assignment error messages
 */
export const ROLE_ASSIGNMENT_MESSAGES = {
  SUCCESS: 'Szerepkör sikeresen hozzárendelve',
  HIERARCHY_VIOLATION: 'Nem rendelhet magasabb szintű szerepkört',
  SELF_ASSIGNMENT: 'Saját szerepkör nem módosítható',
  USER_NOT_FOUND: 'Felhasználó nem található',
  SAME_ROLE: 'A felhasználónak már ez a szerepköre',
} as const;
