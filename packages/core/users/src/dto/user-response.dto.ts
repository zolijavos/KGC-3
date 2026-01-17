/**
 * User Response DTOs
 * Story 2.1: User CRUD Operations
 *
 * Defines response structures for user endpoints.
 * Consistent with Epic 1 response patterns.
 */

import { z } from 'zod';
import { Role, UserStatus } from '../interfaces/user.interface';

/**
 * User response schema for validation
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(Role),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  status: z.nativeEnum(UserStatus),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
});

/**
 * Single user response wrapper schema
 */
export const singleUserResponseSchema = z.object({
  data: userResponseSchema,
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

/**
 * User list response schema
 */
export const userListResponseSchema = z.object({
  data: z.array(userResponseSchema),
  pagination: paginationSchema,
});

/**
 * Delete user response schema
 */
export const deleteUserResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
});

/**
 * Error response schema (consistent with Epic 1)
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string()).optional(),
  }),
});

/**
 * Response DTO types
 */
export type UserResponseDto = z.infer<typeof userResponseSchema>;
export type SingleUserResponseDto = z.infer<typeof singleUserResponseSchema>;
export type UserListResponseDto = z.infer<typeof userListResponseSchema>;
export type DeleteUserResponseDto = z.infer<typeof deleteUserResponseSchema>;
export type ErrorResponseDto = z.infer<typeof errorResponseSchema>;

/**
 * Helper function to format user entity to response DTO
 */
export function formatUserResponse(user: {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  tenantId: string;
  locationId?: string | null;
  status: UserStatus | string;
  createdAt: Date;
  updatedAt: Date;
}): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: user.tenantId,
    locationId: user.locationId ?? null,
    status: user.status as UserStatus,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Success messages (Hungarian)
 */
export const USER_MESSAGES = {
  CREATED: 'Felhasználó sikeresen létrehozva', // User successfully created
  UPDATED: 'Felhasználó sikeresen frissítve', // User successfully updated
  DELETED: 'Felhasználó sikeresen törölve', // User successfully deleted
  NOT_FOUND: 'Felhasználó nem található', // User not found
  EMAIL_EXISTS: 'Ez az email cím már foglalt', // Email already exists
  ROLE_VIOLATION: 'Csak egyenlő vagy alacsonyabb szintű szerepkört rendelhet hozzá', // Role hierarchy violation
  UNAUTHORIZED: 'Nincs jogosultsága ehhez a művelethez', // Unauthorized
} as const;
