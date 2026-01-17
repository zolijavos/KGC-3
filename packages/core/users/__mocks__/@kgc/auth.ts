/**
 * Mock for @kgc/auth package
 * Used in vitest tests to avoid build dependency
 */

import { vi } from 'vitest';

export class JwtAuthGuard {
  canActivate() {
    return true;
  }
}

export class AuthService {
  revokeAllUserTokens = vi.fn().mockResolvedValue(1);
}

export class PasswordService {
  hashPassword = vi.fn().mockResolvedValue('hashed-password');
  verifyPassword = vi.fn().mockResolvedValue(true);
}

export class TokenService {
  generateAccessToken = vi.fn().mockResolvedValue('access-token');
  generateRefreshToken = vi.fn().mockResolvedValue('refresh-token');
}

// DTOs (mocked as passthrough)
export const loginSchema = {};
export const validateLoginInput = vi.fn();
export type ValidationError = {
  code: string;
  message: string;
  fields: Record<string, string>;
};
