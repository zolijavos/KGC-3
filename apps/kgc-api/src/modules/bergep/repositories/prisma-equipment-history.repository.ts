/**
 * Prisma Equipment History Repository
 * Epic 40: Story 40-3 - Bérgép előzmények fül
 *
 * Fetches rental history and related data for equipment.
 *
 * SECURITY (ADR-001): Multi-tenancy enforced via:
 * 1. Explicit tenantId filter in queries (belt)
 * 2. PostgreSQL RLS policy on tables (suspenders)
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Rental history item interface
 */
export interface RentalHistoryItem {
  rentalId: string;
  rentalCode: string;
  partnerId: string;
  partnerName: string;
  startDate: Date;
  expectedEnd: Date;
  actualEnd: Date | null;
  issuedByName: string | null;
  returnedByName: string | null;
  itemTotal: number;
  status: string;
}

/**
 * Rental history result
 */
export interface RentalHistoryResult {
  equipmentId: string;
  totalRentals: number;
  lastRenterName: string | null;
  worksheetCount: number;
  rentals: RentalHistoryItem[];
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Prisma implementation of Equipment History Repository
 *
 * Fetches rental history with partner and user information.
 *
 * ÜZLETI SZABÁLY:
 * - Időrendi sorrend (legújabb elől)
 * - Partner neve, bérlési időszak, ki adta ki, ki vette vissza
 * - Összeg az adott tételre (itemTotal)
 * - Max 20 elem/oldal (pagination)
 */
@Injectable()
export class PrismaEquipmentHistoryRepository {
  private readonly logger = new Logger(PrismaEquipmentHistoryRepository.name);

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  /**
   * Get rental history for an equipment
   *
   * @param equipmentId Equipment unique ID
   * @param tenantId Tenant ID for multi-tenancy (ADR-001)
   * @param page Page number (1-based)
   * @param pageSize Items per page (default: 20, max: 50)
   * @returns Rental history result
   */
  async getRentalHistory(
    equipmentId: string,
    tenantId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<RentalHistoryResult> {
    // Validate and clamp page size
    const clampedPageSize = Math.min(Math.max(pageSize, 1), 50);
    const skip = (Math.max(page, 1) - 1) * clampedPageSize;

    // Security warning for missing tenantId
    if (!tenantId) {
      this.logger.warn(
        `[SECURITY] getRentalHistory called without tenantId for equipment ${equipmentId}. ` +
          'Relying on RLS policy for tenant isolation. Consider passing tenantId explicitly.'
      );
    }

    const tenantFilter = tenantId ? { tenantId } : {};

    // 1. Count total rentals for pagination
    const totalRentals = await this.prisma.rentalItem.count({
      where: {
        equipmentId,
        rental: tenantFilter,
      },
    });

    // 2. Get rental items with rental and partner info
    const rentalItems = await this.prisma.rentalItem.findMany({
      where: {
        equipmentId,
        rental: tenantFilter,
      },
      include: {
        rental: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        rental: {
          startDate: 'desc',
        },
      },
      skip,
      take: clampedPageSize,
    });

    // 3. Get user names for issuedBy and returnedBy
    // Note: This is a simplified approach - in production, you'd join with User table
    const rentals: RentalHistoryItem[] = await Promise.all(
      rentalItems.map(async item => {
        // Fetch user names if available
        const issuedByName = item.rental.issuedBy
          ? await this.getUserName(item.rental.issuedBy)
          : null;
        const returnedByName = item.rental.returnedBy
          ? await this.getUserName(item.rental.returnedBy)
          : null;

        return {
          rentalId: item.rental.id,
          rentalCode: item.rental.rentalCode,
          partnerId: item.rental.partner.id,
          partnerName: item.rental.partner.name,
          startDate: item.rental.startDate,
          expectedEnd: item.rental.expectedEnd,
          actualEnd: item.rental.actualEnd,
          issuedByName,
          returnedByName,
          itemTotal: item.itemTotal?.toNumber() ?? 0,
          status: item.rental.status,
        };
      })
    );

    // 4. Get last renter name (from most recent completed rental)
    let lastRenterName: string | null = null;
    if (rentals.length > 0) {
      // First completed or returned rental in the sorted list
      const lastCompleted = rentals.find(r => r.status === 'COMPLETED' || r.status === 'RETURNED');
      lastRenterName = lastCompleted?.partnerName ?? rentals[0]?.partnerName ?? null;
    }

    // 5. Count worksheets for this equipment
    const worksheetCount = await this.prisma.worksheet.count({
      where: {
        equipmentId,
        ...tenantFilter,
      },
    });

    const totalPages = Math.ceil(totalRentals / clampedPageSize);

    return {
      equipmentId,
      totalRentals,
      lastRenterName,
      worksheetCount,
      rentals,
      page: Math.max(page, 1),
      pageSize: clampedPageSize,
      totalPages,
    };
  }

  /**
   * Get user name by ID
   * Note: This is a simplified lookup - in production, use proper User model
   */
  private async getUserName(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name ?? null;
    } catch {
      // User not found or error - return null
      return null;
    }
  }
}
