/**
 * ElevatedAccessGuard
 * Story 2.4: Elevated Access Requirement
 * AC#3: ElevatedAccessGuard Implementation
 *
 * Guard that checks if user has recent password verification (elevated access).
 * Used with @RequireElevatedAccess decorator to enforce 5-minute re-auth requirement.
 *
 * @example
 * @Post(':id/cancel')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ElevatedAccessGuard)
 * @RequirePermission(Permission.RENTAL_CANCEL)
 * @RequireElevatedAccess()
 * async cancelRental(@Param('id') id: string) { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ElevatedAccessService } from '../services/elevated-access.service';
import { IAuditService, AUDIT_SERVICE, AuditAction } from '../interfaces/audit.interface';
import {
  ELEVATED_ACCESS_KEY,
  ElevatedAccessMetadata,
} from '../decorators/require-elevated-access.decorator';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

/**
 * User object structure expected from JWT/AuthGuard
 */
interface AuthenticatedUser {
  id: string;
  role: string;
  tenantId: string;
}

/**
 * Request with authenticated user
 */
interface AuthenticatedRequest {
  user: AuthenticatedUser | null | undefined;
  url: string;
}

@Injectable()
export class ElevatedAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly elevatedAccessService: ElevatedAccessService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get elevated access metadata from decorator
    const metadata = this.reflector.get<ElevatedAccessMetadata | undefined>(
      ELEVATED_ACCESS_KEY,
      context.getHandler()
    );

    // No elevated access requirement - allow
    if (!metadata) {
      return true;
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user exists (should be set by JwtAuthGuard)
    if (!user || !user.id) {
      throw new ForbiddenException({
        code: 'ELEVATED_ACCESS_REQUIRED',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    // 3. Get TTL from metadata (default: 5 minutes)
    const ttlMs = metadata.ttlMs ?? ELEVATED_ACCESS_TTL_MS;

    // 4. Check if user has valid elevated access
    const isValid = this.elevatedAccessService.isVerificationValid(user.id, ttlMs);

    if (!isValid) {
      // Audit log - elevated access denied
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.ELEVATED_ACCESS_DENIED,
          userId: user.id,
          tenantId: user.tenantId,
          resourceType: 'ENDPOINT',
          resourceId: request.url,
          details: {
            reason: 'No valid elevated access session',
            requiredTtlMs: ttlMs,
          },
        });
      }

      throw new ForbiddenException({
        code: 'ELEVATED_ACCESS_REQUIRED',
        message: 'Újra-hitelesítés szükséges',
        validUntil: null,
      });
    }

    // 5. Audit log - elevated access granted
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.ELEVATED_ACCESS_GRANTED,
        userId: user.id,
        tenantId: user.tenantId,
        resourceType: 'ENDPOINT',
        resourceId: request.url,
        details: {
          remainingMs: this.elevatedAccessService.getTimeRemaining(user.id, ttlMs),
        },
      });
    }

    return true;
  }
}
