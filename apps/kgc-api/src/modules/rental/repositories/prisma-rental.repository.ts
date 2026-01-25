/**
 * Prisma Rental Repository
 * Implements IRentalRepository for PostgreSQL persistence
 * Epic 14: Bérlés kiadás, visszavétel, díjkalkuláció
 * Story 14-3: Kedvezmény kezelés role-alapon
 */

import type {
  AppliedDiscount,
  Rental,
  RentalExtension,
  RentalHistoryEntry,
  RentalStatistics,
} from '@kgc/rental-core';
import {
  CreateRentalInput,
  DepositStatus,
  DiscountType,
  IRentalRepository,
  PricingTier,
  RentalEventType,
  RentalQuery,
  RentalQueryResult,
  RentalStatus,
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

// ============================================
// DISCOUNT INTERFACES (Epic 14-3)
// ============================================

/**
 * Partner discount info from database
 */
export interface IPartnerDiscountInfo {
  partnerId: string;
  partnerName: string;
  defaultDiscountPc: number;
  loyaltyTier?:
    | {
        tierId: string;
        tierCode: string;
        tierName: string;
        discountPercent: number;
      }
    | undefined;
}

/**
 * Discount application input
 */
export interface IApplyDiscountInput {
  type: DiscountType;
  name: string;
  percentage?: number;
  fixedAmount?: number;
  reason?: string;
}

/**
 * Discount limits by role
 */
export interface IDiscountLimits {
  maxPercentage: number;
  maxFixedAmount: number;
  requiresApproval: boolean;
  approvalThreshold: number;
}

/**
 * Role-based discount limits configuration
 * Higher roles can apply larger discounts
 */
const DISCOUNT_LIMITS_BY_ROLE: Record<string, IDiscountLimits> = {
  CASHIER: { maxPercentage: 5, maxFixedAmount: 1000, requiresApproval: true, approvalThreshold: 3 },
  SALES_REP: {
    maxPercentage: 10,
    maxFixedAmount: 5000,
    requiresApproval: true,
    approvalThreshold: 7,
  },
  STORE_MANAGER: {
    maxPercentage: 20,
    maxFixedAmount: 20000,
    requiresApproval: false,
    approvalThreshold: 15,
  },
  REGIONAL_MANAGER: {
    maxPercentage: 30,
    maxFixedAmount: 50000,
    requiresApproval: false,
    approvalThreshold: 25,
  },
  ADMIN: {
    maxPercentage: 50,
    maxFixedAmount: 100000,
    requiresApproval: false,
    approvalThreshold: 50,
  },
  SYSTEM: {
    maxPercentage: 100,
    maxFixedAmount: Infinity,
    requiresApproval: false,
    approvalThreshold: 100,
  },
};

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

  /**
   * Extend rental with full workflow (Epic 14-5)
   * Handles: validation, pricing recalculation, OVERDUE reset, audit trail
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param newReturnDate New expected return date
   * @param userId User extending the rental
   * @param reason Optional reason for extension
   */
  async extendRental(
    rentalId: string,
    tenantId: string,
    newReturnDate: Date,
    userId: string,
    reason?: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        // Get rental with validation
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            startDate: true,
            expectedEnd: true,
            subtotal: true,
            discountAmount: true,
            lateFeeAmount: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Validate status - only ACTIVE or OVERDUE can be extended
        if (rental.status !== 'ACTIVE' && rental.status !== 'OVERDUE') {
          throw new Error('Csak aktív vagy lejárt bérlés hosszabbítható');
        }

        // Validate new return date is after current expected date
        if (newReturnDate <= rental.expectedEnd) {
          throw new Error('Az új visszavételi dátum az eredetinél későbbi kell legyen');
        }

        const now = new Date();
        const previousEndDate = rental.expectedEnd;

        // Calculate extension days
        const extensionDays = Math.ceil(
          (newReturnDate.getTime() - previousEndDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate additional amount (pro-rata based on original daily rate)
        const originalDays = Math.max(
          1,
          Math.ceil(
            (previousEndDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
        const dailyRate = Number(rental.subtotal) / originalDays;
        const additionalAmount = Math.round(dailyRate * extensionDays);

        // Count existing extensions
        const existingExtensions = await tx.rentalExtension.count({
          where: { rentalId },
        });

        // Create extension record
        const extension = await tx.rentalExtension.create({
          data: {
            rentalId,
            previousEndDate,
            newEndDate: newReturnDate,
            extensionDays,
            extensionAmount: additionalAmount,
            requestedBy: userId,
            approvedBy: userId,
            approvedAt: now,
            notes: reason ?? null,
          },
        });

        // Calculate new totals
        const newSubtotal = Number(rental.subtotal) + additionalAmount;
        const discountAmount = Number(rental.discountAmount);
        const netAmount = newSubtotal - discountAmount;
        const newVatAmount = Math.round(netAmount * 0.27);
        const newGrandTotal = netAmount + newVatAmount;

        // Build audit trail
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];
        const existingExtensionsList =
          (breakdown.extensions as Array<Record<string, unknown>>) ?? [];

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: RentalEventType.EXTENDED,
          previousValue: previousEndDate.toISOString(),
          newValue: newReturnDate.toISOString(),
          performedBy: userId,
          description: `Bérlés hosszabbítva ${extensionDays} nappal (+${additionalAmount} Ft)`,
          metadata: {
            extensionId: extension.id,
            extensionNumber: existingExtensions + 1,
            extensionDays,
            additionalAmount,
            reason,
          },
          performedAt: now.toISOString(),
        };

        const extensionRecord = {
          id: extension.id,
          previousEndDate: previousEndDate.toISOString(),
          newEndDate: newReturnDate.toISOString(),
          extensionDays,
          additionalAmount,
          approvedBy: userId,
          approvedAt: now.toISOString(),
          reason,
        };

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];
        updatedBreakdown['extensions'] = [...existingExtensionsList, extensionRecord];

        // Determine new status (reset OVERDUE to ACTIVE if extended)
        const newStatus = rental.status === 'OVERDUE' ? 'ACTIVE' : rental.status;

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            status: newStatus,
            expectedEnd: newReturnDate,
            subtotal: newSubtotal,
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            lateFeeAmount: rental.status === 'OVERDUE' ? 0 : Number(rental.lateFeeAmount), // Clear late fee if extending overdue
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        // Return updated rental
        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 15000,
      }
    );
  }

  /**
   * Get extension history for a rental
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   */
  async getExtensionHistory(
    rentalId: string,
    tenantId: string
  ): Promise<
    Array<{
      id: string;
      previousEndDate: Date;
      newEndDate: Date;
      extensionDays: number;
      additionalAmount: number;
      approvedBy: string | null;
      approvedAt: Date | null;
      notes: string | null;
    }>
  > {
    // Validate rental exists and belongs to tenant
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { id: true },
    });
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const extensions = await this.prisma.rentalExtension.findMany({
      where: { rentalId },
      orderBy: { requestedAt: 'asc' },
      select: {
        id: true,
        previousEndDate: true,
        newEndDate: true,
        extensionDays: true,
        extensionAmount: true,
        approvedBy: true,
        approvedAt: true,
        notes: true,
      },
    });

    return extensions.map(e => ({
      id: e.id,
      previousEndDate: e.previousEndDate,
      newEndDate: e.newEndDate,
      extensionDays: e.extensionDays,
      additionalAmount: Number(e.extensionAmount),
      approvedBy: e.approvedBy,
      approvedAt: e.approvedAt,
      notes: e.notes,
    }));
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

  // ============================================
  // DISCOUNT METHODS (Epic 14-3)
  // ============================================

  /**
   * Get partner's eligible discounts (automatic discounts from partner + loyalty tier)
   * @param partnerId Partner ID
   * @param tenantId Tenant ID
   */
  async getPartnerDiscountInfo(
    partnerId: string,
    tenantId: string
  ): Promise<IPartnerDiscountInfo | null> {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, tenantId, isDeleted: false },
      select: {
        id: true,
        name: true,
        defaultDiscountPc: true,
        loyaltyTier: {
          select: {
            id: true,
            tierCode: true,
            tierName: true,
            discountPercent: true,
          },
        },
      },
    });

    if (!partner) {
      return null;
    }

    const result: IPartnerDiscountInfo = {
      partnerId: partner.id,
      partnerName: partner.name,
      defaultDiscountPc: Number(partner.defaultDiscountPc),
    };

    if (partner.loyaltyTier) {
      result.loyaltyTier = {
        tierId: partner.loyaltyTier.id,
        tierCode: partner.loyaltyTier.tierCode,
        tierName: partner.loyaltyTier.tierName,
        discountPercent: Number(partner.loyaltyTier.discountPercent),
      };
    }

    return result;
  }

  /**
   * Get discount limits for a user based on their role
   * @param userId User ID
   * @param tenantId Tenant ID
   */
  async getDiscountLimits(userId: string, tenantId: string): Promise<IDiscountLimits> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true },
    });

    if (!user) {
      // Default to most restrictive
      return (
        DISCOUNT_LIMITS_BY_ROLE['CASHIER'] ?? {
          maxPercentage: 5,
          maxFixedAmount: 1000,
          requiresApproval: true,
          approvalThreshold: 3,
        }
      );
    }

    // Map user role to discount limits
    const roleLimits = DISCOUNT_LIMITS_BY_ROLE[user.role];
    if (roleLimits) {
      return roleLimits;
    }

    // Default to SALES_REP if role not found
    return (
      DISCOUNT_LIMITS_BY_ROLE['SALES_REP'] ?? {
        maxPercentage: 10,
        maxFixedAmount: 5000,
        requiresApproval: true,
        approvalThreshold: 7,
      }
    );
  }

  /**
   * Apply discount to a rental
   * Validates user permission and stores discount in calculationBreakdown
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param discount Discount to apply
   * @param userId User applying the discount
   */
  async applyDiscount(
    rentalId: string,
    tenantId: string,
    discount: IApplyDiscountInput,
    userId: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        // Get rental with validation
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            subtotal: true,
            discountAmount: true,
            vatAmount: true,
            grandTotal: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Only allow discount on DRAFT or CONFIRMED rentals
        if (rental.status !== 'DRAFT' && rental.status !== 'CONFIRMED') {
          throw new Error('Kedvezmény csak vázlat vagy megerősített bérlésre adható');
        }

        // Validate discount limits
        const limits = await this.getDiscountLimits(userId, tenantId);
        const percentage = discount.percentage ?? 0;
        const fixedAmount = discount.fixedAmount ?? 0;

        // H1 FIX: Validate non-negative values
        if (percentage < 0) {
          throw new Error('Kedvezmény százalék nem lehet negatív');
        }
        if (fixedAmount < 0) {
          throw new Error('Kedvezmény összeg nem lehet negatív');
        }

        if (percentage > limits.maxPercentage) {
          throw new Error(`Maximum ${limits.maxPercentage}% kedvezmény adható a szerepkör alapján`);
        }

        if (fixedAmount > limits.maxFixedAmount) {
          throw new Error(
            `Maximum ${limits.maxFixedAmount} Ft kedvezmény adható a szerepkör alapján`
          );
        }

        // Calculate discount amount
        const subtotal = Number(rental.subtotal);
        const existingDiscountTotal = Number(rental.discountAmount);
        let calculatedAmount = 0;

        if (percentage > 0) {
          calculatedAmount = Math.round(subtotal * (percentage / 100));
        } else if (fixedAmount > 0) {
          calculatedAmount = fixedAmount;
        }

        // H2 FIX: Don't allow total discounts to exceed subtotal
        const newTotalDiscount = existingDiscountTotal + calculatedAmount;
        if (newTotalDiscount > subtotal) {
          const maxAllowed = subtotal - existingDiscountTotal;
          throw new Error(
            `Maximum ${maxAllowed} Ft további kedvezmény adható (már ${existingDiscountTotal} Ft kedvezmény van)`
          );
        }

        // Create applied discount record
        const discountId = crypto.randomUUID();
        const now = new Date();
        const appliedDiscount: AppliedDiscount = {
          id: discountId,
          type: discount.type,
          name: discount.name,
          calculatedAmount,
          appliedBy: userId,
          appliedAt: now,
        };
        if (discount.percentage !== undefined) {
          appliedDiscount.percentage = discount.percentage;
        }
        if (discount.fixedAmount !== undefined) {
          appliedDiscount.fixedAmount = discount.fixedAmount;
        }
        if (discount.reason !== undefined) {
          appliedDiscount.reason = discount.reason;
        }

        // Update calculationBreakdown with discounts array
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingDiscounts = (breakdown.discounts as AppliedDiscount[]) ?? [];
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        // Add new discount
        const updatedDiscounts = [...existingDiscounts, appliedDiscount];
        const totalDiscountAmount = updatedDiscounts.reduce(
          (sum, d) => sum + d.calculatedAmount,
          0
        );

        // Add history entry
        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: RentalEventType.DISCOUNT_APPLIED,
          performedBy: userId,
          description: `Kedvezmény: ${discount.name} (${calculatedAmount} Ft)`,
          metadata: { discountId, amount: calculatedAmount, type: discount.type },
          performedAt: now.toISOString(),
        };

        // Calculate new totals
        const newVatAmount = Math.round((subtotal - totalDiscountAmount) * 0.27);
        const newGrandTotal = subtotal - totalDiscountAmount + newVatAmount;

        // Build updated breakdown as JSON-serializable object
        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['discounts'] = updatedDiscounts;
        updatedBreakdown['history'] = [...existingHistory, historyEntry];

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            discountAmount: totalDiscountAmount,
            discountReason: updatedDiscounts.map(d => d.name).join(', '),
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        // Return updated rental
        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Remove a discount from a rental
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param discountId Discount ID to remove
   * @param userId User removing the discount
   */
  async removeDiscount(
    rentalId: string,
    tenantId: string,
    discountId: string,
    userId: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        // Get rental with validation
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            subtotal: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Only allow discount removal on DRAFT or CONFIRMED rentals
        if (rental.status !== 'DRAFT' && rental.status !== 'CONFIRMED') {
          throw new Error('Kedvezmény csak vázlat vagy megerősített bérlésről törölhető');
        }

        // Get existing discounts
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingDiscounts = (breakdown.discounts as AppliedDiscount[]) ?? [];
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        // Find discount to remove
        const discountIndex = existingDiscounts.findIndex(d => d.id === discountId);
        if (discountIndex === -1) {
          throw new Error('Kedvezmény nem található');
        }

        const removedDiscount = existingDiscounts[discountIndex];
        if (!removedDiscount) {
          throw new Error('Kedvezmény nem található');
        }

        // H3 FIX: Permission check - user can remove own discounts or if higher role
        const userLimits = await this.getDiscountLimits(userId, tenantId);
        const isOwnDiscount = removedDiscount.appliedBy === userId;
        const hasHigherPermission = userLimits.maxPercentage >= 20; // STORE_MANAGER or higher

        if (!isOwnDiscount && !hasHigherPermission) {
          throw new Error('Nincs jogosultság más által adott kedvezmény törléséhez');
        }

        // Remove discount
        const updatedDiscounts = existingDiscounts.filter(d => d.id !== discountId);
        const totalDiscountAmount = updatedDiscounts.reduce(
          (sum, d) => sum + d.calculatedAmount,
          0
        );

        // Add history entry
        const now = new Date();
        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'DISCOUNT_REMOVED',
          performedBy: userId,
          description: `Kedvezmény törölve: ${removedDiscount.name} (${removedDiscount.calculatedAmount} Ft)`,
          metadata: {
            discountId,
            amount: removedDiscount.calculatedAmount,
            type: removedDiscount.type,
          },
          performedAt: now.toISOString(),
        };

        // Calculate new totals
        const subtotal = Number(rental.subtotal);
        const newVatAmount = Math.round((subtotal - totalDiscountAmount) * 0.27);
        const newGrandTotal = subtotal - totalDiscountAmount + newVatAmount;

        // Build updated breakdown as JSON-serializable object
        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['discounts'] = updatedDiscounts;
        updatedBreakdown['history'] = [...existingHistory, historyEntry];

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            discountAmount: totalDiscountAmount,
            discountReason:
              updatedDiscounts.length > 0 ? updatedDiscounts.map(d => d.name).join(', ') : null,
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        // Return updated rental
        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Get all discounts applied to a rental
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   */
  async getAppliedDiscounts(rentalId: string, tenantId: string): Promise<AppliedDiscount[]> {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { calculationBreakdown: true },
    });

    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
    const discounts = (breakdown.discounts as AppliedDiscount[]) ?? [];

    // Convert stored records to AppliedDiscount objects
    return discounts.map(d => ({
      id: d.id,
      type: d.type as DiscountType,
      name: d.name,
      percentage: d.percentage,
      fixedAmount: d.fixedAmount,
      calculatedAmount: d.calculatedAmount,
      appliedBy: d.appliedBy,
      reason: d.reason,
      appliedAt: new Date(d.appliedAt),
    }));
  }

  /**
   * Apply automatic partner discounts (from partner.defaultDiscountPc and loyaltyTier)
   * Should be called when creating a rental
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param partnerId Partner ID
   * @param userId User creating the rental
   */
  async applyAutomaticDiscounts(
    rentalId: string,
    tenantId: string,
    partnerId: string,
    userId: string
  ): Promise<Rental> {
    const partnerInfo = await this.getPartnerDiscountInfo(partnerId, tenantId);
    if (!partnerInfo) {
      // No partner info, return rental as-is
      const rental = await this.prisma.rental.findFirst({ where: { id: rentalId, tenantId } });
      if (!rental) {
        throw new Error('Bérlés nem található');
      }
      return this.toRentalDomain(rental);
    }

    let result: Rental | null = null;

    // Apply partner default discount if exists
    if (partnerInfo.defaultDiscountPc > 0) {
      result = await this.applyDiscount(
        rentalId,
        tenantId,
        {
          type: DiscountType.CONTRACT,
          name: `Partner kedvezmény (${partnerInfo.partnerName})`,
          percentage: partnerInfo.defaultDiscountPc,
          reason: 'Automatikus partner kedvezmény',
        },
        userId
      );
    }

    // Apply loyalty tier discount if exists
    if (partnerInfo.loyaltyTier && partnerInfo.loyaltyTier.discountPercent > 0) {
      result = await this.applyDiscount(
        rentalId,
        tenantId,
        {
          type: DiscountType.LOYALTY,
          name: `Törzsvendég: ${partnerInfo.loyaltyTier.tierName}`,
          percentage: partnerInfo.loyaltyTier.discountPercent,
          reason: `${partnerInfo.loyaltyTier.tierCode} szint kedvezmény`,
        },
        userId
      );
    }

    // If no discounts applied, return rental
    if (!result) {
      const rental = await this.prisma.rental.findFirst({ where: { id: rentalId, tenantId } });
      if (!rental) {
        throw new Error('Bérlés nem található');
      }
      return this.toRentalDomain(rental);
    }

    return result;
  }

  /**
   * Validate if user can apply a specific discount percentage
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param percentage Requested discount percentage
   */
  async canApplyDiscount(
    userId: string,
    tenantId: string,
    percentage: number
  ): Promise<{ allowed: boolean; maxAllowed: number; requiresApproval: boolean }> {
    const limits = await this.getDiscountLimits(userId, tenantId);

    return {
      allowed: percentage <= limits.maxPercentage,
      maxAllowed: limits.maxPercentage,
      requiresApproval: limits.requiresApproval && percentage > limits.approvalThreshold,
    };
  }

  // ============================================
  // RETURN WORKFLOW METHODS (Epic 14-4)
  // ============================================

  /**
   * Process rental return with full workflow
   * Handles: status change, late fee, deposit, audit trail
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param input Return workflow input
   * @param userId User processing the return
   */
  async processReturn(
    rentalId: string,
    tenantId: string,
    input: {
      returnDate: Date;
      returnedBy: string;
      accessoryChecklistVerified: boolean;
      conditionNotes?: string;
      damageReport?: string;
      depositAction: 'RETURN' | 'RETAIN_PARTIAL' | 'RETAIN_FULL';
      depositRetainedAmount?: number;
      depositRetainReason?: string;
    },
    userId: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        // Get rental with validation
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            startDate: true,
            expectedEnd: true,
            subtotal: true,
            discountAmount: true,
            vatAmount: true,
            grandTotal: true,
            depositRequired: true,
            depositPaid: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Validate status
        if (
          rental.status !== 'ACTIVE' &&
          rental.status !== 'OVERDUE' &&
          rental.status !== 'CONFIRMED'
        ) {
          throw new Error('Csak aktív, lejárt vagy megerősített bérlés vehető vissza');
        }

        // Validate checklist
        if (!input.accessoryChecklistVerified) {
          throw new Error('A tartozék checklist ellenőrzés kötelező');
        }

        const now = new Date();
        const returnDate = input.returnDate;

        // Calculate late fee if overdue
        let lateFeeAmount = 0;
        let lateFeeDetails: Record<string, unknown> | undefined;

        if (returnDate > rental.expectedEnd) {
          const daysOverdue = Math.ceil(
            (returnDate.getTime() - rental.expectedEnd.getTime()) / (1000 * 60 * 60 * 24)
          );

          // 2 hour grace period
          const hoursLate =
            (returnDate.getTime() - rental.expectedEnd.getTime()) / (1000 * 60 * 60);
          if (hoursLate > 2) {
            // Late fee: 50% of daily rate per day, capped at 30 days
            const dailyRate =
              Number(rental.subtotal) /
              Math.max(
                1,
                Math.ceil(
                  (rental.expectedEnd.getTime() - rental.startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
            const effectiveDays = Math.min(daysOverdue, 30);
            lateFeeAmount = Math.round(dailyRate * 0.5 * effectiveDays);

            lateFeeDetails = {
              daysOverdue,
              effectiveDays,
              dailyRate,
              lateFeeRate: 0.5,
              amount: lateFeeAmount,
              cappedAt30Days: daysOverdue > 30,
            };
          }
        }

        // Handle deposit
        const depositPaid = Number(rental.depositPaid);
        let depositReturned = 0;
        let depositRetained = 0;

        switch (input.depositAction) {
          case 'RETURN':
            depositReturned = depositPaid;
            break;
          case 'RETAIN_PARTIAL':
            depositRetained = input.depositRetainedAmount ?? 0;
            depositReturned = Math.max(0, depositPaid - depositRetained);
            break;
          case 'RETAIN_FULL':
            depositRetained = depositPaid;
            break;
        }

        // Calculate new totals
        const subtotal = Number(rental.subtotal);
        const discountAmount = Number(rental.discountAmount);
        const netAmount = subtotal - discountAmount;
        const newVatAmount = Math.round((netAmount + lateFeeAmount) * 0.27);
        const newGrandTotal = netAmount + lateFeeAmount + newVatAmount;

        // Build audit trail
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: RentalEventType.RETURNED,
          performedBy: userId,
          description:
            lateFeeAmount > 0
              ? `Bérlés visszavéve ${lateFeeAmount} Ft késedelmi díjjal`
              : 'Bérlés visszavéve',
          metadata: {
            returnDate: returnDate.toISOString(),
            returnedBy: input.returnedBy,
            lateFeeAmount,
            depositAction: input.depositAction,
            depositReturned,
            depositRetained,
            damageReport: input.damageReport,
          },
          performedAt: now.toISOString(),
        };

        // Build updated breakdown
        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];
        if (lateFeeDetails) {
          updatedBreakdown['lateFee'] = lateFeeDetails;
        }
        updatedBreakdown['returnInfo'] = {
          returnDate: returnDate.toISOString(),
          returnedBy: input.returnedBy,
          conditionNotes: input.conditionNotes,
          damageReport: input.damageReport,
          depositAction: input.depositAction,
          depositRetainReason: input.depositRetainReason,
        };

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            status: 'RETURNED',
            actualEnd: returnDate,
            returnedAt: now,
            returnedBy: input.returnedBy,
            returnNotes: input.conditionNotes ?? null,
            damageReport: input.damageReport ?? null,
            lateFeeAmount,
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            depositReturned,
            depositRetained,
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        // Return updated rental
        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 15000,
      }
    );
  }

  /**
   * Mark rental as overdue
   * Called by scheduled job for rentals past expectedReturnDate
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param userId System user ID
   */
  async markAsOverdue(rentalId: string, tenantId: string, userId: string): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            status: true,
            expectedEnd: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        if (rental.status !== 'ACTIVE') {
          throw new Error('Csak aktív bérlés jelölhető lejártnak');
        }

        const now = new Date();
        if (rental.expectedEnd >= now) {
          throw new Error('A bérlés még nem járt le');
        }

        // Add history entry
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'STATUS_CHANGED',
          previousStatus: 'ACTIVE',
          newStatus: 'OVERDUE',
          performedBy: userId,
          description: 'Bérlés automatikusan lejártnak jelölve',
          performedAt: now.toISOString(),
        };

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];

        await tx.rental.update({
          where: { id: rentalId },
          data: {
            status: 'OVERDUE',
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Get rentals pending return (due today or overdue)
   * @param tenantId Tenant ID
   * @param locationId Optional location filter
   */
  async getRentalsPendingReturn(tenantId: string, locationId?: string): Promise<Rental[]> {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const where: Prisma.RentalWhereInput = {
      tenantId,
      status: { in: ['ACTIVE', 'OVERDUE'] },
      expectedEnd: { lte: todayEnd },
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

  /**
   * Cancel a rental (only DRAFT or CONFIRMED status)
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param reason Cancellation reason
   * @param userId User cancelling
   */
  async cancelRental(
    rentalId: string,
    tenantId: string,
    reason: string,
    userId: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            status: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        if (rental.status !== 'DRAFT' && rental.status !== 'CONFIRMED') {
          throw new Error('Csak vázlat vagy megerősített bérlés mondható le');
        }

        const now = new Date();
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'CANCELLED',
          previousStatus: rental.status,
          newStatus: 'CANCELLED',
          performedBy: userId,
          description: `Bérlés lemondva: ${reason}`,
          performedAt: now.toISOString(),
        };

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];
        updatedBreakdown['cancellation'] = {
          reason,
          cancelledBy: userId,
          cancelledAt: now.toISOString(),
        };

        await tx.rental.update({
          where: { id: rentalId },
          data: {
            status: 'CANCELLED',
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  // ============================================
  // LATE FEE METHODS (Epic 14-6)
  // ============================================

  /**
   * Late fee configuration interface
   */
  private readonly DEFAULT_LATE_FEE_CONFIG = {
    gracePeriodHours: 2,
    dailyRateMultiplier: 0.5, // 50% of daily rate
    maxDays: 30, // Cap at 30 days
    minFee: 500, // Minimum 500 Ft
  };

  /**
   * Get late fee configuration for tenant
   * Can be extended to read from tenant settings table
   * @param tenantId Tenant ID
   */
  async getLateFeeConfig(tenantId: string): Promise<{
    gracePeriodHours: number;
    dailyRateMultiplier: number;
    maxDays: number;
    minFee: number;
  }> {
    // Future: read from tenant settings
    // For now, return default config
    // Using tenantId to allow tenant-specific config in the future
    void tenantId;
    return { ...this.DEFAULT_LATE_FEE_CONFIG };
  }

  /**
   * Calculate late fee for a rental without applying
   * Pure calculation for display/preview
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param returnDate Proposed return date (defaults to now)
   */
  async calculateLateFee(
    rentalId: string,
    tenantId: string,
    returnDate?: Date
  ): Promise<{
    isOverdue: boolean;
    daysOverdue: number;
    hoursLate: number;
    gracePeriodExceeded: boolean;
    dailyRate: number;
    lateFeeAmount: number;
    effectiveDays: number;
    cappedAt30Days: boolean;
    breakdown: {
      originalDuration: number;
      subtotal: number;
      expectedEnd: Date;
      actualReturn: Date;
    };
  }> {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: {
        id: true,
        status: true,
        startDate: true,
        expectedEnd: true,
        subtotal: true,
      },
    });

    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const config = await this.getLateFeeConfig(tenantId);
    const actualReturn = returnDate ?? new Date();
    const expectedEnd = rental.expectedEnd;
    const subtotal = Number(rental.subtotal);

    // Calculate original duration
    const originalDuration = Math.max(
      1,
      Math.ceil((expectedEnd.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate daily rate
    const dailyRate = subtotal / originalDuration;

    // Check if overdue
    const isOverdue = actualReturn > expectedEnd;
    const hoursLate = isOverdue
      ? (actualReturn.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60)
      : 0;
    const daysOverdue = isOverdue
      ? Math.ceil((actualReturn.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Grace period check
    const gracePeriodExceeded = hoursLate > config.gracePeriodHours;

    // Calculate late fee
    let lateFeeAmount = 0;
    let effectiveDays = 0;
    const cappedAt30Days = daysOverdue > config.maxDays;

    if (isOverdue && gracePeriodExceeded) {
      effectiveDays = Math.min(daysOverdue, config.maxDays);
      lateFeeAmount = Math.round(dailyRate * config.dailyRateMultiplier * effectiveDays);

      // Apply minimum fee
      if (lateFeeAmount < config.minFee && lateFeeAmount > 0) {
        lateFeeAmount = config.minFee;
      }
    }

    return {
      isOverdue,
      daysOverdue,
      hoursLate: Math.round(hoursLate * 100) / 100,
      gracePeriodExceeded,
      dailyRate: Math.round(dailyRate),
      lateFeeAmount,
      effectiveDays,
      cappedAt30Days,
      breakdown: {
        originalDuration,
        subtotal,
        expectedEnd,
        actualReturn,
      },
    };
  }

  /**
   * Waive late fee for a rental
   * Requires STORE_MANAGER or higher permission
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param reason Waive reason (mandatory)
   * @param userId User waiving the fee (must be STORE_MANAGER+)
   */
  async waiveLateFee(
    rentalId: string,
    tenantId: string,
    reason: string,
    userId: string
  ): Promise<Rental> {
    if (!reason || reason.trim().length < 10) {
      throw new Error('A késedelmi díj elengedés indoklása kötelező (min. 10 karakter)');
    }

    // M3 FIX: Use explicit permission check instead of discount limits as proxy
    const hasPermission = await this.canWaiveLateFee(userId, tenantId);
    if (!hasPermission) {
      throw new Error('Csak üzletvezető vagy magasabb jogkörrel engedhető el késedelmi díj');
    }

    return await this.prisma.$transaction(
      async tx => {
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            lateFeeAmount: true,
            subtotal: true,
            discountAmount: true,
            vatAmount: true,
            grandTotal: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Validate status - can waive on RETURNED, OVERDUE, or ACTIVE
        const allowedStatuses = ['RETURNED', 'OVERDUE', 'ACTIVE'];
        if (!allowedStatuses.includes(rental.status)) {
          throw new Error(
            'Késedelmi díj csak aktív, lejárt vagy visszavett bérlésből engedhető el'
          );
        }

        const currentLateFee = Number(rental.lateFeeAmount);
        if (currentLateFee <= 0) {
          throw new Error('Nincs késedelmi díj elengedésre');
        }

        const now = new Date();

        // Recalculate totals without late fee
        const subtotal = Number(rental.subtotal);
        const discountAmount = Number(rental.discountAmount);
        const netAmount = subtotal - discountAmount;
        const newVatAmount = Math.round(netAmount * 0.27);
        const newGrandTotal = netAmount + newVatAmount;

        // Build audit trail
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];
        const existingWaivers = (breakdown.lateFeeWaivers as Array<Record<string, unknown>>) ?? [];

        const waiverRecord = {
          id: crypto.randomUUID(),
          waivedAmount: currentLateFee,
          waivedBy: userId,
          waivedAt: now.toISOString(),
          reason: reason.trim(),
        };

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'LATE_FEE_WAIVED',
          performedBy: userId,
          description: `Késedelmi díj elengedve: ${currentLateFee} Ft - ${reason.trim()}`,
          metadata: {
            waivedAmount: currentLateFee,
            reason: reason.trim(),
            previousGrandTotal: Number(rental.grandTotal),
            newGrandTotal,
          },
          performedAt: now.toISOString(),
        };

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];
        updatedBreakdown['lateFeeWaivers'] = [...existingWaivers, waiverRecord];
        updatedBreakdown['lateFeeWaived'] = true;

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            lateFeeAmount: 0,
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Apply late fee to an overdue rental
   * Called when rental is returned or manually triggered
   * H1 FIX: All calculation done INSIDE transaction to prevent race conditions
   * M4 FIX: Check for existing late fee to prevent double application
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param returnDate The date used for calculation
   * @param userId User applying the fee
   */
  async applyLateFee(
    rentalId: string,
    tenantId: string,
    returnDate: Date,
    userId: string
  ): Promise<Rental> {
    const config = await this.getLateFeeConfig(tenantId);

    return await this.prisma.$transaction(
      async tx => {
        // H1 FIX: Read rental data INSIDE transaction
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            startDate: true,
            expectedEnd: true,
            lateFeeAmount: true,
            subtotal: true,
            discountAmount: true,
            vatAmount: true,
            grandTotal: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Validate status
        const allowedStatuses = ['ACTIVE', 'OVERDUE'];
        if (!allowedStatuses.includes(rental.status)) {
          throw new Error('Késedelmi díj csak aktív vagy lejárt bérlésre alkalmazható');
        }

        // M4 FIX: Check for existing late fee to prevent double application
        const currentLateFee = Number(rental.lateFeeAmount);
        if (currentLateFee > 0) {
          throw new Error(
            'Késedelmi díj már alkalmazva van. Használja a módosítás vagy törlés funkciót.'
          );
        }

        // H1 FIX: Calculate late fee INSIDE transaction using fresh data
        const actualReturn = returnDate;
        const expectedEnd = rental.expectedEnd;
        const subtotal = Number(rental.subtotal);
        const discountAmount = Number(rental.discountAmount);

        // Calculate original duration
        const originalDuration = Math.max(
          1,
          Math.ceil((expectedEnd.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        const dailyRate = subtotal / originalDuration;

        // Check if overdue
        const isOverdue = actualReturn > expectedEnd;
        const hoursLate = isOverdue
          ? (actualReturn.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60)
          : 0;
        const daysOverdue = isOverdue
          ? Math.ceil((actualReturn.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const gracePeriodExceeded = hoursLate > config.gracePeriodHours;

        if (!isOverdue || !gracePeriodExceeded) {
          throw new Error('A bérlés nem lejárt vagy a türelmi idő nem járt le');
        }

        // Calculate late fee amount
        const effectiveDays = Math.min(daysOverdue, config.maxDays);
        let newLateFeeAmount = Math.round(dailyRate * config.dailyRateMultiplier * effectiveDays);
        if (newLateFeeAmount < config.minFee && newLateFeeAmount > 0) {
          newLateFeeAmount = config.minFee;
        }

        if (newLateFeeAmount <= 0) {
          throw new Error('Nincs alkalmazandó késedelmi díj');
        }

        const now = new Date();
        const cappedAt30Days = daysOverdue > config.maxDays;

        // Recalculate totals with late fee
        const netAmount = subtotal - discountAmount;
        const newVatAmount = Math.round((netAmount + newLateFeeAmount) * 0.27);
        const newGrandTotal = netAmount + newLateFeeAmount + newVatAmount;

        // Build audit trail
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        const historyEntry = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'LATE_FEE_APPLIED',
          performedBy: userId,
          description: `Késedelmi díj alkalmazva: ${newLateFeeAmount} Ft (${effectiveDays} nap)`,
          metadata: {
            isOverdue,
            daysOverdue,
            hoursLate: Math.round(hoursLate * 100) / 100,
            gracePeriodExceeded,
            dailyRate: Math.round(dailyRate),
            lateFeeAmount: newLateFeeAmount,
            effectiveDays,
            cappedAt30Days,
            breakdown: {
              originalDuration,
              subtotal,
              expectedEnd: expectedEnd.toISOString(),
              actualReturn: actualReturn.toISOString(),
            },
          },
          performedAt: now.toISOString(),
        };

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];
        updatedBreakdown['lateFee'] = {
          daysOverdue,
          effectiveDays,
          dailyRate: Math.round(dailyRate),
          lateFeeRate: config.dailyRateMultiplier,
          amount: newLateFeeAmount,
          cappedAt30Days,
          appliedAt: now.toISOString(),
          appliedBy: userId,
        };

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            lateFeeAmount: newLateFeeAmount,
            vatAmount: newVatAmount,
            grandTotal: newGrandTotal,
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        const updated = await tx.rental.findUnique({ where: { id: rentalId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Get late fee waiver history for a rental
   * M5 FIX: Added runtime validation for waiver records
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   */
  async getLateFeeWaivers(
    rentalId: string,
    tenantId: string
  ): Promise<
    Array<{
      id: string;
      waivedAmount: number;
      waivedBy: string;
      waivedAt: Date;
      reason: string;
    }>
  > {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { calculationBreakdown: true },
    });

    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
    const waivers = (breakdown.lateFeeWaivers as Array<Record<string, unknown>>) ?? [];

    // M5 FIX: Validate and safely convert each waiver record
    return waivers
      .filter(w => {
        // Skip invalid records instead of crashing
        if (!w || typeof w !== 'object') return false;
        if (!w.id || !w.waivedAt) return false;
        return true;
      })
      .map(w => ({
        id: String(w.id),
        waivedAmount:
          typeof w.waivedAmount === 'number' ? w.waivedAmount : Number(w.waivedAmount) || 0,
        waivedBy: String(w.waivedBy ?? 'unknown'),
        waivedAt: new Date(String(w.waivedAt)),
        reason: String(w.reason ?? ''),
      }));
  }

  /**
   * Check if user has permission to waive late fees
   * M3 FIX: Explicit permission check instead of using discount limits as proxy
   * @param userId User ID
   * @param tenantId Tenant ID
   */
  async canWaiveLateFee(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Roles that can waive late fees
    const waiveAllowedRoles = [
      'STORE_MANAGER',
      'REGIONAL_MANAGER',
      'FRANCHISE_OWNER',
      'ADMIN',
      'SYSTEM',
    ];
    return waiveAllowedRoles.includes(user.role);
  }

  // ============================================
  // STATUS & AUDIT METHODS (Epic 14-7)
  // ============================================

  /**
   * Valid status transitions for rental state machine
   * Based on ADR-037 rental lifecycle
   */
  private readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['OVERDUE', 'RETURNED', 'EXTENDED', 'CANCELLED'],
    EXTENDED: ['OVERDUE', 'RETURNED', 'CANCELLED'],
    OVERDUE: ['ACTIVE', 'RETURNED', 'EXTENDED'], // ACTIVE only via extension
    RETURNED: ['COMPLETED', 'DISPUTED'],
    DISPUTED: ['RETURNED', 'COMPLETED'],
    COMPLETED: [], // Terminal state
    CANCELLED: [], // Terminal state
  };

  /**
   * Validate if status transition is allowed
   * @param fromStatus Current status
   * @param toStatus Target status
   */
  validateStatusTransition(
    fromStatus: string,
    toStatus: string
  ): {
    valid: boolean;
    allowedTransitions: string[];
    reason?: string;
  } {
    const allowed = this.STATUS_TRANSITIONS[fromStatus] ?? [];
    const isValid = allowed.includes(toStatus);

    const result: {
      valid: boolean;
      allowedTransitions: string[];
      reason?: string;
    } = {
      valid: isValid,
      allowedTransitions: allowed,
    };

    // Conditionally add reason to satisfy exactOptionalPropertyTypes
    if (!isValid) {
      result.reason = `Átmenet ${fromStatus} → ${toStatus} nem engedélyezett`;
    }

    return result;
  }

  /**
   * Change rental status with explicit validation and audit trail
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   * @param newStatus Target status
   * @param userId User performing the change
   * @param reason Optional reason for status change
   */
  async changeStatus(
    rentalId: string,
    tenantId: string,
    newStatus: string,
    userId: string,
    reason?: string
  ): Promise<Rental> {
    return await this.prisma.$transaction(
      async tx => {
        const rental = await tx.rental.findFirst({
          where: { id: rentalId, tenantId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            calculationBreakdown: true,
          },
        });

        if (!rental) {
          throw new Error('Bérlés nem található');
        }

        // Validate transition
        const validation = this.validateStatusTransition(rental.status, newStatus);
        if (!validation.valid) {
          throw new Error(validation.reason ?? 'Érvénytelen státusz átmenet');
        }

        const now = new Date();

        // Build audit trail
        const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
        const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

        const historyEntry: Record<string, unknown> = {
          id: crypto.randomUUID(),
          rentalId,
          eventType: 'STATUS_CHANGED',
          previousStatus: rental.status,
          newStatus,
          performedBy: userId,
          description: reason
            ? `Státusz: ${rental.status} → ${newStatus}: ${reason}`
            : `Státusz: ${rental.status} → ${newStatus}`,
          performedAt: now.toISOString(),
        };

        if (reason) {
          historyEntry.metadata = { reason };
        }

        const updatedBreakdown: Record<string, unknown> = { ...breakdown };
        updatedBreakdown['history'] = [...existingHistory, historyEntry];

        // Update rental
        await tx.rental.update({
          where: { id: rentalId },
          data: {
            status: this.mapStatusToPrisma(newStatus as RentalStatus),
            calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
            updatedBy: userId,
            updatedAt: now,
          },
        });

        // M6 FIX: Use findFirst with tenantId for defense-in-depth
        const updated = await tx.rental.findFirst({ where: { id: rentalId, tenantId } });
        if (!updated) {
          throw new Error('Frissített bérlés nem található');
        }
        return this.toRentalDomain(updated);
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Bulk update status for scheduled jobs (e.g., marking overdue rentals)
   * @param tenantId Tenant ID
   * @param fromStatus Current status filter
   * @param toStatus Target status
   * @param condition Additional condition (e.g., expectedEnd < now)
   * @param userId System user ID
   */
  async bulkUpdateStatus(
    tenantId: string,
    fromStatus: string,
    toStatus: string,
    condition: 'OVERDUE_CHECK' | 'COMPLETE_RETURNED',
    userId: string
  ): Promise<{ updated: number; errors: Array<{ rentalId: string; error: string }> }> {
    // Validate transition
    const validation = this.validateStatusTransition(fromStatus, toStatus);
    if (!validation.valid) {
      throw new Error(validation.reason ?? 'Érvénytelen státusz átmenet');
    }

    const now = new Date();
    const whereCondition: Prisma.RentalWhereInput = {
      tenantId,
      status: this.mapStatusToPrisma(fromStatus as RentalStatus),
    };

    // Apply condition-specific filters
    switch (condition) {
      case 'OVERDUE_CHECK':
        whereCondition.expectedEnd = { lt: now };
        break;
      case 'COMPLETE_RETURNED':
        // Rentals returned more than 24 hours ago
        whereCondition.returnedAt = {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        };
        break;
    }

    // H1 FIX: Use transaction with RepeatableRead for consistency
    return await this.prisma.$transaction(
      async tx => {
        // Find matching rentals inside transaction
        const rentals = await tx.rental.findMany({
          where: whereCondition,
          select: { id: true, tenantId: true, calculationBreakdown: true },
          take: 500, // H2 FIX: Limit batch size to prevent memory issues
        });

        const errors: Array<{ rentalId: string; error: string }> = [];
        let updated = 0;

        // Process each rental individually to maintain audit trail
        for (const rental of rentals) {
          // M6 FIX: Verify tenantId match (defense in depth)
          if (rental.tenantId !== tenantId) {
            errors.push({ rentalId: rental.id, error: 'Tenant mismatch' });
            continue;
          }

          try {
            const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
            const existingHistory = (breakdown.history as Array<Record<string, unknown>>) ?? [];

            const historyEntry = {
              id: crypto.randomUUID(),
              rentalId: rental.id,
              eventType: 'STATUS_CHANGED',
              previousStatus: fromStatus,
              newStatus: toStatus,
              performedBy: userId,
              description: `Automatikus státusz váltás (${condition})`,
              metadata: { bulkOperation: true, condition },
              performedAt: now.toISOString(),
            };

            const updatedBreakdown: Record<string, unknown> = { ...breakdown };
            updatedBreakdown['history'] = [...existingHistory, historyEntry];

            await tx.rental.update({
              where: { id: rental.id },
              data: {
                status: this.mapStatusToPrisma(toStatus as RentalStatus),
                calculationBreakdown: updatedBreakdown as Prisma.InputJsonValue,
                updatedBy: userId,
                updatedAt: now,
              },
            });

            updated++;
          } catch (err) {
            errors.push({
              rentalId: rental.id,
              error: err instanceof Error ? err.message : 'Ismeretlen hiba',
            });
          }
        }

        return { updated, errors };
      },
      {
        isolationLevel: 'RepeatableRead',
        maxWait: 10000,
        timeout: 60000, // Longer timeout for batch operations
      }
    );
  }

  /**
   * Get audit statistics for a period
   * @param tenantId Tenant ID
   * @param startDate Start of period
   * @param endDate End of period
   * @param locationId Optional location filter
   */
  async getAuditStatistics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string
  ): Promise<{
    totalEvents: number;
    byEventType: Record<string, number>;
    byUser: Record<string, { userId: string; eventCount: number }>;
    recentEvents: Array<{
      rentalId: string;
      rentalCode: string;
      eventType: string;
      performedBy: string;
      performedAt: Date;
      description: string;
    }>;
  }> {
    const where: Prisma.RentalWhereInput = {
      tenantId,
      updatedAt: { gte: startDate, lte: endDate },
    };
    if (locationId) {
      where.warehouseId = locationId;
    }

    // H2 FIX: Limit query size to prevent memory exhaustion
    const rentals = await this.prisma.rental.findMany({
      where,
      select: {
        id: true,
        rentalCode: true,
        calculationBreakdown: true,
      },
      take: 1000, // Limit to prevent memory issues
      orderBy: { updatedAt: 'desc' },
    });

    const byEventType: Record<string, number> = {};
    const byUser: Record<string, { userId: string; eventCount: number }> = {};
    const allEvents: Array<{
      rentalId: string;
      rentalCode: string;
      eventType: string;
      performedBy: string;
      performedAt: Date;
      description: string;
    }> = [];

    for (const rental of rentals) {
      const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
      const history = (breakdown.history as Array<Record<string, unknown>>) ?? [];

      for (const event of history) {
        // M5 FIX: Validate date before using
        const performedAtRaw = event.performedAt;
        if (!performedAtRaw) {
          continue; // Skip events without date
        }
        const performedAt = new Date(String(performedAtRaw));
        if (isNaN(performedAt.getTime())) {
          continue; // Skip events with invalid date
        }

        // Filter by date range
        if (performedAt < startDate || performedAt > endDate) {
          continue;
        }

        const eventType = String(event.eventType ?? 'UNKNOWN');
        const performedBy = String(event.performedBy ?? 'unknown');

        // Count by event type
        byEventType[eventType] = (byEventType[eventType] ?? 0) + 1;

        // Count by user
        if (!byUser[performedBy]) {
          byUser[performedBy] = { userId: performedBy, eventCount: 0 };
        }
        byUser[performedBy].eventCount++;

        // Collect event for recent list
        allEvents.push({
          rentalId: rental.id,
          rentalCode: rental.rentalCode,
          eventType,
          performedBy,
          performedAt,
          description: String(event.description ?? ''),
        });
      }
    }

    // Sort events by date descending and take top 50
    allEvents.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
    const recentEvents = allEvents.slice(0, 50);

    return {
      totalEvents: allEvents.length,
      byEventType,
      byUser,
      recentEvents,
    };
  }

  /**
   * Get status history for a rental (extracted from history entries)
   * @param rentalId Rental ID
   * @param tenantId Tenant ID
   */
  async getStatusHistory(
    rentalId: string,
    tenantId: string
  ): Promise<
    Array<{
      fromStatus: string;
      toStatus: string;
      performedBy: string;
      performedAt: Date;
      reason?: string;
    }>
  > {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId },
      select: { calculationBreakdown: true },
    });

    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const breakdown = (rental.calculationBreakdown as Record<string, unknown>) ?? {};
    const history = (breakdown.history as Array<Record<string, unknown>>) ?? [];

    return history
      .filter(h => h.eventType === 'STATUS_CHANGED')
      .map(h => {
        const metadata = (h.metadata as Record<string, unknown>) ?? {};
        const result: {
          fromStatus: string;
          toStatus: string;
          performedBy: string;
          performedAt: Date;
          reason?: string;
        } = {
          fromStatus: String(h.previousStatus ?? 'UNKNOWN'),
          toStatus: String(h.newStatus ?? 'UNKNOWN'),
          performedBy: String(h.performedBy ?? 'unknown'),
          performedAt: new Date(String(h.performedAt)),
        };
        // Conditionally add reason to satisfy exactOptionalPropertyTypes
        if (metadata.reason) {
          result.reason = String(metadata.reason);
        }
        return result;
      })
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Get all rentals in a specific status
   * @param tenantId Tenant ID
   * @param status Status to filter
   * @param locationId Optional location filter
   * @param limit Maximum records to return
   */
  async getRentalsByStatus(
    tenantId: string,
    status: RentalStatus,
    locationId?: string,
    limit = 100
  ): Promise<Rental[]> {
    const where: Prisma.RentalWhereInput = {
      tenantId,
      status: this.mapStatusToPrisma(status),
    };
    if (locationId) {
      where.warehouseId = locationId;
    }

    const rentals = await this.prisma.rental.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return rentals.map(r => this.toRentalDomain(r));
  }
}
