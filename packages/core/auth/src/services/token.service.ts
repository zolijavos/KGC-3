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
const DEFAULT_KIOSK_TOKEN_TTL = '4h'; // Story 1.4: Shorter session for kiosk mode

/** TTL in seconds for getExpiresIn() */
const TTL_IN_SECONDS = {
  access: 24 * 60 * 60, // 24 hours
  refresh: 7 * 24 * 60 * 60, // 7 days
  kiosk: 4 * 60 * 60, // 4 hours (Story 1.4 AC1)
};

/**
 * Parse TTL string to seconds
 * @param ttl - TTL string (e.g., "24h", "7d", "4h", "30m", "60s", "1000ms")
 * @returns number - TTL in seconds
 */
function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    // MEDIUM: Throw error for invalid TTL format instead of silent fallback
    throw new Error(`Invalid TTL format: "${ttl}"`);
  }

  // Fix: The regex ensures match[1] and match[2] exist if match is not null
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

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
      // This case should ideally not be reached due to regex, but added for type safety
      throw new Error(`Invalid TTL unit: "${unit}"`);
  }
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTokenTtl: string;
  private readonly refreshTokenTtl: string;
  private readonly kioskTokenTtl: string; // Story 1.4

  /**
   * Constructor supports both DI and manual instantiation
   * @param jwtSecret - JWT secret (injected via DI or passed directly)
   * @param options - Optional TTL configuration
   */
  constructor(
    @Inject('JWT_SECRET') @Optional() jwtSecret?: string,
    @Optional() options?: TokenServiceOptions
  ) {
    // CRITICAL: JWT secret is required for security - fail fast if not configured
    if (!jwtSecret || jwtSecret.length === 0) {
      throw new Error('CRITICAL: JWT_SECRET is not configured. Application cannot start.');
    }
    this.jwtSecret = jwtSecret;
    this.accessTokenTtl = options?.accessTokenTtl ?? DEFAULT_ACCESS_TOKEN_TTL;
    this.refreshTokenTtl = options?.refreshTokenTtl ?? DEFAULT_REFRESH_TOKEN_TTL;
    this.kioskTokenTtl = options?.kioskTokenTtl ?? DEFAULT_KIOSK_TOKEN_TTL; // Story 1.4
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

  // ============================================
  // Story 1.4: Kiosk Token Support
  // ============================================

  /**
   * Generate JWT kiosk token with 4h TTL
   * Story 1.4: PIN Kód Belépés (Kiosk Mód)
   * AC1: Shortened session for kiosk mode
   * @param user - User data for token payload
   * @returns Promise<string> - Signed JWT kiosk token
   */
  async generateKioskToken(user: UserForToken): Promise<string> {
    this.validateUser(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'kiosk' as const, // Story 1.4: Kiosk token type
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.kioskTokenTtl,
      algorithm: 'HS256',
    });
  }

  /**
   * Validate specifically a kiosk token (Story 1.4: type validation)
   * @param token - JWT token to validate
   * @returns Promise<boolean> - true if valid kiosk token, false otherwise
   */
  async validateKioskToken(token: string): Promise<boolean> {
    if (!(await this.validateToken(token))) {
      return false;
    }
    const payload = this.decodeToken(token);
    return payload?.type === 'kiosk';
  }

  /**
   * Decode a JWT token without verification
   * Useful for reading payload data after validation
   *
   * ⚠️ **SECURITY WARNING**: This method does NOT verify the JWT signature!
   * Always call validateToken(), validateAccessToken(), validateRefreshToken(),
   * or validateKioskToken() BEFORE using this method to ensure the token is authentic.
   * Using this method on unvalidated tokens may lead to accepting forged payloads.
   *
   * @param token - JWT token to decode
   * @returns JwtPayload | null - Decoded payload or null if invalid format
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
   * @param type - 'access', 'refresh', or 'kiosk'
   * @returns number - TTL in seconds
   */
  getExpiresIn(type: 'access' | 'refresh' | 'kiosk'): number {
    if (type === 'access') {
      return parseTtlToSeconds(this.accessTokenTtl);
    }
    if (type === 'kiosk') {
      return parseTtlToSeconds(this.kioskTokenTtl); // Story 1.4: 4h for kiosk
    }
    return parseTtlToSeconds(this.refreshTokenTtl);
  }

  /**
   * Validate user data for token generation
   * Code Review Fix (HIGH): Validate all required fields for JWT payload
   * @throws Error if any required field is missing
   */
  private validateUser(user: UserForToken): void {
    if (!user) {
      throw new Error('User data is required');
    }
    if (!user.id) {
      throw new Error('User ID is required');
    }
    // Code Review Fix: Validate all fields that go into JWT payload
    if (!user.email) {
      throw new Error('User email is required');
    }
    if (!user.role) {
      throw new Error('User role is required');
    }
    if (!user.tenantId) {
      throw new Error('User tenantId is required');
    }
  }
}
