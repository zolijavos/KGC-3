/**
 * JWT Strategy - Passport JWT authentication strategy
 * Story 1.1: JWT Login Endpoint
 *
 * Validates JWT tokens from Authorization header
 * Extracts user payload for request context
 *
 * Security:
 * - G-H2 FIX: Validates token type to prevent refresh token abuse
 * - Only accepts 'access' or 'kiosk' tokens for protected endpoints
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/** Valid token types for protected endpoint access */
const VALID_ACCESS_TOKEN_TYPES = ['access', 'kiosk'] as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('JWT_SECRET') jwtSecret: string) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
    });
  }

  /**
   * Validate and transform JWT payload
   * Called after JWT signature is verified
   *
   * G-H2 SECURITY FIX: Validates token type to prevent using refresh tokens
   * as access tokens. Only 'access' and 'kiosk' types are allowed for
   * protected endpoint authentication.
   *
   * @param payload - Decoded JWT payload
   * @returns User context object for request
   * @throws UnauthorizedException if token type is invalid or missing required fields
   */
  async validate(payload: JwtPayload): Promise<{
    id: string;
    email: string;
    role: string;
    tenantId: string;
  }> {
    // G-H2 FIX: Validate token type - reject refresh tokens and unknown types
    const tokenType = payload.type;
    if (!tokenType || !VALID_ACCESS_TOKEN_TYPES.includes(tokenType as typeof VALID_ACCESS_TOKEN_TYPES[number])) {
      throw new UnauthorizedException('Invalid token type');
    }

    // Validate required fields exist (they should for access/kiosk tokens)
    if (!payload.sub || !payload.email || !payload.role || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as string,
      tenantId: payload.tenantId,
    };
  }
}
