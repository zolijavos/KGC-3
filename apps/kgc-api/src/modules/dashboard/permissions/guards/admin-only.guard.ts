import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';

/**
 * Admin Only Guard (Story 45-1)
 *
 * Placeholder guard for admin-only endpoints.
 * In production, this will be replaced with actual RBAC from @kgc/auth.
 *
 * Current behavior:
 * - Checks if user has ADMIN or ROLE_ADMIN role
 * - Allows access in development if no auth context
 *
 * TODO: Replace with actual RolesGuard from @kgc/auth when integrated
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  private readonly logger = new Logger(AdminOnlyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // In development without auth, allow access with warning
    if (!user) {
      this.logger.warn(
        'AdminOnlyGuard: No user context - allowing access in development mode. ' +
          'TODO: Integrate with @kgc/auth for production.'
      );
      return true;
    }

    // Check for admin roles
    const roles: string[] = user.roles ?? [];
    const isAdmin =
      roles.includes('ADMIN') ||
      roles.includes('ROLE_ADMIN') ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('CENTRAL_ADMIN');

    if (!isAdmin) {
      this.logger.warn(
        `AdminOnlyGuard: Access denied for user ${user.id} with roles: ${roles.join(', ')}`
      );
      return false;
    }

    return true;
  }
}
