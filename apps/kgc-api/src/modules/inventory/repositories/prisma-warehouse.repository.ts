/**
 * Prisma Warehouse Repository
 * Implements IWarehouseRepository for PostgreSQL persistence
 * Story INV-S2: PrismaWarehouseRepository
 */

import {
  CrossWarehouseStockSummary,
  InventoryTransfer,
  IWarehouseRepository,
  TransferItem,
  TransferQuery,
  TransferQueryResult,
  TransferStatus,
  Warehouse,
  WarehouseQuery,
  WarehouseQueryResult,
  WarehouseStatus,
  WarehouseType,
} from '@kgc/inventory';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  InventoryTransfer as PrismaTransfer,
  TransferItem as PrismaTransferItem,
  Warehouse as PrismaWarehouse,
} from '@prisma/client';

type PrismaTransferWithItems = PrismaTransfer & {
  items: PrismaTransferItem[];
};

@Injectable()
export class PrismaWarehouseRepository implements IWarehouseRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma Warehouse to domain interface
   */
  private toWarehouseDomain(warehouse: PrismaWarehouse): Warehouse {
    const result: Warehouse = {
      id: warehouse.id,
      tenantId: warehouse.tenantId,
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type as WarehouseType,
      status: warehouse.status as WarehouseStatus,
      isDefault: warehouse.isDefault,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      isDeleted: warehouse.isDeleted,
    };
    if (warehouse.address !== null) result.address = warehouse.address;
    if (warehouse.city !== null) result.city = warehouse.city;
    if (warehouse.postalCode !== null) result.postalCode = warehouse.postalCode;
    if (warehouse.contactName !== null) result.contactName = warehouse.contactName;
    if (warehouse.contactPhone !== null) result.contactPhone = warehouse.contactPhone;
    if (warehouse.contactEmail !== null) result.contactEmail = warehouse.contactEmail;
    return result;
  }

  /**
   * Convert Prisma Transfer to domain interface
   */
  private toTransferDomain(transfer: PrismaTransferWithItems): InventoryTransfer {
    const result: InventoryTransfer = {
      id: transfer.id,
      tenantId: transfer.tenantId,
      transferCode: transfer.transferCode,
      sourceWarehouseId: transfer.sourceWarehouseId,
      targetWarehouseId: transfer.targetWarehouseId,
      status: transfer.status as TransferStatus,
      initiatedBy: transfer.initiatedBy,
      initiatedAt: transfer.initiatedAt,
      items: transfer.items.map(item => this.toTransferItemDomain(item)),
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    };
    if (transfer.reason !== null) result.reason = transfer.reason;
    if (transfer.completedBy !== null) result.completedBy = transfer.completedBy;
    if (transfer.completedAt !== null) result.completedAt = transfer.completedAt;
    return result;
  }

  /**
   * Convert Prisma TransferItem to domain interface
   */
  private toTransferItemDomain(item: PrismaTransferItem): TransferItem {
    const result: TransferItem = {
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unit: item.unit,
    };
    if (item.serialNumber !== null) result.serialNumber = item.serialNumber;
    if (item.note !== null) result.note = item.note;
    return result;
  }

  // ============================================
  // WAREHOUSE CRUD OPERATIONS
  // ============================================

  async create(warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warehouse> {
    // Check for duplicate code within tenant (AC1)
    const existingByCode = await this.prisma.warehouse.findFirst({
      where: { code: warehouse.code, tenantId: warehouse.tenantId, isDeleted: false },
    });
    if (existingByCode) {
      throw new Error(`Warehouse with code ${warehouse.code} already exists`);
    }

    // Use transaction to ensure atomicity when setting default warehouse
    const created = await this.prisma.$transaction(async tx => {
      // If this warehouse is default, clear other defaults first
      if (warehouse.isDefault) {
        await tx.warehouse.updateMany({
          where: { tenantId: warehouse.tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.create({
        data: {
          tenantId: warehouse.tenantId,
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type,
          status: warehouse.status,
          address: warehouse.address ?? null,
          city: warehouse.city ?? null,
          postalCode: warehouse.postalCode ?? null,
          contactName: warehouse.contactName ?? null,
          contactPhone: warehouse.contactPhone ?? null,
          contactEmail: warehouse.contactEmail ?? null,
          isDefault: warehouse.isDefault,
          isDeleted: warehouse.isDeleted,
        },
      });
    });

    return this.toWarehouseDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<Warehouse | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    return warehouse ? this.toWarehouseDomain(warehouse) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<Warehouse | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { code, tenantId, isDeleted: false },
    });
    return warehouse ? this.toWarehouseDomain(warehouse) : null;
  }

  async findDefault(tenantId: string): Promise<Warehouse | null> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true, isDeleted: false },
    });
    return warehouse ? this.toWarehouseDomain(warehouse) : null;
  }

  async query(query: WarehouseQuery): Promise<WarehouseQueryResult> {
    const where: Prisma.WarehouseWhereInput = {
      tenantId: query.tenantId,
      isDeleted: false,
    };

    // Type filter
    if (query.type) {
      if (Array.isArray(query.type)) {
        where.type = { in: query.type };
      } else {
        where.type = query.type;
      }
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // City filter
    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    // Search filter (name or code)
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    let orderBy: Prisma.WarehouseOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'asc';
      switch (query.sortBy) {
        case 'name':
          orderBy = { name: sortOrder };
          break;
        case 'code':
          orderBy = { code: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      warehouses: warehouses.map(w => this.toWarehouseDomain(w)),
      total,
      offset,
      limit,
    };
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Omit<Warehouse, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<Warehouse> {
    // Verify warehouse exists and belongs to tenant
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Warehouse not found: ${id}`);
    }

    // If setting as default, clear other defaults first
    if (data.isDefault === true) {
      await this.prisma.warehouse.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: Prisma.WarehouseUncheckedUpdateInput = {};

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.city !== undefined) updateData.city = data.city ?? null;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode ?? null;
    if (data.contactName !== undefined) updateData.contactName = data.contactName ?? null;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone ?? null;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail ?? null;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    return this.toWarehouseDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    // Verify warehouse exists and belongs to tenant
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Warehouse not found: ${id}`);
    }

    // Check if warehouse has inventory items (AC3)
    const hasItems = await this.hasInventoryItems(id, tenantId);
    if (hasItems) {
      throw new Error('Cannot delete warehouse with inventory items');
    }

    await this.prisma.warehouse.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  // ============================================
  // TRANSFER OPERATIONS
  // ============================================

  async createTransfer(
    transfer: Omit<InventoryTransfer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InventoryTransfer> {
    const created = await this.prisma.inventoryTransfer.create({
      data: {
        tenantId: transfer.tenantId,
        transferCode: transfer.transferCode,
        sourceWarehouseId: transfer.sourceWarehouseId,
        targetWarehouseId: transfer.targetWarehouseId,
        status: transfer.status,
        reason: transfer.reason ?? null,
        initiatedBy: transfer.initiatedBy,
        initiatedAt: transfer.initiatedAt,
        completedBy: transfer.completedBy ?? null,
        completedAt: transfer.completedAt ?? null,
        items: {
          create: transfer.items.map(item => ({
            inventoryItemId: item.inventoryItemId,
            serialNumber: item.serialNumber ?? null,
            quantity: item.quantity,
            unit: item.unit,
            note: item.note ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return this.toTransferDomain(created);
  }

  async findTransferById(id: string, tenantId: string): Promise<InventoryTransfer | null> {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    return transfer ? this.toTransferDomain(transfer) : null;
  }

  async findTransferByCode(code: string, tenantId: string): Promise<InventoryTransfer | null> {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { transferCode: code, tenantId },
      include: { items: true },
    });
    return transfer ? this.toTransferDomain(transfer) : null;
  }

  async queryTransfers(query: TransferQuery): Promise<TransferQueryResult> {
    const where: Prisma.InventoryTransferWhereInput = {
      tenantId: query.tenantId,
    };

    if (query.sourceWarehouseId) where.sourceWarehouseId = query.sourceWarehouseId;
    if (query.targetWarehouseId) where.targetWarehouseId = query.targetWarehouseId;
    if (query.initiatedBy) where.initiatedBy = query.initiatedBy;

    // Status filter
    if (query.status) {
      if (Array.isArray(query.status)) {
        where.status = { in: query.status };
      } else {
        where.status = query.status;
      }
    }

    // Date range filter
    if (query.dateFrom || query.dateTo) {
      where.initiatedAt = {};
      if (query.dateFrom) where.initiatedAt.gte = query.dateFrom;
      if (query.dateTo) where.initiatedAt.lte = query.dateTo;
    }

    // Sorting
    let orderBy: Prisma.InventoryTransferOrderByWithRelationInput = { initiatedAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'asc';
      switch (query.sortBy) {
        case 'initiatedAt':
          orderBy = { initiatedAt: sortOrder };
          break;
        case 'completedAt':
          orderBy = { completedAt: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [transfers, total] = await Promise.all([
      this.prisma.inventoryTransfer.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: { items: true },
      }),
      this.prisma.inventoryTransfer.count({ where }),
    ]);

    return {
      transfers: transfers.map(t => this.toTransferDomain(t)),
      total,
      offset,
      limit,
    };
  }

  async updateTransfer(
    id: string,
    tenantId: string,
    data: Partial<Omit<InventoryTransfer, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<InventoryTransfer> {
    // Verify transfer exists and belongs to tenant
    const existing = await this.prisma.inventoryTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!existing) {
      throw new Error(`Transfer not found: ${id}`);
    }

    // Validate status transition (AC5)
    if (data.status !== undefined && data.status !== existing.status) {
      const validTransition = this.isValidStatusTransition(
        existing.status as TransferStatus,
        data.status
      );
      if (!validTransition) {
        throw new Error(`Invalid status transition: ${existing.status} → ${data.status}`);
      }
    }

    const updateData: Prisma.InventoryTransferUncheckedUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      // If completing, set completedAt and completedBy
      if (data.status === 'COMPLETED') {
        updateData.completedAt = data.completedAt ?? new Date();
        if (data.completedBy) updateData.completedBy = data.completedBy;
      }
    }
    if (data.reason !== undefined) updateData.reason = data.reason ?? null;
    if (data.completedBy !== undefined) updateData.completedBy = data.completedBy ?? null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ?? null;

    const updated = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return this.toTransferDomain(updated);
  }

  /**
   * Validate status transition according to AC5:
   * - PENDING → IN_TRANSIT → COMPLETED
   * - PENDING → CANCELLED
   */
  private isValidStatusTransition(current: TransferStatus, next: TransferStatus): boolean {
    const validTransitions: Record<TransferStatus, TransferStatus[]> = {
      PENDING: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    return validTransitions[current]?.includes(next) ?? false;
  }

  // ============================================
  // CROSS-WAREHOUSE OPERATIONS
  // ============================================

  async getCrossWarehouseStock(
    tenantId: string,
    productIds?: string[]
  ): Promise<CrossWarehouseStockSummary[]> {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (productIds && productIds.length > 0) {
      where.productId = { in: productIds };
    }

    // Get all inventory items grouped by product and warehouse
    // CR-6: Include product to get productName
    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        product: {
          select: { name: true },
        },
      },
    });

    // Group by productId
    // CR-6: Track productName from Product relation
    const productMap = new Map<
      string,
      {
        productName: string;
        unit: string;
        warehouses: Map<
          string,
          { name: string; code: string; quantity: number; availableQuantity: number }
        >;
      }
    >();

    for (const item of items) {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          productName: item.product.name,
          unit: item.unit,
          warehouses: new Map(),
        });
      }

      const product = productMap.get(item.productId)!;
      const warehouseId = item.warehouseId;

      if (!product.warehouses.has(warehouseId)) {
        product.warehouses.set(warehouseId, {
          name: item.warehouse.name,
          code: item.warehouse.code,
          quantity: 0,
          availableQuantity: 0,
        });
      }

      const warehouseData = product.warehouses.get(warehouseId)!;
      warehouseData.quantity += item.quantity;
      if (item.status === 'AVAILABLE') {
        warehouseData.availableQuantity += item.quantity;
      }
    }

    // Convert to result format
    const results: CrossWarehouseStockSummary[] = [];

    for (const [productId, data] of productMap.entries()) {
      let totalQuantity = 0;
      const warehouseBreakdown: CrossWarehouseStockSummary['warehouseBreakdown'] = [];

      for (const [warehouseId, warehouseData] of data.warehouses.entries()) {
        totalQuantity += warehouseData.quantity;
        warehouseBreakdown.push({
          warehouseId,
          warehouseName: warehouseData.name,
          warehouseCode: warehouseData.code,
          quantity: warehouseData.quantity,
          availableQuantity: warehouseData.availableQuantity,
        });
      }

      results.push({
        productId,
        productName: data.productName,
        unit: data.unit,
        totalQuantity,
        warehouseBreakdown,
      });
    }

    return results;
  }

  async hasInventoryItems(warehouseId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.inventoryItem.count({
      where: {
        warehouseId,
        tenantId,
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
