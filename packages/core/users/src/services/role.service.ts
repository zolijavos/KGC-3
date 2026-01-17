/**
 * Role Service - Role hierarchy and permission logic
 * Story 2.1: User CRUD Operations
 * AC6: Role Hierarchy Enforcement
 *
 * Implements ADR-032 RBAC Architecture role levels:
 * - OPERATOR (Level 1) - Pultos / Értékesítő
 * - TECHNIKUS (Level 2) - Szerviz technikus
 * - BOLTVEZETO (Level 3) - Boltvezető
 * - ACCOUNTANT (Level 3) - Könyvelő
 * - PARTNER_OWNER (Level 4) - Franchise Partner Tulajdonos
 * - CENTRAL_ADMIN (Level 5) - Központi Admin
 * - DEVOPS_ADMIN (Level 6) - DevOps / IT Admin
 * - SUPER_ADMIN (Level 8) - Rendszergazda (KGC HQ)
 *
 * Rule: User can only assign roles at equal or lower level than their own.
 */

import { Injectable } from '@nestjs/common';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';

/**
 * Role inheritance chain per ADR-032
 * Key: Role, Value: Parent role in the operational hierarchy
 * Note: ACCOUNTANT, CENTRAL_ADMIN, DEVOPS_ADMIN are parallel hierarchies (no inheritance)
 */
const ROLE_INHERITANCE: Partial<Record<Role, Role>> = {
  [Role.TECHNIKUS]: Role.OPERATOR,
  [Role.BOLTVEZETO]: Role.TECHNIKUS,
  [Role.PARTNER_OWNER]: Role.BOLTVEZETO,
  [Role.SUPER_ADMIN]: Role.PARTNER_OWNER,
};

/**
 * Role scope definitions per ADR-032
 * LOCATION: Single location access
 * TENANT: All locations within tenant
 * GLOBAL: Cross-tenant access
 */
const ROLE_SCOPES: Record<Role, RoleScope> = {
  [Role.OPERATOR]: RoleScope.LOCATION,
  [Role.TECHNIKUS]: RoleScope.LOCATION,
  [Role.BOLTVEZETO]: RoleScope.LOCATION,
  [Role.ACCOUNTANT]: RoleScope.TENANT,
  [Role.PARTNER_OWNER]: RoleScope.TENANT,
  [Role.CENTRAL_ADMIN]: RoleScope.GLOBAL,
  [Role.DEVOPS_ADMIN]: RoleScope.GLOBAL,
  [Role.SUPER_ADMIN]: RoleScope.GLOBAL,
};

/**
 * Role level definitions per ADR-032
 * Higher level = more permissions
 */
export const ROLE_LEVELS: Record<Role, number> = {
  [Role.OPERATOR]: 1,
  [Role.TECHNIKUS]: 2,
  [Role.BOLTVEZETO]: 3,
  [Role.ACCOUNTANT]: 3, // Same level as BOLTVEZETO
  [Role.PARTNER_OWNER]: 4,
  [Role.CENTRAL_ADMIN]: 5,
  [Role.DEVOPS_ADMIN]: 6,
  [Role.SUPER_ADMIN]: 8, // Highest level (gap for future expansion)
};

@Injectable()
export class RoleService {
  /**
   * Get the hierarchy level for a role
   * @param role - The role to get level for
   * @returns Role level (1-8)
   * @throws Error if role is invalid
   */
  getRoleLevel(role: Role): number {
    const level = ROLE_LEVELS[role];
    if (level === undefined) {
      throw new Error('Érvénytelen szerepkör'); // Hungarian: Invalid role
    }
    return level;
  }

  /**
   * Check if a user with creatorRole can assign targetRole to another user
   * AC6: Only equal or lower level roles can be assigned
   *
   * @param creatorRole - Role of the user making the assignment
   * @param targetRole - Role to be assigned
   * @returns true if assignment is allowed, false otherwise
   */
  canAssignRole(creatorRole: Role, targetRole: Role): boolean {
    const creatorLevel = this.getRoleLevel(creatorRole);
    const targetLevel = this.getRoleLevel(targetRole);

    // User can only assign roles at equal or lower level
    return creatorLevel >= targetLevel;
  }

  /**
   * Check if a role is valid
   * @param role - Role to check
   * @returns true if role is valid
   */
  isValidRole(role: string): role is Role {
    return Object.values(Role).includes(role as Role);
  }

  /**
   * Get all roles at or below a given level
   * Useful for listing assignable roles for a user
   *
   * @param maxLevel - Maximum level to include
   * @returns Array of roles at or below the given level
   */
  getRolesAtOrBelowLevel(maxLevel: number): Role[] {
    return Object.entries(ROLE_LEVELS)
      .filter(([, level]) => level <= maxLevel)
      .map(([role]) => role as Role);
  }

  /**
   * Get assignable roles for a given role
   * Returns all roles the given role can assign
   *
   * @param role - Role to get assignable roles for
   * @returns Array of assignable roles
   */
  getAssignableRoles(role: Role): Role[] {
    const level = this.getRoleLevel(role);
    return this.getRolesAtOrBelowLevel(level);
  }

  /**
   * Get inherited roles for a given role
   * Story 2.2: Role Inheritance per ADR-032
   *
   * Returns the complete inheritance chain (parent, grandparent, etc.)
   * Note: ACCOUNTANT, CENTRAL_ADMIN, DEVOPS_ADMIN are parallel hierarchies with no inheritance.
   *
   * @param role - Role to get inherited roles for
   * @returns Array of inherited roles (ordered from immediate parent to root)
   */
  getInheritedRoles(role: Role): Role[] {
    const inherited: Role[] = [];
    let currentRole: Role | undefined = ROLE_INHERITANCE[role];

    while (currentRole) {
      inherited.push(currentRole);
      currentRole = ROLE_INHERITANCE[currentRole];
    }

    return inherited;
  }

  /**
   * Get the scope for a given role
   * Story 2.2: Role Scope per ADR-032
   *
   * @param role - Role to get scope for
   * @returns Role scope (LOCATION, TENANT, or GLOBAL)
   * @throws Error if role is invalid
   */
  getRoleScope(role: Role): RoleScope {
    const scope = ROLE_SCOPES[role];
    if (!scope) {
      throw new Error('Érvénytelen szerepkör');
    }
    return scope;
  }
}
