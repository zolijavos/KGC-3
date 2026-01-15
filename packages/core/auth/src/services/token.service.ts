/**
 * Token Service - JWT token generation and validation
 * Story 1.1: JWT Login Endpoint
 * AC1: JWT access token (24h TTL) és refresh token (7d TTL)
 *
 * Security requirements:
 * - Access token: 24 hour expiration
 * - Refresh token: 7 day expiration
 * - HMAC SHA-256 signature
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type {
  JwtPayload,
  TokenServiceOptions,
  UserForToken,
} from '../interfaces/jwt-payload.interface';

/** Default TTL values */
const DEFAULT_ACCESS_TOKEN_TTL = '24h';
const DEFAULT_REFRESH_TOKEN_TTL = '7d';

/** TTL in seconds for getExpiresIn() */
const TTL_IN_SECONDS = {
  access: 24 * 60 * 60, // 24 hours
  refresh: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Parse TTL string to seconds
 */
function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    return TTL_IN_SECONDS.access; // default
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value / 1000;
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return TTL_IN_SECONDS.access;
  }
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTokenTtl: string;
  private readonly refreshTokenTtl: string;

  /**
   * Constructor supports both DI and manual instantiation
   * @param jwtSecret - JWT secret (injected via DI or passed directly)
   * @param options - Optional TTL configuration
   */
  constructor(
    @Inject('JWT_SECRET') @Optional() jwtSecret?: string,
    @Optional() options?: TokenServiceOptions
  ) {
    // Support both DI injection and manual instantiation
    this.jwtSecret = jwtSecret ?? '';
    this.accessTokenTtl = options?.accessTokenTtl ?? DEFAULT_ACCESS_TOKEN_TTL;
    this.refreshTokenTtl = options?.refreshTokenTtl ?? DEFAULT_REFRESH_TOKEN_TTL;
  }

  /**
   * Generate JWT access token with 24h TTL
   * @param user - User data for token payload
   * @returns Promise<string> - Signed JWT token
   */
  async generateAccessToken(user: UserForToken): Promise<string> {
    this.validateUser(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'access' as const, // P7: Add type claim for token type validation
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenTtl,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate JWT refresh token with 7d TTL
   * @param user - User data for token payload
   * @returns Promise<string> - Signed JWT token
   */
  async generateRefreshToken(user: UserForToken): Promise<string> {
    this.validateUser(user);

    const payload = {
      sub: user.id,
      type: 'refresh' as const,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenTtl,
      algorithm: 'HS256',
    });
  }

  /**
   * Validate a JWT token's signature and expiration (any type)
   * @param token - JWT token to validate
   * @returns Promise<boolean> - true if valid, false otherwise
   */
  async validateToken(token: string): Promise<boolean> {
    if (!token || token.length === 0) {
      return false;
    }

    try {
      jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate specifically an access token (P7: type validation)
   * @param token - JWT token to validate
   * @returns Promise<boolean> - true if valid access token, false otherwise
   */
  async validateAccessToken(token: string): Promise<boolean> {
    if (!(await this.validateToken(token))) {
      return false;
    }
    const payload = this.decodeToken(token);
    return payload?.type === 'access';
  }

  /**
   * Validate specifically a refresh token (P7: type validation)
   * @param token - JWT token to validate
   * @returns Promise<boolean> - true if valid refresh token, false otherwise
   */
  async validateRefreshToken(token: string): Promise<boolean> {
    if (!(await this.validateToken(token))) {
      return false;
    }
    const payload = this.decodeToken(token);
    return payload?.type === 'refresh';
  }

  /**
   * Decode a JWT token without verification
   * Useful for reading payload data
   * @param token - JWT token to decode
   * @returns JwtPayload | null - Decoded payload or null if invalid
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') {
        return null;
      }
      return decoded as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiration time in seconds
   * @param type - 'access' or 'refresh'
   * @returns number - TTL in seconds
   */
  getExpiresIn(type: 'access' | 'refresh'): number {
    if (type === 'access') {
      return parseTtlToSeconds(this.accessTokenTtl);
    }
    return parseTtlToSeconds(this.refreshTokenTtl);
  }

  /**
   * Validate user data for token generation
   */
  private validateUser(user: UserForToken): void {
    if (!user) {
      throw new Error('User data is required');
    }
    if (!user.id) {
      throw new Error('User ID is required');
    }
  }
}
