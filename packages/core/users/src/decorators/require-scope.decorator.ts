/**
 * @RequireScope Decorator
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#2: @RequireScope Decorator
 *
 * Marks endpoints as requiring specific scope level for access.
 * Used with ScopedPermissionGuard to enforce tenant/location-based access control.
 */

import { SetMetadata } from '@nestjs/common';
import { RoleScope } from '../interfaces/permission.interface';

/**
 * Metadata key for scope requirement
 */
export const SCOPE_REQUIREMENT_KEY = 'scope_requirement';

/**
 * Scope requirement metadata interface
 */
export interface ScopeRequirementMetadata {
  /**
   * Minimum scope required to access this resource
   * - LOCATION: User must be in the same location as the resource
   * - TENANT: User must be in the same tenant as the resource
   * - GLOBAL: Cross-tenant access allowed
   */
  minimumScope: RoleScope;

  /**
   * URL param name containing resource ID for scope lookup
   * Used when the resource ID needs to be extracted from URL params
   * Example: 'id', 'tenantId', 'locationId'
   */
  resourceIdParam?: string;

  /**
   * Allow GLOBAL scope users to perform write operations on cross-tenant resources
   * Default: false (GLOBAL scope users have read-only access to other tenants)
   */
  allowGlobalWrite?: boolean;
}

/**
 * @RequireScope decorator
 *
 * Marks an endpoint as requiring a specific scope level.
 * Used with ScopedPermissionGuard to enforce access control.
 *
 * @param minimumScope - Minimum scope required (LOCATION | TENANT | GLOBAL)
 * @param options - Additional options for resource extraction
 *
 * @example
 * // Require LOCATION scope - user must be in same location as resource
 * @Get(':id')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
 * @RequirePermission(Permission.RENTAL_VIEW)
 * @RequireScope(RoleScope.LOCATION, { resourceIdParam: 'id' })
 * async getRental(@Param('id') id: string) { ... }
 *
 * @example
 * // Require TENANT scope - user must be in same tenant
 * @Get()
 * @UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
 * @RequireScope(RoleScope.TENANT)
 * async listTenantRentals() { ... }
 *
 * @example
 * // Allow GLOBAL scope users to write (admin operations)
 * @Post()
 * @UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
 * @RequireScope(RoleScope.GLOBAL, { allowGlobalWrite: true })
 * async adminCreateTenant(@Body() dto: CreateTenantDto) { ... }
 */
export function RequireScope(
  minimumScope: RoleScope,
  options?: Partial<Omit<ScopeRequirementMetadata, 'minimumScope'>>
): MethodDecorator {
  const metadata: ScopeRequirementMetadata = {
    minimumScope,
    allowGlobalWrite: options?.allowGlobalWrite ?? false,
    // Only include resourceIdParam if explicitly provided (exactOptionalPropertyTypes)
    ...(options?.resourceIdParam !== undefined && { resourceIdParam: options.resourceIdParam }),
  };

  return SetMetadata(SCOPE_REQUIREMENT_KEY, metadata);
}
