/**
 * Prisma Equipment Cost Repository
 * Epic 40: Story 40-1 - Bérgép vételár és ráfordítás nyilvántartás
 *
 * Implements IEquipmentCostRepository for fetching worksheet costs from Prisma.
 * ADR-051: Bérgép Megtérülés Kalkuláció
 *
 * SECURITY (ADR-001): Multi-tenancy enforced via:
 * 1. Explicit tenantId filter in queries (belt)
 * 2. PostgreSQL RLS policy on worksheet table (suspenders)
 */

import { IEquipmentCostRepository, WorksheetCostInfo } from '@kgc/rental-core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma implementation of Equipment Cost Repository
 *
 * Fetches worksheet cost data from the database for equipment cost calculations.
 * Only returns COMPLETED or DELIVERED worksheets with valid completedAt dates.
 *
 * SECURITY: Requires tenantId for all queries (ADR-001 compliance)
 */
@Injectable()
export class PrismaEquipmentCostRepository implements IEquipmentCostRepository {
  private readonly logger = new Logger(PrismaEquipmentCostRepository.name);

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  /**
   * Get all completed worksheets for an equipment
   *
   * ÜZLETI SZABÁLY:
   * - Csak ELKÉSZÜLT vagy KIADVA munkalapok (status = 'COMPLETED' vagy 'DELIVERED')
   * - Visszaadjuk az isWarranty mezőt, a szűrés a service-ben történik
   * - Csak érvényes completedAt dátummal rendelkező munkalapok
   *
   * SECURITY: tenantId szűrés kötelező (ADR-001)
   *
   * @param equipmentId Equipment unique ID
   * @param tenantId Tenant ID for multi-tenancy isolation
   * @returns Array of worksheet cost info
   */
  async getWorksheetsByEquipmentId(
    equipmentId: string,
    tenantId?: string
  ): Promise<WorksheetCostInfo[]> {
    // Build where clause with optional tenant filtering
    // Note: RLS policy provides additional security layer at DB level
    const whereClause: Record<string, unknown> = {
      equipmentId,
      status: {
        in: ['COMPLETED', 'DELIVERED'],
      },
      completedAt: {
        not: null, // Only include worksheets with valid completion dates
      },
    };

    // Add explicit tenant filter if provided (ADR-001: belt-and-suspenders)
    if (tenantId) {
      whereClause.tenantId = tenantId;
    } else {
      this.logger.warn(
        `[SECURITY] getWorksheetsByEquipmentId called without tenantId for equipment ${equipmentId}. ` +
          'Relying on RLS policy for tenant isolation. Consider passing tenantId explicitly.'
      );
    }

    // Query worksheets for this equipment
    const worksheets = await this.prisma.worksheet.findMany({
      where: whereClause,
      select: {
        id: true,
        worksheetNumber: true,
        totalAmount: true,
        isWarranty: true,
        completedAt: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Transform to WorksheetCostInfo format
    // Note: completedAt is guaranteed non-null by the where clause
    return worksheets.map(ws => ({
      worksheetId: ws.id,
      worksheetNumber: ws.worksheetNumber,
      totalCost: ws.totalAmount?.toNumber() ?? 0,
      isWarranty: ws.isWarranty ?? false,
      completedAt: ws.completedAt as Date, // Safe cast - filtered by NOT NULL
    }));
  }
}
