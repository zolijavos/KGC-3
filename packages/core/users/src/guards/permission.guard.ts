/**
 * PermissionGuard - NestJS Guard for Permission Checking
 * Story 2.3: Permission Check Middleware
 * AC#2: PermissionGuard Implementation
 * AC#3: 403 Forbidden Response
 * AC#6: Multiple Permissions Support (ALL/ANY logic)
 * AC#7: Tenant Context Integration
 *
 * Checks if the authenticated user has the required permissions
 * as defined by @RequirePermission decorator.
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
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';
import { PermissionService } from '../services/permission.service';
import {
  IAuditService,
  AUDIT_SERVICE,
  AuditAction,
} from '../interfaces/audit.interface';
import {
  PERMISSIONS_KEY,
  PERMISSION_LOGIC_KEY,
  PermissionLogic,
} from '../decorators/require-permission.decorator';

/**
 * User object structure expected from JWT/AuthGuard
 */
interface AuthenticatedUser {
  id: string;
  role: Role;
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
export class PermissionGuard implements CanActivate {
  private readonly permissionService: PermissionService;

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(AUDIT_SERVICE)
    private readonly auditService: IAuditService | null
  ) {
    this.permissionService = new PermissionService();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.get<Permission[] | undefined>(
      PERMISSIONS_KEY,
      context.getHandler()
    );

    // No permission requirement - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Get permission logic (ALL = AND, ANY = OR)
    const logic =
      this.reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        context.getHandler()
      ) ?? 'ALL';

    // 3. Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user exists and has role
    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    const userRole = user.role;

    // 4. Check permissions based on logic
    const results = requiredPermissions.map((permission) =>
      this.permissionService.hasPermission(userRole, permission)
    );

    const hasPermission =
      logic === 'ALL'
        ? results.every(Boolean) // AND logic
        : results.some(Boolean); // OR logic

    if (!hasPermission) {
      // Find missing permissions for error message
      const missingPermissions = requiredPermissions.filter(
        (_, index) => !results[index]
      );

      // Audit log (if service available)
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.PERMISSION_DENIED,
          userId: user.id,
          tenantId: user.tenantId,
          resourceType: 'ENDPOINT',
          resourceId: request.url,
          details: {
            requiredPermissions,
            missingPermissions,
            userRole,
            logic,
          },
        });
      }

      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: `Nincs jogosultság: ${missingPermissions.join(', ')}`,
      });
    }

    return true;
  }
}
