/**
 * @RequirePermission Decorator
 * Story 2.3: Permission Check Middleware
 * AC#1: @RequirePermission Decorator
 * AC#6: Multiple Permissions Support (ALL/ANY logic)
 *
 * Decorator to specify required permissions for endpoint access.
 * Uses NestJS SetMetadata to store permission requirements for PermissionGuard.
 */

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../interfaces/permission.interface';

/** Metadata key for storing required permissions */
export const PERMISSIONS_KEY = 'permissions';

/** Metadata key for storing permission logic (ALL/ANY) */
export const PERMISSION_LOGIC_KEY = 'permission_logic';

/**
 * Permission logic type
 * - ALL: User must have ALL specified permissions (AND logic)
 * - ANY: User must have at least ONE of the specified permissions (OR logic)
 */
export type PermissionLogic = 'ALL' | 'ANY';

/**
 * @RequirePermission decorator - single permission
 * @example @RequirePermission(Permission.RENTAL_CREATE)
 */
export function RequirePermission(permission: Permission): MethodDecorator;

/**
 * @RequirePermission decorator - multiple permissions with logic
 * @example @RequirePermission([Permission.RENTAL_VIEW, Permission.RENTAL_CREATE], 'ALL')
 * @example @RequirePermission([Permission.USER_VIEW, Permission.ADMIN_CONFIG], 'ANY')
 */
export function RequirePermission(
  permissions: Permission[],
  logic?: PermissionLogic
): MethodDecorator;

/**
 * Implementation of @RequirePermission decorator
 * Sets metadata on the method for PermissionGuard to read
 */
export function RequirePermission(
  permissionOrPermissions: Permission | Permission[],
  logic: PermissionLogic = 'ALL'
): MethodDecorator {
  // Normalize to array
  const permissions = Array.isArray(permissionOrPermissions)
    ? permissionOrPermissions
    : [permissionOrPermissions];

  // Return composed decorator
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    // Set permissions metadata
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
    // Set logic metadata
    SetMetadata(PERMISSION_LOGIC_KEY, logic)(target, key, descriptor);
    return descriptor;
  };
}
