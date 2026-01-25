/**
 * Prisma Rental Repository
 * Implements IRentalRepository for PostgreSQL persistence
 * Epic 14: Bérlés kiadás, visszavétel, díjkalkuláció
 */

import type {
  Rental,
  RentalExtension,
  RentalHistoryEntry,
  RentalStatistics,
  RentalStatus,
} from '@kgc/rental-core';
import {
  CreateRentalInput,
  DepositStatus,
  IRentalRepository,
  PricingTier,
  RentalQuery,
  RentalQueryResult,
  UpdateRentalInput,
} from '@kgc/rental-core';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Rental as PrismaRental,
  RentalExtension as PrismaRentalExtension,
  RentalStatus as PrismaRentalStatus,
} from '@prisma/client';

@Injectable()
export class PrismaRentalRepository implements IRentalRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toRentalDomain(rental: PrismaRental): Rental {
    const subtotal = Number(rental.subtotal);
    const discountAmount = Number(rental.discountAmount);
    const vatAmount = Number(rental.vatAmount);
    const lateFeeAmount = Number(rental.lateFeeAmount);
    const grandTotal = Number(rental.grandTotal);
    const netAmount = subtotal - discountAmount;
    const totalAmount = netAmount + vatAmount;
    const depositPaid = Number(rental.depositPaid);

    return {
      id: rental.id,
      tenantId: rental.tenantId,
      locationId: rental.warehouseId,
      rentalNumber: rental.rentalCode,
      customerId: rental.partnerId,
      customerName: '', // Will be joined separately if needed
      equipmentId: '', // From rental items
      equipmentName: '', // From rental items
      status: rental.status as unknown as RentalStatus,
      startDate: rental.startDate,
      expectedReturnDate: rental.expectedEnd,
      originalReturnDate: rental.expectedEnd, // Stored in calculationBreakdown
      actualReturnDate: rental.actualEnd ?? undefined,
      extensionCount: 0, // Calculate from extensions
      pricing: {
        tier: PricingTier.DAILY,
        dailyRate: 0, // From items
        weeklyRate: 0,
        monthlyRate: 0,
        durationDays: 0,
        grossAmount: subtotal,
        discountAmount,
        netAmount,
        vatRate: 0.27,
        vatAmount,
        totalAmount,
        lateFeeAmount,
        grandTotal,
      },
      discounts: [],
      depositAmount: Number(rental.depositRequired),
      depositStatus: depositPaid > 0 ? DepositStatus.COLLECTED : DepositStatus.PENDING,
      pickupChecklistVerified: rental.issuedAt !== null,
      returnChecklistVerified: rental.returnedAt !== null,
      pickedUpBy: rental.issuedBy ?? undefined,
      returnedBy: rental.returnedBy ?? undefined,
      notes: rental.notes ?? undefined,
      createdBy: rental.createdBy,
      createdAt: rental.createdAt,
      updatedAt: rental.updatedAt,
    };
  }

  private toExtensionDomain(ext: PrismaRentalExtension): RentalExtension {
    return {
      id: ext.id,
      rentalId: ext.rentalId,
      previousReturnDate: ext.previousEndDate,
      newReturnDate: ext.newEndDate,
      additionalDays: ext.extensionDays,
      additionalAmount: Number(ext.extensionAmount),
      reason: ext.notes ?? '',
      selfService: false, // TODO: Add to Prisma schema
      approvedBy: ext.approvedBy ?? undefined,
      paymentStatus: ext.approvedBy ? 'PAID' : 'PENDING',
      createdAt: ext.requestedAt,
    };
  }

  private mapStatusToPrisma(status: RentalStatus): PrismaRentalStatus {
    const statusMap: Record<string, PrismaRentalStatus> = {
      DRAFT: 'DRAFT',
      ACTIVE: 'ACTIVE',
      EXTENDED: 'ACTIVE', // Prisma doesn't have EXTENDED
      OVERDUE: 'OVERDUE',
      RETURNED: 'RETURNED',
      CANCELLED: 'CANCELLED',
      DISPUTED: 'CANCELLED', // Map to closest
      COMPLETED: 'COMPLETED',
      CONFIRMED: 'CONFIRMED',
    };
    return statusMap[status] ?? 'DRAFT';
  }

  clear(): void {
    // No-op for Prisma
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: RentalQuery): Promise<RentalQueryResult> {
    const where: Prisma.RentalWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.locationId) {
      where.warehouseId = params.locationId;
    }
    if (params.status) {
      where.status = this.mapStatusToPrisma(params.status);
    }
    if (params.customerId) {
      where.partnerId = params.customerId;
    }
    if (params.startDateFrom) {
      where.startDate = { gte: params.startDateFrom };
    }
    if (params.startDateTo) {
      where.startDate = { ...(where.startDate as object), lte: params.startDateTo };
    }
    if (params.overdueOnly) {
      where.status = 'ACTIVE';
      where.expectedEnd = { lt: new Date() };
    }
    if (params.search) {
      where.OR = [
        { rentalCode: { contains: params.search, mode: 'insensitive' } },
        { partner: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [rentals, total] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.rental.count({ where }),
    ]);

    return {
      rentals: rentals.map(r => this.toRentalDomain(r)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Rental | null> {
    const rental = await this.prisma.rental.findFirst({
      where: { id, tenantId },
    });
    return rental ? this.toRentalDomain(rental) : null;
  }

  async findByNumber(rentalNumber: string, tenantId: string): Promise<Rental | null> {
    const rental = await this.prisma.rental.findFirst({
      where: { rentalCode: rentalNumber, tenantId },
    });
    return rental ? this.toRentalDomain(rental) : null;
  }

  // ============================================
  // CREATE / UPDATE
  // ============================================

  async create(tenantId: string, data: CreateRentalInput, createdBy: string): Promise<Rental> {
    // Validate rental number doesn't exist
    if (await this.rentalNumberExists(data.rentalNumber, tenantId)) {
      throw new Error(`A bérlési szám már létezik: ${data.rentalNumber}`);
    }

    // Validate deposit amount
    if (data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    const rental = await this.prisma.rental.create({
      data: {
        tenantId,
        rentalCode: data.rentalNumber,
        partnerId: data.customerId,
        warehouseId: data.locationId,
        status: 'DRAFT',
        startDate: data.startDate,
        expectedEnd: data.expectedReturnDate,
        subtotal: data.pricing.grossAmount,
        discountAmount: data.pricing.discountAmount ?? 0,
        lateFeeAmount: 0,
        totalAmount: data.pricing.grandTotal,
        vatAmount: data.pricing.vatAmount,
        grandTotal: data.pricing.grandTotal,
        depositRequired: data.depositAmount,
        depositPaid: 0,
        depositReturned: 0,
        depositRetained: 0,
        notes: data.notes ?? null,
        createdBy,
        updatedBy: createdBy,
        calculationBreakdown: data.pricing as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toRentalDomain(rental);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRentalInput,
    updatedBy: string
  ): Promise<Rental> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Bérlés nem található');
    }

    const updateData: Record<string, unknown> = {
      updatedBy,
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = this.mapStatusToPrisma(data.status);
    }
    if (data.expectedReturnDate !== undefined) {
      updateData.expectedEnd = data.expectedReturnDate;
    }
    if (data.actualReturnDate !== undefined) {
      updateData.actualEnd = data.actualReturnDate;
      updateData.returnedAt = data.actualReturnDate;
    }
    if (data.returnedBy !== undefined) {
      updateData.returnedBy = data.returnedBy;
    }
    if (data.pickedUpBy !== undefined) {
      updateData.issuedBy = data.pickedUpBy;
      updateData.issuedAt = new Date();
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.lateFee !== undefined) {
      updateData.lateFeeAmount = data.lateFee.amount;
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.rental.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.RentalUpdateManyMutationInput,
    });

    if (result.count === 0) {
      throw new Error('Bérlés frissítése sikertelen');
    }

    // M3 FIX: Explicit null check instead of non-null assertion
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Bérlés nem található frissítés után');
    }
    return updated;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getActiveRentalsForCustomer(customerId: string, tenantId: string): Promise<Rental[]> {
    const rentals = await this.prisma.rental.findMany({
      where: {
        tenantId,
        partnerId: customerId,
        status: { in: ['ACTIVE', 'OVERDUE', 'CONFIRMED'] },
      },
      orderBy: { startDate: 'desc' },
    });
    return rentals.map(r => this.toRentalDomain(r));
  }

  async getActiveRentalsForEquipment(equipmentId: string, tenantId: string): Promise<Rental[]> {
    const rentals = await this.prisma.rental.findMany({
      where: {
        tenantId,
        items: { some: { equipmentId } },
        status: { in: ['DRAFT', 'ACTIVE', 'OVERDUE', 'CONFIRMED'] },
      },
      orderBy: { startDate: 'desc' },
    });
    return rentals.map(r => this.toRentalDomain(r));
  }

  async getOverdueRentals(tenantId: string, locationId?: string): Promise<Rental[]> {
    const where: Prisma.RentalWhereInput = {
      tenantId,
      status: 'ACTIVE',
      expectedEnd: { lt: new Date() },
    };
    if (locationId) {
      where.warehouseId = locationId;
    }

    const rentals = await this.prisma.rental.findMany({
      where,
      orderBy: { expectedEnd: 'asc' },
    });
    return rentals.map(r => this.toRentalDomain(r));
  }

  async getRentalsDueToday(tenantId: string, locationId?: string): Promise<Rental[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const where: Prisma.RentalWhereInput = {
      tenantId,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      expectedEnd: { gte: todayStart, lt: todayEnd },
    };
    if (locationId) {
      where.warehouseId = locationId;
    }

    const rentals = await this.prisma.rental.findMany({
      where,
      orderBy: { expectedEnd: 'asc' },
    });
    return rentals.map(r => this.toRentalDomain(r));
  }

  async getStatistics(tenantId: string, locationId?: string): Promise<RentalStatistics> {
    const baseWhere: Prisma.RentalWhereInput = { tenantId };
    if (locationId) {
      baseWhere.warehouseId = locationId;
    }

    const [total, active, overdue, returned, statusCounts, revenue] = await Promise.all([
      this.prisma.rental.count({ where: baseWhere }),
      this.prisma.rental.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      this.prisma.rental.count({
        where: { ...baseWhere, status: 'ACTIVE', expectedEnd: { lt: new Date() } },
      }),
      this.prisma.rental.count({
        where: {
          ...baseWhere,
          status: 'RETURNED',
          returnedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.countByStatus(tenantId),
      this.prisma.rental.aggregate({
        where: { ...baseWhere, status: { in: ['RETURNED', 'COMPLETED'] } },
        _sum: { grandTotal: true },
      }),
    ]);

    return {
      totalRentals: total,
      activeRentals: active,
      overdueRentals: overdue,
      returnedToday: returned,
      dueTodayCount: 0,
      totalRevenue: Number(revenue._sum.grandTotal ?? 0),
      averageRentalDays: 0,
      averageRentalValue: total > 0 ? Number(revenue._sum.grandTotal ?? 0) / total : 0,
      topEquipment: [],
      byStatus: statusCounts,
    };
  }

  async countByStatus(tenantId: string): Promise<Record<RentalStatus, number>> {
    const counts = await this.prisma.rental.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const result: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      EXTENDED: 0,
      OVERDUE: 0,
      RETURNED: 0,
      CANCELLED: 0,
      DISPUTED: 0,
    };

    for (const { status, _count } of counts) {
      result[status] = _count.status;
    }

    return result as Record<RentalStatus, number>;
  }

  // ============================================
  // NUMBER GENERATION
  // ============================================

  async generateNextNumber(tenantId: string, prefix = 'BER'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}${year}-`;

    // C3 FIX: Use transaction with SERIALIZABLE isolation to prevent race conditions
    return this.prisma.$transaction(
      async tx => {
        // Lock and read the last rental number in a single atomic operation
        const lastRental = await tx.rental.findFirst({
          where: {
            tenantId,
            rentalCode: { startsWith: pattern },
          },
          orderBy: { rentalCode: 'desc' },
        });

        let nextNum = 1;
        if (lastRental) {
          const match = lastRental.rentalCode.match(/-(\d+)$/);
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

  async rentalNumberExists(rentalNumber: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.rental.count({
      where: { rentalCode: rentalNumber, tenantId },
    });
    return count > 0;
  }

  // ============================================
  // EXTENSIONS
  // ============================================

  async addExtension(
    rentalId: string,
    tenantId: string,
    extension: Omit<RentalExtension, 'id' | 'rentalId' | 'createdAt'>
  ): Promise<RentalExtension> {
    // H1 FIX: Validate rental exists and belongs to tenant
    const rental = await this.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const ext = await this.prisma.rentalExtension.create({
      data: {
        rentalId,
        previousEndDate: extension.previousReturnDate,
        newEndDate: extension.newReturnDate,
        extensionDays: extension.additionalDays,
        extensionAmount: extension.additionalAmount,
        requestedBy: extension.approvedBy ?? null,
        approvedBy: extension.approvedBy ?? null,
        approvedAt: extension.approvedBy ? new Date() : null,
        notes: extension.reason ?? null,
      },
    });

    // Update rental expected end date
    await this.prisma.rental.updateMany({
      where: { id: rentalId, tenantId },
      data: { expectedEnd: extension.newReturnDate },
    });

    return this.toExtensionDomain(ext);
  }

  async getExtensions(rentalId: string, tenantId: string): Promise<RentalExtension[]> {
    // H1 FIX: Validate rental exists and belongs to tenant
    const rental = await this.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const extensions = await this.prisma.rentalExtension.findMany({
      where: { rentalId },
      orderBy: { requestedAt: 'desc' },
    });
    return extensions.map(e => this.toExtensionDomain(e));
  }

  // ============================================
  // HISTORY (stored as audit in separate table or JSON)
  // ============================================

  async addHistoryEntry(
    entry: Omit<RentalHistoryEntry, 'id' | 'performedAt'>
  ): Promise<RentalHistoryEntry> {
    // H3 FIX: Validate rental exists before adding history
    const rental = await this.prisma.rental.findUnique({
      where: { id: entry.rentalId },
      select: { id: true, calculationBreakdown: true, tenantId: true },
    });
    if (!rental) {
      throw new Error('Bérlés nem található a history bejegyzéshez');
    }

    const historyEntry: RentalHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      performedAt: new Date(),
    };

    // Store history in calculationBreakdown JSON field
    const existingBreakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
    const existingHistory = (existingBreakdown.history as Array<Record<string, unknown>>) ?? [];

    // Convert history entry to plain object for JSON storage
    const historyRecord: Record<string, unknown> = {
      id: historyEntry.id,
      rentalId: historyEntry.rentalId,
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
    if (historyEntry.previousValue !== undefined) {
      historyRecord.previousValue = historyEntry.previousValue;
    }
    if (historyEntry.newValue !== undefined) {
      historyRecord.newValue = historyEntry.newValue;
    }
    if (historyEntry.metadata !== undefined) {
      historyRecord.metadata = historyEntry.metadata;
    }

    const updatedBreakdown = {
      ...existingBreakdown,
      history: [...existingHistory, historyRecord],
    };

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.rental.updateMany({
      where: { id: entry.rentalId, tenantId: rental.tenantId },
      data: {
        calculationBreakdown: updatedBreakdown as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return historyEntry;
  }

  async getHistory(rentalId: string, tenantId: string): Promise<RentalHistoryEntry[]> {
    // H1 FIX: Validate rental exists and belongs to tenant
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { calculationBreakdown: true },
    });
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    // Read history from calculationBreakdown JSON field
    const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
    const rawHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

    // Convert stored JSON records back to RentalHistoryEntry objects
    const history: RentalHistoryEntry[] = rawHistory.map(h => {
      const entry: RentalHistoryEntry = {
        id: h.id as string,
        rentalId: h.rentalId as string,
        eventType: h.eventType as RentalHistoryEntry['eventType'],
        performedBy: h.performedBy as string,
        description: h.description as string,
        performedAt: new Date(h.performedAt as string),
      };
      // Restore optional fields
      if (h.previousStatus !== undefined) {
        entry.previousStatus = h.previousStatus as RentalStatus;
      }
      if (h.newStatus !== undefined) {
        entry.newStatus = h.newStatus as RentalStatus;
      }
      if (h.previousValue !== undefined) {
        entry.previousValue = h.previousValue as string;
      }
      if (h.newValue !== undefined) {
        entry.newValue = h.newValue as string;
      }
      if (h.metadata !== undefined) {
        entry.metadata = h.metadata as Record<string, unknown>;
      }
      return entry;
    });

    // Sort by performedAt descending (newest first)
    return history.sort(
      (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }
}
