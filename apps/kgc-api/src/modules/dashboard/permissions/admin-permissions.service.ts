import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient, WidgetRole } from '@prisma/client';
import type {
  AdminPermissionsResponseDto,
  AdminWidgetPermission,
  PermissionUpdateDto,
  RolePermissions,
  UpdatePermissionsResponseDto,
  WidgetCategory,
} from './dto/admin-permissions.dto';
import { WidgetRoleEnum } from './dto/admin-permissions.dto';

/**
 * Widget catalog definition for admin UI
 */
interface WidgetCatalogItem {
  id: string;
  name: string;
  category: WidgetCategory;
  /** Default roles (hardcoded fallback) */
  defaultRoles: WidgetRoleEnum[];
}

/**
 * Admin Permissions Service (Story 45-1)
 *
 * Manages dashboard widget permissions with database persistence.
 * Provides CRUD operations for admin widget permission configuration.
 *
 * Features:
 * - Get permission matrix for all widgets
 * - Update permissions with audit trail
 * - Fallback to hardcoded defaults
 * - Tenant-scoped permissions
 */
@Injectable()
export class AdminPermissionsService {
  private readonly logger = new Logger(AdminPermissionsService.name);

  /**
   * Widget catalog matching frontend widget-registry.ts
   * Used for admin UI display and default permission fallback
   */
  private readonly WIDGET_CATALOG: WidgetCatalogItem[] = [
    // General
    {
      id: 'welcome-card',
      name: 'Üdvözlő kártya',
      category: 'general',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'empty-state',
      name: 'Üres állapot',
      category: 'general',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    // Finance
    {
      id: 'revenue-kpi',
      name: 'Bevétel KPI',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'net-revenue-kpi',
      name: 'Nettó bevétel KPI',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'receivables-kpi',
      name: 'Kintlévőség KPI',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'payments-kpi',
      name: 'Befizetések KPI',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'equipment-profit',
      name: 'Bérgép megtérülés',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'receivables-aging',
      name: 'Kintlévőség aging',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'revenue-forecast',
      name: 'Bevétel előrejelzés',
      category: 'finance',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    // Inventory
    {
      id: 'stock-summary',
      name: 'Készlet összesítő',
      category: 'inventory',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'stock-utilization',
      name: 'Kihasználtság',
      category: 'inventory',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'stock-alerts',
      name: 'Készlet riasztások',
      category: 'inventory',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'stock-movement',
      name: 'Készlet mozgások',
      category: 'inventory',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'stock-heatmap',
      name: 'Készlet hőtérkép',
      category: 'inventory',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    // Service
    {
      id: 'worksheet-summary',
      name: 'Munkalap összesítő',
      category: 'service',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'technician-workload',
      name: 'Szerelő terhelés',
      category: 'service',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'service-revenue',
      name: 'Szerviz bevétel',
      category: 'service',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'warranty-ratio-placeholder',
      name: 'Garanciális arány',
      category: 'service',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    // Partner
    {
      id: 'partner-overview',
      name: 'Partner áttekintés',
      category: 'partner',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'top-partners',
      name: 'Top partnerek',
      category: 'partner',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'partner-activity',
      name: 'Partner aktivitás',
      category: 'partner',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    {
      id: 'partner-credit-placeholder',
      name: 'Partner hitelkeret',
      category: 'partner',
      defaultRoles: [WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
    // Alerts
    {
      id: 'notification-panel',
      name: 'Értesítések',
      category: 'alerts',
      defaultRoles: [WidgetRoleEnum.OPERATOR, WidgetRoleEnum.STORE_MANAGER, WidgetRoleEnum.ADMIN],
    },
  ];

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  /**
   * Get all widget permissions for admin matrix view (AC1)
   *
   * Returns widgets grouped with their role permissions.
   * Merges database permissions with hardcoded defaults.
   */
  async getAdminPermissions(tenantId: string): Promise<AdminPermissionsResponseDto> {
    // Fetch custom permissions from database
    const dbPermissions = await this.prisma.dashboardWidgetPermission.findMany({
      where: { tenantId },
    });

    // Create lookup map for db permissions
    const dbPermissionMap = new Map<string, boolean>();
    for (const perm of dbPermissions) {
      const key = `${perm.widgetId}:${perm.role}`;
      dbPermissionMap.set(key, perm.enabled);
    }

    // Build admin widget list with merged permissions
    const widgets: AdminWidgetPermission[] = this.WIDGET_CATALOG.map(widget => {
      const roles: RolePermissions = {
        OPERATOR: this.getEffectivePermission(widget, WidgetRoleEnum.OPERATOR, dbPermissionMap),
        STORE_MANAGER: this.getEffectivePermission(
          widget,
          WidgetRoleEnum.STORE_MANAGER,
          dbPermissionMap
        ),
        ADMIN: true, // ADMIN always has access (Story requirement: ADMIN mindig lát mindent)
      };

      return {
        id: widget.id,
        name: widget.name,
        category: widget.category,
        roles,
      };
    });

    return { widgets };
  }

  /**
   * Get effective permission for a widget+role combination
   * Database overrides default, default is fallback
   */
  private getEffectivePermission(
    widget: WidgetCatalogItem,
    role: WidgetRoleEnum,
    dbPermissionMap: Map<string, boolean>
  ): boolean {
    const key = `${widget.id}:${role}`;
    const dbValue = dbPermissionMap.get(key);

    if (dbValue !== undefined) {
      return dbValue;
    }

    // Fallback to hardcoded default
    return widget.defaultRoles.includes(role);
  }

  /**
   * Update widget permissions (AC2)
   *
   * Saves permissions to database and creates audit log entry.
   * Uses transaction for batch processing (MED-1 fix: N+1 query optimization).
   * Validates widget IDs before update (MED-3 fix: input validation).
   */
  async updatePermissions(
    tenantId: string,
    userId: string,
    updates: PermissionUpdateDto[]
  ): Promise<UpdatePermissionsResponseDto> {
    this.logger.log(`Updating ${updates.length} widget permissions for tenant ${tenantId}`);

    // Filter out ADMIN role updates (ADMIN always has access)
    const validUpdates = updates.filter(u => u.role !== WidgetRoleEnum.ADMIN);

    if (validUpdates.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        message: 'Nincs módosítandó jogosultság (ADMIN mindig látja az összes widgetet)',
      };
    }

    // MED-3 fix: Validate widget IDs before update
    const invalidWidgetIds = validUpdates
      .filter(u => !this.isValidWidgetId(u.widgetId))
      .map(u => u.widgetId);

    if (invalidWidgetIds.length > 0) {
      throw new BadRequestException(
        `Érvénytelen widget azonosítók: ${invalidWidgetIds.join(', ')}`
      );
    }

    // MED-1 fix: Use transaction for batch upsert instead of N+1 queries
    const now = new Date();

    await this.prisma.$transaction(async tx => {
      // Delete existing permissions that will be updated
      await tx.dashboardWidgetPermission.deleteMany({
        where: {
          tenantId,
          OR: validUpdates.map(u => ({
            widgetId: u.widgetId,
            role: u.role as WidgetRole,
          })),
        },
      });

      // Create all permissions in batch
      await tx.dashboardWidgetPermission.createMany({
        data: validUpdates.map(u => ({
          tenantId,
          widgetId: u.widgetId,
          role: u.role as WidgetRole,
          enabled: u.enabled,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })),
      });
    });

    // Log for audit (AC2 audit log requirement)
    this.logger.log(
      `Widget permissions updated: tenant=${tenantId}, user=${userId}, changes=${JSON.stringify(validUpdates)}`
    );

    return {
      success: true,
      updatedCount: validUpdates.length,
      message: `${validUpdates.length} jogosultság sikeresen mentve`,
    };
  }

  /**
   * Get widget catalog for frontend (used for validation)
   */
  getWidgetCatalog(): WidgetCatalogItem[] {
    return [...this.WIDGET_CATALOG];
  }

  /**
   * Check if a widget ID is valid
   */
  isValidWidgetId(widgetId: string): boolean {
    return this.WIDGET_CATALOG.some(w => w.id === widgetId);
  }

  /**
   * Get permissions for a specific user role (for frontend API AC5)
   *
   * Returns list of widget IDs the role can access.
   * Merges database permissions with defaults.
   */
  async getPermissionsForRole(tenantId: string, role: WidgetRoleEnum): Promise<string[]> {
    // ADMIN always sees everything
    if (role === WidgetRoleEnum.ADMIN) {
      return this.WIDGET_CATALOG.map(w => w.id);
    }

    // Fetch custom permissions from database
    const dbPermissions = await this.prisma.dashboardWidgetPermission.findMany({
      where: { tenantId, role: role as WidgetRole },
    });

    // Create lookup map
    const dbPermissionMap = new Map<string, boolean>();
    for (const perm of dbPermissions) {
      dbPermissionMap.set(perm.widgetId, perm.enabled);
    }

    // Filter widgets by permission
    return this.WIDGET_CATALOG.filter(widget => {
      const dbValue = dbPermissionMap.get(widget.id);
      if (dbValue !== undefined) {
        return dbValue;
      }
      return widget.defaultRoles.includes(role);
    }).map(w => w.id);
  }

  /**
   * Reset permissions to defaults for a tenant
   *
   * Deletes all custom permissions, reverting to hardcoded defaults.
   */
  async resetToDefaults(tenantId: string, userId: string): Promise<UpdatePermissionsResponseDto> {
    const deleted = await this.prisma.dashboardWidgetPermission.deleteMany({
      where: { tenantId },
    });

    this.logger.log(
      `Widget permissions reset to defaults: tenant=${tenantId}, user=${userId}, deleted=${deleted.count}`
    );

    return {
      success: true,
      updatedCount: deleted.count,
      message: 'Jogosultságok visszaállítva az alapértelmezettekre',
    };
  }
}
