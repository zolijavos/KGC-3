/**
 * Login Response DTO - Response structure for login endpoint
 * Story 1.1: JWT Login Endpoint
 * AC1: Response tartalmazza: { accessToken, refreshToken, expiresIn, user }
 */

import { z } from 'zod';

/**
 * User info in login response
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
});

/**
 * Successful login response schema
 */
export const loginResponseSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int().positive(),
    user: userResponseSchema,
  }),
});

/**
 * Error response schema (AC3, AC5)
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string()).optional(),
  }),
});

/**
 * Type definitions
 */
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginResponseDto = z.infer<typeof loginResponseSchema>;
export type ErrorResponseDto = z.infer<typeof errorResponseSchema>;
