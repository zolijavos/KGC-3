/**
 * JWT Payload Interfaces - Story 1.1: JWT Login Endpoint
 * Per ADR-032: RBAC Architecture
 */

import type { Role } from '@prisma/client';

/**
 * JWT Payload structure for access and refresh tokens
 * ADR-032 compliant with 8 role support
 */
export interface JwtPayload {
  /** User ID (UUID) - maps to user.id */
  sub: string;
  /** User email (only in access tokens) */
  email?: string;
  /** User role from RBAC - one of 8 roles (only in access tokens) */
  role?: Role | string;
  /** Tenant ID for multi-tenancy - ADR-001 (only in access tokens) */
  tenantId?: string;
  /** Token type: 'access' or 'refresh' for type-safe validation */
  type?: 'access' | 'refresh';
  /** Issued at timestamp (seconds since epoch) */
  iat: number;
  /** Expiration timestamp (seconds since epoch) */
  exp: number;
}

/**
 * User data required for token generation
 */
export interface UserForToken {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  tenantId: string;
}

/**
 * Token Service configuration options
 */
export interface TokenServiceOptions {
  /** Access token TTL (default: '24h') */
  accessTokenTtl?: string;
  /** Refresh token TTL (default: '7d') */
  refreshTokenTtl?: string;
}

/**
 * Login response structure per AC1
 */
export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    /** Expiration time in seconds */
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

/**
 * Error response structure per AC5
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
