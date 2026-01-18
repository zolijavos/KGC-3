/**
 * PriceRuleService unit tests
 * Story 8-5: Árszabály Kezelés
 *
 * TDD RED phase - Tests for price rule management and calculation
 *
 * @kgc/cikk
 */

import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PRIORITY,
  PriceCalculationType,
  PriceRuleStatus,
  PriceRuleType,
} from '../interfaces/price-rule.interface';
import { PriceRuleService } from './price-rule.service';

// Mock Prisma client
const mockPrismaPriceRule = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

const mockPrismaItem = {
  findFirst: vi.fn(),
};

const mockPrisma = {
  priceRule: mockPrismaPriceRule,
  item: mockPrismaItem,
  $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrisma)),
};

// Mock audit logger
const mockAuditLogger = {
  log: vi.fn(),
};

describe('PriceRuleService', () => {
  let service: PriceRuleService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriceRuleService(mockPrisma as never, mockAuditLogger as never);
  });

  // =========================================
  // CREATE PRICE RULE TESTS
  // =========================================
  describe('createPriceRule', () => {
    it('should create a promotion price rule', async () => {
      const input = {
        name: 'Téli akció 2026',
        description: '20% kedvezmény minden termékre',
        ruleType: PriceRuleType.PROMOTION,
        calculationType: PriceCalculationType.DISCOUNT,
        value: 20,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-01-31'),
      };

      mockPrismaPriceRule.create.mockResolvedValue({
        id: 'rule-uuid',
        tenantId,
        ...input,
        value: new Decimal(20),
        priority: DEFAULT_PRIORITY[PriceRuleType.PROMOTION],
        status: PriceRuleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      });

      const result = await service.createPriceRule(tenantId, input, userId);

      expect(result.id).toBe('rule-uuid');
      expect(result.ruleType).toBe(PriceRuleType.PROMOTION);
      expect(result.priority).toBe(100); // Default promotion priority
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });

    it('should create a partner-specific price rule', async () => {
      const input = {
        name: 'VIP Partner kedvezmény',
        ruleType: PriceRuleType.PARTNER,
        calculationType: PriceCalculationType.DISCOUNT,
        value: 15,
        partnerId: 'partner-789',
      };

      mockPrismaPriceRule.create.mockResolvedValue({
        id: 'rule-uuid',
        tenantId,
        ...input,
        value: new Decimal(15),
        priority: DEFAULT_PRIORITY[PriceRuleType.PARTNER],
        status: PriceRuleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      });

      const result = await service.createPriceRule(tenantId, input, userId);

      expect(result.ruleType).toBe(PriceRuleType.PARTNER);
      expect(result.priority).toBe(80); // Default partner priority
    });

    it('should create a category price rule with percentage markup', async () => {
      const input = {
        name: 'Alkatrész árrés',
        ruleType: PriceRuleType.CATEGORY,
        calculationType: PriceCalculationType.PERCENTAGE,
        value: 60, // 60% árrés
        categoryId: 'cat-alkatresz',
      };

      mockPrismaPriceRule.create.mockResolvedValue({
        id: 'rule-uuid',
        tenantId,
        ...input,
        value: new Decimal(60),
        priority: DEFAULT_PRIORITY[PriceRuleType.CATEGORY],
        status: PriceRuleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      });

      const result = await service.createPriceRule(tenantId, input, userId);

      expect(result.calculationType).toBe(PriceCalculationType.PERCENTAGE);
    });

    it('should create an item-specific fixed price rule', async () => {
      const input = {
        name: 'Makita DDF481 fix ár',
        ruleType: PriceRuleType.ITEM,
        calculationType: PriceCalculationType.FIXED,
        value: 129900, // Fix ár HUF
        itemId: 'item-makita-ddf481',
      };

      mockPrismaPriceRule.create.mockResolvedValue({
        id: 'rule-uuid',
        tenantId,
        ...input,
        value: new Decimal(129900),
        priority: DEFAULT_PRIORITY[PriceRuleType.ITEM],
        status: PriceRuleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      });

      const result = await service.createPriceRule(tenantId, input, userId);

      expect(result.calculationType).toBe(PriceCalculationType.FIXED);
    });

    it('should allow custom priority override', async () => {
      const input = {
        name: 'Kiemelt akció',
        ruleType: PriceRuleType.PROMOTION,
        calculationType: PriceCalculationType.DISCOUNT,
        value: 30,
        priority: 150, // Custom higher priority
      };

      mockPrismaPriceRule.create.mockResolvedValue({
        id: 'rule-uuid',
        tenantId,
        ...input,
        value: new Decimal(30),
        priority: 150,
        status: PriceRuleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      });

      const result = await service.createPriceRule(tenantId, input, userId);

      expect(result.priority).toBe(150);
    });
  });

  // =========================================
  // PRICE CALCULATION TESTS
  // =========================================
  describe('calculatePrice', () => {
    it('should apply promotion rule with highest priority', async () => {
      const context = {
        itemId: 'item-123',
        categoryId: 'cat-gep',
        quantity: 1,
        basePrice: 100000,
      };

      // Mock rules: promotion + category
      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'promo-rule',
          name: 'Téli akció',
          ruleType: PriceRuleType.PROMOTION,
          calculationType: PriceCalculationType.DISCOUNT,
          value: new Decimal(20),
          priority: 100,
          status: PriceRuleStatus.ACTIVE,
          validFrom: new Date('2026-01-01'),
          validTo: new Date('2026-12-31'),
        },
        {
          id: 'cat-rule',
          name: 'Gép árrés',
          ruleType: PriceRuleType.CATEGORY,
          calculationType: PriceCalculationType.PERCENTAGE,
          value: new Decimal(35),
          priority: 20,
          status: PriceRuleStatus.ACTIVE,
          categoryId: 'cat-gep',
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      // Base: 100000 + 35% = 135000, then -20% promotion = 108000
      expect(result.finalPrice).toBe(108000);
      expect(result.appliedRules).toHaveLength(2);
      expect(result.appliedRules[0]?.ruleType).toBe(PriceRuleType.CATEGORY); // Applied first (lower priority)
      expect(result.appliedRules[1]?.ruleType).toBe(PriceRuleType.PROMOTION); // Applied last (highest priority)
    });

    it('should use list price when no rules match', async () => {
      const context = {
        itemId: 'item-no-rules',
        quantity: 1,
        basePrice: 50000,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([]);

      const result = await service.calculatePrice(tenantId, context);

      expect(result.finalPrice).toBe(50000); // No change
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should apply fixed price rule', async () => {
      const context = {
        itemId: 'item-makita',
        quantity: 1,
        basePrice: 85000, // Beszerzési ár
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'fix-rule',
          name: 'Makita fix ár',
          ruleType: PriceRuleType.ITEM,
          calculationType: PriceCalculationType.FIXED,
          value: new Decimal(129900),
          priority: 60,
          status: PriceRuleStatus.ACTIVE,
          itemId: 'item-makita',
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      expect(result.finalPrice).toBe(129900); // Fix price, ignores base
    });

    it('should apply percentage markup rule', async () => {
      const context = {
        itemId: 'item-123',
        categoryId: 'cat-alkatresz',
        quantity: 1,
        basePrice: 5000,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'markup-rule',
          name: 'Alkatrész árrés',
          ruleType: PriceRuleType.CATEGORY,
          calculationType: PriceCalculationType.PERCENTAGE,
          value: new Decimal(60), // 60% markup
          priority: 20,
          status: PriceRuleStatus.ACTIVE,
          categoryId: 'cat-alkatresz',
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      // 5000 + 60% = 8000
      expect(result.finalPrice).toBe(8000);
    });

    it('should apply partner-specific discount', async () => {
      const context = {
        itemId: 'item-123',
        partnerId: 'vip-partner',
        quantity: 1,
        basePrice: 100000,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'partner-rule',
          name: 'VIP Partner',
          ruleType: PriceRuleType.PARTNER,
          calculationType: PriceCalculationType.DISCOUNT,
          value: new Decimal(15), // 15% discount
          priority: 80,
          status: PriceRuleStatus.ACTIVE,
          partnerId: 'vip-partner',
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      // 100000 - 15% = 85000
      expect(result.finalPrice).toBe(85000);
    });

    it('should skip expired rules', async () => {
      const context = {
        itemId: 'item-123',
        quantity: 1,
        basePrice: 100000,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'expired-rule',
          name: 'Lejárt akció',
          ruleType: PriceRuleType.PROMOTION,
          calculationType: PriceCalculationType.DISCOUNT,
          value: new Decimal(50),
          priority: 100,
          status: PriceRuleStatus.EXPIRED,
          validTo: new Date('2025-12-31'),
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      expect(result.finalPrice).toBe(100000); // Expired rule not applied
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should respect rule validity dates', async () => {
      const futureDate = new Date('2027-01-15');
      const context = {
        itemId: 'item-123',
        quantity: 1,
        basePrice: 100000,
        date: futureDate,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'future-rule',
          name: 'Jövőbeli akció',
          ruleType: PriceRuleType.PROMOTION,
          calculationType: PriceCalculationType.DISCOUNT,
          value: new Decimal(25),
          priority: 100,
          status: PriceRuleStatus.ACTIVE,
          validFrom: new Date('2027-01-01'),
          validTo: new Date('2027-01-31'),
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      // Rule should apply because date is within validity
      expect(result.finalPrice).toBe(75000);
    });
  });

  // =========================================
  // RULE PRIORITY TESTS
  // =========================================
  describe('rule priority', () => {
    it('should apply rules in priority order (low to high)', async () => {
      const context = {
        itemId: 'item-123',
        categoryId: 'cat-gep',
        partnerId: 'partner-vip',
        quantity: 1,
        basePrice: 100000,
      };

      mockPrismaPriceRule.findMany.mockResolvedValue([
        {
          id: 'cat-rule',
          name: 'Kategória',
          ruleType: PriceRuleType.CATEGORY,
          calculationType: PriceCalculationType.PERCENTAGE,
          value: new Decimal(30), // +30%
          priority: 20,
          status: PriceRuleStatus.ACTIVE,
        },
        {
          id: 'partner-rule',
          name: 'Partner',
          ruleType: PriceRuleType.PARTNER,
          calculationType: PriceCalculationType.DISCOUNT,
          value: new Decimal(10), // -10%
          priority: 80,
          status: PriceRuleStatus.ACTIVE,
        },
      ]);

      const result = await service.calculatePrice(tenantId, context);

      // Order: category (+30%) first, then partner (-10%)
      // 100000 * 1.30 = 130000, then 130000 * 0.90 = 117000
      expect(result.finalPrice).toBe(117000);
      expect(result.appliedRules[0]?.ruleType).toBe(PriceRuleType.CATEGORY);
      expect(result.appliedRules[1]?.ruleType).toBe(PriceRuleType.PARTNER);
    });

    it('should use default priorities by rule type', () => {
      expect(DEFAULT_PRIORITY[PriceRuleType.PROMOTION]).toBe(100);
      expect(DEFAULT_PRIORITY[PriceRuleType.PARTNER]).toBe(80);
      expect(DEFAULT_PRIORITY[PriceRuleType.ITEM]).toBe(60);
      expect(DEFAULT_PRIORITY[PriceRuleType.SUPPLIER]).toBe(40);
      expect(DEFAULT_PRIORITY[PriceRuleType.CATEGORY]).toBe(20);
      expect(DEFAULT_PRIORITY[PriceRuleType.LIST]).toBe(0);
    });
  });

  // =========================================
  // UPDATE PRICE RULE TESTS
  // =========================================
  describe('updatePriceRule', () => {
    it('should update price rule fields', async () => {
      mockPrismaPriceRule.findFirst.mockResolvedValue({
        id: 'rule-123',
        tenantId,
        name: 'Original',
        value: new Decimal(20),
      });

      mockPrismaPriceRule.update.mockResolvedValue({
        id: 'rule-123',
        tenantId,
        name: 'Updated',
        value: new Decimal(25),
      });

      await service.updatePriceRule('rule-123', tenantId, { value: 25 }, userId);

      expect(mockPrismaPriceRule.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent rule', async () => {
      mockPrismaPriceRule.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePriceRule('non-existent', tenantId, { value: 30 }, userId)
      ).rejects.toThrow('Árszabály nem található');
    });
  });

  // =========================================
  // DELETE PRICE RULE TESTS
  // =========================================
  describe('deletePriceRule', () => {
    it('should delete price rule', async () => {
      mockPrismaPriceRule.findFirst.mockResolvedValue({
        id: 'rule-123',
        tenantId,
        name: 'To delete',
      });

      mockPrismaPriceRule.delete.mockResolvedValue({});

      await service.deletePriceRule('rule-123', tenantId, userId);

      expect(mockPrismaPriceRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
      });
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });
  });

  // =========================================
  // GET APPLICABLE RULES TESTS
  // =========================================
  describe('getApplicableRules', () => {
    it('should return all applicable rules for item', async () => {
      const rules = [
        { id: 'rule-1', ruleType: PriceRuleType.CATEGORY, priority: 20 },
        { id: 'rule-2', ruleType: PriceRuleType.ITEM, priority: 60 },
      ];

      mockPrismaPriceRule.findMany.mockResolvedValue(rules);

      const result = await service.getApplicableRules(tenantId, {
        itemId: 'item-123',
        categoryId: 'cat-gep',
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      mockPrismaPriceRule.findMany.mockResolvedValue([
        { id: 'active', status: PriceRuleStatus.ACTIVE },
      ]);

      await service.getApplicableRules(tenantId, {
        itemId: 'item-123',
        activeOnly: true,
      });

      expect(mockPrismaPriceRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PriceRuleStatus.ACTIVE,
          }),
        })
      );
    });
  });

  // =========================================
  // LIST PRICE RULES TESTS
  // =========================================
  describe('listPriceRules', () => {
    it('should return paginated price rules', async () => {
      mockPrismaPriceRule.findMany.mockResolvedValue([
        { id: 'rule-1', name: 'Rule 1' },
        { id: 'rule-2', name: 'Rule 2' },
      ]);
      mockPrismaPriceRule.count.mockResolvedValue(10);

      const result = await service.listPriceRules(tenantId, { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should filter by rule type', async () => {
      mockPrismaPriceRule.findMany.mockResolvedValue([]);
      mockPrismaPriceRule.count.mockResolvedValue(0);

      await service.listPriceRules(tenantId, { ruleType: PriceRuleType.PROMOTION });

      expect(mockPrismaPriceRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ruleType: PriceRuleType.PROMOTION,
          }),
        })
      );
    });
  });
});
