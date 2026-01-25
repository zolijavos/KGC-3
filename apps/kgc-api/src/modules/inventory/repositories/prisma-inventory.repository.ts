/**
 * Prisma Inventory Repository
 * Implements IInventoryRepository for PostgreSQL persistence
 * Story 9-1: Készlet nyilvántartás alap
 */

import {
  IInventoryRepository,
  InventoryItem,
  InventoryItemType,
  InventoryQuery,
  InventoryQueryResult,
  InventoryStatus,
  StockSummary,
} from '@kgc/inventory';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, InventoryItem as PrismaInventoryItem } from '@prisma/client';

/**
 * Stock level threshold multiplier for LOW status.
 * If available quantity is below minStockLevel * this multiplier (but above minStockLevel),
 * the stock level status is 'LOW'.
 * CR-8: Extracted from magic number 1.5
 */
const LOW_STOCK_THRESHOLD_MULTIPLIER = 1.5;

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Convert Prisma model to domain interface
   */
  private toDomain(item: PrismaInventoryItem): InventoryItem {
    const result: InventoryItem = {
      id: item.id,
      tenantId: item.tenantId,
      warehouseId: item.warehouseId,
      productId: item.productId,
      type: item.type as InventoryItemType,
      status: item.status as InventoryStatus,
      quantity: item.quantity,
      unit: item.unit,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
      isDeleted: item.isDeleted,
    };
    if (item.serialNumber !== null) result.serialNumber = item.serialNumber;
    if (item.batchNumber !== null) result.batchNumber = item.batchNumber;
    if (item.locationCode !== null) result.locationCode = item.locationCode;
    if (item.minStockLevel !== null) result.minStockLevel = item.minStockLevel;
    if (item.maxStockLevel !== null) result.maxStockLevel = item.maxStockLevel;
    if (item.purchasePrice !== null) result.purchasePrice = Number(item.purchasePrice);
    if (item.lastPurchaseDate !== null) result.lastPurchaseDate = item.lastPurchaseDate;
    if (item.deletedAt !== null) result.deletedAt = item.deletedAt;
    return result;
  }

  async create(
    item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InventoryItem> {
    const created = await this.prisma.inventoryItem.create({
      data: {
        tenantId: item.tenantId,
        warehouseId: item.warehouseId,
        productId: item.productId,
        type: item.type,
        status: item.status,
        serialNumber: item.serialNumber ?? null,
        batchNumber: item.batchNumber ?? null,
        locationCode: item.locationCode ?? null,
        quantity: item.quantity,
        unit: item.unit,
        minStockLevel: item.minStockLevel ?? null,
        maxStockLevel: item.maxStockLevel ?? null,
        purchasePrice: item.purchasePrice ?? null,
        lastPurchaseDate: item.lastPurchaseDate ?? null,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
        isDeleted: item.isDeleted,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<InventoryItem | null> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    return item ? this.toDomain(item) : null;
  }

  async findBySerialNumber(serialNumber: string, tenantId: string): Promise<InventoryItem | null> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { serialNumber, tenantId, isDeleted: false },
    });
    return item ? this.toDomain(item) : null;
  }

  async query(query: InventoryQuery): Promise<InventoryQueryResult> {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId: query.tenantId,
      isDeleted: false,
    };

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;
    if (query.serialNumber) where.serialNumber = query.serialNumber;
    if (query.batchNumber) where.batchNumber = query.batchNumber;
    if (query.locationCode) {
      where.locationCode = { startsWith: query.locationCode };
    }

    if (query.status) {
      if (Array.isArray(query.status)) {
        where.status = { in: query.status };
      } else {
        where.status = query.status;
      }
    }

    // Note: belowMinStock filter requires special handling - see findBelowMinStock method
    // Prisma doesn't support comparing two columns directly in where clause
    // If belowMinStock is true, we'll filter in memory after fetching items with minStockLevel set
    const filterBelowMinStock = query.belowMinStock === true;
    if (filterBelowMinStock) {
      where.minStockLevel = { not: null };
    }

    if (query.search) {
      where.OR = [
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { batchNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.InventoryItemOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'asc';
      switch (query.sortBy) {
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'quantity':
          orderBy = { quantity: sortOrder };
          break;
        case 'locationCode':
          orderBy = { locationCode: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = Math.min(query.limit ?? 50, 500); // CR-9: Max limit validation

    // For belowMinStock filter, we need to use raw SQL since Prisma doesn't support column comparison
    if (filterBelowMinStock) {
      // Use raw query for column comparison (quantity < min_stock_level)
      const rawItems = await this.prisma.$queryRaw<PrismaInventoryItem[]>`
        SELECT * FROM inventory_items
        WHERE tenant_id = ${query.tenantId}::uuid
          AND is_deleted = false
          AND min_stock_level IS NOT NULL
          AND quantity < min_stock_level
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const rawCount = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM inventory_items
        WHERE tenant_id = ${query.tenantId}::uuid
          AND is_deleted = false
          AND min_stock_level IS NOT NULL
          AND quantity < min_stock_level
      `;

      return {
        items: rawItems.map(item => this.toDomain(item)),
        total: Number(rawCount[0]?.count ?? 0),
        offset,
        limit,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items: items.map(item => this.toDomain(item)),
      total,
      offset,
      limit,
    };
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Omit<InventoryItem, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>
  ): Promise<InventoryItem> {
    // Verify item exists and belongs to tenant (tenant isolation)
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Inventory item not found: ${id}`);
    }

    const updateData: Prisma.InventoryItemUncheckedUpdateInput = {};
    if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.locationCode !== undefined) updateData.locationCode = data.locationCode ?? null;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.minStockLevel !== undefined) updateData.minStockLevel = data.minStockLevel ?? null;
    if (data.maxStockLevel !== undefined) updateData.maxStockLevel = data.maxStockLevel ?? null;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice ?? null;
    if (data.lastPurchaseDate !== undefined)
      updateData.lastPurchaseDate = data.lastPurchaseDate ?? null;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });
    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    // Verify item exists and belongs to tenant (tenant isolation)
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Inventory item not found: ${id}`);
    }

    await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    // Verify item exists and belongs to tenant (tenant isolation)
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error(`Inventory item not found: ${id}`);
    }

    await this.prisma.inventoryItem.delete({
      where: { id },
    });
  }

  async getStockSummary(
    tenantId: string,
    productId: string,
    warehouseId?: string
  ): Promise<StockSummary | null> {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      productId,
      isDeleted: false,
    };
    if (warehouseId) where.warehouseId = warehouseId;

    // CR-6: Include product to get productName
    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: { product: { select: { name: true } } },
    });

    if (items.length === 0) return null;

    const firstItem = items[0];
    if (!firstItem) return null;

    let totalQuantity = 0;
    let availableQuantity = 0;
    let reservedQuantity = 0;
    let inTransitQuantity = 0;
    let inServiceQuantity = 0;
    let rentedQuantity = 0;
    let minStockLevel: number | undefined;

    for (const item of items) {
      totalQuantity += item.quantity;
      if (
        item.minStockLevel !== null &&
        (minStockLevel === undefined || item.minStockLevel < minStockLevel)
      ) {
        minStockLevel = item.minStockLevel;
      }

      switch (item.status) {
        case 'AVAILABLE':
          availableQuantity += item.quantity;
          break;
        case 'RESERVED':
          reservedQuantity += item.quantity;
          break;
        case 'IN_TRANSIT':
          inTransitQuantity += item.quantity;
          break;
        case 'IN_SERVICE':
          inServiceQuantity += item.quantity;
          break;
        case 'RENTED':
          rentedQuantity += item.quantity;
          break;
      }
    }

    const stockLevelStatus = this.calculateStockLevelStatus(availableQuantity, minStockLevel);

    const summary: StockSummary = {
      tenantId,
      productId,
      productName: firstItem.product.name,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      inTransitQuantity,
      inServiceQuantity,
      rentedQuantity,
      unit: firstItem.unit,
      stockLevelStatus,
      lastUpdated: new Date(),
    };
    if (warehouseId) summary.warehouseId = warehouseId;
    if (minStockLevel !== undefined) summary.minStockLevel = minStockLevel;
    return summary;
  }

  async getStockSummaries(
    tenantId: string,
    warehouseId?: string,
    productIds?: string[]
  ): Promise<StockSummary[]> {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      isDeleted: false,
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (productIds && productIds.length > 0) {
      where.productId = { in: productIds };
    }

    // CR-6: Include product to get productName
    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: { product: { select: { name: true } } },
    });

    // Group by productId - track product name from first item
    type ItemWithProduct = PrismaInventoryItem & { product: { name: string } };
    const productMap = new Map<string, { productName: string; items: ItemWithProduct[] }>();
    for (const item of items) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.items.push(item);
      } else {
        productMap.set(item.productId, { productName: item.product.name, items: [item] });
      }
    }

    const summaries: StockSummary[] = [];
    for (const [productId, productData] of productMap.entries()) {
      const productItems = productData.items;
      const firstItem = productItems[0];
      if (!firstItem) continue;

      let totalQuantity = 0;
      let availableQuantity = 0;
      let reservedQuantity = 0;
      let inTransitQuantity = 0;
      let inServiceQuantity = 0;
      let rentedQuantity = 0;
      let minStockLevel: number | undefined;

      for (const item of productItems) {
        totalQuantity += item.quantity;
        if (
          item.minStockLevel !== null &&
          (minStockLevel === undefined || item.minStockLevel < minStockLevel)
        ) {
          minStockLevel = item.minStockLevel;
        }

        switch (item.status) {
          case 'AVAILABLE':
            availableQuantity += item.quantity;
            break;
          case 'RESERVED':
            reservedQuantity += item.quantity;
            break;
          case 'IN_TRANSIT':
            inTransitQuantity += item.quantity;
            break;
          case 'IN_SERVICE':
            inServiceQuantity += item.quantity;
            break;
          case 'RENTED':
            rentedQuantity += item.quantity;
            break;
        }
      }

      const stockLevelStatus = this.calculateStockLevelStatus(availableQuantity, minStockLevel);

      const summary: StockSummary = {
        tenantId,
        productId,
        productName: productData.productName,
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        inTransitQuantity,
        inServiceQuantity,
        rentedQuantity,
        unit: firstItem.unit,
        stockLevelStatus,
        lastUpdated: new Date(),
      };
      if (warehouseId) summary.warehouseId = warehouseId;
      if (minStockLevel !== undefined) summary.minStockLevel = minStockLevel;
      summaries.push(summary);
    }

    return summaries;
  }

  async findBelowMinStock(tenantId: string, warehouseId?: string): Promise<StockSummary[]> {
    const summaries = await this.getStockSummaries(tenantId, warehouseId);
    return summaries.filter(
      s =>
        s.stockLevelStatus === 'LOW' ||
        s.stockLevelStatus === 'CRITICAL' ||
        s.stockLevelStatus === 'OUT_OF_STOCK'
    );
  }

  async adjustQuantity(
    id: string,
    tenantId: string,
    adjustment: number,
    updatedBy: string
  ): Promise<InventoryItem> {
    // Verify item exists and belongs to tenant (tenant isolation)
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Inventory item not found: ${id}`);
    }

    // Validate that adjustment won't result in negative quantity
    if (existing.quantity + adjustment < 0) {
      throw new Error(
        `Insufficient quantity: current ${existing.quantity}, adjustment ${adjustment}`
      );
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: { increment: adjustment },
        updatedBy,
      },
    });
    return this.toDomain(updated);
  }

  async bulkAdjustQuantity(
    adjustments: Array<{ id: string; tenantId: string; adjustment: number }>,
    updatedBy: string
  ): Promise<void> {
    await this.prisma.$transaction(
      adjustments.map(adj =>
        this.prisma.inventoryItem.update({
          where: { id: adj.id },
          data: {
            quantity: { increment: adj.adjustment },
            updatedBy,
          },
        })
      )
    );
  }

  private calculateStockLevelStatus(
    availableQuantity: number,
    minStockLevel?: number
  ): 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' {
    if (minStockLevel === undefined || minStockLevel === null) {
      return 'OK';
    }
    if (availableQuantity === 0) {
      return 'OUT_OF_STOCK';
    }
    if (availableQuantity < minStockLevel) {
      return 'CRITICAL';
    }
    if (availableQuantity < minStockLevel * LOW_STOCK_THRESHOLD_MULTIPLIER) {
      return 'LOW';
    }
    return 'OK';
  }
}
