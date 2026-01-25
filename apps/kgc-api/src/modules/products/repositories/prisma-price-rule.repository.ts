/**
 * Prisma PriceRule Repository
 * Implements IPriceRuleRepository for PostgreSQL persistence
 * Epic 8: Story 8-5: Árszabály kezelés
 */

import {
  CalculatedPrice,
  CreatePriceRuleInput,
  IPriceRuleRepository,
  PriceRule,
  PriceRuleQuery,
  PriceRuleQueryResult,
  PriceRuleType,
  UpdatePriceRuleInput,
} from '@kgc/products';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, PriceRule as PrismaPriceRule } from '@prisma/client';

@Injectable()
export class PrismaPriceRuleRepository implements IPriceRuleRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toPriceRuleDomain(rule: PrismaPriceRule): PriceRule {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      productId: rule.productId,
      categoryId: rule.categoryId,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType as PriceRuleType,
      discountPercent: rule.discountPercent ? Number(rule.discountPercent) : null,
      discountAmount: rule.discountAmount ? Number(rule.discountAmount) : null,
      fixedPrice: rule.fixedPrice ? Number(rule.fixedPrice) : null,
      minQuantity: rule.minQuantity,
      minAmount: rule.minAmount ? Number(rule.minAmount) : null,
      partnerTier: rule.partnerTier,
      applyToRental: rule.applyToRental,
      applyToSales: rule.applyToSales,
      validFrom: rule.validFrom,
      validUntil: rule.validUntil,
      priority: rule.priority,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  clear(): void {
    // No-op
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: PriceRuleQuery): Promise<PriceRuleQueryResult> {
    const where: Prisma.PriceRuleWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.productId !== undefined) {
      where.productId = params.productId;
    }
    if (params.categoryId !== undefined) {
      where.categoryId = params.categoryId;
    }
    if (params.ruleType !== undefined) {
      where.ruleType = params.ruleType;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.partnerTier) {
      where.OR = [{ partnerTier: null }, { partnerTier: params.partnerTier }];
    }
    if (params.validAt) {
      where.validFrom = { lte: params.validAt };
      where.AND = [
        {
          OR: [{ validUntil: null }, { validUntil: { gte: params.validAt } }],
        },
      ];
    }

    const priceRules = await this.prisma.priceRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { ruleName: 'asc' }],
    });

    return {
      priceRules: priceRules.map(r => this.toPriceRuleDomain(r)),
      total: priceRules.length,
    };
  }

  async findById(id: string, tenantId: string): Promise<PriceRule | null> {
    const rule = await this.prisma.priceRule.findFirst({
      where: { id, tenantId },
    });
    return rule ? this.toPriceRuleDomain(rule) : null;
  }

  async getActiveRulesForProduct(
    productId: string,
    tenantId: string,
    at: Date = new Date()
  ): Promise<PriceRule[]> {
    const rules = await this.prisma.priceRule.findMany({
      where: {
        tenantId,
        productId,
        isActive: true,
        validFrom: { lte: at },
        OR: [{ validUntil: null }, { validUntil: { gte: at } }],
      },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => this.toPriceRuleDomain(r));
  }

  async getActiveRulesForCategory(
    categoryId: string,
    tenantId: string,
    at: Date = new Date()
  ): Promise<PriceRule[]> {
    const rules = await this.prisma.priceRule.findMany({
      where: {
        tenantId,
        categoryId,
        productId: null,
        isActive: true,
        validFrom: { lte: at },
        OR: [{ validUntil: null }, { validUntil: { gte: at } }],
      },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => this.toPriceRuleDomain(r));
  }

  async getGlobalRules(tenantId: string, at: Date = new Date()): Promise<PriceRule[]> {
    const rules = await this.prisma.priceRule.findMany({
      where: {
        tenantId,
        productId: null,
        categoryId: null,
        isActive: true,
        validFrom: { lte: at },
        OR: [{ validUntil: null }, { validUntil: { gte: at } }],
      },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => this.toPriceRuleDomain(r));
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreatePriceRuleInput): Promise<PriceRule> {
    const rule = await this.prisma.priceRule.create({
      data: {
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
      },
    });

    return this.toPriceRuleDomain(rule);
  }

  async update(id: string, tenantId: string, data: UpdatePriceRuleInput): Promise<PriceRule> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Árszabály nem található: ${id}`);
    }

    const updateData: Prisma.PriceRuleUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.ruleName !== undefined) updateData.ruleName = data.ruleName;
    if (data.ruleType !== undefined) updateData.ruleType = data.ruleType;
    if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
    if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount;
    if (data.fixedPrice !== undefined) updateData.fixedPrice = data.fixedPrice;
    if (data.minQuantity !== undefined) updateData.minQuantity = data.minQuantity;
    if (data.minAmount !== undefined) updateData.minAmount = data.minAmount;
    if (data.partnerTier !== undefined) updateData.partnerTier = data.partnerTier;
    if (data.applyToRental !== undefined) updateData.applyToRental = data.applyToRental;
    if (data.applyToSales !== undefined) updateData.applyToSales = data.applyToSales;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.priceRule.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Árszabály frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Árszabály nem található: ${id}`);
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.priceRule.deleteMany({
      where: { id, tenantId },
    });
  }

  async activate(id: string, tenantId: string): Promise<PriceRule> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<PriceRule> {
    return this.update(id, tenantId, { isActive: false });
  }

  // ============================================
  // PRICE CALCULATION
  // ============================================

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
      if (options.transactionType === 'rental' && !rule.applyToRental) return false;
      if (options.transactionType === 'sales' && !rule.applyToSales) return false;
      if (rule.minQuantity !== null && quantity < rule.minQuantity) return false;
      if (rule.minAmount !== null && amount < rule.minAmount) return false;
      if (rule.partnerTier !== null && rule.partnerTier !== options.partnerTier) return false;
      return true;
    });

    // Sort by priority and remove duplicates
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
          currentPrice -= discountApplied;
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

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getExpiringSoon(tenantId: string, daysAhead = 30): Promise<PriceRule[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const rules = await this.prisma.priceRule.findMany({
      where: {
        tenantId,
        isActive: true,
        validUntil: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { validUntil: 'asc' },
    });

    return rules.map(r => this.toPriceRuleDomain(r));
  }

  async duplicate(id: string, tenantId: string, newName: string): Promise<PriceRule> {
    const original = await this.findById(id, tenantId);
    if (!original) {
      throw new Error(`Price rule not found: ${id}`);
    }

    const rule = await this.prisma.priceRule.create({
      data: {
        tenantId,
        productId: original.productId,
        categoryId: original.categoryId,
        ruleName: newName,
        ruleType: original.ruleType,
        discountPercent: original.discountPercent,
        discountAmount: original.discountAmount,
        fixedPrice: original.fixedPrice,
        minQuantity: original.minQuantity,
        minAmount: original.minAmount,
        partnerTier: original.partnerTier,
        applyToRental: original.applyToRental,
        applyToSales: original.applyToSales,
        validFrom: original.validFrom,
        validUntil: original.validUntil,
        priority: original.priority,
        isActive: false, // Start inactive
      },
    });

    return this.toPriceRuleDomain(rule);
  }

  async hasConflictingRules(
    tenantId: string,
    productId: string | null,
    categoryId: string | null,
    validFrom: Date,
    validUntil: Date | null,
    excludeId?: string
  ): Promise<boolean> {
    const ruleEnd = validUntil ?? new Date('9999-12-31');

    const conflicting = await this.prisma.priceRule.findFirst({
      where: {
        tenantId,
        productId,
        categoryId,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        validFrom: { lte: ruleEnd },
        OR: [{ validUntil: null }, { validUntil: { gte: validFrom } }],
      },
      select: { id: true },
    });

    return conflicting !== null;
  }
}
