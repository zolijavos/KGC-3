/**
 * JWT Auth Guard - Protects routes requiring authentication
 * Story 1.1: JWT Login Endpoint
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * async protectedRoute() { ... }
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Handle authentication errors
   * Returns 401 Unauthorized for invalid/missing tokens
   */
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Nincs jogosultság'); // Hungarian: No authorization
    }
    return user;
  }
}
