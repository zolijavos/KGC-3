/**
 * PriceRuleService - Price rule management and calculation
 * Story 8-5: Árszabály Kezelés
 *
 * ADR-012: Kombinált hierarchikus árazási rendszer
 *
 * Priority (highest to lowest):
 * 1. Promotion (akció) - 100
 * 2. Partner-specific - 80
 * 3. Item-specific - 60
 * 4. Supplier rule - 40
 * 5. Category rule - 20
 * 6. List price - 0
 *
 * @kgc/cikk
 */

import { Injectable, Inject } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PriceRuleType,
  PriceCalculationType,
  PriceRuleStatus,
  DEFAULT_PRIORITY,
  type PriceRule,
  type CreatePriceRuleInput,
  type UpdatePriceRuleInput,
  type PriceCalculationContext,
  type PriceCalculationResult,
  type AppliedRule,
  type PriceRuleFilterOptions,
  type PriceRuleListResponse,
} from '../interfaces/price-rule.interface';

/**
 * Audit logger interface
 */
interface AuditLogger {
  log(entry: {
    tenantId: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    details?: Record<string, unknown>;
  }): void;
}

@Injectable()
export class PriceRuleService {
  constructor(
    @Inject('PRISMA_SERVICE') private readonly prisma: any,
    @Inject('AUDIT_LOGGER') private readonly auditLogger: AuditLogger
  ) {}

  // =========================================
  // CREATE PRICE RULE
  // =========================================

  /**
   * Create a new price rule
   */
  async createPriceRule(
    tenantId: string,
    input: CreatePriceRuleInput,
    userId: string
  ): Promise<PriceRule> {
    const priority = input.priority ?? DEFAULT_PRIORITY[input.ruleType];
    const status = this.determineInitialStatus(input.validFrom, input.validTo);

    const data: Record<string, unknown> = {
      tenantId,
      name: input.name,
      description: input.description,
      ruleType: input.ruleType,
      calculationType: input.calculationType,
      value: input.value,
      priority,
      status,
      validFrom: input.validFrom,
      validTo: input.validTo,
      createdBy: userId,
    };

    // Add type-specific fields
    if (input.itemId) data.itemId = input.itemId;
    if (input.itemIds) data.itemIds = input.itemIds;
    if (input.categoryId) data.categoryId = input.categoryId;
    if (input.categoryIds) data.categoryIds = input.categoryIds;
    if (input.supplierId) data.supplierId = input.supplierId;
    if (input.partnerId) data.partnerId = input.partnerId;
    if (input.minQuantity) data.minQuantity = input.minQuantity;
    if (input.maxUsageCount) data.maxUsageCount = input.maxUsageCount;

    const rule = await this.prisma.priceRule.create({ data });

    this.auditLogger.log({
      tenantId,
      action: 'PRICE_RULE_CREATED',
      entityType: 'PriceRule',
      entityId: rule.id,
      userId,
      details: { ruleType: input.ruleType, name: input.name },
    });

    return this.transformRule(rule);
  }

  // =========================================
  // CALCULATE PRICE
  // =========================================

  /**
   * Calculate final price based on applicable rules
   */
  async calculatePrice(
    tenantId: string,
    context: PriceCalculationContext
  ): Promise<PriceCalculationResult> {
    const calculationDate = context.date ?? new Date();

    // Get all applicable rules
    const rules = await this.getApplicableRulesInternal(tenantId, context, calculationDate);

    // Sort by priority (low to high) - lower priority rules apply first
    const sortedRules = rules.sort((a, b) => {
      const priorityA = typeof a.priority === 'number' ? a.priority : 0;
      const priorityB = typeof b.priority === 'number' ? b.priority : 0;
      return priorityA - priorityB;
    });

    let currentPrice = context.basePrice;
    const appliedRules: AppliedRule[] = [];
    let totalDiscount = 0;

    for (const rule of sortedRules) {
      // Skip inactive or expired rules
      if (!this.isRuleActive(rule, calculationDate)) {
        continue;
      }

      const ruleValue = rule.value instanceof Decimal ? rule.value.toNumber() : Number(rule.value);
      let priceEffect = 0;

      switch (rule.calculationType) {
        case PriceCalculationType.FIXED:
          // Fixed price replaces current price
          priceEffect = ruleValue - currentPrice;
          currentPrice = ruleValue;
          break;

        case PriceCalculationType.PERCENTAGE:
          // Percentage markup on current price
          priceEffect = currentPrice * (ruleValue / 100);
          currentPrice = currentPrice + priceEffect;
          break;

        case PriceCalculationType.DISCOUNT:
          // Percentage discount from current price
          priceEffect = -(currentPrice * (ruleValue / 100));
          currentPrice = currentPrice + priceEffect;
          totalDiscount += Math.abs(priceEffect);
          break;

        case PriceCalculationType.LIST_PRICE:
          // Use supplier list price (would need additional lookup)
          // For now, treat as no change
          priceEffect = 0;
          break;
      }

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType as PriceRuleType,
        calculationType: rule.calculationType as PriceCalculationType,
        value: ruleValue,
        priceEffect: Math.round(priceEffect),
        priority: typeof rule.priority === 'number' ? rule.priority : 0,
      });
    }

    // Round final price
    const finalPrice = Math.round(currentPrice);
    const totalDiscountPercent =
      context.basePrice > 0 ? (totalDiscount / context.basePrice) * 100 : 0;

    return {
      finalPrice,
      basePrice: context.basePrice,
      appliedRules,
      totalDiscount: Math.round(totalDiscount),
      totalDiscountPercent: Math.round(totalDiscountPercent * 100) / 100,
      calculatedAt: calculationDate,
    };
  }

  // =========================================
  // GET APPLICABLE RULES
  // =========================================

  /**
   * Get all rules applicable to the given context
   */
  async getApplicableRules(
    tenantId: string,
    options: {
      itemId?: string;
      categoryId?: string;
      supplierId?: string;
      partnerId?: string;
      activeOnly?: boolean;
    }
  ): Promise<PriceRule[]> {
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (options.activeOnly) {
      where.status = PriceRuleStatus.ACTIVE;
    }

    // Build OR conditions for matching rules
    const orConditions: Record<string, unknown>[] = [];

    // Global rules (no specific target)
    orConditions.push({
      itemId: null,
      categoryId: null,
      supplierId: null,
      partnerId: null,
    });

    // Item-specific rules
    if (options.itemId) {
      orConditions.push({ itemId: options.itemId });
    }

    // Category rules
    if (options.categoryId) {
      orConditions.push({ categoryId: options.categoryId });
    }

    // Supplier rules
    if (options.supplierId) {
      orConditions.push({ supplierId: options.supplierId });
    }

    // Partner rules
    if (options.partnerId) {
      orConditions.push({ partnerId: options.partnerId });
    }

    where.OR = orConditions;

    const rules = await this.prisma.priceRule.findMany({
      where,
      orderBy: { priority: 'asc' },
    });

    return rules.map((r: unknown) => this.transformRule(r));
  }

  /**
   * Internal method to get applicable rules with date filtering
   */
  private async getApplicableRulesInternal(
    tenantId: string,
    context: PriceCalculationContext,
    _date: Date
  ): Promise<any[]> {
    const where: Record<string, unknown> = {
      tenantId,
      status: PriceRuleStatus.ACTIVE,
    };

    // Build OR conditions
    const orConditions: Record<string, unknown>[] = [];

    // Promotions (can be item-specific or global)
    orConditions.push({
      ruleType: PriceRuleType.PROMOTION,
      OR: [
        { itemIds: { isEmpty: true } },
        { itemIds: { has: context.itemId } },
        context.categoryId ? { categoryIds: { has: context.categoryId } } : {},
      ].filter((c) => Object.keys(c).length > 0),
    });

    // Partner rules
    if (context.partnerId) {
      orConditions.push({
        ruleType: PriceRuleType.PARTNER,
        partnerId: context.partnerId,
      });
    }

    // Item-specific rules
    orConditions.push({
      ruleType: PriceRuleType.ITEM,
      itemId: context.itemId,
    });

    // Supplier rules
    if (context.supplierId) {
      orConditions.push({
        ruleType: PriceRuleType.SUPPLIER,
        supplierId: context.supplierId,
      });
    }

    // Category rules
    if (context.categoryId) {
      orConditions.push({
        ruleType: PriceRuleType.CATEGORY,
        categoryId: context.categoryId,
      });
    }

    where.OR = orConditions;

    return this.prisma.priceRule.findMany({
      where,
      orderBy: { priority: 'asc' },
    });
  }

  // =========================================
  // UPDATE PRICE RULE
  // =========================================

  /**
   * Update an existing price rule
   */
  async updatePriceRule(
    id: string,
    tenantId: string,
    input: UpdatePriceRuleInput,
    userId: string
  ): Promise<PriceRule> {
    const existing = await this.prisma.priceRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Árszabály nem található');
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.calculationType !== undefined) data.calculationType = input.calculationType;
    if (input.value !== undefined) data.value = input.value;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.validFrom !== undefined) data.validFrom = input.validFrom;
    if (input.validTo !== undefined) data.validTo = input.validTo;
    if (input.itemIds !== undefined) data.itemIds = input.itemIds;
    if (input.categoryIds !== undefined) data.categoryIds = input.categoryIds;
    if (input.minQuantity !== undefined) data.minQuantity = input.minQuantity;
    if (input.maxUsageCount !== undefined) data.maxUsageCount = input.maxUsageCount;

    const rule = await this.prisma.priceRule.update({
      where: { id },
      data,
    });

    this.auditLogger.log({
      tenantId,
      action: 'PRICE_RULE_UPDATED',
      entityType: 'PriceRule',
      entityId: id,
      userId,
      details: { changes: Object.keys(data) },
    });

    return this.transformRule(rule);
  }

  // =========================================
  // DELETE PRICE RULE
  // =========================================

  /**
   * Delete a price rule
   */
  async deletePriceRule(id: string, tenantId: string, userId: string): Promise<void> {
    const existing = await this.prisma.priceRule.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Árszabály nem található');
    }

    await this.prisma.priceRule.delete({
      where: { id },
    });

    this.auditLogger.log({
      tenantId,
      action: 'PRICE_RULE_DELETED',
      entityType: 'PriceRule',
      entityId: id,
      userId,
      details: { name: existing.name },
    });
  }

  // =========================================
  // LIST PRICE RULES
  // =========================================

  /**
   * List price rules with filtering and pagination
   */
  async listPriceRules(
    tenantId: string,
    options: PriceRuleFilterOptions = {}
  ): Promise<PriceRuleListResponse> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (options.ruleType) where.ruleType = options.ruleType;
    if (options.status) where.status = options.status;
    if (options.itemId) where.itemId = options.itemId;
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.supplierId) where.supplierId = options.supplierId;
    if (options.partnerId) where.partnerId = options.partnerId;

    if (options.activeOnly) {
      where.status = PriceRuleStatus.ACTIVE;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [rules, total] = await Promise.all([
      this.prisma.priceRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.priceRule.count({ where }),
    ]);

    return {
      data: rules.map((r: unknown) => this.transformRule(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================
  // GET BY ID
  // =========================================

  /**
   * Get price rule by ID
   */
  async getPriceRuleById(id: string, tenantId: string): Promise<PriceRule | null> {
    const rule = await this.prisma.priceRule.findFirst({
      where: { id, tenantId },
    });

    return rule ? this.transformRule(rule) : null;
  }

  // =========================================
  // HELPERS
  // =========================================

  /**
   * Determine initial status based on validity dates
   */
  private determineInitialStatus(validFrom?: Date | null, validTo?: Date | null): PriceRuleStatus {
    const now = new Date();

    if (validTo && validTo < now) {
      return PriceRuleStatus.EXPIRED;
    }

    if (validFrom && validFrom > now) {
      return PriceRuleStatus.SCHEDULED;
    }

    return PriceRuleStatus.ACTIVE;
  }

  /**
   * Check if rule is active at given date
   */
  private isRuleActive(rule: any, date: Date): boolean {
    if (rule.status !== PriceRuleStatus.ACTIVE) {
      return false;
    }

    if (rule.validFrom && new Date(rule.validFrom) > date) {
      return false;
    }

    if (rule.validTo && new Date(rule.validTo) < date) {
      return false;
    }

    return true;
  }

  /**
   * Transform Prisma rule to interface type
   */
  private transformRule(rule: any): PriceRule {
    return {
      ...rule,
      value: rule.value instanceof Decimal ? rule.value.toNumber() : Number(rule.value),
    };
  }
}
