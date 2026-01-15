/**
 * JWT Strategy - Passport JWT authentication strategy
 * Story 1.1: JWT Login Endpoint
 *
 * Validates JWT tokens from Authorization header
 * Extracts user payload for request context
 */

import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

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
   * @param payload - Decoded JWT payload
   * @returns User context object for request
   */
  async validate(payload: JwtPayload): Promise<{
    id: string;
    email: string;
    role: string;
    tenantId: string;
  }> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as string,
      tenantId: payload.tenantId,
    };
  }
}
