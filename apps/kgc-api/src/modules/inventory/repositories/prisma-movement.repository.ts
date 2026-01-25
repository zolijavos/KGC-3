/**
 * Prisma Movement Repository
 * Implements IMovementRepository for PostgreSQL persistence
 * Story INV-S4: PrismaMovementRepository
 *
 * Note: The Prisma StockMovement model has fewer fields than the interface.
 * This implementation maps available fields and derives others where possible.
 */

import {
  IMovementRepository,
  InventoryMovement,
  MovementQuery,
  MovementQueryResult,
  MovementSourceModule,
  MovementSummary,
  MovementType,
} from '@kgc/inventory';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  MovementType as PrismaMovementType,
  StockMovement as PrismaStockMovement,
} from '@prisma/client';

type PrismaMovementWithItem = PrismaStockMovement & {
  inventoryItem: {
    warehouseId: string;
    productId: string;
    serialNumber: string | null;
    batchNumber: string | null;
    unit: string;
  };
};

@Injectable()
export class PrismaMovementRepository implements IMovementRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // TYPE MAPPING FUNCTIONS
  // ============================================

  /**
   * Map interface MovementType to Prisma MovementType
   * Interface: RECEIPT, ISSUE, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, RETURN, SCRAP, RESERVATION, RELEASE, STATUS_CHANGE
   * Prisma: IN, OUT, TRANSFER, ADJUSTMENT, RESERVATION, RELEASE
   */
  private mapInterfaceTypeToPrisma(type: MovementType): PrismaMovementType {
    const mapping: Record<MovementType, PrismaMovementType> = {
      RECEIPT: PrismaMovementType.IN,
      RETURN: PrismaMovementType.IN,
      ISSUE: PrismaMovementType.OUT,
      SCRAP: PrismaMovementType.OUT,
      TRANSFER_OUT: PrismaMovementType.TRANSFER,
      TRANSFER_IN: PrismaMovementType.TRANSFER,
      ADJUSTMENT: PrismaMovementType.ADJUSTMENT,
      RESERVATION: PrismaMovementType.RESERVATION,
      RELEASE: PrismaMovementType.RELEASE,
      STATUS_CHANGE: PrismaMovementType.ADJUSTMENT, // Maps to ADJUSTMENT as fallback
    };
    return mapping[type];
  }

  /**
   * Map Prisma MovementType back to interface MovementType
   *
   * CR-3: TYPE MAPPING INFORMATION LOSS
   * The Prisma schema has fewer movement types than the interface:
   * - Prisma: IN, OUT, TRANSFER, ADJUSTMENT, RESERVATION, RELEASE
   * - Interface: RECEIPT, ISSUE, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, RETURN, SCRAP, RESERVATION, RELEASE, STATUS_CHANGE
   *
   * This causes information loss in both directions:
   * - RECEIPT/RETURN both map to IN → reads back as RECEIPT (RETURN info lost)
   * - ISSUE/SCRAP both map to OUT → reads back as ISSUE (SCRAP info lost)
   * - TRANSFER_OUT/TRANSFER_IN both map to TRANSFER → reads back as TRANSFER_IN (direction lost)
   * - STATUS_CHANGE maps to ADJUSTMENT → reads back as ADJUSTMENT (STATUS_CHANGE info lost)
   *
   * To preserve the original type, consider:
   * 1. Adding a 'subType' field to StockMovement Prisma model
   * 2. Storing original type in 'reason' or 'referenceType' field
   * 3. Expanding the Prisma MovementType enum to match the interface
   */
  private mapPrismaTypeToInterface(prismaType: PrismaMovementType): MovementType {
    const mapping: Record<PrismaMovementType, MovementType> = {
      [PrismaMovementType.IN]: 'RECEIPT',
      [PrismaMovementType.OUT]: 'ISSUE',
      [PrismaMovementType.TRANSFER]: 'TRANSFER_IN',
      [PrismaMovementType.ADJUSTMENT]: 'ADJUSTMENT',
      [PrismaMovementType.RESERVATION]: 'RESERVATION',
      [PrismaMovementType.RELEASE]: 'RELEASE',
    };
    return mapping[prismaType];
  }

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma StockMovement to domain interface
   * Note: Some fields are derived or left undefined due to schema limitations
   */
  private toDomain(movement: PrismaMovementWithItem): InventoryMovement {
    const result: InventoryMovement = {
      id: movement.id,
      tenantId: movement.tenantId,
      inventoryItemId: movement.inventoryItemId,
      warehouseId: movement.inventoryItem.warehouseId,
      productId: movement.inventoryItem.productId,
      type: this.mapPrismaTypeToInterface(movement.type),
      sourceModule: this.deriveSourceModule(movement.referenceType),
      quantityChange: movement.quantity,
      previousQuantity: 0, // Not stored in Prisma model - would need historical query
      newQuantity: movement.quantity, // Approximation: equals quantityChange since previousQuantity unknown
      unit: movement.inventoryItem.unit,
      performedBy: movement.createdBy,
      performedAt: movement.createdAt,
      createdAt: movement.createdAt,
    };

    // Optional fields
    if (movement.referenceId !== null) result.referenceId = movement.referenceId;
    if (movement.referenceType !== null) result.referenceType = movement.referenceType;
    if (movement.fromLocationCode !== null) result.previousLocationCode = movement.fromLocationCode;
    if (movement.toLocationCode !== null) result.newLocationCode = movement.toLocationCode;
    if (movement.inventoryItem.serialNumber !== null)
      result.serialNumber = movement.inventoryItem.serialNumber;
    if (movement.inventoryItem.batchNumber !== null)
      result.batchNumber = movement.inventoryItem.batchNumber;
    if (movement.reason !== null) result.reason = movement.reason;

    return result;
  }

  /**
   * Derive sourceModule from referenceType
   */
  private deriveSourceModule(referenceType: string | null): MovementSourceModule {
    if (!referenceType) return 'MANUAL';

    const mapping: Record<string, MovementSourceModule> = {
      RENTAL: 'RENTAL',
      WORKSHEET: 'SERVICE',
      SERVICE: 'SERVICE',
      INVOICE: 'SALES',
      SALE: 'SALES',
      TRANSFER: 'TRANSFER',
      STOCK_COUNT: 'STOCK_COUNT',
    };

    return mapping[referenceType.toUpperCase()] ?? 'INVENTORY';
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> {
    const created = await this.prisma.stockMovement.create({
      data: {
        tenantId: movement.tenantId,
        inventoryItemId: movement.inventoryItemId,
        type: this.mapInterfaceTypeToPrisma(movement.type),
        quantity: movement.quantityChange,
        reason: movement.reason ?? null,
        fromLocationCode: movement.previousLocationCode ?? null,
        toLocationCode: movement.newLocationCode ?? null,
        referenceType: movement.referenceType ?? null,
        referenceId: movement.referenceId ?? null,
        createdBy: movement.performedBy,
      },
      include: {
        inventoryItem: {
          select: {
            warehouseId: true,
            productId: true,
            serialNumber: true,
            batchNumber: true,
            unit: true,
          },
        },
      },
    });

    return this.toDomain(created as PrismaMovementWithItem);
  }

  async createMany(movements: Array<Omit<InventoryMovement, 'id' | 'createdAt'>>): Promise<number> {
    if (movements.length === 0) return 0;

    const result = await this.prisma.stockMovement.createMany({
      data: movements.map(m => ({
        tenantId: m.tenantId,
        inventoryItemId: m.inventoryItemId,
        type: this.mapInterfaceTypeToPrisma(m.type),
        quantity: m.quantityChange,
        reason: m.reason ?? null,
        fromLocationCode: m.previousLocationCode ?? null,
        toLocationCode: m.newLocationCode ?? null,
        referenceType: m.referenceType ?? null,
        referenceId: m.referenceId ?? null,
        createdBy: m.performedBy,
      })),
    });

    return result.count;
  }

  async findById(id: string, tenantId: string): Promise<InventoryMovement | null> {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
      include: {
        inventoryItem: {
          select: {
            warehouseId: true,
            productId: true,
            serialNumber: true,
            batchNumber: true,
            unit: true,
          },
        },
      },
    });

    return movement ? this.toDomain(movement) : null;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  async query(query: MovementQuery): Promise<MovementQueryResult> {
    const where: Prisma.StockMovementWhereInput = {
      tenantId: query.tenantId,
    };

    if (query.inventoryItemId) where.inventoryItemId = query.inventoryItemId;
    if (query.referenceId) where.referenceId = query.referenceId;
    if (query.performedBy) where.createdBy = query.performedBy;

    // Note: sourceModule filter is not supported - Prisma model doesn't store sourceModule directly.
    // sourceModule is derived from referenceType at read time. Filtering by sourceModule would require
    // filtering by multiple referenceType values, which is complex and may not cover all cases.

    // Type filter - map interface types to Prisma types
    if (query.type) {
      if (Array.isArray(query.type)) {
        const prismaTypes = query.type.map(t => this.mapInterfaceTypeToPrisma(t));
        // Remove duplicates (e.g., RECEIPT and RETURN both map to IN)
        where.type = { in: [...new Set(prismaTypes)] };
      } else {
        where.type = this.mapInterfaceTypeToPrisma(query.type);
      }
    }

    // Build inventoryItem filter for warehouse, product, serial, batch
    const inventoryItemFilter: Prisma.InventoryItemWhereInput = {};
    if (query.warehouseId) {
      inventoryItemFilter.warehouseId = query.warehouseId;
    }
    if (query.productId) {
      inventoryItemFilter.productId = query.productId;
    }
    if (query.serialNumber) {
      inventoryItemFilter.serialNumber = query.serialNumber;
    }
    if (query.batchNumber) {
      inventoryItemFilter.batchNumber = query.batchNumber;
    }
    if (Object.keys(inventoryItemFilter).length > 0) {
      where.inventoryItem = inventoryItemFilter;
    }

    // Date range filter
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = query.dateFrom;
      if (query.dateTo) where.createdAt.lte = query.dateTo;
    }

    // Sorting
    let orderBy: Prisma.StockMovementOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'desc';
      switch (query.sortBy) {
        case 'performedAt':
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'quantityChange':
          orderBy = { quantity: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          inventoryItem: {
            select: {
              warehouseId: true,
              productId: true,
              serialNumber: true,
              batchNumber: true,
              unit: true,
            },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      movements: movements.map(m => this.toDomain(m)),
      total,
      offset,
      limit,
    };
  }

  // ============================================
  // HISTORY/SUMMARY OPERATIONS
  // ============================================

  async getHistory(
    inventoryItemId: string,
    tenantId: string,
    limit?: number
  ): Promise<InventoryMovement[]> {
    const findArgs: Prisma.StockMovementFindManyArgs = {
      where: { inventoryItemId, tenantId },
      orderBy: { createdAt: 'asc' },
      include: {
        inventoryItem: {
          select: {
            warehouseId: true,
            productId: true,
            serialNumber: true,
            batchNumber: true,
            unit: true,
          },
        },
      },
    };
    if (limit !== undefined) {
      findArgs.take = limit;
    }

    const movements = await this.prisma.stockMovement.findMany(findArgs);

    return movements.map(m => this.toDomain(m as PrismaMovementWithItem));
  }

  async getSummary(
    tenantId: string,
    warehouseId: string | undefined,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MovementSummary> {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (warehouseId) {
      where.inventoryItem = { warehouseId };
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      select: {
        type: true,
        quantity: true,
      },
    });

    let totalReceipts = 0;
    let totalIssues = 0;
    let totalTransfersOut = 0;
    let totalTransfersIn = 0;
    let positiveAdjustments = 0;
    let negativeAdjustments = 0;
    let totalScrapped = 0;

    // Map Prisma MovementType to summary categories
    // Prisma: IN, OUT, TRANSFER, ADJUSTMENT, RESERVATION, RELEASE
    // Summary: receipts, issues, transfersOut, transfersIn, adjustments, scrapped
    for (const m of movements) {
      switch (m.type) {
        case 'IN':
          // IN = Receipt/Return (stock increase)
          totalReceipts += Math.abs(m.quantity);
          break;
        case 'OUT':
          // OUT = Issue/Scrap (stock decrease)
          if (m.quantity < 0) {
            totalScrapped += Math.abs(m.quantity);
          } else {
            totalIssues += Math.abs(m.quantity);
          }
          break;
        case 'TRANSFER':
          // TRANSFER = Both out and in (based on quantity sign)
          if (m.quantity < 0) {
            totalTransfersOut += Math.abs(m.quantity);
          } else {
            totalTransfersIn += Math.abs(m.quantity);
          }
          break;
        case 'ADJUSTMENT':
          if (m.quantity >= 0) {
            positiveAdjustments += m.quantity;
          } else {
            negativeAdjustments += Math.abs(m.quantity);
          }
          break;
        case 'RESERVATION':
          // Reservation reduces available stock
          totalIssues += Math.abs(m.quantity);
          break;
        case 'RELEASE':
          // Release returns reserved stock
          totalReceipts += Math.abs(m.quantity);
          break;
      }
    }

    const netChange =
      totalReceipts +
      totalTransfersIn +
      positiveAdjustments -
      totalIssues -
      totalTransfersOut -
      negativeAdjustments -
      totalScrapped;

    return {
      periodStart,
      periodEnd,
      totalReceipts,
      totalIssues,
      totalTransfersOut,
      totalTransfersIn,
      positiveAdjustments,
      negativeAdjustments,
      totalScrapped,
      netChange,
    };
  }

  async getLastMovement(
    inventoryItemId: string,
    tenantId: string
  ): Promise<InventoryMovement | null> {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { inventoryItemId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        inventoryItem: {
          select: {
            warehouseId: true,
            productId: true,
            serialNumber: true,
            batchNumber: true,
            unit: true,
          },
        },
      },
    });

    return movement ? this.toDomain(movement) : null;
  }
}
