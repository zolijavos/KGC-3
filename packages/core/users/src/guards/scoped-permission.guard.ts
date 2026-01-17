/**
 * ScopedPermissionGuard
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#3: ScopedPermissionGuard Implementation
 * AC#4: Resource Context Extraction
 * AC#6: Guard Ordering Integration
 * AC#8: GLOBAL Scope Read-Only Override
 *
 * Guard that enforces tenant/location-based access control.
 * Uses @RequireScope decorator metadata to determine access rules.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../interfaces/user.interface';
import { ScopedPermissionService, ScopeCheckUser, ResourceContext } from '../services/scoped-permission.service';
import {
  SCOPE_REQUIREMENT_KEY,
  ScopeRequirementMetadata,
} from '../decorators/require-scope.decorator';
import { AuditAction, IAuditService, AUDIT_SERVICE } from '../interfaces/audit.interface';

/**
 * HTTP methods considered as write operations
 */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Request user interface for type safety
 */
interface RequestUser {
  id: string;
  role: string;
  tenantId: string;
  locationId?: string | null;
}

/**
 * Request interface for scope checking
 */
interface ScopeRequest {
  user?: RequestUser | null;
  params?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
  method?: string;
  url?: string;
}

/**
 * ScopedPermissionGuard
 *
 * Enforces tenant and location-based access control using the @RequireScope decorator.
 * Must be used after JwtAuthGuard and PermissionGuard in the guard chain.
 *
 * @example
 * // In controller:
 * @Get(':id')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
 * @RequirePermission(Permission.RENTAL_VIEW)
 * @RequireScope(RoleScope.LOCATION, { resourceIdParam: 'id' })
 * async getRental(@Param('id') id: string) { ... }
 */
@Injectable()
export class ScopedPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopedPermissionService: ScopedPermissionService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}

  /**
   * Determines if the current request is allowed based on scope requirements
   * @param context - The execution context
   * @returns true if access is allowed
   * @throws ForbiddenException if access is denied
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get scope requirement metadata from decorator
    const scopeRequirement = this.reflector.get<ScopeRequirementMetadata | undefined>(
      SCOPE_REQUIREMENT_KEY,
      context.getHandler()
    );

    // If no @RequireScope decorator, allow access
    if (!scopeRequirement) {
      return true;
    }

    // Get request and user
    const request = context.switchToHttp().getRequest<ScopeRequest>();
    const user = request.user;

    // Validate user exists and has required properties
    if (!user || !user.role) {
      await this.logScopeDenied(user, null, 'Missing user or role');
      throw new ForbiddenException({
        code: 'SCOPE_VIOLATION',
        message: 'User authentication required for scope check',
      });
    }

    // Convert to ScopeCheckUser (undefined → null for exactOptionalPropertyTypes)
    const scopeCheckUser: ScopeCheckUser = {
      id: user.id,
      role: user.role as Role,
      tenantId: user.tenantId,
      locationId: user.locationId ?? null,
    };

    // Extract resource context from request
    const resourceContext = this.extractResourceContext(request);

    // Check scope with service
    const scopeResult = this.scopedPermissionService.checkScope(
      scopeCheckUser,
      resourceContext,
      scopeRequirement.minimumScope
    );

    if (!scopeResult.allowed) {
      await this.logScopeDenied(user, resourceContext, scopeResult.reason);
      throw new ForbiddenException({
        code: 'SCOPE_VIOLATION',
        message: scopeResult.reason ?? 'Scope check failed',
      });
    }

    // AC#8: GLOBAL scope cross-tenant write restriction
    if (this.scopedPermissionService.hasGlobalScope(scopeCheckUser.role)) {
      const isWriteOperation = this.isWriteOperation(request.method);
      const isCrossTenant = this.isCrossTenantAccess(scopeCheckUser, resourceContext);

      if (isWriteOperation && isCrossTenant && !scopeRequirement.allowGlobalWrite) {
        await this.logScopeDenied(user, resourceContext, 'Cross-tenant write denied for GLOBAL scope');
        throw new ForbiddenException({
          code: 'CROSS_TENANT_WRITE_DENIED',
          message: 'GLOBAL scope users cannot perform write operations on other tenants',
        });
      }
    }

    // Log successful scope check
    await this.logScopeGranted(user, resourceContext);

    return true;
  }

  /**
   * Extract resource context from request
   * Priority: headers > params > body
   */
  private extractResourceContext(request: ScopeRequest): ResourceContext {
    const params = request.params ?? {};
    const headers = request.headers ?? {};
    const body = (request.body ?? {}) as Record<string, unknown>;

    // Extract tenantId (headers override params, which override body)
    let tenantId: string | null = null;
    const headerTenantId = headers['x-resource-tenant-id'];
    if (typeof headerTenantId === 'string') {
      tenantId = headerTenantId;
    } else if (params['tenantId']) {
      tenantId = params['tenantId'];
    } else if (typeof body['tenantId'] === 'string') {
      tenantId = body['tenantId'];
    }

    // Extract locationId (headers override params, which override body)
    let locationId: string | null = null;
    const headerLocationId = headers['x-resource-location-id'];
    if (typeof headerLocationId === 'string') {
      locationId = headerLocationId;
    } else if (params['locationId']) {
      locationId = params['locationId'];
    } else if (typeof body['locationId'] === 'string') {
      locationId = body['locationId'];
    }

    return { tenantId, locationId };
  }

  /**
   * Check if HTTP method is a write operation
   */
  private isWriteOperation(method?: string): boolean {
    if (!method) return false;
    return WRITE_METHODS.includes(method.toUpperCase());
  }

  /**
   * Check if this is a cross-tenant access
   */
  private isCrossTenantAccess(user: ScopeCheckUser, resource: ResourceContext): boolean {
    if (!resource.tenantId) return false;
    return user.tenantId !== resource.tenantId;
  }

  /**
   * Log scope granted audit event
   */
  private async logScopeGranted(
    user: RequestUser,
    resourceContext: ResourceContext | null
  ): Promise<void> {
    if (!this.auditService) return;

    await this.auditService.log({
      action: AuditAction.SCOPE_GRANTED,
      userId: user.id,
      tenantId: user.tenantId,
      resourceType: 'SCOPE_CHECK',
      details: {
        resourceTenantId: resourceContext?.tenantId,
        resourceLocationId: resourceContext?.locationId,
      },
    });
  }

  /**
   * Log scope denied audit event
   */
  private async logScopeDenied(
    user: RequestUser | null | undefined,
    resourceContext: ResourceContext | null,
    reason?: string
  ): Promise<void> {
    if (!this.auditService) return;
    if (!user) return;

    await this.auditService.log({
      action: AuditAction.SCOPE_DENIED,
      userId: user.id,
      tenantId: user.tenantId,
      resourceType: 'SCOPE_CHECK',
      details: {
        resourceTenantId: resourceContext?.tenantId,
        resourceLocationId: resourceContext?.locationId,
        reason,
      },
    });
  }
}
