import { Injectable } from '@nestjs/common';
import type {
  AccessLevel,
  DashboardPermissionsResponseDto,
  DashboardPreset,
  DashboardSection,
  RoleCode,
  SectionVisibility,
  WidgetId,
  WidgetPermission,
} from './dto/dashboard-permissions.dto';

/**
 * Widget definition with section and permission
 */
interface WidgetDefinition {
  id: WidgetId;
  permissionCode: string;
  sectionId: DashboardSection;
  name: string;
}

/**
 * Role-based access configuration per widget
 */
type RoleWidgetAccess = Record<RoleCode, AccessLevel>;

/**
 * Dashboard Permissions Service (Story 35-8)
 *
 * Manages RBAC permissions for dashboard widgets and sections.
 * Based on RBAC Widget Spec (dashboard-rbac-widget-spec.md)
 *
 * Features:
 * - Widget visibility by role
 * - Section visibility calculation
 * - Role-specific presets
 * - Multi-role permission union
 */
@Injectable()
export class DashboardPermissionsService {
  /**
   * Widget catalog with definitions
   */
  private readonly WIDGETS: WidgetDefinition[] = [
    // Executive Summary
    {
      id: 'EXEC_HEALTH',
      permissionCode: 'dashboard.exec.health',
      sectionId: 'executive',
      name: 'Uzleti Egeszseg',
    },
    {
      id: 'EXEC_REVENUE',
      permissionCode: 'dashboard.exec.revenue',
      sectionId: 'executive',
      name: 'Napi Bevetel',
    },
    {
      id: 'EXEC_INVENTORY',
      permissionCode: 'dashboard.exec.inventory',
      sectionId: 'executive',
      name: 'Keszlet Osszefoglalo',
    },
    {
      id: 'EXEC_SERVICE',
      permissionCode: 'dashboard.exec.service',
      sectionId: 'executive',
      name: 'Aktiv Munkalapok',
    },
    {
      id: 'EXEC_ALERTS',
      permissionCode: 'dashboard.exec.alerts',
      sectionId: 'executive',
      name: 'Alert Szamlalo',
    },
    // Finance
    {
      id: 'FIN_GROSS_REV',
      permissionCode: 'dashboard.finance.gross_revenue',
      sectionId: 'finance',
      name: 'Brutto Bevetel',
    },
    {
      id: 'FIN_NET_REV',
      permissionCode: 'dashboard.finance.net_revenue',
      sectionId: 'finance',
      name: 'Netto Bevetel',
    },
    {
      id: 'FIN_RECEIVABLES',
      permissionCode: 'dashboard.finance.receivables',
      sectionId: 'finance',
      name: 'Kintlevoseg',
    },
    {
      id: 'FIN_PAYMENTS',
      permissionCode: 'dashboard.finance.payments',
      sectionId: 'finance',
      name: 'Befizetesek',
    },
    {
      id: 'FIN_AGING',
      permissionCode: 'dashboard.finance.aging',
      sectionId: 'finance',
      name: 'Kintlevoseg Aging',
    },
    {
      id: 'FIN_FORECAST',
      permissionCode: 'dashboard.finance.forecast',
      sectionId: 'finance',
      name: 'Bevetel Elorejelzes',
    },
    // Inventory
    {
      id: 'INV_SUMMARY',
      permissionCode: 'dashboard.inventory.summary',
      sectionId: 'inventory',
      name: 'Keszlet Osszesites',
    },
    {
      id: 'INV_UTILIZATION',
      permissionCode: 'dashboard.inventory.utilization',
      sectionId: 'inventory',
      name: 'Kihasznaltsag',
    },
    {
      id: 'INV_ALERTS',
      permissionCode: 'dashboard.inventory.alerts',
      sectionId: 'inventory',
      name: 'Keszlethiany Alertek',
    },
    {
      id: 'INV_MOVEMENT',
      permissionCode: 'dashboard.inventory.movement',
      sectionId: 'inventory',
      name: 'Keszlet Mozgas',
    },
    {
      id: 'INV_HEATMAP',
      permissionCode: 'dashboard.inventory.heatmap',
      sectionId: 'inventory',
      name: 'Keszlet Hoterkep',
    },
    // Service
    {
      id: 'SVC_WORKSHEETS',
      permissionCode: 'dashboard.service.worksheets',
      sectionId: 'service',
      name: 'Munkalapok',
    },
    {
      id: 'SVC_WORKLOAD',
      permissionCode: 'dashboard.service.workload',
      sectionId: 'service',
      name: 'Szerelo Terheles',
    },
    {
      id: 'SVC_REVENUE',
      permissionCode: 'dashboard.service.revenue',
      sectionId: 'service',
      name: 'Szerviz Bevetel',
    },
    {
      id: 'SVC_WARRANTY',
      permissionCode: 'dashboard.service.warranty',
      sectionId: 'service',
      name: 'Garancialis Arany',
    },
    // Partner
    {
      id: 'PTR_SUMMARY',
      permissionCode: 'dashboard.partner.summary',
      sectionId: 'partner',
      name: 'Partner Osszesites',
    },
    {
      id: 'PTR_TOP',
      permissionCode: 'dashboard.partner.top',
      sectionId: 'partner',
      name: 'Top Partnerek',
    },
    {
      id: 'PTR_ACTIVITY',
      permissionCode: 'dashboard.partner.activity',
      sectionId: 'partner',
      name: 'Partner Aktivitas',
    },
    {
      id: 'PTR_CREDIT',
      permissionCode: 'dashboard.partner.credit',
      sectionId: 'partner',
      name: 'Partner Hitelkeret',
    },
    // Analytics
    {
      id: 'ANA_ROI',
      permissionCode: 'dashboard.analytics.roi',
      sectionId: 'analytics',
      name: 'Bergep Megterules',
    },
    {
      id: 'ANA_FORECAST',
      permissionCode: 'dashboard.analytics.forecast',
      sectionId: 'analytics',
      name: 'Bevetel Elorejelzes',
    },
  ];

  /**
   * Section definitions with display names
   */
  private readonly SECTIONS: { id: DashboardSection; name: string }[] = [
    { id: 'executive', name: 'Osszegzes' },
    { id: 'finance', name: 'Penzugy' },
    { id: 'inventory', name: 'Keszlet' },
    { id: 'service', name: 'Szerviz' },
    { id: 'partner', name: 'Partner' },
    { id: 'analytics', name: 'Analitika' },
  ];

  /**
   * Role-Widget access matrix based on RBAC spec
   * Key: widgetId, Value: access level per role
   */
  private readonly WIDGET_ACCESS: Record<WidgetId, RoleWidgetAccess> = {
    // Executive Summary
    EXEC_HEALTH: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'READ',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'READ',
      ROLE_TECHNICIAN: 'READ',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'READ',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    EXEC_REVENUE: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'READ',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    EXEC_INVENTORY: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'READ',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    EXEC_SERVICE: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'FULL',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    EXEC_ALERTS: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'READ',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'READ',
      ROLE_TECHNICIAN: 'READ',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'READ',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    // Finance
    FIN_GROSS_REV: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'READ',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    FIN_NET_REV: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    FIN_RECEIVABLES: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    FIN_PAYMENTS: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'FULL',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    FIN_AGING: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    FIN_FORECAST: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    // Inventory
    INV_SUMMARY: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'READ',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    INV_UTILIZATION: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    INV_ALERTS: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'FULL',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    INV_MOVEMENT: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    INV_HEATMAP: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'FULL',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    // Service
    SVC_WORKSHEETS: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'FULL',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    SVC_WORKLOAD: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'READ',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    SVC_REVENUE: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    SVC_WARRANTY: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'FULL',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    // Partner
    PTR_SUMMARY: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'READ',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'FULL',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    PTR_TOP: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'FULL',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    PTR_ACTIVITY: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'NONE',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'FULL',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'READ',
    },
    PTR_CREDIT: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'READ',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    // Analytics
    ANA_ROI: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
    ANA_FORECAST: {
      ROLE_ADMIN: 'FULL',
      ROLE_MANAGER: 'FULL',
      ROLE_FINANCE: 'FULL',
      ROLE_FRANCHISE_OWNER: 'FULL',
      ROLE_STOCK: 'NONE',
      ROLE_TECHNICIAN: 'NONE',
      ROLE_SALES: 'NONE',
      ROLE_CASHIER: 'NONE',
      ROLE_FRANCHISE_EMP: 'NONE',
    },
  };

  /**
   * Dashboard presets by role
   */
  private readonly PRESETS: DashboardPreset[] = [
    {
      roleCode: 'ROLE_ADMIN',
      expandedSections: ['finance', 'inventory'],
      pinnedWidgets: ['EXEC_HEALTH', 'EXEC_ALERTS'],
      defaultRefreshInterval: 60,
    },
    {
      roleCode: 'ROLE_MANAGER',
      expandedSections: ['finance', 'inventory'],
      pinnedWidgets: ['EXEC_HEALTH', 'EXEC_REVENUE', 'EXEC_ALERTS'],
      defaultRefreshInterval: 60,
    },
    {
      roleCode: 'ROLE_FINANCE',
      expandedSections: ['finance'],
      pinnedWidgets: ['FIN_RECEIVABLES', 'FIN_AGING'],
      defaultRefreshInterval: 300,
    },
    {
      roleCode: 'ROLE_FRANCHISE_OWNER',
      expandedSections: ['finance', 'inventory'],
      pinnedWidgets: ['EXEC_HEALTH', 'EXEC_REVENUE', 'EXEC_ALERTS'],
      defaultRefreshInterval: 60,
    },
    {
      roleCode: 'ROLE_STOCK',
      expandedSections: ['inventory'],
      pinnedWidgets: ['INV_ALERTS', 'INV_SUMMARY'],
      defaultRefreshInterval: 120,
    },
    {
      roleCode: 'ROLE_TECHNICIAN',
      expandedSections: ['service'],
      pinnedWidgets: ['SVC_WORKSHEETS'],
      defaultRefreshInterval: 120,
    },
    {
      roleCode: 'ROLE_SALES',
      expandedSections: ['partner', 'inventory'],
      pinnedWidgets: ['PTR_TOP', 'INV_ALERTS'],
      defaultRefreshInterval: 300,
    },
    {
      roleCode: 'ROLE_CASHIER',
      expandedSections: ['finance'],
      pinnedWidgets: ['FIN_PAYMENTS'],
      defaultRefreshInterval: 60,
    },
    {
      roleCode: 'ROLE_FRANCHISE_EMP',
      expandedSections: ['executive'],
      pinnedWidgets: ['EXEC_HEALTH', 'EXEC_ALERTS'],
      defaultRefreshInterval: 120,
    },
  ];

  /**
   * Default preset for unknown roles
   */
  private readonly DEFAULT_PRESET: DashboardPreset = {
    roleCode: 'ROLE_FRANCHISE_EMP',
    expandedSections: ['executive'],
    pinnedWidgets: ['EXEC_HEALTH'],
    defaultRefreshInterval: 300,
  };

  /**
   * Get the access level for a widget given a role
   */
  getWidgetAccessForRole(widgetId: WidgetId, role: RoleCode): AccessLevel {
    const widgetAccess = this.WIDGET_ACCESS[widgetId];
    if (!widgetAccess) {
      return 'NONE';
    }
    return widgetAccess[role] ?? 'NONE';
  }

  /**
   * Get the highest access level from multiple roles
   * FULL > READ > NONE
   */
  getHighestAccessLevel(levels: AccessLevel[]): AccessLevel {
    if (levels.includes('FULL')) return 'FULL';
    if (levels.includes('READ')) return 'READ';
    return 'NONE';
  }

  /**
   * Get effective access level for a widget considering multiple roles
   */
  getWidgetAccessForRoles(widgetId: WidgetId, roles: RoleCode[]): AccessLevel {
    const accessLevels = roles.map(role => this.getWidgetAccessForRole(widgetId, role));
    return this.getHighestAccessLevel(accessLevels);
  }

  /**
   * Check if a string is a valid role code
   */
  isValidRoleCode(role: string): role is RoleCode {
    const validRoles: RoleCode[] = [
      'ROLE_ADMIN',
      'ROLE_MANAGER',
      'ROLE_FINANCE',
      'ROLE_FRANCHISE_OWNER',
      'ROLE_STOCK',
      'ROLE_TECHNICIAN',
      'ROLE_SALES',
      'ROLE_CASHIER',
      'ROLE_FRANCHISE_EMP',
    ];
    return validRoles.includes(role as RoleCode);
  }

  /**
   * Get visible widgets for given roles
   */
  getVisibleWidgets(roles: string[]): WidgetPermission[] {
    const validRoles = roles.filter(r => this.isValidRoleCode(r)) as RoleCode[];

    if (validRoles.length === 0) {
      return [];
    }

    return this.WIDGETS.map(widget => {
      const accessLevel = this.getWidgetAccessForRoles(widget.id, validRoles);
      return {
        widgetId: widget.id,
        permissionCode: widget.permissionCode,
        accessLevel,
        sectionId: widget.sectionId,
        name: widget.name,
      };
    }).filter(w => w.accessLevel !== 'NONE');
  }

  /**
   * Calculate section visibility based on visible widgets
   */
  getSectionVisibility(visibleWidgets: WidgetPermission[]): SectionVisibility[] {
    return this.SECTIONS.map(section => {
      const sectionWidgets = visibleWidgets.filter(w => w.sectionId === section.id);
      return {
        sectionId: section.id,
        isVisible: sectionWidgets.length > 0,
        visibleWidgetCount: sectionWidgets.length,
        name: section.name,
      };
    });
  }

  /**
   * Get preset for the primary role (first role with highest privileges)
   */
  getPresetForRoles(roles: string[]): DashboardPreset {
    const validRoles = roles.filter(r => this.isValidRoleCode(r)) as RoleCode[];

    // Priority order for presets
    const priorityOrder: RoleCode[] = [
      'ROLE_ADMIN',
      'ROLE_MANAGER',
      'ROLE_FRANCHISE_OWNER',
      'ROLE_FINANCE',
      'ROLE_STOCK',
      'ROLE_TECHNICIAN',
      'ROLE_SALES',
      'ROLE_CASHIER',
      'ROLE_FRANCHISE_EMP',
    ];

    for (const role of priorityOrder) {
      if (validRoles.includes(role)) {
        const preset = this.PRESETS.find(p => p.roleCode === role);
        if (preset) {
          return preset;
        }
      }
    }

    return this.DEFAULT_PRESET;
  }

  /**
   * Get complete dashboard permissions for a user
   */
  async getPermissions(userRoles: string[]): Promise<DashboardPermissionsResponseDto> {
    const visibleWidgets = this.getVisibleWidgets(userRoles);
    const sections = this.getSectionVisibility(visibleWidgets);
    const preset = this.getPresetForRoles(userRoles);

    return {
      widgets: visibleWidgets,
      sections,
      preset,
      totalWidgets: visibleWidgets.length,
      roles: userRoles,
    };
  }

  /**
   * Check if user has access to a specific widget
   */
  hasWidgetAccess(widgetId: WidgetId, userRoles: string[]): boolean {
    const validRoles = userRoles.filter(r => this.isValidRoleCode(r)) as RoleCode[];
    const accessLevel = this.getWidgetAccessForRoles(widgetId, validRoles);
    return accessLevel !== 'NONE';
  }

  /**
   * Check if user has access to a specific permission code
   */
  hasPermission(permissionCode: string, userRoles: string[]): boolean {
    const widget = this.WIDGETS.find(w => w.permissionCode === permissionCode);
    if (!widget) {
      return false;
    }
    return this.hasWidgetAccess(widget.id, userRoles);
  }

  /**
   * Get all widgets in a section
   */
  getWidgetsInSection(sectionId: DashboardSection): WidgetDefinition[] {
    return this.WIDGETS.filter(w => w.sectionId === sectionId);
  }

  /**
   * Get total widget count for a role
   * Used for verifying RBAC spec widget counts
   */
  getTotalWidgetCountForRole(role: RoleCode): number {
    return this.WIDGETS.filter(w => {
      const accessLevel = this.getWidgetAccessForRole(w.id, role);
      return accessLevel !== 'NONE';
    }).length;
  }
}
