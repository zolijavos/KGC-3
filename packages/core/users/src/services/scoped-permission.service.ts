/**
 * ScopedPermissionService
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#5: ScopedPermissionService Functions
 *
 * Service for checking permission scopes (tenant/location).
 * Implements tenant and location-based access control per ADR-032.
 */

import { Injectable } from '@nestjs/common';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';
import {
  ROLE_SCOPE_MAP,
  isLocationScopedRole,
  isGlobalScopedRole,
} from '../constants/scoped-permission.constants';

/**
 * User context for scope checking
 */
export interface ScopeCheckUser {
  /** User ID */
  id: string;
  /** User's role */
  role: Role;
  /** User's tenant ID */
  tenantId: string;
  /** User's location ID (optional for tenant/global scope users) */
  locationId?: string | null;
}

/**
 * Resource context for scope checking
 */
export interface ResourceContext {
  /** Target resource's tenant ID */
  tenantId?: string | null;
  /** Target resource's location ID */
  locationId?: string | null;
}

/**
 * Scope check result
 */
export interface ScopeCheckResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for denial (if denied) */
  reason?: string;
}

/**
 * Scope level numeric values for comparison
 */
const SCOPE_LEVEL: Record<RoleScope, number> = {
  [RoleScope.LOCATION]: 1,
  [RoleScope.TENANT]: 2,
  [RoleScope.GLOBAL]: 3,
};

/**
 * Service for checking permission scopes (tenant/location)
 * Story 2.5: Tenant és Location Scoped Permissions
 *
 * This service provides methods to check if a user can access
 * resources based on their role's scope and the resource's
 * tenant/location context.
 */
@Injectable()
export class ScopedPermissionService {
  /**
   * Get the scope for a given role
   * @param role - The role to get scope for
   * @returns The RoleScope for the role
   */
  getScopeForRole(role: Role): RoleScope {
    return ROLE_SCOPE_MAP[role];
  }

  /**
   * Check if a role requires location-level scope
   * @param role - The role to check
   * @returns true if the role is LOCATION scoped
   */
  requiresLocationScope(role: Role): boolean {
    return isLocationScopedRole(role);
  }

  /**
   * Check if a role has global (cross-tenant) scope
   * @param role - The role to check
   * @returns true if the role is GLOBAL scoped
   */
  hasGlobalScope(role: Role): boolean {
    return isGlobalScopedRole(role);
  }

  /**
   * Check if user can access a tenant
   *
   * Rules:
   * - If no resource tenant specified → allow (use user's tenant context)
   * - If GLOBAL scope → allow cross-tenant access
   * - Otherwise → user tenant must match resource tenant
   *
   * @param user - User context
   * @param resourceTenantId - Target tenant ID
   * @returns true if access allowed
   */
  canAccessTenant(
    user: ScopeCheckUser,
    resourceTenantId: string | null | undefined
  ): boolean {
    // No resource tenant specified - allow (tenant will be from user context)
    if (!resourceTenantId) {
      return true;
    }

    // Global scope users can access any tenant
    if (this.hasGlobalScope(user.role)) {
      return true;
    }

    // Check if user's tenant matches resource tenant
    return user.tenantId === resourceTenantId;
  }

  /**
   * Check if user can access a location
   *
   * Rules:
   * - First check tenant access (must pass)
   * - If no resource location specified → allow
   * - If TENANT or GLOBAL scope → allow any location within allowed tenants
   * - If LOCATION scope → user location must match resource location
   *
   * @param user - User context
   * @param resourceTenantId - Target tenant ID
   * @param resourceLocationId - Target location ID
   * @returns true if access allowed
   */
  canAccessLocation(
    user: ScopeCheckUser,
    resourceTenantId: string | null | undefined,
    resourceLocationId: string | null | undefined
  ): boolean {
    // First check tenant access
    if (!this.canAccessTenant(user, resourceTenantId)) {
      return false;
    }

    // No resource location specified - allow
    if (!resourceLocationId) {
      return true;
    }

    // TENANT and GLOBAL scope users can access any location within allowed tenants
    if (!this.requiresLocationScope(user.role)) {
      return true;
    }

    // LOCATION scope users must match location
    // User without locationId cannot access location-specific resources
    if (!user.locationId) {
      return false;
    }

    return user.locationId === resourceLocationId;
  }

  /**
   * Full scope check combining minimum scope, tenant, and location
   *
   * Performs a complete scope validation:
   * 1. Check if user's scope level is sufficient for minimum requirement
   * 2. Check tenant access
   * 3. Check location access (for LOCATION scope users)
   *
   * @param user - User context
   * @param resource - Resource context
   * @param minimumScope - Minimum scope required for the operation
   * @returns ScopeCheckResult with allowed status and reason
   */
  checkScope(
    user: ScopeCheckUser,
    resource: ResourceContext,
    minimumScope: RoleScope
  ): ScopeCheckResult {
    const userScope = this.getScopeForRole(user.role);

    // Check if user's scope is sufficient
    if (SCOPE_LEVEL[userScope] < SCOPE_LEVEL[minimumScope]) {
      return {
        allowed: false,
        reason: `Insufficient scope: required ${minimumScope}, user has ${userScope}`,
      };
    }

    // Check tenant access
    if (!this.canAccessTenant(user, resource.tenantId)) {
      return {
        allowed: false,
        reason: `Tenant access denied: user tenant ${user.tenantId}, resource tenant ${resource.tenantId}`,
      };
    }

    // Check location access for LOCATION scope users
    if (this.requiresLocationScope(user.role)) {
      if (!this.canAccessLocation(user, resource.tenantId, resource.locationId)) {
        return {
          allowed: false,
          reason: `Location access denied: user location ${user.locationId}, resource location ${resource.locationId}`,
        };
      }
    }

    return { allowed: true };
  }
}
