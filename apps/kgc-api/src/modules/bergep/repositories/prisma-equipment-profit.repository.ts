/**
 * Prisma Equipment Profit Repository
 * Epic 40: Story 40-2 - Bérgép megtérülés kalkuláció
 *
 * Implements IEquipmentProfitRepository for fetching profit data from Prisma.
 * ADR-051: Bérgép Megtérülés Kalkuláció
 *
 * KÉPLET:
 * PROFIT = Σ(RentalItem.itemTotal) - purchasePrice - Σ(Worksheet.totalCost WHERE !isWarranty)
 *
 * SECURITY (ADR-001): Multi-tenancy enforced via:
 * 1. Explicit tenantId filter in queries (belt)
 * 2. PostgreSQL RLS policy on tables (suspenders)
 */

import { EquipmentProfitData, IEquipmentProfitRepository } from '@kgc/rental-core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma implementation of Equipment Profit Repository
 *
 * Aggregates rental revenue and service costs for equipment profitability calculation.
 *
 * ÜZLETI SZABÁLY:
 * - Bevétel = Σ(RentalItem.itemTotal) where Rental.status IN (COMPLETED, RETURNED, ACTIVE)
 * - Ráfordítás = Σ(Worksheet.totalAmount) WHERE !isWarranty AND status IN (COMPLETED, DELIVERED)
 * - Garanciális munkák NEM számítanak ráfordításnak
 *
 * SECURITY: Requires tenantId for all queries (ADR-001 compliance)
 */
@Injectable()
export class PrismaEquipmentProfitRepository implements IEquipmentProfitRepository {
  private readonly logger = new Logger(PrismaEquipmentProfitRepository.name);

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  /**
   * Get profit calculation data for an equipment
   *
   * Aggregates:
   * - purchasePrice from RentalEquipment
   * - totalRentalRevenue from RentalItem.itemTotal (completed rentals)
   * - totalServiceCost from Worksheet.totalAmount (non-warranty, completed)
   *
   * @param equipmentId Equipment unique ID
   * @param tenantId Optional tenant ID for multi-tenancy (ADR-001)
   * @returns Equipment profit data or null if not found
   */
  async getEquipmentProfitData(
    equipmentId: string,
    tenantId?: string
  ): Promise<EquipmentProfitData | null> {
    // Security warning for missing tenantId
    if (!tenantId) {
      this.logger.warn(
        `[SECURITY] getEquipmentProfitData called without tenantId for equipment ${equipmentId}. ` +
          'Relying on RLS policy for tenant isolation. Consider passing tenantId explicitly.'
      );
    }

    // Build where clause for tenant filtering
    const tenantFilter = tenantId ? { tenantId } : {};

    // 1. Get equipment with purchasePrice
    const equipment = await this.prisma.rentalEquipment.findFirst({
      where: {
        id: equipmentId,
        ...tenantFilter,
      },
      select: {
        id: true,
        purchasePrice: true,
      },
    });

    if (!equipment) {
      return null;
    }

    // 2. Aggregate rental revenue from RentalItem.itemTotal
    // Only count COMPLETED, RETURNED, or ACTIVE rentals (actual revenue)
    const rentalRevenue = await this.prisma.rentalItem.aggregate({
      where: {
        equipmentId,
        rental: {
          status: {
            in: ['COMPLETED', 'RETURNED', 'ACTIVE'],
          },
          ...tenantFilter,
        },
      },
      _sum: {
        itemTotal: true,
      },
    });

    // 3. Aggregate service costs from Worksheet.totalAmount (non-warranty only)
    // Only COMPLETED or DELIVERED worksheets with valid completedAt dates
    const serviceCosts = await this.prisma.worksheet.aggregate({
      where: {
        equipmentId,
        isWarranty: false, // Exclude warranty repairs (ADR-051 rule)
        status: {
          in: ['COMPLETED', 'DELIVERED'],
        },
        completedAt: {
          not: null,
        },
        ...tenantFilter,
      },
      _sum: {
        totalAmount: true,
      },
    });

    return {
      equipmentId: equipment.id,
      purchasePrice: equipment.purchasePrice?.toNumber() ?? null,
      totalRentalRevenue: rentalRevenue._sum.itemTotal?.toNumber() ?? 0,
      totalServiceCost: serviceCosts._sum.totalAmount?.toNumber() ?? 0,
    };
  }
}
