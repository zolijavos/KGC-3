/**
 * @kgc/products - PriceRule Repository
 * Epic 8: Story 8-5: Árszabály kezelés
 *
 * Repository interface and token for PriceRule entity operations.
 * Implements flexible pricing rules with priority-based application.
 */

import { Injectable } from '@nestjs/common';
import type { CreatePriceRuleInput, UpdatePriceRuleInput } from '../dto/price-rule.dto';
import type {
  CalculatedPrice,
  PriceRule,
  PriceRuleQuery,
  PriceRuleQueryResult,
} from '../types/product.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const PRICE_RULE_REPOSITORY = Symbol('PRICE_RULE_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IPriceRuleRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query price rules with filters
   */
  query(params: PriceRuleQuery): Promise<PriceRuleQueryResult>;

  /**
   * Find price rule by ID
   */
  findById(id: string, tenantId: string): Promise<PriceRule | null>;

  /**
   * Get all active rules for a product
   */
  getActiveRulesForProduct(productId: string, tenantId: string, at?: Date): Promise<PriceRule[]>;

  /**
   * Get all active rules for a category
   */
  getActiveRulesForCategory(categoryId: string, tenantId: string, at?: Date): Promise<PriceRule[]>;

  /**
   * Get global rules (no product/category specified)
   */
  getGlobalRules(tenantId: string, at?: Date): Promise<PriceRule[]>;

  /**
   * Create new price rule
   */
  create(tenantId: string, data: CreatePriceRuleInput): Promise<PriceRule>;

  /**
   * Update existing price rule
   */
  update(id: string, tenantId: string, data: UpdatePriceRuleInput): Promise<PriceRule>;

  /**
   * Delete price rule
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Activate price rule
   */
  activate(id: string, tenantId: string): Promise<PriceRule>;

  /**
   * Deactivate price rule
   */
  deactivate(id: string, tenantId: string): Promise<PriceRule>;

  /**
   * Get applicable rules for product in context
   */
  getApplicableRules(
    tenantId: string,
    productId: string,
    categoryId: string | null,
    options: {
      quantity?: number;
      amount?: number;
      partnerTier?: string | null;
      transactionType: 'rental' | 'sales';
      at?: Date;
    }
  ): Promise<PriceRule[]>;

  /**
   * Calculate final price with applied rules
   */
  calculatePrice(
    tenantId: string,
    productId: string,
    categoryId: string | null,
    basePrice: number,
    vatPercent: number,
    options: {
      quantity?: number;
      partnerTier?: string | null;
      transactionType: 'rental' | 'sales';
      at?: Date;
    }
  ): Promise<CalculatedPrice>;

  /**
   * Get rules expiring soon
   */
  getExpiringSoon(tenantId: string, daysAhead?: number): Promise<PriceRule[]>;

  /**
   * Duplicate price rule
   */
  duplicate(id: string, tenantId: string, newName: string): Promise<PriceRule>;

  /**
   * Check for conflicting rules
   */
  hasConflictingRules(
    tenantId: string,
    productId: string | null,
    categoryId: string | null,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string
  ): Promise<boolean>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryPriceRuleRepository implements IPriceRuleRepository {
  private priceRules: Map<string, PriceRule> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.priceRules.clear();
  }

  async query(params: PriceRuleQuery): Promise<PriceRuleQueryResult> {
    let results = Array.from(this.priceRules.values()).filter(r => r.tenantId === params.tenantId);

    // Apply filters
    if (params.productId !== undefined) {
      results = results.filter(r => r.productId === params.productId);
    }
    if (params.categoryId !== undefined) {
      results = results.filter(r => r.categoryId === params.categoryId);
    }
    if (params.ruleType !== undefined) {
      results = results.filter(r => r.ruleType === params.ruleType);
    }
    if (params.isActive !== undefined) {
      results = results.filter(r => r.isActive === params.isActive);
    }
    if (params.partnerTier) {
      results = results.filter(r => r.partnerTier === null || r.partnerTier === params.partnerTier);
    }
    if (params.validAt) {
      const validAt = params.validAt;
      results = results.filter(
        r => r.validFrom <= validAt && (r.validUntil === null || r.validUntil >= validAt)
      );
    }

    // Sort by priority (descending) then name
    results.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.ruleName.localeCompare(b.ruleName);
    });

    return { priceRules: results, total: results.length };
  }

  async findById(id: string, tenantId: string): Promise<PriceRule | null> {
    const rule = this.priceRules.get(id);
    if (!rule || rule.tenantId !== tenantId) return null;
    return rule;
  }

  async getActiveRulesForProduct(
    productId: string,
    tenantId: string,
    at: Date = new Date()
  ): Promise<PriceRule[]> {
    return Array.from(this.priceRules.values())
      .filter(
        r =>
          r.tenantId === tenantId &&
          r.productId === productId &&
          r.isActive &&
          r.validFrom <= at &&
          (r.validUntil === null || r.validUntil >= at)
      )
      .sort((a, b) => b.priority - a.priority);
  }

  async getActiveRulesForCategory(
    categoryId: string,
    tenantId: string,
    at: Date = new Date()
  ): Promise<PriceRule[]> {
    return Array.from(this.priceRules.values())
      .filter(
        r =>
          r.tenantId === tenantId &&
          r.categoryId === categoryId &&
          r.productId === null &&
          r.isActive &&
          r.validFrom <= at &&
          (r.validUntil === null || r.validUntil >= at)
      )
      .sort((a, b) => b.priority - a.priority);
  }

  async getGlobalRules(tenantId: string, at: Date = new Date()): Promise<PriceRule[]> {
    return Array.from(this.priceRules.values())
      .filter(
        r =>
          r.tenantId === tenantId &&
          r.productId === null &&
          r.categoryId === null &&
          r.isActive &&
          r.validFrom <= at &&
          (r.validUntil === null || r.validUntil >= at)
      )
      .sort((a, b) => b.priority - a.priority);
  }

  async create(tenantId: string, data: CreatePriceRuleInput): Promise<PriceRule> {
    const now = new Date();
    const id = crypto.randomUUID();

    const priceRule: PriceRule = {
      id,
      tenantId,
      productId: data.productId ?? null,
      categoryId: data.categoryId ?? null,
      ruleName: data.ruleName,
      ruleType: data.ruleType,
      discountPercent: data.discountPercent ?? null,
      discountAmount: data.discountAmount ?? null,
      fixedPrice: data.fixedPrice ?? null,
      minQuantity: data.minQuantity ?? null,
      minAmount: data.minAmount ?? null,
      partnerTier: data.partnerTier ?? null,
      applyToRental: data.applyToRental ?? false,
      applyToSales: data.applyToSales ?? true,
      validFrom: data.validFrom,
      validUntil: data.validUntil ?? null,
      priority: data.priority ?? 0,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.priceRules.set(id, priceRule);
    return priceRule;
  }

  async update(id: string, tenantId: string, data: UpdatePriceRuleInput): Promise<PriceRule> {
    const rule = await this.findById(id, tenantId);
    if (!rule) {
      throw new Error('Árszabály nem található');
    }

    const updated: PriceRule = {
      ...rule,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.priceRules.set(id, updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const rule = await this.findById(id, tenantId);
    if (!rule) {
      throw new Error('Árszabály nem található');
    }
    this.priceRules.delete(id);
  }

  async activate(id: string, tenantId: string): Promise<PriceRule> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<PriceRule> {
    return this.update(id, tenantId, { isActive: false });
  }

  async getApplicableRules(
    tenantId: string,
    productId: string,
    categoryId: string | null,
    options: {
      quantity?: number;
      amount?: number;
      partnerTier?: string | null;
      transactionType: 'rental' | 'sales';
      at?: Date;
    }
  ): Promise<PriceRule[]> {
    const at = options.at ?? new Date();
    const quantity = options.quantity ?? 1;
    const amount = options.amount ?? 0;

    // Gather all potentially applicable rules
    const allRules: PriceRule[] = [];

    // Product-specific rules
    allRules.push(...(await this.getActiveRulesForProduct(productId, tenantId, at)));

    // Category rules
    if (categoryId) {
      allRules.push(...(await this.getActiveRulesForCategory(categoryId, tenantId, at)));
    }

    // Global rules
    allRules.push(...(await this.getGlobalRules(tenantId, at)));

    // Filter by conditions
    const applicableRules = allRules.filter(rule => {
      // Transaction type check
      if (options.transactionType === 'rental' && !rule.applyToRental) return false;
      if (options.transactionType === 'sales' && !rule.applyToSales) return false;

      // Quantity check
      if (rule.minQuantity !== null && quantity < rule.minQuantity) return false;

      // Amount check
      if (rule.minAmount !== null && amount < rule.minAmount) return false;

      // Partner tier check
      if (rule.partnerTier !== null && rule.partnerTier !== options.partnerTier) return false;

      return true;
    });

    // Sort by priority (highest first) and remove duplicates
    const uniqueRules = new Map<string, PriceRule>();
    applicableRules.forEach(rule => uniqueRules.set(rule.id, rule));

    return Array.from(uniqueRules.values()).sort((a, b) => b.priority - a.priority);
  }

  async calculatePrice(
    tenantId: string,
    productId: string,
    categoryId: string | null,
    basePrice: number,
    vatPercent: number,
    options: {
      quantity?: number;
      partnerTier?: string | null;
      transactionType: 'rental' | 'sales';
      at?: Date;
    }
  ): Promise<CalculatedPrice> {
    const quantity = options.quantity ?? 1;
    const totalBasePrice = basePrice * quantity;

    const rules = await this.getApplicableRules(tenantId, productId, categoryId, {
      ...options,
      quantity,
      amount: totalBasePrice,
    });

    let currentPrice = totalBasePrice;
    const appliedRules: Array<{ ruleId: string; ruleName: string; discountApplied: number }> = [];

    for (const rule of rules) {
      let discountApplied = 0;

      if (rule.ruleType === 'FIXED' && rule.fixedPrice !== null) {
        // Fixed price replaces the current price
        discountApplied = currentPrice - rule.fixedPrice * quantity;
        currentPrice = rule.fixedPrice * quantity;
      } else if (rule.ruleType === 'DISCOUNT') {
        if (rule.discountPercent !== null) {
          discountApplied = currentPrice * (rule.discountPercent / 100);
          currentPrice -= discountApplied;
        } else if (rule.discountAmount !== null) {
          discountApplied = Math.min(rule.discountAmount, currentPrice);
          currentPrice -= discountApplied;
        }
      } else if (rule.ruleType === 'MARKUP') {
        if (rule.discountPercent !== null) {
          discountApplied = -(currentPrice * (rule.discountPercent / 100));
          currentPrice -= discountApplied; // Negative discount = markup
        } else if (rule.discountAmount !== null) {
          discountApplied = -rule.discountAmount;
          currentPrice += rule.discountAmount;
        }
      }

      if (discountApplied !== 0) {
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          discountApplied,
        });
      }
    }

    const totalDiscount = totalBasePrice - currentPrice;
    const discountPercent = totalBasePrice > 0 ? (totalDiscount / totalBasePrice) * 100 : 0;
    const vatAmount = currentPrice * (vatPercent / 100);

    return {
      originalPrice: totalBasePrice,
      finalPrice: Math.max(0, currentPrice),
      discount: totalDiscount,
      discountPercent: Math.round(discountPercent * 100) / 100,
      appliedRules,
      vatAmount: Math.round(vatAmount * 100) / 100,
      priceWithVat: Math.round((currentPrice + vatAmount) * 100) / 100,
    };
  }

  async getExpiringSoon(tenantId: string, daysAhead = 30): Promise<PriceRule[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return Array.from(this.priceRules.values()).filter(
      r =>
        r.tenantId === tenantId &&
        r.isActive &&
        r.validUntil !== null &&
        r.validUntil >= now &&
        r.validUntil <= futureDate
    );
  }

  async duplicate(id: string, tenantId: string, newName: string): Promise<PriceRule> {
    const original = await this.findById(id, tenantId);
    if (!original) {
      throw new Error('Árszabály nem található');
    }

    const now = new Date();
    const newId = crypto.randomUUID();

    const duplicated: PriceRule = {
      ...original,
      id: newId,
      ruleName: newName,
      isActive: false, // Start inactive
      createdAt: now,
      updatedAt: now,
    };

    this.priceRules.set(newId, duplicated);
    return duplicated;
  }

  async hasConflictingRules(
    tenantId: string,
    productId: string | null,
    categoryId: string | null,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string
  ): Promise<boolean> {
    return Array.from(this.priceRules.values()).some(rule => {
      if (rule.tenantId !== tenantId) return false;
      if (rule.id === excludeId) return false;
      if (!rule.isActive) return false;

      // Must match product/category scope
      if (rule.productId !== productId) return false;
      if (rule.categoryId !== categoryId) return false;

      // Check date overlap
      const ruleEnd = rule.validUntil ?? new Date('9999-12-31');
      const newEnd = validUntil ?? new Date('9999-12-31');

      return validFrom <= ruleEnd && newEnd >= rule.validFrom;
    });
  }
}
