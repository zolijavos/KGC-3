import { ApiProperty } from '@nestjs/swagger';

/**
 * Dashboard Permissions DTO (Story 35-8)
 *
 * Response DTOs for dashboard permission API
 * Based on RBAC Widget Spec
 */

/**
 * Dashboard Sections
 */
export type DashboardSection =
  | 'executive'
  | 'finance'
  | 'inventory'
  | 'service'
  | 'partner'
  | 'analytics';

/**
 * Widget IDs matching the RBAC spec
 */
export type WidgetId =
  // Executive Summary
  | 'EXEC_HEALTH'
  | 'EXEC_REVENUE'
  | 'EXEC_INVENTORY'
  | 'EXEC_SERVICE'
  | 'EXEC_ALERTS'
  // Finance
  | 'FIN_GROSS_REV'
  | 'FIN_NET_REV'
  | 'FIN_RECEIVABLES'
  | 'FIN_PAYMENTS'
  | 'FIN_AGING'
  | 'FIN_FORECAST'
  // Inventory
  | 'INV_SUMMARY'
  | 'INV_UTILIZATION'
  | 'INV_ALERTS'
  | 'INV_MOVEMENT'
  | 'INV_HEATMAP'
  // Service
  | 'SVC_WORKSHEETS'
  | 'SVC_WORKLOAD'
  | 'SVC_REVENUE'
  | 'SVC_WARRANTY'
  // Partner
  | 'PTR_SUMMARY'
  | 'PTR_TOP'
  | 'PTR_ACTIVITY'
  | 'PTR_CREDIT'
  // Analytics
  | 'ANA_ROI'
  | 'ANA_FORECAST';

/**
 * Access levels for widgets
 */
export type AccessLevel = 'FULL' | 'READ' | 'NONE';

/**
 * Role codes
 */
export type RoleCode =
  | 'ROLE_ADMIN'
  | 'ROLE_MANAGER'
  | 'ROLE_FINANCE'
  | 'ROLE_FRANCHISE_OWNER'
  | 'ROLE_STOCK'
  | 'ROLE_TECHNICIAN'
  | 'ROLE_SALES'
  | 'ROLE_CASHIER'
  | 'ROLE_FRANCHISE_EMP';

/**
 * Widget permission detail
 */
export interface WidgetPermission {
  widgetId: WidgetId;
  permissionCode: string;
  accessLevel: AccessLevel;
  sectionId: DashboardSection;
  name: string;
}

/**
 * Section visibility info
 */
export interface SectionVisibility {
  sectionId: DashboardSection;
  isVisible: boolean;
  visibleWidgetCount: number;
  name: string;
}

/**
 * Dashboard preset configuration
 */
export interface DashboardPreset {
  roleCode: RoleCode;
  expandedSections: DashboardSection[];
  pinnedWidgets: WidgetId[];
  defaultRefreshInterval: number;
}

/**
 * Main response DTO for dashboard permissions
 */
export interface DashboardPermissionsResponseDto {
  /** List of widgets user can see */
  widgets: WidgetPermission[];

  /** Section visibility status */
  sections: SectionVisibility[];

  /** Role-specific dashboard preset */
  preset: DashboardPreset;

  /** Total widget count for user */
  totalWidgets: number;

  /** User's effective roles */
  roles: string[];
}

// Swagger classes for OpenAPI documentation
export class WidgetPermissionSwagger implements WidgetPermission {
  @ApiProperty({ example: 'EXEC_HEALTH' })
  widgetId!: WidgetId;

  @ApiProperty({ example: 'dashboard.exec.health' })
  permissionCode!: string;

  @ApiProperty({ enum: ['FULL', 'READ', 'NONE'], example: 'FULL' })
  accessLevel!: AccessLevel;

  @ApiProperty({ example: 'executive' })
  sectionId!: DashboardSection;

  @ApiProperty({ example: 'Uzleti Egeszseg' })
  name!: string;
}

export class SectionVisibilitySwagger implements SectionVisibility {
  @ApiProperty({ example: 'finance' })
  sectionId!: DashboardSection;

  @ApiProperty({ example: true })
  isVisible!: boolean;

  @ApiProperty({ example: 6 })
  visibleWidgetCount!: number;

  @ApiProperty({ example: 'Penzugy' })
  name!: string;
}

export class DashboardPresetSwagger implements DashboardPreset {
  @ApiProperty({ example: 'ROLE_ADMIN' })
  roleCode!: RoleCode;

  @ApiProperty({ example: ['finance', 'inventory'], type: [String] })
  expandedSections!: DashboardSection[];

  @ApiProperty({ example: ['EXEC_HEALTH', 'EXEC_ALERTS'], type: [String] })
  pinnedWidgets!: WidgetId[];

  @ApiProperty({ example: 60 })
  defaultRefreshInterval!: number;
}

export class DashboardPermissionsResponseSwagger implements DashboardPermissionsResponseDto {
  @ApiProperty({ type: [WidgetPermissionSwagger] })
  widgets!: WidgetPermission[];

  @ApiProperty({ type: [SectionVisibilitySwagger] })
  sections!: SectionVisibility[];

  @ApiProperty({ type: DashboardPresetSwagger })
  preset!: DashboardPreset;

  @ApiProperty({ example: 26 })
  totalWidgets!: number;

  @ApiProperty({ example: ['ROLE_ADMIN'], type: [String] })
  roles!: string[];
}
