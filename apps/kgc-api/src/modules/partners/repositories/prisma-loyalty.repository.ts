/**
 * Prisma Loyalty Tier Repository
 * Implements ILoyaltyTierRepository for PostgreSQL persistence
 * Epic 7: Story 7-3: Törzsvendég szint kezelés
 *
 * Note: Schema mapping differences:
 * - Interface uses: pointsAtChange, transactionsAtChange, spendAtChange
 * - Prisma uses: transactionCount, totalSpend (no pointsAtChange stored)
 * - LoyaltyHistory in Prisma has no tenantId - filtered via Partner relation
 */

import {
  CreateLoyaltyTierInput,
  ILoyaltyTierRepository,
  LoyaltyHistory,
  LoyaltyTier,
  LoyaltyTierQuery,
  LoyaltyTierQueryResult,
  TierCalculationResult,
  UpdateLoyaltyTierInput,
} from '@kgc/partners';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  LoyaltyHistory as PrismaLoyaltyHistory,
  LoyaltyTier as PrismaLoyaltyTier,
} from '@prisma/client';

@Injectable()
export class PrismaLoyaltyTierRepository implements ILoyaltyTierRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma LoyaltyTier to domain interface
   */
  private toTierDomain(tier: PrismaLoyaltyTier): LoyaltyTier {
    return {
      id: tier.id,
      tenantId: tier.tenantId,
      tierCode: tier.tierCode,
      tierName: tier.tierName,
      minTransactions: tier.minTransactions,
      minSpend: tier.minSpend ? Number(tier.minSpend) : null,
      discountPercent: Number(tier.discountPercent),
      benefits: tier.benefits as unknown[],
      badgeColor: tier.badgeColor,
      sortOrder: tier.sortOrder,
      isActive: tier.isActive,
      createdAt: tier.createdAt,
    };
  }

  /**
   * Convert Prisma LoyaltyHistory to domain interface
   * Note: Prisma schema uses transactionCount/totalSpend, interface uses different names
   */
  private toHistoryDomain(history: PrismaLoyaltyHistory, tenantId: string): LoyaltyHistory {
    return {
      id: history.id,
      tenantId, // Derived from partner relation
      partnerId: history.partnerId,
      oldTierId: history.oldTierId,
      newTierId: history.newTierId,
      reason: history.reason,
      pointsAtChange: 0, // Not stored in Prisma schema - set default
      transactionsAtChange: history.transactionCount ?? 0,
      spendAtChange: history.totalSpend ? Number(history.totalSpend) : null,
      changedAt: history.changedAt,
      changedBy: history.changedBy,
    };
  }

  // ============================================
  // CLEAR (testing only)
  // ============================================

  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: LoyaltyTierQuery): Promise<LoyaltyTierQueryResult> {
    const where: Prisma.LoyaltyTierWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.tierCode) {
      where.tierCode = params.tierCode;
    }

    const tiers = await this.prisma.loyaltyTier.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return {
      tiers: tiers.map(t => this.toTierDomain(t)),
      total: tiers.length,
    };
  }

  async findById(id: string, tenantId: string): Promise<LoyaltyTier | null> {
    const tier = await this.prisma.loyaltyTier.findFirst({
      where: { id, tenantId },
    });
    return tier ? this.toTierDomain(tier) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<LoyaltyTier | null> {
    const tier = await this.prisma.loyaltyTier.findFirst({
      where: { tierCode: code, tenantId },
    });
    return tier ? this.toTierDomain(tier) : null;
  }

  async getActiveTiers(tenantId: string): Promise<LoyaltyTier[]> {
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return tiers.map(t => this.toTierDomain(t));
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreateLoyaltyTierInput): Promise<LoyaltyTier> {
    // Validate unique code
    if (await this.codeExists(data.tierCode, tenantId)) {
      throw new Error(`Szint kód már létezik: ${data.tierCode}`);
    }

    // Get max sortOrder
    const maxSortOrder = await this.prisma.loyaltyTier.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });

    const tier = await this.prisma.loyaltyTier.create({
      data: {
        tenantId,
        tierCode: data.tierCode,
        tierName: data.tierName,
        minTransactions: data.minTransactions,
        minSpend: data.minSpend ?? null,
        discountPercent: data.discountPercent,
        benefits: data.benefits ?? [],
        badgeColor: data.badgeColor ?? null,
        sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });

    return this.toTierDomain(tier);
  }

  async update(id: string, tenantId: string, data: UpdateLoyaltyTierInput): Promise<LoyaltyTier> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Törzsvendég szint nem található: ${id}`);
    }

    const updateData: Prisma.LoyaltyTierUpdateManyMutationInput = {};

    if (data.tierName !== undefined) updateData.tierName = data.tierName;
    if (data.minTransactions !== undefined) updateData.minTransactions = data.minTransactions;
    if (data.minSpend !== undefined) updateData.minSpend = data.minSpend;
    if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
    if (data.benefits !== undefined) updateData.benefits = data.benefits;
    if (data.badgeColor !== undefined) updateData.badgeColor = data.badgeColor;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.loyaltyTier.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Törzsvendég szint frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Törzsvendég szint nem található: ${id}`);
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.loyaltyTier.deleteMany({
      where: { id, tenantId },
    });
  }

  async activate(id: string, tenantId: string): Promise<LoyaltyTier> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<LoyaltyTier> {
    return this.update(id, tenantId, { isActive: false });
  }

  // ============================================
  // TIER CALCULATION
  // ============================================

  async calculateTierForPartner(
    tenantId: string,
    transactionCount: number,
    totalSpend: number | null
  ): Promise<TierCalculationResult> {
    const activeTiers = await this.getActiveTiers(tenantId);

    if (activeTiers.length === 0) {
      return {
        calculatedTierId: null,
        calculatedTierName: null,
        discountPercent: 0,
        nextTierId: null,
        nextTierName: null,
        transactionsToNextTier: null,
        spendToNextTier: null,
      };
    }

    // Find highest matching tier
    let matchedTier: LoyaltyTier | null = null;
    for (const tier of activeTiers) {
      const meetsTransactions = transactionCount >= tier.minTransactions;
      const meetsSpend =
        tier.minSpend === null || (totalSpend !== null && totalSpend >= tier.minSpend);

      if (meetsTransactions && meetsSpend) {
        matchedTier = tier;
      } else {
        break; // Tiers are sorted by sortOrder, higher tiers have higher requirements
      }
    }

    // Find next tier
    let nextTier: LoyaltyTier | null = null;
    if (matchedTier) {
      const currentIndex = activeTiers.findIndex(t => t.id === matchedTier!.id);
      if (currentIndex < activeTiers.length - 1) {
        nextTier = activeTiers[currentIndex + 1] ?? null;
      }
    } else {
      nextTier = activeTiers[0] ?? null;
    }

    return {
      calculatedTierId: matchedTier?.id ?? null,
      calculatedTierName: matchedTier?.tierName ?? null,
      discountPercent: matchedTier?.discountPercent ?? 0,
      nextTierId: nextTier?.id ?? null,
      nextTierName: nextTier?.tierName ?? null,
      transactionsToNextTier: nextTier
        ? Math.max(0, nextTier.minTransactions - transactionCount)
        : null,
      spendToNextTier:
        nextTier !== null && nextTier.minSpend !== null && totalSpend !== null
          ? Math.max(0, nextTier.minSpend - totalSpend)
          : null,
    };
  }

  async getNextTier(currentTierId: string | null, tenantId: string): Promise<LoyaltyTier | null> {
    const activeTiers = await this.getActiveTiers(tenantId);

    if (activeTiers.length === 0) return null;

    if (currentTierId === null) {
      return activeTiers[0] ?? null;
    }

    const currentIndex = activeTiers.findIndex(t => t.id === currentTierId);
    if (currentIndex === -1 || currentIndex >= activeTiers.length - 1) {
      return null;
    }

    return activeTiers[currentIndex + 1] ?? null;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const tier = await this.prisma.loyaltyTier.findFirst({
      where: {
        tierCode: code,
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return tier !== null;
  }

  async reorder(
    tenantId: string,
    tierOrders: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    await this.prisma.$transaction(
      tierOrders.map(({ id, sortOrder }) =>
        this.prisma.loyaltyTier.updateMany({
          where: { id, tenantId },
          data: { sortOrder },
        })
      )
    );
  }

  async getPartnersCountByTier(tenantId: string): Promise<Record<string, number>> {
    const counts = await this.prisma.partner.groupBy({
      by: ['loyaltyTierId'],
      where: {
        tenantId,
        isDeleted: false,
        loyaltyTierId: { not: null },
      },
      _count: { loyaltyTierId: true },
    });

    const result: Record<string, number> = {};
    for (const { loyaltyTierId, _count } of counts) {
      if (loyaltyTierId) {
        result[loyaltyTierId] = _count.loyaltyTierId;
      }
    }

    return result;
  }

  // ============================================
  // HISTORY METHODS
  // ============================================

  async recordTierChange(
    tenantId: string,
    partnerId: string,
    oldTierId: string | null,
    newTierId: string | null,
    reason: string,
    _pointsAtChange: number,
    transactionsAtChange: number,
    spendAtChange: number | null,
    changedBy: string | null
  ): Promise<LoyaltyHistory> {
    // Note: _pointsAtChange is not stored in Prisma schema (prefixed with _ to indicate unused)
    // tenantId is derived from Partner relation in queries
    const history = await this.prisma.loyaltyHistory.create({
      data: {
        partnerId,
        oldTierId,
        newTierId,
        reason,
        transactionCount: transactionsAtChange,
        totalSpend: spendAtChange,
        changedBy,
      },
    });

    return this.toHistoryDomain(history, tenantId);
  }

  async getTierHistory(tenantId: string, partnerId: string): Promise<LoyaltyHistory[]> {
    // Verify partner belongs to tenant first
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, tenantId },
      select: { id: true },
    });

    if (!partner) {
      return [];
    }

    const history = await this.prisma.loyaltyHistory.findMany({
      where: { partnerId },
      orderBy: { changedAt: 'desc' },
    });

    return history.map(h => this.toHistoryDomain(h, tenantId));
  }
}
