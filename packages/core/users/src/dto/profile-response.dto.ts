/**
 * Profile Response DTO
 * Story 2.6: User Profile Management
 * AC#1: GET /users/me - Profile response without sensitive data
 *
 * Defines profile response structure excluding passwordHash and pinHash.
 */

import { z } from 'zod';
import { Role, UserStatus } from '../interfaces/user.interface';

/**
 * Profile response schema for validation
 * Includes phone and avatarUrl, excludes sensitive fields
 */
export const profileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(Role),
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().nullable(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: z.nativeEnum(UserStatus),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
});

/**
 * Profile response DTO type
 */
export type ProfileResponseDto = z.infer<typeof profileResponseSchema>;

/**
 * Helper function to format user entity to profile response DTO
 * Security by design: explicit field mapping, no sensitive data
 *
 * @param user - User entity from database
 * @returns ProfileResponseDto without sensitive fields
 */
export function formatProfileResponse(user: {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  tenantId: string;
  locationId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: UserStatus | string;
  createdAt: Date;
  updatedAt: Date;
  // Sensitive fields excluded by not being in return type
  passwordHash?: string;
  pinHash?: string | null;
}): ProfileResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: user.tenantId,
    locationId: user.locationId ?? null,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status as UserStatus,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Profile success messages (Hungarian)
 */
export const PROFILE_MESSAGES = {
  PROFILE_UPDATED: 'Profil sikeresen frissítve', // Profile successfully updated
  PIN_CHANGED: 'PIN sikeresen módosítva', // PIN successfully changed
  NOT_FOUND: 'Felhasználó nem található', // User not found
  INVALID_PIN: 'Érvénytelen jelenlegi PIN kód', // Invalid current PIN
} as const;
