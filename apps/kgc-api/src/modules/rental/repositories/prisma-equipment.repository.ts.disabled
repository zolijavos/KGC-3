/**
 * Prisma Equipment Repository
 * Implements IEquipmentRepository for PostgreSQL persistence
 * Epic 13: Bérgép törzs, státusz lifecycle, tartozék kezelés
 */

import type {
  CreateEquipmentInput,
  EquipmentAccessory,
  EquipmentHistoryEntry,
  EquipmentListResult,
  EquipmentStatistics,
  MaintenanceRecord,
  RentalEquipment,
  UpdateEquipmentInput,
} from '@kgc/bergep';
import {
  EquipmentCategory,
  EquipmentCondition,
  EquipmentEventType,
  EquipmentQuery,
  EquipmentStatus,
  IEquipmentRepository,
  MaintenanceQuery,
} from '@kgc/bergep';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  RentalAccessory as PrismaAccessory,
  PrismaClient,
  RentalEquipment as PrismaEquipment,
  EquipmentStatus as PrismaEquipmentStatus,
} from '@prisma/client';

@Injectable()
export class PrismaEquipmentRepository implements IEquipmentRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toDomainStatus(prismaStatus: PrismaEquipmentStatus): EquipmentStatus {
    const statusMap: Record<PrismaEquipmentStatus, EquipmentStatus> = {
      AVAILABLE: EquipmentStatus.AVAILABLE,
      RENTED: EquipmentStatus.RENTED,
      RESERVED: EquipmentStatus.RESERVED,
      IN_SERVICE: EquipmentStatus.IN_SERVICE,
      DAMAGED: EquipmentStatus.MAINTENANCE_REQUIRED,
      LOST: EquipmentStatus.DECOMMISSIONED,
      SOLD: EquipmentStatus.DECOMMISSIONED,
      SCRAPPED: EquipmentStatus.DECOMMISSIONED,
    };
    return statusMap[prismaStatus] ?? EquipmentStatus.AVAILABLE;
  }

  private toPrismaStatus(domainStatus: EquipmentStatus): PrismaEquipmentStatus {
    const statusMap: Record<EquipmentStatus, PrismaEquipmentStatus> = {
      [EquipmentStatus.AVAILABLE]: 'AVAILABLE',
      [EquipmentStatus.RENTED]: 'RENTED',
      [EquipmentStatus.RESERVED]: 'RESERVED',
      [EquipmentStatus.IN_SERVICE]: 'IN_SERVICE',
      [EquipmentStatus.MAINTENANCE_REQUIRED]: 'DAMAGED',
      [EquipmentStatus.DECOMMISSIONED]: 'SCRAPPED',
    };
    return statusMap[domainStatus] ?? 'AVAILABLE';
  }

  private toDomainCondition(prismaCondition: string): EquipmentCondition {
    const conditionMap: Record<string, EquipmentCondition> = {
      NEW: EquipmentCondition.EXCELLENT,
      EXCELLENT: EquipmentCondition.EXCELLENT,
      GOOD: EquipmentCondition.GOOD,
      FAIR: EquipmentCondition.FAIR,
      POOR: EquipmentCondition.POOR,
      NEEDS_REPAIR: EquipmentCondition.NEEDS_REPAIR,
    };
    return conditionMap[prismaCondition] ?? EquipmentCondition.GOOD;
  }

  private toPrismaCondition(domainCondition: EquipmentCondition): string {
    return domainCondition;
  }

  private toEquipmentDomain(
    equipment: PrismaEquipment & { product?: { name: string; category?: string; brand?: string } }
  ): RentalEquipment {
    return {
      id: equipment.id,
      tenantId: equipment.tenantId,
      locationId: equipment.warehouseId ?? equipment.locationId ?? '',
      productId: equipment.productId,
      serialNumber: equipment.serialNumber,
      inventoryCode: equipment.equipmentCode,
      qrCode: equipment.qrCode ?? '',
      name: equipment.product?.name ?? equipment.equipmentCode,
      description: equipment.notes ?? undefined,
      category: this.mapProductCategory(equipment.product?.category),
      brand: equipment.product?.brand,
      model: undefined, // Not in Prisma model
      status: this.toDomainStatus(equipment.status),
      condition: this.toDomainCondition(equipment.condition),
      dailyRate: Number(equipment.dailyRate ?? 0),
      weeklyRate: Number(equipment.weeklyRate ?? 0),
      monthlyRate: Number(equipment.monthlyRate ?? 0),
      depositAmount: Number(equipment.depositAmount ?? 0),
      purchaseDate: equipment.purchaseDate ?? undefined,
      purchasePrice: equipment.purchasePrice ? Number(equipment.purchasePrice) : undefined,
      warrantyExpiry: equipment.warrantyEndDate ?? undefined,
      lastMaintenanceDate: equipment.lastServiceDate ?? undefined,
      nextMaintenanceDate: equipment.nextServiceDate ?? undefined,
      maintenanceIntervalDays: equipment.serviceIntervalDays ?? undefined,
      totalRentals: equipment.totalRentals,
      totalRevenue: Number(equipment.totalRevenue),
      notes: equipment.notes ?? undefined,
      isActive: !equipment.isDeleted,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
    };
  }

  private mapProductCategory(category?: string | null): EquipmentCategory {
    const categoryMap: Record<string, EquipmentCategory> = {
      POWER_TOOL: EquipmentCategory.POWER_TOOL,
      GARDEN: EquipmentCategory.GARDEN,
      CONSTRUCTION: EquipmentCategory.CONSTRUCTION,
      CLEANING: EquipmentCategory.CLEANING,
      MACHINERY: EquipmentCategory.MACHINERY,
      HAND_TOOL: EquipmentCategory.HAND_TOOL,
      MEASUREMENT: EquipmentCategory.MEASUREMENT,
      SAFETY: EquipmentCategory.SAFETY,
    };
    return category
      ? (categoryMap[category] ?? EquipmentCategory.POWER_TOOL)
      : EquipmentCategory.POWER_TOOL;
  }

  private toAccessoryDomain(accessory: PrismaAccessory): EquipmentAccessory {
    return {
      id: accessory.id,
      equipmentId: accessory.equipmentId,
      name: accessory.name,
      description: accessory.description ?? undefined,
      quantity: 1, // Prisma doesn't have quantity field
      isMandatory: accessory.isRequired,
      replacementCost: Number(accessory.value ?? 0),
      condition: this.toDomainCondition(accessory.condition),
      notes: undefined,
      createdAt: accessory.createdAt,
      updatedAt: accessory.createdAt, // Prisma doesn't have updatedAt
    };
  }

  clear(): void {
    // No-op for Prisma - use for testing only
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async findById(id: string, tenantId: string): Promise<RentalEquipment | null> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { product: true },
    });
    return equipment ? this.toEquipmentDomain(equipment) : null;
  }

  async findBySerialNumber(
    serialNumber: string,
    tenantId: string
  ): Promise<RentalEquipment | null> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { serialNumber, tenantId, isDeleted: false },
      include: { product: true },
    });
    return equipment ? this.toEquipmentDomain(equipment) : null;
  }

  async findByQrCode(qrCode: string, tenantId: string): Promise<RentalEquipment | null> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { qrCode, tenantId, isDeleted: false },
      include: { product: true },
    });
    return equipment ? this.toEquipmentDomain(equipment) : null;
  }

  async findByInventoryCode(
    inventoryCode: string,
    tenantId: string
  ): Promise<RentalEquipment | null> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { equipmentCode: inventoryCode, tenantId, isDeleted: false },
      include: { product: true },
    });
    return equipment ? this.toEquipmentDomain(equipment) : null;
  }

  async query(params: EquipmentQuery): Promise<EquipmentListResult> {
    const where: Prisma.RentalEquipmentWhereInput = {
      tenantId: params.tenantId,
      isDeleted: false,
    };

    // M1 FIX: Collect AND conditions to avoid OR overwriting
    const andConditions: Prisma.RentalEquipmentWhereInput[] = [];

    if (params.locationId) {
      andConditions.push({
        OR: [{ warehouseId: params.locationId }, { locationId: params.locationId }],
      });
    }

    if (params.status) {
      where.status = this.toPrismaStatus(params.status);
    }

    if (params.condition) {
      where.condition = this.toPrismaCondition(params.condition);
    }

    // M2 FIX: Add category filter via product relation
    if (params.category) {
      where.product = {
        ...((where.product as Prisma.ProductWhereInput) ?? {}),
        category: params.category,
      };
    }

    // M4 FIX: Add brand filter via product relation
    if (params.brand) {
      where.product = {
        ...((where.product as Prisma.ProductWhereInput) ?? {}),
        brand: { equals: params.brand, mode: 'insensitive' },
      };
    }

    if (params.availableOnly) {
      where.status = 'AVAILABLE';
    }

    if (params.minDailyRate !== undefined) {
      where.dailyRate = { gte: params.minDailyRate };
    }

    if (params.maxDailyRate !== undefined) {
      where.dailyRate = {
        ...(where.dailyRate as object),
        lte: params.maxDailyRate,
      };
    }

    if (params.maintenanceDueSoon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.nextServiceDate = { lte: thirtyDaysFromNow };
    }

    // M1 FIX: Search uses AND to combine with location filter
    if (params.search) {
      andConditions.push({
        OR: [
          { equipmentCode: { contains: params.search, mode: 'insensitive' } },
          { serialNumber: { contains: params.search, mode: 'insensitive' } },
          { product: { name: { contains: params.search, mode: 'insensitive' } } },
        ],
      });
    }

    // M1 FIX: Apply all AND conditions
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;

    // Build orderBy
    const orderBy: Prisma.RentalEquipmentOrderByWithRelationInput = {};
    switch (params.sortBy) {
      case 'name':
        orderBy.product = { name: params.sortOrder ?? 'asc' };
        break;
      case 'serialNumber':
        orderBy.serialNumber = params.sortOrder ?? 'asc';
        break;
      case 'dailyRate':
        orderBy.dailyRate = params.sortOrder ?? 'asc';
        break;
      case 'totalRentals':
        orderBy.totalRentals = params.sortOrder ?? 'desc';
        break;
      default:
        orderBy.createdAt = params.sortOrder ?? 'desc';
    }

    const [equipment, total] = await Promise.all([
      this.prisma.rentalEquipment.findMany({
        where,
        include: { product: true },
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.rentalEquipment.count({ where }),
    ]);

    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    return {
      equipment: equipment.map(e => this.toEquipmentDomain(e)),
      total,
      page,
      pageSize: limit,
      hasMore,
    };
  }

  async create(
    tenantId: string,
    locationId: string,
    data: CreateEquipmentInput,
    createdBy: string
  ): Promise<RentalEquipment> {
    // Validate serial number doesn't exist
    if (await this.serialNumberExists(data.serialNumber, tenantId)) {
      throw new Error(`A sorozatszám már létezik: ${data.serialNumber}`);
    }

    // Validate rates are positive
    if (data.dailyRate < 0 || data.weeklyRate < 0 || data.monthlyRate < 0) {
      throw new Error('A bérlési díjak nem lehetnek negatívak');
    }

    if (data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    // Generate inventory code if not provided
    const inventoryCode = data.inventoryCode ?? (await this.generateNextInventoryCode(tenantId));

    // Validate inventory code doesn't exist
    if (await this.inventoryCodeExists(inventoryCode, tenantId)) {
      throw new Error(`A leltári kód már létezik: ${inventoryCode}`);
    }

    // Require productId for Prisma (foreign key constraint)
    if (!data.productId) {
      throw new Error('A termék azonosító megadása kötelező');
    }

    const equipment = await this.prisma.rentalEquipment.create({
      data: {
        tenantId,
        equipmentCode: inventoryCode,
        serialNumber: data.serialNumber,
        productId: data.productId,
        warehouseId: locationId,
        status: 'AVAILABLE',
        condition: 'GOOD',
        qrCode: this.generateQrCode(tenantId, inventoryCode),
        dailyRate: data.dailyRate,
        weeklyRate: data.weeklyRate,
        monthlyRate: data.monthlyRate,
        depositAmount: data.depositAmount,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        warrantyEndDate: data.warrantyExpiry,
        serviceIntervalDays: data.maintenanceIntervalDays,
        notes: data.notes,
        totalRentals: 0,
        totalRevenue: 0,
        createdBy,
        updatedBy: createdBy,
      },
      include: { product: true },
    });

    return this.toEquipmentDomain(equipment);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateEquipmentInput,
    updatedBy: string
  ): Promise<RentalEquipment> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Bérgép nem található');
    }

    // Validate rates if provided
    if (data.dailyRate !== undefined && data.dailyRate < 0) {
      throw new Error('A napi bérlési díj nem lehet negatív');
    }
    if (data.weeklyRate !== undefined && data.weeklyRate < 0) {
      throw new Error('A heti bérlési díj nem lehet negatív');
    }
    if (data.monthlyRate !== undefined && data.monthlyRate < 0) {
      throw new Error('A havi bérlési díj nem lehet negatív');
    }
    if (data.depositAmount !== undefined && data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    const updateData: Prisma.RentalEquipmentUpdateInput = {
      updatedBy,
      updatedAt: new Date(),
    };

    if (data.dailyRate !== undefined) updateData.dailyRate = data.dailyRate;
    if (data.weeklyRate !== undefined) updateData.weeklyRate = data.weeklyRate;
    if (data.monthlyRate !== undefined) updateData.monthlyRate = data.monthlyRate;
    if (data.depositAmount !== undefined) updateData.depositAmount = data.depositAmount;
    if (data.condition !== undefined) updateData.condition = this.toPrismaCondition(data.condition);
    if (data.warrantyExpiry !== undefined) updateData.warrantyEndDate = data.warrantyExpiry;
    if (data.maintenanceIntervalDays !== undefined)
      updateData.serviceIntervalDays = data.maintenanceIntervalDays;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Use updateMany for tenant safety
    await this.prisma.rentalEquipment.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.RentalEquipmentUpdateManyMutationInput,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Bérgép nem található frissítés után');
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const equipment = await this.findById(id, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // Soft delete
    await this.prisma.rentalEquipment.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async changeStatus(
    id: string,
    tenantId: string,
    newStatus: EquipmentStatus,
    changedBy: string,
    reason?: string,
    relatedId?: string
  ): Promise<RentalEquipment> {
    const equipment = await this.findById(id, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const previousStatus = equipment.status;

    // Validate state transition
    this.validateStatusTransition(previousStatus, newStatus);

    const updateData: Prisma.RentalEquipmentUpdateManyMutationInput = {
      status: this.toPrismaStatus(newStatus),
      updatedBy: changedBy,
      updatedAt: new Date(),
    };

    // Update rental counts if rented out
    if (newStatus === EquipmentStatus.RENTED && previousStatus === EquipmentStatus.AVAILABLE) {
      updateData.totalRentals = { increment: 1 };
      updateData.lastRentalDate = new Date();
    }

    await this.prisma.rentalEquipment.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    // Add history entry with proper optional property handling (H3 FIX)
    const eventType = this.determineEventType(previousStatus, newStatus);
    const historyEntry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'> = {
      equipmentId: id,
      eventType,
      previousStatus,
      newStatus,
      performedBy: changedBy,
      description: `Státusz változás: ${previousStatus} → ${newStatus}${reason ? ` (${reason})` : ''}`,
    };

    // Add optional fields only when defined (exactOptionalPropertyTypes compliance)
    if (newStatus === EquipmentStatus.RENTED || previousStatus === EquipmentStatus.RENTED) {
      if (relatedId !== undefined) historyEntry.rentalId = relatedId;
    }
    if (newStatus === EquipmentStatus.IN_SERVICE || previousStatus === EquipmentStatus.IN_SERVICE) {
      if (relatedId !== undefined) historyEntry.serviceId = relatedId;
    }
    if (reason !== undefined) historyEntry.notes = reason;

    await this.addHistoryEntry(historyEntry);

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Bérgép nem található frissítés után');
    }
    return updated;
  }

  private determineEventType(
    previousStatus: EquipmentStatus,
    newStatus: EquipmentStatus
  ): EquipmentEventType {
    if (newStatus === EquipmentStatus.RENTED) {
      return EquipmentEventType.RENTED_OUT;
    }
    if (previousStatus === EquipmentStatus.RENTED && newStatus === EquipmentStatus.AVAILABLE) {
      return EquipmentEventType.RETURNED;
    }
    if (newStatus === EquipmentStatus.IN_SERVICE) {
      return EquipmentEventType.SENT_TO_SERVICE;
    }
    if (previousStatus === EquipmentStatus.IN_SERVICE) {
      return EquipmentEventType.RETURNED_FROM_SERVICE;
    }
    if (newStatus === EquipmentStatus.DECOMMISSIONED) {
      return EquipmentEventType.DECOMMISSIONED;
    }
    return EquipmentEventType.STATUS_CHANGED;
  }

  private validateStatusTransition(from: EquipmentStatus, to: EquipmentStatus): void {
    const validTransitions: Record<EquipmentStatus, EquipmentStatus[]> = {
      [EquipmentStatus.AVAILABLE]: [
        EquipmentStatus.RENTED,
        EquipmentStatus.RESERVED,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.RENTED]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
      ],
      [EquipmentStatus.RESERVED]: [EquipmentStatus.AVAILABLE, EquipmentStatus.RENTED],
      [EquipmentStatus.IN_SERVICE]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.MAINTENANCE_REQUIRED]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.DECOMMISSIONED]: [],
    };

    if (from === to) return;

    const allowed = validTransitions[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Érvénytelen státusz átmenet: ${from} → ${to}`);
    }
  }

  // ============================================
  // ACCESSORY MANAGEMENT
  // ============================================

  async getAccessories(equipmentId: string, tenantId: string): Promise<EquipmentAccessory[]> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const accessories = await this.prisma.rentalAccessory.findMany({
      where: { equipmentId },
      orderBy: { name: 'asc' },
    });

    return accessories.map(a => this.toAccessoryDomain(a));
  }

  async addAccessory(
    equipmentId: string,
    tenantId: string,
    accessory: Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>
  ): Promise<EquipmentAccessory> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const created = await this.prisma.rentalAccessory.create({
      data: {
        equipmentId,
        name: accessory.name,
        description: accessory.description,
        condition: this.toPrismaCondition(accessory.condition),
        isRequired: accessory.isMandatory,
        value: accessory.replacementCost,
      },
    });

    await this.addHistoryEntry({
      equipmentId,
      eventType: EquipmentEventType.ACCESSORY_ADDED,
      performedBy: 'system',
      description: `Tartozék hozzáadva: ${accessory.name} (${accessory.quantity} db)`,
    });

    return this.toAccessoryDomain(created);
  }

  async updateAccessory(
    accessoryId: string,
    equipmentId: string,
    tenantId: string,
    data: Partial<Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EquipmentAccessory> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // M5 FIX: Verify accessory belongs to this equipment before updating
    const existingAccessory = await this.prisma.rentalAccessory.findFirst({
      where: { id: accessoryId, equipmentId },
    });

    if (!existingAccessory) {
      throw new Error('Tartozék nem található');
    }

    const updateData: Prisma.RentalAccessoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.condition !== undefined) updateData.condition = this.toPrismaCondition(data.condition);
    if (data.isMandatory !== undefined) updateData.isRequired = data.isMandatory;
    if (data.replacementCost !== undefined) updateData.value = data.replacementCost;

    const updated = await this.prisma.rentalAccessory.update({
      where: { id: accessoryId },
      data: updateData,
    });

    return this.toAccessoryDomain(updated);
  }

  async removeAccessory(accessoryId: string, equipmentId: string, tenantId: string): Promise<void> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const accessory = await this.prisma.rentalAccessory.findUnique({
      where: { id: accessoryId },
    });

    if (!accessory || accessory.equipmentId !== equipmentId) {
      throw new Error('Tartozék nem található');
    }

    await this.prisma.rentalAccessory.delete({
      where: { id: accessoryId },
    });

    await this.addHistoryEntry({
      equipmentId,
      eventType: EquipmentEventType.ACCESSORY_REMOVED,
      performedBy: 'system',
      description: `Tartozék eltávolítva: ${accessory.name}`,
    });
  }

  // ============================================
  // HISTORY (stored in notes JSON field - similar to rental calculationBreakdown)
  // ============================================

  async getHistory(
    equipmentId: string,
    tenantId: string,
    limit?: number
  ): Promise<EquipmentHistoryEntry[]> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { id: equipmentId, tenantId },
      select: { id: true, notes: true },
    });

    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // Parse history from notes JSON field
    let historyData: { history?: Array<Record<string, unknown>> } = {};
    try {
      if (equipment.notes) {
        historyData = JSON.parse(equipment.notes);
      }
    } catch {
      // Notes is plain text, not JSON - return empty history
      return [];
    }

    const rawHistory = historyData.history ?? [];

    // Convert stored JSON records back to EquipmentHistoryEntry objects
    const history: EquipmentHistoryEntry[] = rawHistory.map(h => {
      const entry: EquipmentHistoryEntry = {
        id: h.id as string,
        equipmentId: h.equipmentId as string,
        eventType: h.eventType as EquipmentEventType,
        performedBy: h.performedBy as string,
        description: h.description as string,
        performedAt: new Date(h.performedAt as string),
      };
      // Restore optional fields
      if (h.previousStatus !== undefined) {
        entry.previousStatus = h.previousStatus as EquipmentStatus;
      }
      if (h.newStatus !== undefined) {
        entry.newStatus = h.newStatus as EquipmentStatus;
      }
      if (h.rentalId !== undefined) {
        entry.rentalId = h.rentalId as string;
      }
      if (h.serviceId !== undefined) {
        entry.serviceId = h.serviceId as string;
      }
      if (h.notes !== undefined) {
        entry.notes = h.notes as string;
      }
      return entry;
    });

    // Sort by performedAt descending (newest first)
    history.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

    return limit ? history.slice(0, limit) : history;
  }

  async addHistoryEntry(
    entry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'>
  ): Promise<EquipmentHistoryEntry> {
    const historyEntry: EquipmentHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      performedAt: new Date(),
    };

    // Get current equipment to read existing history
    const equipment = await this.prisma.rentalEquipment.findUnique({
      where: { id: entry.equipmentId },
      select: { notes: true, tenantId: true },
    });

    if (!equipment) {
      // Equipment might not exist yet during creation - just return entry
      return historyEntry;
    }

    // Parse existing data from notes
    let notesData: { history?: Array<Record<string, unknown>>; text?: string } = {};
    try {
      if (equipment.notes) {
        notesData = JSON.parse(equipment.notes);
      }
    } catch {
      // Notes is plain text - preserve it
      notesData = { text: equipment.notes ?? undefined };
    }

    const existingHistory = notesData.history ?? [];

    // Convert history entry to plain object for JSON storage
    const historyRecord: Record<string, unknown> = {
      id: historyEntry.id,
      equipmentId: historyEntry.equipmentId,
      eventType: historyEntry.eventType,
      performedBy: historyEntry.performedBy,
      description: historyEntry.description,
      performedAt: historyEntry.performedAt.toISOString(),
    };
    // Add optional fields only if defined
    if (historyEntry.previousStatus !== undefined) {
      historyRecord.previousStatus = historyEntry.previousStatus;
    }
    if (historyEntry.newStatus !== undefined) {
      historyRecord.newStatus = historyEntry.newStatus;
    }
    if (historyEntry.rentalId !== undefined) {
      historyRecord.rentalId = historyEntry.rentalId;
    }
    if (historyEntry.serviceId !== undefined) {
      historyRecord.serviceId = historyEntry.serviceId;
    }
    if (historyEntry.notes !== undefined) {
      historyRecord.notes = historyEntry.notes;
    }

    const updatedNotes = {
      ...notesData,
      history: [...existingHistory, historyRecord],
    };

    // Update equipment with new history
    await this.prisma.rentalEquipment.updateMany({
      where: { id: entry.equipmentId, tenantId: equipment.tenantId },
      data: {
        notes: JSON.stringify(updatedNotes),
        updatedAt: new Date(),
      },
    });

    return historyEntry;
  }

  // ============================================
  // MAINTENANCE (stored in notes JSON field)
  // ============================================

  async getMaintenanceRecords(params: MaintenanceQuery): Promise<MaintenanceRecord[]> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { id: params.equipmentId, tenantId: params.tenantId },
      select: { notes: true },
    });

    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // Parse maintenance from notes JSON field
    let notesData: { maintenance?: Array<Record<string, unknown>> } = {};
    try {
      if (equipment.notes) {
        notesData = JSON.parse(equipment.notes);
      }
    } catch {
      return [];
    }

    const rawMaintenance = notesData.maintenance ?? [];

    // Convert stored JSON records back to MaintenanceRecord objects
    let records: MaintenanceRecord[] = rawMaintenance.map(m => ({
      id: m.id as string,
      equipmentId: m.equipmentId as string,
      maintenanceType: m.maintenanceType as MaintenanceRecord['maintenanceType'],
      description: m.description as string,
      partsReplaced: m.partsReplaced as string[] | undefined,
      cost: m.cost as number,
      performedBy: m.performedBy as string,
      performedAt: new Date(m.performedAt as string),
      nextDueDate: m.nextDueDate ? new Date(m.nextDueDate as string) : undefined,
      notes: m.notes as string | undefined,
      createdAt: new Date(m.createdAt as string),
    }));

    // Apply filters
    if (params.fromDate) {
      records = records.filter(r => r.performedAt >= params.fromDate!);
    }
    if (params.toDate) {
      records = records.filter(r => r.performedAt <= params.toDate!);
    }

    // Sort by performedAt descending
    records.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    return params.limit ? records.slice(0, params.limit) : records;
  }

  async addMaintenanceRecord(
    equipmentId: string,
    tenantId: string,
    record: Omit<MaintenanceRecord, 'id' | 'equipmentId' | 'createdAt'>
  ): Promise<MaintenanceRecord> {
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: { id: equipmentId, tenantId },
      select: { notes: true, status: true },
    });

    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const maintenanceRecord: MaintenanceRecord = {
      ...record,
      id: crypto.randomUUID(),
      equipmentId,
      createdAt: new Date(),
    };

    // Parse existing data from notes
    let notesData: {
      maintenance?: Array<Record<string, unknown>>;
      history?: unknown;
      text?: string;
    } = {};
    try {
      if (equipment.notes) {
        notesData = JSON.parse(equipment.notes);
      }
    } catch {
      notesData = { text: equipment.notes ?? undefined };
    }

    const existingMaintenance = notesData.maintenance ?? [];

    // Convert maintenance record to plain object for JSON storage
    const maintenanceJson: Record<string, unknown> = {
      id: maintenanceRecord.id,
      equipmentId: maintenanceRecord.equipmentId,
      maintenanceType: maintenanceRecord.maintenanceType,
      description: maintenanceRecord.description,
      cost: maintenanceRecord.cost,
      performedBy: maintenanceRecord.performedBy,
      performedAt: maintenanceRecord.performedAt.toISOString(),
      createdAt: maintenanceRecord.createdAt.toISOString(),
    };
    if (maintenanceRecord.partsReplaced !== undefined) {
      maintenanceJson.partsReplaced = maintenanceRecord.partsReplaced;
    }
    if (maintenanceRecord.nextDueDate !== undefined) {
      maintenanceJson.nextDueDate = maintenanceRecord.nextDueDate.toISOString();
    }
    if (maintenanceRecord.notes !== undefined) {
      maintenanceJson.notes = maintenanceRecord.notes;
    }

    const updatedNotes = {
      ...notesData,
      maintenance: [...existingMaintenance, maintenanceJson],
    };

    // Determine new status
    const currentStatus = this.toDomainStatus(equipment.status as PrismaEquipmentStatus);
    const newStatus =
      currentStatus === EquipmentStatus.MAINTENANCE_REQUIRED ? ('AVAILABLE' as const) : undefined;

    // Update equipment with maintenance info
    await this.prisma.rentalEquipment.updateMany({
      where: { id: equipmentId, tenantId },
      data: {
        lastServiceDate: record.performedAt,
        nextServiceDate: record.nextDueDate,
        notes: JSON.stringify(updatedNotes),
        updatedAt: new Date(),
        status: newStatus,
      },
    });

    // Add history entry (with proper optional property handling)
    const historyEntry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'> = {
      equipmentId,
      eventType: EquipmentEventType.MAINTENANCE_PERFORMED,
      performedBy: record.performedBy,
      description: `Karbantartás elvégezve: ${record.maintenanceType} - ${record.description}`,
    };
    if (record.notes !== undefined) {
      historyEntry.notes = record.notes;
    }

    await this.addHistoryEntry(historyEntry);

    return maintenanceRecord;
  }

  async getEquipmentNeedingMaintenance(
    tenantId: string,
    daysThreshold = 7
  ): Promise<RentalEquipment[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const equipment = await this.prisma.rentalEquipment.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: [{ status: 'DAMAGED' }, { nextServiceDate: { lte: thresholdDate } }],
      },
      include: { product: true },
      orderBy: { nextServiceDate: 'asc' },
    });

    return equipment.map(e => this.toEquipmentDomain(e));
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(tenantId: string, locationId?: string): Promise<EquipmentStatistics> {
    const baseWhere: Prisma.RentalEquipmentWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (locationId) {
      baseWhere.AND = [
        {
          OR: [{ warehouseId: locationId }, { locationId }],
        },
      ];
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalEquipment,
      available,
      rented,
      inService,
      maintenanceRequired,
      maintenanceDue,
      revenue,
      statusCounts,
      conditionCounts,
    ] = await Promise.all([
      this.prisma.rentalEquipment.count({ where: baseWhere }),
      this.prisma.rentalEquipment.count({ where: { ...baseWhere, status: 'AVAILABLE' } }),
      this.prisma.rentalEquipment.count({ where: { ...baseWhere, status: 'RENTED' } }),
      this.prisma.rentalEquipment.count({ where: { ...baseWhere, status: 'IN_SERVICE' } }),
      this.prisma.rentalEquipment.count({ where: { ...baseWhere, status: 'DAMAGED' } }),
      this.prisma.rentalEquipment.count({
        where: { ...baseWhere, nextServiceDate: { lte: thirtyDaysFromNow } },
      }),
      this.prisma.rentalEquipment.aggregate({
        where: baseWhere,
        _sum: { totalRevenue: true },
      }),
      this.prisma.rentalEquipment.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      // M3 FIX: Add condition groupBy
      this.prisma.rentalEquipment.groupBy({
        by: ['condition'],
        where: baseWhere,
        _count: { condition: true },
      }),
    ]);

    // Build status counts
    const byStatus: Record<EquipmentStatus, number> = {
      [EquipmentStatus.AVAILABLE]: 0,
      [EquipmentStatus.RENTED]: 0,
      [EquipmentStatus.IN_SERVICE]: 0,
      [EquipmentStatus.RESERVED]: 0,
      [EquipmentStatus.DECOMMISSIONED]: 0,
      [EquipmentStatus.MAINTENANCE_REQUIRED]: 0,
    };

    for (const { status, _count } of statusCounts) {
      const domainStatus = this.toDomainStatus(status);
      byStatus[domainStatus] = (byStatus[domainStatus] ?? 0) + _count.status;
    }

    // M3 FIX: Build condition counts
    const byCondition: Record<EquipmentCondition, number> = {
      [EquipmentCondition.EXCELLENT]: 0,
      [EquipmentCondition.GOOD]: 0,
      [EquipmentCondition.FAIR]: 0,
      [EquipmentCondition.POOR]: 0,
      [EquipmentCondition.NEEDS_REPAIR]: 0,
    };

    for (const { condition, _count } of conditionCounts) {
      const domainCondition = this.toDomainCondition(condition);
      byCondition[domainCondition] = (byCondition[domainCondition] ?? 0) + _count.condition;
    }

    // M3 FIX: Get category counts via product join
    const equipmentWithProducts = await this.prisma.rentalEquipment.findMany({
      where: baseWhere,
      select: { product: { select: { category: true } } },
    });

    const byCategory: Record<string, number> = {};
    for (const eq of equipmentWithProducts) {
      const category = eq.product?.category ?? 'UNKNOWN';
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }

    const averageUtilization = totalEquipment > 0 ? (rented / totalEquipment) * 100 : 0;

    return {
      totalEquipment,
      byStatus,
      byCategory: byCategory as Record<EquipmentCategory, number>,
      byCondition,
      availableCount: available,
      rentedCount: rented,
      inServiceCount: inService,
      maintenanceDueCount: maintenanceRequired + maintenanceDue,
      totalRevenue: Number(revenue._sum.totalRevenue ?? 0),
      averageUtilization,
    };
  }

  async getAvailableEquipment(tenantId: string, locationId?: string): Promise<RentalEquipment[]> {
    const where: Prisma.RentalEquipmentWhereInput = {
      tenantId,
      isDeleted: false,
      status: 'AVAILABLE',
    };

    if (locationId) {
      where.OR = [{ warehouseId: locationId }, { locationId }];
    }

    const equipment = await this.prisma.rentalEquipment.findMany({
      where,
      include: { product: true },
      orderBy: { equipmentCode: 'asc' },
    });

    return equipment.map(e => this.toEquipmentDomain(e));
  }

  // ============================================
  // CODE GENERATION
  // ============================================

  async generateNextInventoryCode(tenantId: string, prefix = 'EQ'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}${year}-`;

    // Use transaction with SERIALIZABLE isolation
    return this.prisma.$transaction(
      async tx => {
        const lastEquipment = await tx.rentalEquipment.findFirst({
          where: {
            tenantId,
            equipmentCode: { startsWith: pattern },
          },
          orderBy: { equipmentCode: 'desc' },
        });

        let nextNum = 1;
        if (lastEquipment) {
          const match = lastEquipment.equipmentCode.match(/-(\d+)$/);
          if (match?.[1]) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }

        return `${pattern}${nextNum.toString().padStart(5, '0')}`;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  generateQrCode(tenantId: string, equipmentId: string): string {
    return `KGC:EQ:${tenantId}:${equipmentId}`;
  }

  // ============================================
  // UTILITIES
  // ============================================

  async serialNumberExists(serialNumber: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.rentalEquipment.count({
      where: { serialNumber, tenantId },
    });
    return count > 0;
  }

  async inventoryCodeExists(inventoryCode: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.rentalEquipment.count({
      where: { equipmentCode: inventoryCode, tenantId },
    });
    return count > 0;
  }
}
