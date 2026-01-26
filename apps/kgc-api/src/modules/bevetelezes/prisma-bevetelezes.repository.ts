/**
 * @kgc/bevetelezes - Prisma Repositories
 * Epic 21: Goods Receipt Management
 *
 * Implements repository interfaces for Avizo, Receipt, and Discrepancy entities.
 */

import {
  AvizoStatus as DomainAvizoStatus,
  DiscrepancyType as DomainDiscrepancyType,
  ReceiptStatus as DomainReceiptStatus,
  IAvizo,
  IAvizoItem,
  IAvizoItemRepository,
  IAvizoRepository,
  IDiscrepancy,
  IDiscrepancyRepository,
  IReceipt,
  IReceiptItem,
  IReceiptItemRepository,
  IReceiptRepository,
} from '@kgc/bevetelezes';
import { Injectable } from '@nestjs/common';
import {
  AvizoStatus,
  DiscrepancyTypeEnum,
  Prisma,
  PrismaClient,
  ReceiptStatus,
} from '@prisma/client';

// ============================================
// Validation helpers
// ============================================

function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[],
  entityName: string
): void {
  const missingFields = fields.filter(
    field =>
      (data as Record<string, unknown>)[field] === undefined ||
      (data as Record<string, unknown>)[field] === null
  );
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields for ${entityName}: ${missingFields.join(', ')}`);
  }
}

// ============================================
// Mapping helpers
// ============================================

function mapAvizoStatusToDomain(status: AvizoStatus): DomainAvizoStatus {
  const mapping: Record<AvizoStatus, DomainAvizoStatus> = {
    [AvizoStatus.PENDING]: DomainAvizoStatus.PENDING,
    [AvizoStatus.PARTIAL]: DomainAvizoStatus.PARTIAL,
    [AvizoStatus.RECEIVED]: DomainAvizoStatus.RECEIVED,
    [AvizoStatus.CANCELLED]: DomainAvizoStatus.CANCELLED,
  };
  return mapping[status];
}

function mapAvizoStatusToPrisma(status: DomainAvizoStatus): AvizoStatus {
  const mapping: Record<DomainAvizoStatus, AvizoStatus> = {
    [DomainAvizoStatus.PENDING]: AvizoStatus.PENDING,
    [DomainAvizoStatus.PARTIAL]: AvizoStatus.PARTIAL,
    [DomainAvizoStatus.RECEIVED]: AvizoStatus.RECEIVED,
    [DomainAvizoStatus.CANCELLED]: AvizoStatus.CANCELLED,
  };
  return mapping[status];
}

function mapReceiptStatusToDomain(status: ReceiptStatus): DomainReceiptStatus {
  const mapping: Record<ReceiptStatus, DomainReceiptStatus> = {
    [ReceiptStatus.DRAFT]: DomainReceiptStatus.DRAFT,
    [ReceiptStatus.IN_PROGRESS]: DomainReceiptStatus.IN_PROGRESS,
    [ReceiptStatus.COMPLETED]: DomainReceiptStatus.COMPLETED,
    [ReceiptStatus.DISCREPANCY]: DomainReceiptStatus.DISCREPANCY,
  };
  return mapping[status];
}

function mapReceiptStatusToPrisma(status: DomainReceiptStatus): ReceiptStatus {
  const mapping: Record<DomainReceiptStatus, ReceiptStatus> = {
    [DomainReceiptStatus.DRAFT]: ReceiptStatus.DRAFT,
    [DomainReceiptStatus.IN_PROGRESS]: ReceiptStatus.IN_PROGRESS,
    [DomainReceiptStatus.COMPLETED]: ReceiptStatus.COMPLETED,
    [DomainReceiptStatus.DISCREPANCY]: ReceiptStatus.DISCREPANCY,
  };
  return mapping[status];
}

function mapDiscrepancyTypeToDomain(type: DiscrepancyTypeEnum): DomainDiscrepancyType {
  const mapping: Record<DiscrepancyTypeEnum, DomainDiscrepancyType> = {
    [DiscrepancyTypeEnum.SHORTAGE]: DomainDiscrepancyType.SHORTAGE,
    [DiscrepancyTypeEnum.SURPLUS]: DomainDiscrepancyType.SURPLUS,
    [DiscrepancyTypeEnum.DAMAGED]: DomainDiscrepancyType.DAMAGED,
    [DiscrepancyTypeEnum.WRONG_ITEM]: DomainDiscrepancyType.WRONG_ITEM,
  };
  return mapping[type];
}

function mapDiscrepancyTypeToPrisma(type: DomainDiscrepancyType): DiscrepancyTypeEnum {
  const mapping: Record<DomainDiscrepancyType, DiscrepancyTypeEnum> = {
    [DomainDiscrepancyType.SHORTAGE]: DiscrepancyTypeEnum.SHORTAGE,
    [DomainDiscrepancyType.SURPLUS]: DiscrepancyTypeEnum.SURPLUS,
    [DomainDiscrepancyType.DAMAGED]: DiscrepancyTypeEnum.DAMAGED,
    [DomainDiscrepancyType.WRONG_ITEM]: DiscrepancyTypeEnum.WRONG_ITEM,
  };
  return mapping[type];
}

// ============================================
// Avizo Repository
// ============================================

@Injectable()
export class PrismaAvizoRepository implements IAvizoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Partial<IAvizo>): Promise<IAvizo> {
    // M2 FIX: Validate required fields explicitly
    validateRequiredFields(
      data,
      ['tenantId', 'avizoNumber', 'supplierId', 'supplierName', 'expectedDate', 'createdBy'],
      'Avizo'
    );

    // After validation, these fields are guaranteed to exist
    const result = await this.prisma.avizo.create({
      data: {
        tenantId: data.tenantId!,
        avizoNumber: data.avizoNumber!,
        supplierId: data.supplierId!,
        supplierName: data.supplierName!,
        expectedDate: data.expectedDate!,
        status: data.status ? mapAvizoStatusToPrisma(data.status) : AvizoStatus.PENDING,
        totalItems: data.totalItems ?? 0,
        totalQuantity: data.totalQuantity ?? 0,
        ...(data.pdfUrl !== undefined && { pdfUrl: data.pdfUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
        createdBy: data.createdBy!,
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<IAvizo | null> {
    const result = await this.prisma.avizo.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findBySupplier(tenantId: string, supplierId: string): Promise<IAvizo[]> {
    const results = await this.prisma.avizo.findMany({
      where: { tenantId, supplierId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async findPending(tenantId: string): Promise<IAvizo[]> {
    const results = await this.prisma.avizo.findMany({
      where: {
        tenantId,
        status: AvizoStatus.PENDING,
      },
      orderBy: { expectedDate: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IAvizo>): Promise<IAvizo> {
    const updateData: Prisma.AvizoUpdateInput = {};

    if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate;
    if (data.status !== undefined) updateData.status = mapAvizoStatusToPrisma(data.status);
    if (data.totalItems !== undefined) updateData.totalItems = data.totalItems;
    if (data.totalQuantity !== undefined) updateData.totalQuantity = data.totalQuantity;
    if (data.pdfUrl !== undefined) updateData.pdfUrl = data.pdfUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await this.prisma.avizo.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async getNextSequence(tenantId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    // Use MAX to get highest sequence, handles concurrent inserts better than COUNT
    const result = await this.prisma.avizo.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      _max: {
        avizoNumber: true,
      },
    });

    // Extract sequence from avizoNumber format: AV-YYYY-NNNN
    const maxAvizoNumber = result._max.avizoNumber;
    if (!maxAvizoNumber) {
      return 1;
    }

    const match = maxAvizoNumber.match(/AV-\d{4}-(\d+)$/);
    if (!match?.[1]) {
      return 1;
    }

    return parseInt(match[1], 10) + 1;
  }

  private mapToDomain(data: Prisma.AvizoGetPayload<object>): IAvizo {
    return {
      id: data.id,
      tenantId: data.tenantId,
      avizoNumber: data.avizoNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      expectedDate: data.expectedDate,
      status: mapAvizoStatusToDomain(data.status),
      totalItems: data.totalItems,
      totalQuantity: data.totalQuantity,
      ...(data.pdfUrl != null && { pdfUrl: data.pdfUrl }),
      ...(data.notes != null && { notes: data.notes }),
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

// ============================================
// Avizo Item Repository
// ============================================

@Injectable()
export class PrismaAvizoItemRepository implements IAvizoItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(items: Partial<IAvizoItem>[]): Promise<IAvizoItem[]> {
    if (items.length === 0) {
      return [];
    }

    const avizoId = items[0]?.avizoId;
    if (!avizoId) {
      throw new Error('avizoId is required for creating avizo items');
    }

    const data = items.map(item => ({
      avizoId: item.avizoId!,
      tenantId: item.tenantId!,
      productId: item.productId!,
      productCode: item.productCode!,
      productName: item.productName!,
      expectedQuantity: item.expectedQuantity!,
      receivedQuantity: item.receivedQuantity ?? 0,
      unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
    }));

    await this.prisma.avizoItem.createMany({ data });

    // Return created items
    const createdItems = await this.prisma.avizoItem.findMany({
      where: { avizoId },
      orderBy: { createdAt: 'asc' },
    });

    return createdItems.map(item => this.mapToDomain(item));
  }

  async findByAvizoId(avizoId: string): Promise<IAvizoItem[]> {
    const results = await this.prisma.avizoItem.findMany({
      where: { avizoId },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IAvizoItem>): Promise<IAvizoItem> {
    const updateData: Prisma.AvizoItemUpdateInput = {};

    if (data.receivedQuantity !== undefined) updateData.receivedQuantity = data.receivedQuantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = new Prisma.Decimal(data.unitPrice);

    const result = await this.prisma.avizoItem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  private mapToDomain(data: Prisma.AvizoItemGetPayload<object>): IAvizoItem {
    return {
      id: data.id,
      avizoId: data.avizoId,
      tenantId: data.tenantId,
      productId: data.productId,
      productCode: data.productCode,
      productName: data.productName,
      expectedQuantity: data.expectedQuantity,
      receivedQuantity: data.receivedQuantity,
      unitPrice: Number(data.unitPrice),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

// ============================================
// Receipt Repository
// ============================================

@Injectable()
export class PrismaReceiptRepository implements IReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Partial<IReceipt> & { warehouseId?: string }): Promise<IReceipt> {
    // M2 FIX: Validate required fields explicitly
    validateRequiredFields(
      data,
      ['tenantId', 'receiptNumber', 'supplierId', 'supplierName', 'receivedDate', 'processedBy'],
      'GoodsReceipt'
    );

    // Warehouse ID is required - use provided value or fall back to default warehouse
    // After validation, tenantId is guaranteed to exist
    const warehouseId = data.warehouseId ?? (await this.getDefaultWarehouseId(data.tenantId!));

    const result = await this.prisma.goodsReceipt.create({
      data: {
        tenantId: data.tenantId!,
        receiptNumber: data.receiptNumber!,
        ...(data.avizoId !== undefined && { avizoId: data.avizoId }),
        supplierId: data.supplierId!,
        supplierName: data.supplierName!,
        receivedDate: data.receivedDate!,
        status: data.status ? mapReceiptStatusToPrisma(data.status) : ReceiptStatus.DRAFT,
        totalItems: data.totalItems ?? 0,
        totalQuantity: data.totalQuantity ?? 0,
        hasDiscrepancy: data.hasDiscrepancy ?? false,
        processedBy: data.processedBy!,
        warehouseId,
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<IReceipt | null> {
    const result = await this.prisma.goodsReceipt.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByAvizoId(avizoId: string): Promise<IReceipt | null> {
    const result = await this.prisma.goodsReceipt.findFirst({
      where: { avizoId },
      orderBy: { createdAt: 'desc' },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async update(id: string, data: Partial<IReceipt>): Promise<IReceipt> {
    const updateData: Prisma.GoodsReceiptUpdateInput = {};

    if (data.status !== undefined) updateData.status = mapReceiptStatusToPrisma(data.status);
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    if (data.hasDiscrepancy !== undefined) updateData.hasDiscrepancy = data.hasDiscrepancy;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await this.prisma.goodsReceipt.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async getNextSequence(tenantId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    // Use MAX to get highest sequence, handles concurrent inserts better than COUNT
    const result = await this.prisma.goodsReceipt.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      _max: {
        receiptNumber: true,
      },
    });

    // Extract sequence from receiptNumber format: BEV-YYYY-NNNN
    const maxReceiptNumber = result._max.receiptNumber;
    if (!maxReceiptNumber) {
      return 1;
    }

    const match = maxReceiptNumber.match(/BEV-\d{4}-(\d+)$/);
    if (!match?.[1]) {
      return 1;
    }

    return parseInt(match[1], 10) + 1;
  }

  /**
   * Get default warehouse ID for a tenant.
   * @throws Error if no warehouse is configured for the tenant
   */
  private async getDefaultWarehouseId(tenantId: string): Promise<string> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    if (!warehouse) {
      throw new Error(
        `No warehouse configured for tenant ${tenantId}. Please create a default warehouse before processing receipts.`
      );
    }

    return warehouse.id;
  }

  private mapToDomain(data: Prisma.GoodsReceiptGetPayload<object>): IReceipt {
    return {
      id: data.id,
      tenantId: data.tenantId,
      receiptNumber: data.receiptNumber,
      ...(data.avizoId != null && { avizoId: data.avizoId }),
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      receivedDate: data.receivedDate,
      status: mapReceiptStatusToDomain(data.status),
      totalItems: data.totalItems,
      totalQuantity: data.totalQuantity,
      hasDiscrepancy: data.hasDiscrepancy,
      processedBy: data.processedBy,
      ...(data.completedAt != null && { completedAt: data.completedAt }),
      ...(data.notes != null && { notes: data.notes }),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

// ============================================
// Receipt Item Repository
// ============================================

@Injectable()
export class PrismaReceiptItemRepository implements IReceiptItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(items: Partial<IReceiptItem>[]): Promise<IReceiptItem[]> {
    if (items.length === 0) {
      return [];
    }

    const receiptId = items[0]?.receiptId;
    if (!receiptId) {
      throw new Error('receiptId is required for creating receipt items');
    }

    const data = items.map(item => ({
      receiptId: item.receiptId!,
      tenantId: item.tenantId!,
      ...(item.avizoItemId !== undefined && { avizoItemId: item.avizoItemId }),
      productId: item.productId!,
      productCode: item.productCode!,
      productName: item.productName!,
      expectedQuantity: item.expectedQuantity!,
      receivedQuantity: item.receivedQuantity!,
      unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
      ...(item.locationCode !== undefined && { locationCode: item.locationCode }),
    }));

    await this.prisma.goodsReceiptItem.createMany({ data });

    // Return created items
    const createdItems = await this.prisma.goodsReceiptItem.findMany({
      where: { receiptId },
      orderBy: { createdAt: 'asc' },
    });

    return createdItems.map(item => this.mapToDomain(item));
  }

  async findByReceiptId(receiptId: string): Promise<IReceiptItem[]> {
    const results = await this.prisma.goodsReceiptItem.findMany({
      where: { receiptId },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IReceiptItem>): Promise<IReceiptItem> {
    const updateData: Prisma.GoodsReceiptItemUpdateInput = {};

    if (data.receivedQuantity !== undefined) updateData.receivedQuantity = data.receivedQuantity;
    if (data.locationCode !== undefined) updateData.locationCode = data.locationCode;

    const result = await this.prisma.goodsReceiptItem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  private mapToDomain(data: Prisma.GoodsReceiptItemGetPayload<object>): IReceiptItem {
    return {
      id: data.id,
      receiptId: data.receiptId,
      tenantId: data.tenantId,
      ...(data.avizoItemId != null && { avizoItemId: data.avizoItemId }),
      productId: data.productId,
      productCode: data.productCode,
      productName: data.productName,
      expectedQuantity: data.expectedQuantity,
      receivedQuantity: data.receivedQuantity,
      unitPrice: Number(data.unitPrice),
      ...(data.locationCode != null && { locationCode: data.locationCode }),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

// ============================================
// Discrepancy Repository
// ============================================

@Injectable()
export class PrismaDiscrepancyRepository implements IDiscrepancyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Partial<IDiscrepancy>): Promise<IDiscrepancy> {
    // M2 FIX: Validate required fields explicitly
    validateRequiredFields(
      data,
      [
        'receiptId',
        'receiptItemId',
        'tenantId',
        'type',
        'expectedQuantity',
        'actualQuantity',
        'difference',
        'createdBy',
      ],
      'ReceiptDiscrepancy'
    );

    const result = await this.prisma.receiptDiscrepancy.create({
      data: {
        receiptId: data.receiptId!,
        receiptItemId: data.receiptItemId!,
        tenantId: data.tenantId!,
        type: mapDiscrepancyTypeToPrisma(data.type!),
        expectedQuantity: data.expectedQuantity!,
        actualQuantity: data.actualQuantity!,
        difference: data.difference!,
        ...(data.reason !== undefined && { reason: data.reason }),
        supplierNotified: data.supplierNotified ?? false,
        createdBy: data.createdBy!,
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<IDiscrepancy | null> {
    const result = await this.prisma.receiptDiscrepancy.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByReceiptId(receiptId: string): Promise<IDiscrepancy[]> {
    const results = await this.prisma.receiptDiscrepancy.findMany({
      where: { receiptId },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async findUnresolvedByReceiptId(receiptId: string): Promise<IDiscrepancy[]> {
    const results = await this.prisma.receiptDiscrepancy.findMany({
      where: {
        receiptId,
        resolvedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IDiscrepancy>): Promise<IDiscrepancy> {
    const updateData: Prisma.ReceiptDiscrepancyUpdateInput = {};

    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.supplierNotified !== undefined) updateData.supplierNotified = data.supplierNotified;
    if (data.resolvedAt !== undefined) updateData.resolvedAt = data.resolvedAt;
    if (data.resolvedBy !== undefined) updateData.resolvedBy = data.resolvedBy;
    if (data.resolutionNote !== undefined) updateData.resolutionNote = data.resolutionNote;

    const result = await this.prisma.receiptDiscrepancy.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  private mapToDomain(data: Prisma.ReceiptDiscrepancyGetPayload<object>): IDiscrepancy {
    return {
      id: data.id,
      receiptId: data.receiptId,
      receiptItemId: data.receiptItemId,
      tenantId: data.tenantId,
      type: mapDiscrepancyTypeToDomain(data.type),
      expectedQuantity: data.expectedQuantity,
      actualQuantity: data.actualQuantity,
      difference: data.difference,
      ...(data.reason != null && { reason: data.reason }),
      supplierNotified: data.supplierNotified,
      ...(data.resolvedAt != null && { resolvedAt: data.resolvedAt }),
      ...(data.resolvedBy != null && { resolvedBy: data.resolvedBy }),
      ...(data.resolutionNote != null && { resolutionNote: data.resolutionNote }),
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
