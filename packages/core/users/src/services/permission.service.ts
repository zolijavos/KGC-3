/**
 * Permission Service - Role-Permission mapping and checking
 * Story 2.2: Role Assignment és RBAC
 * AC#4: Kompozit jogok (direkt + örökölt)
 *
 * Implements ADR-032 RBAC Architecture permission logic:
 * - Role-Permission mapping with direct permissions per role
 * - Permission inheritance through role hierarchy
 * - Permission constraints (e.g., discount_limit)
 */

import { Injectable } from '@nestjs/common';
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';
import { RoleService } from './role.service';

/**
 * Direct permissions per role per ADR-032
 * Does NOT include inherited permissions
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OPERATOR]: [
    // Bérlés modul - base operations
    Permission.RENTAL_VIEW,
    Permission.RENTAL_CREATE,
    Permission.RENTAL_RETURN,
    // Szerviz modul - base operations
    Permission.SERVICE_VIEW,
    Permission.SERVICE_CREATE,
    Permission.SERVICE_UPDATE,
    // Készlet modul - view only
    Permission.INVENTORY_VIEW,
    // Értékesítés modul - base operations
    Permission.SALES_VIEW,
    Permission.SALES_CREATE,
    // Partner modul - view only
    Permission.PARTNER_VIEW,
    // Árajánlat modul
    Permission.QUOTE_VIEW,
    Permission.QUOTE_CREATE,
    // Munkalap modul
    Permission.WORKSHEET_VIEW,
    Permission.WORKSHEET_CREATE,
  ],

  [Role.TECHNIKUS]: [
    // Szerviz-specific additions
    Permission.SERVICE_WARRANTY,
    Permission.SERVICE_CLOSE,
    // Garancia modul
    Permission.WARRANTY_VIEW,
    Permission.WARRANTY_CREATE,
    Permission.WARRANTY_PROCESS,
    // Munkalap modul
    Permission.WORKSHEET_UPDATE,
    Permission.WORKSHEET_CLOSE,
    // Készlet additions
    Permission.INVENTORY_UPDATE,
  ],

  [Role.BOLTVEZETO]: [
    // Discount and cancel permissions
    Permission.RENTAL_DISCOUNT,
    Permission.RENTAL_CANCEL,
    // Finance access
    Permission.FINANCE_VIEW,
    Permission.FINANCE_REPORTS,
    // Transfer access
    Permission.INVENTORY_TRANSFER,
    // User management
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    // Refund
    Permission.SALES_REFUND,
    // Reports
    Permission.REPORT_OPERATIONAL,
    // Partner management
    Permission.PARTNER_CREATE,
    Permission.PARTNER_UPDATE,
    // Quote conversion
    Permission.QUOTE_CONVERT,
  ],

  [Role.ACCOUNTANT]: [
    // Read-only for operational modules
    Permission.RENTAL_VIEW,
    Permission.SERVICE_VIEW,
    Permission.SALES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.PARTNER_VIEW,
    // Finance full access (read-focused)
    Permission.FINANCE_VIEW,
    Permission.FINANCE_REPORTS,
    // Financial reports
    Permission.REPORT_OPERATIONAL,
    Permission.REPORT_FINANCIAL,
    // Audit access
    Permission.AUDIT_VIEW,
    // Quote view
    Permission.QUOTE_VIEW,
    // Worksheet view
    Permission.WORKSHEET_VIEW,
    // Warranty view
    Permission.WARRANTY_VIEW,
  ],

  [Role.PARTNER_OWNER]: [
    // Full discount (100%)
    Permission.RENTAL_DISCOUNT,
    // Full user management
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_ROLE_ASSIGN,
    // Finance close
    Permission.FINANCE_CLOSE,
    // Audit access
    Permission.AUDIT_VIEW,
    // Inventory adjust
    Permission.INVENTORY_ADJUST,
    // Partner delete
    Permission.PARTNER_DELETE,
    // Financial reports
    Permission.REPORT_FINANCIAL,
  ],

  [Role.CENTRAL_ADMIN]: [
    // Read-only for all operational modules
    Permission.RENTAL_VIEW,
    Permission.SERVICE_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_TRANSFER,
    Permission.SALES_VIEW,
    Permission.PARTNER_VIEW,
    // Finance reports
    Permission.FINANCE_VIEW,
    Permission.FINANCE_REPORTS,
    // Cross-tenant reports
    Permission.REPORT_OPERATIONAL,
    Permission.REPORT_FINANCIAL,
    Permission.REPORT_CROSS_TENANT,
    // User management
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    // Audit
    Permission.AUDIT_VIEW,
    // Quote and worksheet view
    Permission.QUOTE_VIEW,
    Permission.WORKSHEET_VIEW,
    // Warranty view
    Permission.WARRANTY_VIEW,
  ],

  [Role.DEVOPS_ADMIN]: [
    // Admin module - system config
    Permission.ADMIN_CONFIG,
    Permission.ADMIN_TENANT,
    // Audit full
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    // User management
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_ROLE_ASSIGN,
  ],

  [Role.SUPER_ADMIN]: [
    // Full admin
    Permission.ADMIN_SYSTEM,
    Permission.ADMIN_TENANT,
    Permission.ADMIN_CONFIG,
    // Full user management
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_ROLE_ASSIGN,
    // Full audit
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    // All reports
    Permission.REPORT_OPERATIONAL,
    Permission.REPORT_FINANCIAL,
    Permission.REPORT_CROSS_TENANT,
    // Finance close
    Permission.FINANCE_VIEW,
    Permission.FINANCE_REPORTS,
    Permission.FINANCE_CLOSE,
    // All module permissions are inherited through PARTNER_OWNER chain
  ],
};

/**
 * Permission constraints per role
 * Format: { permission: { constraintKey: value } }
 */
const ROLE_CONSTRAINTS: Partial<
  Record<Role, Partial<Record<Permission, Record<string, number>>>>
> = {
  [Role.BOLTVEZETO]: {
    [Permission.RENTAL_DISCOUNT]: { discount_limit: 20 },
  },
  [Role.PARTNER_OWNER]: {
    [Permission.RENTAL_DISCOUNT]: { discount_limit: 100 },
  },
  [Role.SUPER_ADMIN]: {
    [Permission.RENTAL_DISCOUNT]: { discount_limit: 100 },
  },
};

@Injectable()
export class PermissionService {
  /**
   * C1v2 FIX: RoleService now injected via DI instead of manual instantiation
   * This enables proper mocking in tests and follows NestJS best practices
   */
  constructor(private readonly roleService: RoleService) {}

  /**
   * Get direct permissions for a role (not including inherited)
   * @param role - Role to get permissions for
   * @returns Array of direct permissions
   */
  getDirectPermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /**
   * Get all permissions for a role (direct + inherited)
   * @param role - Role to get permissions for
   * @returns Array of all permissions (deduplicated)
   */
  getAllPermissions(role: Role): Permission[] {
    const direct = this.getDirectPermissions(role);
    const inheritedRoles = this.roleService.getInheritedRoles(role);

    // Collect inherited permissions
    const inheritedPermissions: Permission[] = [];
    for (const inheritedRole of inheritedRoles) {
      inheritedPermissions.push(...this.getDirectPermissions(inheritedRole));
    }

    // Combine and deduplicate
    const allPermissions = [...direct, ...inheritedPermissions];
    return [...new Set(allPermissions)];
  }

  /**
   * Check if a role has a specific permission (including inherited)
   * @param role - Role to check
   * @param permission - Permission to check for
   * @returns true if role has the permission
   */
  hasPermission(role: Role, permission: Permission): boolean {
    const allPermissions = this.getAllPermissions(role);
    return allPermissions.includes(permission);
  }

  /**
   * Get constraint value for a permission
   *
   * C3 SECURITY FIX: Returns Math.max() of all inherited constraint values
   * instead of first found. This ensures users with higher roles get the
   * maximum constraint benefit (e.g., highest discount_limit).
   *
   * @param role - Role to check
   * @param permission - Permission to get constraint for
   * @param constraintKey - Constraint key (e.g., 'discount_limit')
   * @returns Maximum constraint value across role hierarchy, or undefined
   */
  getConstraint(
    role: Role,
    permission: Permission,
    constraintKey: string
  ): number | undefined {
    // First check if role has the permission
    if (!this.hasPermission(role, permission)) {
      return undefined;
    }

    // C3 FIX: Collect ALL constraint values from role hierarchy, return Math.max()
    const constraintValues: number[] = [];

    // Check for direct constraint on this role
    const roleConstraints = ROLE_CONSTRAINTS[role];
    if (roleConstraints) {
      const permissionConstraints = roleConstraints[permission];
      if (permissionConstraints && constraintKey in permissionConstraints) {
        constraintValues.push(permissionConstraints[constraintKey] as number);
      }
    }

    // Check ALL inherited roles for constraints (collect all, not first found)
    const inheritedRoles = this.roleService.getInheritedRoles(role);
    for (const inheritedRole of inheritedRoles) {
      const inheritedConstraints = ROLE_CONSTRAINTS[inheritedRole];
      if (inheritedConstraints) {
        const permissionConstraints = inheritedConstraints[permission];
        if (permissionConstraints && constraintKey in permissionConstraints) {
          constraintValues.push(permissionConstraints[constraintKey] as number);
        }
      }
    }

    // C3 FIX: Return maximum value if any found, otherwise undefined
    if (constraintValues.length === 0) {
      return undefined;
    }

    return Math.max(...constraintValues);
  }

  /**
   * Get all roles that have a specific permission (including through inheritance)
   * @param permission - Permission to check
   * @returns Array of roles with the permission
   */
  getRolesWithPermission(permission: Permission): Role[] {
    const rolesWithPermission: Role[] = [];

    for (const role of Object.values(Role)) {
      if (this.hasPermission(role, permission)) {
        rolesWithPermission.push(role);
      }
    }

    return rolesWithPermission;
  }
}
