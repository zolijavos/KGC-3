/**
 * Prisma Alert Repository
 * Implements IAlertRepository for PostgreSQL persistence
 * Story INV-S5: PrismaAlertRepository
 *
 * Note: The Prisma AlertType enum has fewer values than the interface.
 * This implementation maps available types appropriately.
 */

import {
  AlertPriority,
  AlertQuery,
  AlertQueryResult,
  AlertStatus,
  AlertSummary,
  IAlertRepository,
  StockAlert,
  StockAlertType,
  StockLevelSetting,
  StockLevelSettingQuery,
} from '@kgc/inventory';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  AlertPriority as PrismaAlertPriority,
  AlertStatus as PrismaAlertStatus,
  AlertType as PrismaAlertType,
  PrismaClient,
  StockAlert as PrismaStockAlert,
  StockLevelSetting as PrismaStockLevelSetting,
} from '@prisma/client';

@Injectable()
export class PrismaAlertRepository implements IAlertRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // TYPE MAPPING FUNCTIONS
  // ============================================

  /**
   * Map interface StockAlertType to Prisma AlertType
   * Interface: LOW_STOCK, OUT_OF_STOCK, OVERSTOCK, EXPIRING_SOON, WARRANTY_EXPIRING
   * Prisma: LOW_STOCK, OUT_OF_STOCK, EXPIRING, REORDER_POINT
   */
  private mapInterfaceAlertTypeToPrisma(type: StockAlertType): PrismaAlertType {
    const mapping: Record<StockAlertType, PrismaAlertType> = {
      LOW_STOCK: PrismaAlertType.LOW_STOCK,
      OUT_OF_STOCK: PrismaAlertType.OUT_OF_STOCK,
      OVERSTOCK: PrismaAlertType.LOW_STOCK, // Fallback - no direct match
      EXPIRING_SOON: PrismaAlertType.EXPIRING,
      WARRANTY_EXPIRING: PrismaAlertType.EXPIRING,
    };
    return mapping[type];
  }

  /**
   * Map Prisma AlertType back to interface StockAlertType
   */
  private mapPrismaAlertTypeToInterface(prismaType: PrismaAlertType): StockAlertType {
    const mapping: Record<PrismaAlertType, StockAlertType> = {
      [PrismaAlertType.LOW_STOCK]: 'LOW_STOCK',
      [PrismaAlertType.OUT_OF_STOCK]: 'OUT_OF_STOCK',
      [PrismaAlertType.EXPIRING]: 'EXPIRING_SOON',
      [PrismaAlertType.REORDER_POINT]: 'LOW_STOCK', // Map to LOW_STOCK
    };
    return mapping[prismaType];
  }

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma StockLevelSetting to domain interface
   */
  private stockLevelSettingToDomain(setting: PrismaStockLevelSetting): StockLevelSetting {
    const result: StockLevelSetting = {
      id: setting.id,
      tenantId: setting.tenantId,
      productId: setting.productId,
      minimumLevel: setting.minimumLevel,
      reorderPoint: setting.reorderPoint,
      reorderQuantity: setting.reorderQuantity,
      unit: setting.unit,
      isActive: setting.isActive,
      createdAt: setting.createdAt,
    };

    if (setting.warehouseId !== null) result.warehouseId = setting.warehouseId;
    if (setting.maximumLevel !== null) result.maximumLevel = setting.maximumLevel;
    if (setting.leadTimeDays !== null) result.leadTimeDays = setting.leadTimeDays;
    if (setting.updatedAt !== null) result.updatedAt = setting.updatedAt;

    return result;
  }

  /**
   * Convert Prisma StockAlert to domain interface
   *
   * CR-4: The 'unit' field is not stored in the StockAlert Prisma model.
   * A default value is used here. For production use, consider:
   * 1. Adding a 'unit' column to the stock_alerts table
   * 2. Joining with InventoryItem or Product to get the actual unit
   * 3. Denormalizing the unit value when creating alerts
   */
  private alertToDomain(alert: PrismaStockAlert, unit?: string): StockAlert {
    const result: StockAlert = {
      id: alert.id,
      tenantId: alert.tenantId,
      productId: alert.productId,
      type: this.mapPrismaAlertTypeToInterface(alert.type),
      priority: alert.priority as AlertPriority,
      status: alert.status as AlertStatus,
      currentQuantity: alert.currentQuantity,
      minimumLevel: alert.thresholdQuantity,
      // CR-4: Use provided unit or default to 'db'
      unit: unit ?? 'db',
      message: alert.message,
      createdAt: alert.createdAt,
    };

    if (alert.warehouseId !== null) result.warehouseId = alert.warehouseId;
    if (alert.productName !== null) result.productName = alert.productName;
    if (alert.warehouseName !== null) result.warehouseName = alert.warehouseName;
    if (alert.deficit !== null) result.deficit = alert.deficit;
    if (alert.details !== null) result.details = alert.details;
    if (alert.acknowledgedAt !== null) result.acknowledgedAt = alert.acknowledgedAt;
    if (alert.acknowledgedBy !== null) result.acknowledgedBy = alert.acknowledgedBy;
    if (alert.snoozedUntil !== null) result.snoozedUntil = alert.snoozedUntil;
    if (alert.lastNotifiedAt !== null) result.lastNotifiedAt = alert.lastNotifiedAt;

    // Schema limitation: resolvedAt not stored separately
    // Using acknowledgedAt as approximation when status is RESOLVED
    if (alert.status === 'RESOLVED' && alert.acknowledgedAt !== null) {
      result.resolvedAt = alert.acknowledgedAt;
    }

    return result;
  }

  // ============================================
  // STOCK LEVEL SETTING METHODS
  // ============================================

  async createStockLevelSetting(
    setting: Omit<StockLevelSetting, 'id' | 'createdAt'>
  ): Promise<StockLevelSetting> {
    const created = await this.prisma.stockLevelSetting.create({
      data: {
        tenantId: setting.tenantId,
        productId: setting.productId,
        warehouseId: setting.warehouseId ?? null,
        minimumLevel: setting.minimumLevel,
        reorderPoint: setting.reorderPoint,
        reorderQuantity: setting.reorderQuantity,
        maximumLevel: setting.maximumLevel ?? null,
        unit: setting.unit,
        leadTimeDays: setting.leadTimeDays ?? null,
        isActive: setting.isActive,
      },
    });

    return this.stockLevelSettingToDomain(created);
  }

  async findStockLevelSettingById(id: string, tenantId: string): Promise<StockLevelSetting | null> {
    const setting = await this.prisma.stockLevelSetting.findFirst({
      where: { id, tenantId },
    });

    return setting ? this.stockLevelSettingToDomain(setting) : null;
  }

  async findStockLevelSettingByProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string
  ): Promise<StockLevelSetting | null> {
    const setting = await this.prisma.stockLevelSetting.findFirst({
      where: {
        productId,
        tenantId,
        warehouseId: warehouseId ?? null,
      },
    });

    return setting ? this.stockLevelSettingToDomain(setting) : null;
  }

  async queryStockLevelSettings(
    query: StockLevelSettingQuery
  ): Promise<{ items: StockLevelSetting[]; total: number }> {
    const where: Prisma.StockLevelSettingWhereInput = {
      tenantId: query.tenantId,
    };

    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.stockLevelSetting.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockLevelSetting.count({ where }),
    ]);

    return {
      items: items.map(s => this.stockLevelSettingToDomain(s)),
      total,
    };
  }

  async updateStockLevelSetting(
    id: string,
    tenantId: string,
    updates: Partial<Omit<StockLevelSetting, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<StockLevelSetting> {
    // Verify exists and tenant matches
    const existing = await this.prisma.stockLevelSetting.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error(`StockLevelSetting not found: ${id}`);
    }

    const data: Prisma.StockLevelSettingUpdateInput = {};

    if (updates.minimumLevel !== undefined) data.minimumLevel = updates.minimumLevel;
    if (updates.reorderPoint !== undefined) data.reorderPoint = updates.reorderPoint;
    if (updates.reorderQuantity !== undefined) data.reorderQuantity = updates.reorderQuantity;
    if (updates.maximumLevel !== undefined) data.maximumLevel = updates.maximumLevel;
    if (updates.unit !== undefined) data.unit = updates.unit;
    if (updates.leadTimeDays !== undefined) data.leadTimeDays = updates.leadTimeDays;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;

    const updated = await this.prisma.stockLevelSetting.update({
      where: { id },
      data,
    });

    return this.stockLevelSettingToDomain(updated);
  }

  async deleteStockLevelSetting(id: string, tenantId: string): Promise<void> {
    // Verify exists and tenant matches
    const existing = await this.prisma.stockLevelSetting.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error(`StockLevelSetting not found: ${id}`);
    }

    await this.prisma.stockLevelSetting.delete({
      where: { id },
    });
  }

  // ============================================
  // ALERT CRUD METHODS
  // ============================================

  /**
   * Create a new stock alert.
   *
   * CR-7: INTERFACE MISMATCH
   * The Prisma StockAlert model requires 'inventoryItemId' but the StockAlert interface
   * from @kgc/inventory does not include this field. This is a schema-interface gap.
   *
   * Callers MUST provide inventoryItemId via an extended alert object:
   * ```typescript
   * await alertRepository.createAlert({
   *   ...alertData,
   *   inventoryItemId: 'uuid-here',  // Required!
   * } as StockAlert & { inventoryItemId: string });
   * ```
   *
   * Consider adding 'inventoryItemId' to the StockAlert interface in @kgc/inventory.
   */
  async createAlert(alert: Omit<StockAlert, 'id' | 'createdAt'>): Promise<StockAlert> {
    // Validate required fields - warehouseId is required by Prisma schema
    if (!alert.warehouseId) {
      throw new Error('warehouseId is required for creating alerts');
    }

    // CR-7: inventoryItemId is required by Prisma but not in interface
    const inventoryItemId = (alert as { inventoryItemId?: string }).inventoryItemId;
    if (!inventoryItemId) {
      throw new Error('inventoryItemId is required for creating alerts');
    }

    const created = await this.prisma.stockAlert.create({
      data: {
        tenantId: alert.tenantId,
        productId: alert.productId,
        warehouseId: alert.warehouseId,
        inventoryItemId,
        type: this.mapInterfaceAlertTypeToPrisma(alert.type),
        priority: alert.priority as PrismaAlertPriority,
        status: alert.status as PrismaAlertStatus,
        currentQuantity: alert.currentQuantity,
        thresholdQuantity: alert.minimumLevel,
        message: alert.message,
        productName: alert.productName ?? null,
        warehouseName: alert.warehouseName ?? null,
        deficit: alert.deficit ?? null,
        details: alert.details ?? null,
        snoozedUntil: alert.snoozedUntil ?? null,
        lastNotifiedAt: alert.lastNotifiedAt ?? null,
      },
    });

    return this.alertToDomain(created);
  }

  async findAlertById(id: string, tenantId: string): Promise<StockAlert | null> {
    const alert = await this.prisma.stockAlert.findFirst({
      where: { id, tenantId },
    });

    return alert ? this.alertToDomain(alert) : null;
  }

  async findActiveAlertForProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string,
    type?: StockAlertType
  ): Promise<StockAlert | null> {
    const where: Prisma.StockAlertWhereInput = {
      productId,
      tenantId,
      status: 'ACTIVE',
    };

    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = this.mapInterfaceAlertTypeToPrisma(type);

    const alert = await this.prisma.stockAlert.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return alert ? this.alertToDomain(alert) : null;
  }

  async updateAlert(
    id: string,
    tenantId: string,
    updates: Partial<Omit<StockAlert, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<StockAlert> {
    // Verify exists and tenant matches
    const existing = await this.prisma.stockAlert.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error(`StockAlert not found: ${id}`);
    }

    const data: Prisma.StockAlertUpdateInput = {};

    if (updates.type !== undefined) data.type = this.mapInterfaceAlertTypeToPrisma(updates.type);
    if (updates.priority !== undefined) data.priority = updates.priority as PrismaAlertPriority;
    if (updates.status !== undefined) data.status = updates.status as PrismaAlertStatus;
    if (updates.currentQuantity !== undefined) data.currentQuantity = updates.currentQuantity;
    if (updates.minimumLevel !== undefined) data.thresholdQuantity = updates.minimumLevel;
    if (updates.message !== undefined) data.message = updates.message;
    if (updates.details !== undefined) data.details = updates.details;
    if (updates.snoozedUntil !== undefined) data.snoozedUntil = updates.snoozedUntil;
    if (updates.lastNotifiedAt !== undefined) data.lastNotifiedAt = updates.lastNotifiedAt;
    if (updates.acknowledgedAt !== undefined) {
      data.acknowledgedAt = updates.acknowledgedAt;
      data.isAcknowledged = true;
    }
    if (updates.acknowledgedBy !== undefined) data.acknowledgedBy = updates.acknowledgedBy;

    const updated = await this.prisma.stockAlert.update({
      where: { id },
      data,
    });

    return this.alertToDomain(updated);
  }

  // ============================================
  // ALERT QUERY & SUMMARY METHODS
  // ============================================

  async queryAlerts(query: AlertQuery): Promise<AlertQueryResult> {
    const where: Prisma.StockAlertWhereInput = {
      tenantId: query.tenantId,
    };

    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    // Type filter
    if (query.type) {
      if (Array.isArray(query.type)) {
        const prismaTypes = query.type.map(t => this.mapInterfaceAlertTypeToPrisma(t));
        where.type = { in: [...new Set(prismaTypes)] };
      } else {
        where.type = this.mapInterfaceAlertTypeToPrisma(query.type);
      }
    }

    // Priority filter
    if (query.priority) {
      if (Array.isArray(query.priority)) {
        where.priority = { in: query.priority as PrismaAlertPriority[] };
      } else {
        where.priority = query.priority as PrismaAlertPriority;
      }
    }

    // Status filter
    if (query.status) {
      if (Array.isArray(query.status)) {
        where.status = { in: query.status as PrismaAlertStatus[] };
      } else {
        where.status = query.status as PrismaAlertStatus;
      }
    }

    // Date range filter
    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) where.createdAt.gte = query.createdAfter;
      if (query.createdBefore) where.createdAt.lte = query.createdBefore;
    }

    // Sorting
    let orderBy: Prisma.StockAlertOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'desc';
      switch (query.sortBy) {
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'priority':
          orderBy = { priority: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [alerts, total] = await Promise.all([
      this.prisma.stockAlert.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.stockAlert.count({ where }),
    ]);

    return {
      alerts: alerts.map(a => this.alertToDomain(a)),
      total,
      offset,
      limit,
    };
  }

  async getAlertSummary(tenantId: string): Promise<AlertSummary> {
    const alerts = await this.prisma.stockAlert.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      select: {
        type: true,
        priority: true,
        warehouseId: true,
        warehouseName: true,
      },
    });

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    const byType: Record<StockAlertType, number> = {
      LOW_STOCK: 0,
      OUT_OF_STOCK: 0,
      OVERSTOCK: 0,
      EXPIRING_SOON: 0,
      WARRANTY_EXPIRING: 0,
    };

    const warehouseCounts = new Map<string, { name: string; count: number }>();

    for (const alert of alerts) {
      // Count by priority
      switch (alert.priority) {
        case 'CRITICAL':
          criticalCount++;
          break;
        case 'HIGH':
          highCount++;
          break;
        case 'MEDIUM':
          mediumCount++;
          break;
        case 'LOW':
          lowCount++;
          break;
      }

      // Count by type
      const interfaceType = this.mapPrismaAlertTypeToInterface(alert.type);
      byType[interfaceType]++;

      // Count by warehouse
      if (alert.warehouseId) {
        const existing = warehouseCounts.get(alert.warehouseId);
        if (existing) {
          existing.count++;
        } else {
          warehouseCounts.set(alert.warehouseId, {
            name: alert.warehouseName ?? alert.warehouseId,
            count: 1,
          });
        }
      }
    }

    const byWarehouse = Array.from(warehouseCounts.entries()).map(([id, data]) => ({
      warehouseId: id,
      warehouseName: data.name,
      count: data.count,
    }));

    return {
      totalActive: alerts.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      byType,
      byWarehouse,
    };
  }

  async resolveAlertsByProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string
  ): Promise<number> {
    const where: Prisma.StockAlertWhereInput = {
      productId,
      tenantId,
      status: 'ACTIVE',
    };

    if (warehouseId) where.warehouseId = warehouseId;

    const result = await this.prisma.stockAlert.updateMany({
      where,
      data: {
        status: 'RESOLVED',
      },
    });

    return result.count;
  }
}
