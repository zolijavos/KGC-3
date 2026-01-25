/**
 * Prisma Stock Count Repository
 * Epic 24: Leltár - Story 24-1
 */

import type {
  IInventoryProduct,
  IInventoryQueryRepository,
  IStockCount,
  IStockCountFilter,
  IStockCountItem,
  IStockCountItemRepository,
  IStockCountRepository,
} from '@kgc/leltar';
import { Inject } from '@nestjs/common';
import { PrismaClient, StockCountStatus, StockCountType } from '@prisma/client';

export class PrismaStockCountRepository implements IStockCountRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async create(stockCount: IStockCount): Promise<IStockCount> {
    const result = await this.prisma.stockCount.create({
      data: {
        id: stockCount.id,
        tenantId: stockCount.tenantId,
        countNumber: stockCount.countNumber,
        name: stockCount.name,
        type: stockCount.type as StockCountType,
        status: stockCount.status as StockCountStatus,
        locationId: stockCount.locationId,
        warehouseId: stockCount.warehouseId,
        scheduledStartDate: stockCount.scheduledStartDate,
        scheduledEndDate: stockCount.scheduledEndDate,
        actualStartDate: stockCount.actualStartDate ?? null,
        actualEndDate: stockCount.actualEndDate ?? null,
        stockFrozen: stockCount.stockFrozen,
        responsibleUserId: stockCount.responsibleUserId,
        categoryIds: stockCount.categoryIds ?? [],
        zoneIds: stockCount.zoneIds ?? [],
        totalItems: stockCount.totalItems,
        countedItems: stockCount.countedItems,
        varianceCount: stockCount.varianceCount,
        notes: stockCount.notes ?? null,
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<IStockCount | null> {
    const result = await this.prisma.stockCount.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async update(id: string, data: Partial<IStockCount>): Promise<IStockCount> {
    // Build update data without undefined values
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status as StockCountStatus;
    if (data.actualStartDate !== undefined) updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.stockFrozen !== undefined) updateData.stockFrozen = data.stockFrozen;
    if (data.totalItems !== undefined) updateData.totalItems = data.totalItems;
    if (data.countedItems !== undefined) updateData.countedItems = data.countedItems;
    if (data.varianceCount !== undefined) updateData.varianceCount = data.varianceCount;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.updatedAt !== undefined) updateData.updatedAt = data.updatedAt;

    const result = await this.prisma.stockCount.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async findByFilter(filter: IStockCountFilter): Promise<IStockCount[]> {
    const where: Record<string, unknown> = {};

    if (filter.tenantId) {
      where.tenantId = filter.tenantId;
    }
    if (filter.locationId) {
      where.locationId = filter.locationId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.dateFrom || filter.dateTo) {
      where.scheduledStartDate = {
        ...(filter.dateFrom && { gte: filter.dateFrom }),
        ...(filter.dateTo && { lte: filter.dateTo }),
      };
    }

    const results = await this.prisma.stockCount.findMany({
      where,
      orderBy: { scheduledStartDate: 'desc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async generateCountNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Find last count number for this tenant this month
    const lastCount = await this.prisma.stockCount.findFirst({
      where: {
        tenantId,
        countNumber: {
          startsWith: `LT-${year}${month}`,
        },
      },
      orderBy: { countNumber: 'desc' },
    });

    let sequence = 1;
    if (lastCount) {
      const lastSeq = lastCount.countNumber.split('-')[2];
      if (lastSeq) {
        sequence = parseInt(lastSeq, 10) + 1;
      }
    }

    return `LT-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private mapToDomain(prismaRecord: {
    id: string;
    tenantId: string;
    countNumber: string;
    name: string;
    type: StockCountType;
    status: StockCountStatus;
    locationId: string;
    warehouseId: string;
    scheduledStartDate: Date;
    scheduledEndDate: Date;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    stockFrozen: boolean;
    responsibleUserId: string;
    categoryIds: unknown;
    zoneIds: unknown;
    totalItems: number;
    countedItems: number;
    varianceCount: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): IStockCount {
    return {
      id: prismaRecord.id,
      tenantId: prismaRecord.tenantId,
      countNumber: prismaRecord.countNumber,
      name: prismaRecord.name,
      type: prismaRecord.type as IStockCount['type'],
      status: prismaRecord.status as IStockCount['status'],
      locationId: prismaRecord.locationId,
      warehouseId: prismaRecord.warehouseId,
      scheduledStartDate: prismaRecord.scheduledStartDate,
      scheduledEndDate: prismaRecord.scheduledEndDate,
      actualStartDate: prismaRecord.actualStartDate ?? undefined,
      actualEndDate: prismaRecord.actualEndDate ?? undefined,
      stockFrozen: prismaRecord.stockFrozen,
      responsibleUserId: prismaRecord.responsibleUserId,
      categoryIds: (prismaRecord.categoryIds as string[]) ?? undefined,
      zoneIds: (prismaRecord.zoneIds as string[]) ?? undefined,
      totalItems: prismaRecord.totalItems,
      countedItems: prismaRecord.countedItems,
      varianceCount: prismaRecord.varianceCount,
      notes: prismaRecord.notes ?? undefined,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    };
  }
}

export class PrismaStockCountItemRepository implements IStockCountItemRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async createBatch(items: IStockCountItem[]): Promise<IStockCountItem[]> {
    const data = items.map(item => ({
      id: item.id,
      stockCountId: item.stockCountId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      barcode: item.barcode ?? null,
      locationCode: item.locationCode,
      bookQuantity: item.bookQuantity,
      recountRequired: item.recountRequired,
    }));

    await this.prisma.stockCountItem.createMany({ data });

    // Return the created items
    const created = await this.prisma.stockCountItem.findMany({
      where: {
        id: { in: items.map(i => i.id) },
      },
    });

    return created.map(r => this.mapToDomain(r));
  }

  async findById(id: string): Promise<IStockCountItem | null> {
    const result = await this.prisma.stockCountItem.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByStockCountId(stockCountId: string): Promise<IStockCountItem[]> {
    const results = await this.prisma.stockCountItem.findMany({
      where: { stockCountId },
      orderBy: { locationCode: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async findByBarcode(stockCountId: string, barcode: string): Promise<IStockCountItem | null> {
    const result = await this.prisma.stockCountItem.findFirst({
      where: {
        stockCountId,
        barcode,
      },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByProductId(stockCountId: string, productId: string): Promise<IStockCountItem | null> {
    const result = await this.prisma.stockCountItem.findFirst({
      where: {
        stockCountId,
        productId,
      },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByFilter(
    stockCountId: string,
    filter: { uncountedOnly?: boolean; zone?: string; recountOnly?: boolean }
  ): Promise<IStockCountItem[]> {
    const where: Record<string, unknown> = { stockCountId };

    if (filter.uncountedOnly) {
      where.countedQuantity = null;
    }
    if (filter.zone) {
      where.locationCode = { startsWith: filter.zone };
    }
    if (filter.recountOnly) {
      where.recountRequired = true;
    }

    const results = await this.prisma.stockCountItem.findMany({
      where,
      orderBy: { locationCode: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IStockCountItem>): Promise<IStockCountItem> {
    // Build update data without undefined values
    const updateData: Record<string, unknown> = {};
    if (data.countedQuantity !== undefined) updateData.countedQuantity = data.countedQuantity;
    if (data.variance !== undefined) updateData.variance = data.variance;
    if (data.varianceValue !== undefined) updateData.varianceValue = data.varianceValue;
    if (data.countedByUserId !== undefined) updateData.countedByUserId = data.countedByUserId;
    if (data.countedAt !== undefined) updateData.countedAt = data.countedAt;
    if (data.recountRequired !== undefined) updateData.recountRequired = data.recountRequired;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await this.prisma.stockCountItem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  private mapToDomain(prismaRecord: {
    id: string;
    stockCountId: string;
    productId: string;
    productName: string;
    sku: string;
    barcode: string | null;
    locationCode: string;
    bookQuantity: unknown;
    countedQuantity: unknown;
    variance: unknown;
    varianceValue: unknown;
    countedByUserId: string | null;
    countedAt: Date | null;
    recountRequired: boolean;
    notes: string | null;
  }): IStockCountItem {
    return {
      id: prismaRecord.id,
      stockCountId: prismaRecord.stockCountId,
      productId: prismaRecord.productId,
      productName: prismaRecord.productName,
      sku: prismaRecord.sku,
      barcode: prismaRecord.barcode ?? undefined,
      locationCode: prismaRecord.locationCode,
      bookQuantity: Number(prismaRecord.bookQuantity),
      countedQuantity: prismaRecord.countedQuantity
        ? Number(prismaRecord.countedQuantity)
        : undefined,
      variance: prismaRecord.variance ? Number(prismaRecord.variance) : undefined,
      varianceValue: prismaRecord.varianceValue ? Number(prismaRecord.varianceValue) : undefined,
      countedByUserId: prismaRecord.countedByUserId ?? undefined,
      countedAt: prismaRecord.countedAt ?? undefined,
      recountRequired: prismaRecord.recountRequired,
      notes: prismaRecord.notes ?? undefined,
    };
  }
}

export class PrismaInventoryQueryRepository implements IInventoryQueryRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async getProductsForCount(
    _warehouseId: string,
    _categoryIds?: string[],
    _zoneIds?: string[]
  ): Promise<IInventoryProduct[]> {
    // TODO: Implement actual inventory query from StockLevel model
    // For now, return empty array - will be implemented when StockLevel model exists
    // In real implementation, this would query the inventory/stock levels
    // and join with products table

    // Reference prisma to suppress unused warning until implementation
    void this.prisma;

    // Placeholder - in real implementation would be:
    // const stockLevels = await this.prisma.stockLevel.findMany({
    //   where: {
    //     warehouseId: _warehouseId,
    //     ...(categoryIds && { product: { categoryId: { in: categoryIds } } }),
    //   },
    //   include: { product: true },
    // });

    return [];
  }
}
