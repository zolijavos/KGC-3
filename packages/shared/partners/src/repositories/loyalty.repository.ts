/**
 * @kgc/partners - Loyalty Tier Repository
 * Epic 7: Story 7-3: Törzsvendég szint kezelés
 *
 * Repository interface and token for LoyaltyTier entity operations.
 * Handles loyalty program tier management and partner tier calculations.
 */

import { Injectable } from '@nestjs/common';
import type {
  CreateLoyaltyTierInput,
  TierCalculationResult,
  UpdateLoyaltyTierInput,
} from '../dto/loyalty.dto';
import type {
  LoyaltyHistory,
  LoyaltyTier,
  LoyaltyTierQuery,
  LoyaltyTierQueryResult,
} from '../types/partner.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const LOYALTY_TIER_REPOSITORY = Symbol('LOYALTY_TIER_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface ILoyaltyTierRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query loyalty tiers with filters
   */
  query(params: LoyaltyTierQuery): Promise<LoyaltyTierQueryResult>;

  /**
   * Find loyalty tier by ID
   */
  findById(id: string, tenantId: string): Promise<LoyaltyTier | null>;

  /**
   * Find loyalty tier by code
   */
  findByCode(code: string, tenantId: string): Promise<LoyaltyTier | null>;

  /**
   * Get all active tiers ordered by sort order
   */
  getActiveTiers(tenantId: string): Promise<LoyaltyTier[]>;

  /**
   * Create new loyalty tier
   */
  create(tenantId: string, data: CreateLoyaltyTierInput): Promise<LoyaltyTier>;

  /**
   * Update existing loyalty tier
   */
  update(id: string, tenantId: string, data: UpdateLoyaltyTierInput): Promise<LoyaltyTier>;

  /**
   * Delete loyalty tier
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Activate loyalty tier
   */
  activate(id: string, tenantId: string): Promise<LoyaltyTier>;

  /**
   * Deactivate loyalty tier
   */
  deactivate(id: string, tenantId: string): Promise<LoyaltyTier>;

  /**
   * Calculate appropriate tier for partner based on transactions and spend
   */
  calculateTierForPartner(
    tenantId: string,
    transactionCount: number,
    totalSpend: number | null
  ): Promise<TierCalculationResult>;

  /**
   * Get next tier above current tier
   */
  getNextTier(currentTierId: string | null, tenantId: string): Promise<LoyaltyTier | null>;

  /**
   * Check if tier code exists
   */
  codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Reorder tiers
   */
  reorder(tenantId: string, tierOrders: Array<{ id: string; sortOrder: number }>): Promise<void>;

  /**
   * Get partners count for each tier
   */
  getPartnersCountByTier(tenantId: string): Promise<Record<string, number>>;

  /**
   * Record tier change history
   */
  recordTierChange(
    tenantId: string,
    partnerId: string,
    oldTierId: string | null,
    newTierId: string | null,
    reason: string,
    pointsAtChange: number,
    transactionsAtChange: number,
    spendAtChange: number | null,
    changedBy: string | null
  ): Promise<LoyaltyHistory>;

  /**
   * Get tier change history for partner
   */
  getTierHistory(tenantId: string, partnerId: string): Promise<LoyaltyHistory[]>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryLoyaltyTierRepository implements ILoyaltyTierRepository {
  private tiers: Map<string, LoyaltyTier> = new Map();
  private history: Map<string, LoyaltyHistory> = new Map();
  private partnerTierCounts: Map<string, Map<string, number>> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.tiers.clear();
    this.history.clear();
    this.partnerTierCounts.clear();
  }

  async query(params: LoyaltyTierQuery): Promise<LoyaltyTierQueryResult> {
    let results = Array.from(this.tiers.values()).filter(t => t.tenantId === params.tenantId);

    // Apply filters
    if (params.isActive !== undefined) {
      results = results.filter(t => t.isActive === params.isActive);
    }
    if (params.tierCode) {
      results = results.filter(t => t.tierCode === params.tierCode);
    }

    // Sort by sortOrder
    results.sort((a, b) => a.sortOrder - b.sortOrder);

    return { tiers: results, total: results.length };
  }

  async findById(id: string, tenantId: string): Promise<LoyaltyTier | null> {
    const tier = this.tiers.get(id);
    if (!tier || tier.tenantId !== tenantId) return null;
    return tier;
  }

  async findByCode(code: string, tenantId: string): Promise<LoyaltyTier | null> {
    return (
      Array.from(this.tiers.values()).find(t => t.tierCode === code && t.tenantId === tenantId) ??
      null
    );
  }

  async getActiveTiers(tenantId: string): Promise<LoyaltyTier[]> {
    return Array.from(this.tiers.values())
      .filter(t => t.tenantId === tenantId && t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async create(tenantId: string, data: CreateLoyaltyTierInput): Promise<LoyaltyTier> {
    // H2 Fix: Validate tier code doesn't exist
    if (await this.codeExists(data.tierCode, tenantId)) {
      throw new Error(`A törzsvendég szint kód már létezik: ${data.tierCode}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    // Get max sortOrder
    const existingTiers = Array.from(this.tiers.values()).filter(t => t.tenantId === tenantId);
    const maxSortOrder = existingTiers.reduce((max, t) => Math.max(max, t.sortOrder), 0);

    const tier: LoyaltyTier = {
      id,
      tenantId,
      tierCode: data.tierCode,
      tierName: data.tierName,
      minTransactions: data.minTransactions,
      minSpend: data.minSpend ?? null,
      discountPercent: data.discountPercent,
      benefits: data.benefits ?? [],
      badgeColor: data.badgeColor ?? null,
      sortOrder: data.sortOrder ?? maxSortOrder + 1,
      isActive: true,
      createdAt: now,
    };

    this.tiers.set(id, tier);
    return tier;
  }

  async update(id: string, tenantId: string, data: UpdateLoyaltyTierInput): Promise<LoyaltyTier> {
    const tier = await this.findById(id, tenantId);
    if (!tier) {
      throw new Error('Törzsvendég szint nem található');
    }

    const updated: LoyaltyTier = {
      ...tier,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
    };

    this.tiers.set(id, updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tier = await this.findById(id, tenantId);
    if (!tier) {
      throw new Error('Törzsvendég szint nem található');
    }
    this.tiers.delete(id);
  }

  async activate(id: string, tenantId: string): Promise<LoyaltyTier> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<LoyaltyTier> {
    return this.update(id, tenantId, { isActive: false });
  }

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

    // Find matching tier (highest tier that matches requirements)
    let matchedTier: LoyaltyTier | null = null;
    for (const tier of activeTiers) {
      const meetsTransactions = transactionCount >= tier.minTransactions;
      const meetsSpend =
        tier.minSpend === null || (totalSpend !== null && totalSpend >= tier.minSpend);

      if (meetsTransactions && meetsSpend) {
        matchedTier = tier;
      } else {
        break; // Tiers are sorted, so first non-match means no higher tier matches
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

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.tiers.values()).some(
      t => t.tierCode === code && t.tenantId === tenantId && t.id !== excludeId
    );
  }

  async reorder(
    tenantId: string,
    tierOrders: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    for (const { id, sortOrder } of tierOrders) {
      const tier = await this.findById(id, tenantId);
      if (tier) {
        this.tiers.set(id, { ...tier, sortOrder });
      }
    }
  }

  async getPartnersCountByTier(tenantId: string): Promise<Record<string, number>> {
    const counts = this.partnerTierCounts.get(tenantId);
    if (!counts) return {};
    return Object.fromEntries(counts);
  }

  // Helper method for testing - set partner counts
  setPartnerCount(tenantId: string, tierId: string, count: number): void {
    let tenantCounts = this.partnerTierCounts.get(tenantId);
    if (!tenantCounts) {
      tenantCounts = new Map();
      this.partnerTierCounts.set(tenantId, tenantCounts);
    }
    tenantCounts.set(tierId, count);
  }

  async recordTierChange(
    tenantId: string,
    partnerId: string,
    oldTierId: string | null,
    newTierId: string | null,
    reason: string,
    pointsAtChange: number,
    transactionsAtChange: number,
    spendAtChange: number | null,
    changedBy: string | null
  ): Promise<LoyaltyHistory> {
    const id = crypto.randomUUID();

    const historyEntry: LoyaltyHistory = {
      id,
      tenantId,
      partnerId,
      oldTierId,
      newTierId,
      reason,
      pointsAtChange,
      transactionsAtChange,
      spendAtChange,
      changedAt: new Date(),
      changedBy,
    };

    this.history.set(id, historyEntry);
    return historyEntry;
  }

  async getTierHistory(tenantId: string, partnerId: string): Promise<LoyaltyHistory[]> {
    return Array.from(this.history.values())
      .filter(h => h.tenantId === tenantId && h.partnerId === partnerId)
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }
}
