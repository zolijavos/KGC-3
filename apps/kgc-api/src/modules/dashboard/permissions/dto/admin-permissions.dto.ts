import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

/**
 * Admin Permissions DTO (Story 45-1)
 *
 * DTOs for admin widget permission management API
 */

/**
 * Widget Role enum - matches Prisma WidgetRole
 */
export enum WidgetRoleEnum {
  OPERATOR = 'OPERATOR',
  STORE_MANAGER = 'STORE_MANAGER',
  ADMIN = 'ADMIN',
}

/**
 * Widget category for grouping in admin UI
 */
export type WidgetCategory =
  | 'general'
  | 'finance'
  | 'inventory'
  | 'service'
  | 'partner'
  | 'alerts'
  | 'analytics';

/**
 * Role permission status for a single widget
 */
export interface RolePermissions {
  OPERATOR: boolean;
  STORE_MANAGER: boolean;
  ADMIN: boolean;
}

/**
 * Widget with all role permissions for admin view
 */
export interface AdminWidgetPermission {
  id: string;
  name: string;
  category: WidgetCategory;
  roles: RolePermissions;
}

/**
 * Response for GET /dashboard/permissions/admin
 */
export interface AdminPermissionsResponseDto {
  widgets: AdminWidgetPermission[];
}

/**
 * Single permission update
 */
export class PermissionUpdateDto {
  @ApiProperty({ description: 'Widget ID', example: 'revenue-kpi' })
  @IsString()
  @IsNotEmpty()
  widgetId!: string;

  @ApiProperty({ enum: WidgetRoleEnum, description: 'Role to update' })
  @IsEnum(WidgetRoleEnum)
  role!: WidgetRoleEnum;

  @ApiProperty({ description: 'Whether the role can see this widget' })
  @IsBoolean()
  enabled!: boolean;
}

/**
 * Request body for PUT /dashboard/permissions/admin
 */
export class UpdatePermissionsDto {
  @ApiProperty({ type: [PermissionUpdateDto], description: 'Permission updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionUpdateDto)
  permissions!: PermissionUpdateDto[];
}

// Swagger classes
export class RolePermissionsSwagger implements RolePermissions {
  @ApiProperty({ example: false })
  OPERATOR!: boolean;

  @ApiProperty({ example: true })
  STORE_MANAGER!: boolean;

  @ApiProperty({ example: true })
  ADMIN!: boolean;
}

export class AdminWidgetPermissionSwagger implements AdminWidgetPermission {
  @ApiProperty({ example: 'revenue-kpi' })
  id!: string;

  @ApiProperty({ example: 'Bevétel KPI' })
  name!: string;

  @ApiProperty({ example: 'finance' })
  category!: WidgetCategory;

  @ApiProperty({ type: RolePermissionsSwagger })
  roles!: RolePermissions;
}

export class AdminPermissionsResponseSwagger implements AdminPermissionsResponseDto {
  @ApiProperty({ type: [AdminWidgetPermissionSwagger] })
  widgets!: AdminWidgetPermission[];
}

/**
 * Response for successful permission update
 */
export interface UpdatePermissionsResponseDto {
  success: boolean;
  updatedCount: number;
  message: string;
}

export class UpdatePermissionsResponseSwagger implements UpdatePermissionsResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 5 })
  updatedCount!: number;

  @ApiProperty({ example: 'Jogosultságok sikeresen mentve' })
  message!: string;
}
