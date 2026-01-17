/**
 * Scoped Permission Constants
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#1: RoleScope Interface és Utility Functions
 *
 * Provides role-to-scope mapping and utility functions for
 * tenant/location-based permission checks per ADR-032.
 */

import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';

/**
 * Role to Scope mapping per ADR-032 RBAC Architecture
 *
 * Scope Definitions:
 * - LOCATION: Single location access (bolt szintű hozzáférés)
 *   Roles: OPERATOR, TECHNIKUS, BOLTVEZETO
 *
 * - TENANT: All locations within tenant (franchise partner szintű)
 *   Roles: ACCOUNTANT, PARTNER_OWNER
 *
 * - GLOBAL: Cross-tenant access (központi adminisztráció)
 *   Roles: CENTRAL_ADMIN, DEVOPS_ADMIN, SUPER_ADMIN
 */
export const ROLE_SCOPE_MAP: Record<Role, RoleScope> = {
  // LOCATION scope - Single location access
  [Role.OPERATOR]: RoleScope.LOCATION,
  [Role.TECHNIKUS]: RoleScope.LOCATION,
  [Role.BOLTVEZETO]: RoleScope.LOCATION,

  // TENANT scope - All locations within tenant
  [Role.ACCOUNTANT]: RoleScope.TENANT,
  [Role.PARTNER_OWNER]: RoleScope.TENANT,

  // GLOBAL scope - Cross-tenant access
  [Role.CENTRAL_ADMIN]: RoleScope.GLOBAL,
  [Role.DEVOPS_ADMIN]: RoleScope.GLOBAL,
  [Role.SUPER_ADMIN]: RoleScope.GLOBAL,
};

/**
 * Get the scope for a given role
 * @param role - The role to get scope for
 * @returns The RoleScope for the role
 */
export function getScopeForRole(role: Role): RoleScope {
  return ROLE_SCOPE_MAP[role];
}

/**
 * Check if a role requires location-level scope
 * Location-scoped roles can only access resources within their assigned location.
 *
 * @param role - The role to check
 * @returns true if the role is LOCATION scoped
 */
export function isLocationScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.LOCATION;
}

/**
 * Check if a role has tenant-level scope
 * Tenant-scoped roles can access all locations within their tenant.
 *
 * @param role - The role to check
 * @returns true if the role is TENANT scoped
 */
export function isTenantScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.TENANT;
}

/**
 * Check if a role has global (cross-tenant) scope
 * Global-scoped roles can access resources across all tenants.
 *
 * @param role - The role to check
 * @returns true if the role is GLOBAL scoped
 */
export function isGlobalScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.GLOBAL;
}
