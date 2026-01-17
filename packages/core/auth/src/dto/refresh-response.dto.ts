/**
 * Refresh Response DTO - Response structure for refresh endpoint
 * Story 1.2: Token Refresh
 * AC1: Response tartalmazza: { accessToken, refreshToken, expiresIn }
 */

import { z } from 'zod';

/**
 * Successful refresh response schema
 * Note: Similar to LoginResponseDto but without user info
 */
export const refreshResponseSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int().positive(),
  }),
});

/**
 * Type definitions
 */
export type RefreshResponseDto = z.infer<typeof refreshResponseSchema>;

/**
 * Interface for use in service/controller (matches Zod schema)
 */
export interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
