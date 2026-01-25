/**
 * Permission Interface and Enum
 * Story 2.2: Role Assignment és RBAC
 * AC6: Permission Definitions (45+ permissions, ADR-032)
 *
 * Defines all system permissions following the module:action pattern.
 * Based on ADR-032 RBAC Architecture.
 */

import { Role } from './user.interface';

/**
 * System permissions per ADR-032 RBAC Architecture
 * Format: module:action (e.g., rental:create, user:view)
 * Total: 45+ permissions across 8 modules
 */
export enum Permission {
  // ============================================
  // Bérlés modul (5 permissions)
  // ============================================
  RENTAL_VIEW = 'rental:view',
  RENTAL_CREATE = 'rental:create',
  RENTAL_RETURN = 'rental:return',
  RENTAL_CANCEL = 'rental:cancel',
  RENTAL_DISCOUNT = 'rental:discount',

  // ============================================
  // Szerviz modul (5 permissions)
  // ============================================
  SERVICE_VIEW = 'service:view',
  SERVICE_CREATE = 'service:create',
  SERVICE_UPDATE = 'service:update',
  SERVICE_CLOSE = 'service:close',
  SERVICE_WARRANTY = 'service:warranty',

  // ============================================
  // Készlet modul (4 permissions)
  // ============================================
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_ADJUST = 'inventory:adjust',

  // ============================================
  // Értékesítés modul (3 permissions)
  // ============================================
  SALES_VIEW = 'sales:view',
  SALES_CREATE = 'sales:create',
  SALES_REFUND = 'sales:refund',

  // ============================================
  // Pénzügy modul (3 permissions)
  // ============================================
  FINANCE_VIEW = 'finance:view',
  FINANCE_REPORTS = 'finance:reports',
  FINANCE_CLOSE = 'finance:close',

  // ============================================
  // Partner modul (4 permissions)
  // ============================================
  PARTNER_VIEW = 'partner:view',
  PARTNER_CREATE = 'partner:create',
  PARTNER_UPDATE = 'partner:update',
  PARTNER_DELETE = 'partner:delete',

  // ============================================
  // User/Admin modul (5 permissions)
  // ============================================
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ROLE_ASSIGN = 'user:role_assign',

  // ============================================
  // Riport modul (3 permissions)
  // ============================================
  REPORT_OPERATIONAL = 'report:operational',
  REPORT_FINANCIAL = 'report:financial',
  REPORT_CROSS_TENANT = 'report:cross_tenant',

  // ============================================
  // Admin modul (3 permissions)
  // ============================================
  ADMIN_CONFIG = 'admin:config',
  ADMIN_TENANT = 'admin:tenant',
  ADMIN_SYSTEM = 'admin:system',

  // ============================================
  // Audit modul (2 permissions)
  // ============================================
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',

  // ============================================
  // Garancia modul (3 permissions)
  // ============================================
  WARRANTY_VIEW = 'warranty:view',
  WARRANTY_CREATE = 'warranty:create',
  WARRANTY_PROCESS = 'warranty:process',

  // ============================================
  // Árajánlat modul (3 permissions)
  // ============================================
  QUOTE_VIEW = 'quote:view',
  QUOTE_CREATE = 'quote:create',
  QUOTE_CONVERT = 'quote:convert',

  // ============================================
  // Munkalap modul (4 permissions)
  // ============================================
  WORKSHEET_VIEW = 'worksheet:view',
  WORKSHEET_CREATE = 'worksheet:create',
  WORKSHEET_UPDATE = 'worksheet:update',
  WORKSHEET_CLOSE = 'worksheet:close',

  // ============================================
  // Jármű modul (5 permissions) - Epic 34
  // ============================================
  VEHICLE_VIEW = 'vehicle:view', // Járművek megtekintése
  VEHICLE_CREATE = 'vehicle:create', // Bérgép jármű létrehozása
  VEHICLE_UPDATE = 'vehicle:update', // Jármű módosítása
  VEHICLE_DELETE = 'vehicle:delete', // Jármű törlése
  VEHICLE_MANAGE_COMPANY = 'vehicle:manage_company', // Céges gépkocsi kezelés (admin)
}

/**
 * Permission modules grouping
 */
export enum PermissionModule {
  RENTAL = 'rental',
  SERVICE = 'service',
  INVENTORY = 'inventory',
  SALES = 'sales',
  FINANCE = 'finance',
  PARTNER = 'partner',
  USER = 'user',
  REPORT = 'report',
  ADMIN = 'admin',
  AUDIT = 'audit',
  WARRANTY = 'warranty',
  QUOTE = 'quote',
  WORKSHEET = 'worksheet',
  VEHICLE = 'vehicle',
}

/**
 * Permission constraint type (e.g., discount_limit)
 */
export interface PermissionConstraint {
  /** Constraint key (e.g., 'discount_limit') */
  key: string;
  /** Constraint value (e.g., 20 for 20%) */
  value: number;
  /** Human-readable description */
  description?: string;
}

/**
 * Permission with optional constraints
 */
export interface IPermission {
  /** Permission code from Permission enum */
  permission: Permission;
  /** Optional constraints that limit the permission */
  constraints?: PermissionConstraint[];
}

/**
 * Role scope types per ADR-032
 */
export enum RoleScope {
  LOCATION = 'LOCATION', // Single location access
  TENANT = 'TENANT', // All locations within tenant
  GLOBAL = 'GLOBAL', // Cross-tenant access
}

/**
 * Role definition with scope information
 */
export interface RoleDefinition {
  /** Role code */
  role: Role;
  /** Hierarchy level (1-8) */
  level: number;
  /** Access scope */
  scope: RoleScope;
  /** Role inherits from (if any) */
  inheritsFrom?: Role;
  /** Human-readable description */
  description: string;
}

/**
 * User permissions response structure
 */
export interface UserPermissionsResponse {
  /** User ID */
  userId: string;
  /** User's role */
  role: Role;
  /** Role level */
  level: number;
  /** Role scope */
  scope: RoleScope;
  /** All permissions (direct + inherited) */
  permissions: Permission[];
  /** Inherited roles chain */
  inheritedFrom: Role[];
  /** Constraints per permission */
  constraints: Partial<Record<Permission, Record<string, number>>>;
}

/**
 * Get all permissions for a module
 * @param module - The module to get permissions for
 * @returns Array of permissions in that module
 */
export function getPermissionsByModule(module: PermissionModule): Permission[] {
  const modulePrefix = `${module}:`;
  return Object.values(Permission).filter(p => p.startsWith(modulePrefix));
}

/**
 * Extract module from permission code
 * @param permission - The permission code
 * @returns The module name
 */
export function getPermissionModule(permission: Permission): PermissionModule {
  if (!permission.includes(':')) {
    throw new Error(`Invalid permission format: ${permission}`);
  }
  const module = permission.split(':')[0];
  if (!module) {
    throw new Error(`Invalid permission format: ${permission}`);
  }
  return module as PermissionModule;
}

/**
 * Extract action from permission code
 * @param permission - The permission code
 * @returns The action name
 */
export function getPermissionAction(permission: Permission): string {
  if (!permission.includes(':')) {
    throw new Error(`Invalid permission format: ${permission}`);
  }
  const action = permission.split(':')[1];
  if (!action) {
    throw new Error(`Invalid permission format: ${permission}`);
  }
  return action;
}

/**
 * Check if a permission code is valid
 * @param permission - The permission code to check
 * @returns true if valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}

/**
 * Total permission count for validation
 */
export const TOTAL_PERMISSION_COUNT = Object.keys(Permission).length;
