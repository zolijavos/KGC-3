/**
 * Price Rule Interfaces
 * Story 8-5: Árszabály Kezelés
 *
 * ADR-012: Kombinált hierarchikus árazási rendszer
 *
 * Priority (highest to lowest):
 * 1. Promotion (akció) - time-limited
 * 2. Partner-specific price
 * 3. Item-specific price
 * 4. Supplier rule
 * 5. Category rule
 * 6. List price (fallback)
 *
 * @kgc/cikk
 */

import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Price rule types
 */
export enum PriceRuleType {
  PROMOTION = 'PROMOTION', // Akció - time-limited
  PARTNER = 'PARTNER', // Partner kedvezmény
  ITEM = 'ITEM', // Egyedi cikk ár
  SUPPLIER = 'SUPPLIER', // Beszállító szintű
  CATEGORY = 'CATEGORY', // Cikkcsoport szintű
  LIST = 'LIST', // Listaár (alapértelmezett)
}

/**
 * Price calculation method
 */
export enum PriceCalculationType {
  FIXED = 'FIXED', // Fix ár (HUF)
  PERCENTAGE = 'PERCENTAGE', // Százalékos árrés
  DISCOUNT = 'DISCOUNT', // Kedvezmény % (listaárból)
  LIST_PRICE = 'LIST_PRICE', // Beszállítói listaár használata
}

/**
 * Price rule status
 */
export enum PriceRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SCHEDULED = 'SCHEDULED', // Jövőbeli érvényesség
  EXPIRED = 'EXPIRED', // Lejárt
}

/**
 * Base price rule interface
 */
export interface PriceRuleBase {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  ruleType: PriceRuleType;
  calculationType: PriceCalculationType;
  value: number | Decimal; // Fix ár vagy százalék
  priority: number; // Magasabb = nagyobb prioritás
  status: PriceRuleStatus;
  validFrom?: Date | null;
  validTo?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Promotion (akció) price rule
 */
export interface PromotionPriceRule extends PriceRuleBase {
  ruleType: PriceRuleType.PROMOTION;
  itemIds?: string[]; // Érintett cikkek (null = minden cikk)
  categoryIds?: string[]; // Érintett kategóriák
  minQuantity?: number; // Minimum mennyiség
  maxUsageCount?: number; // Maximum felhasználás
  currentUsageCount?: number;
}

/**
 * Partner-specific price rule
 */
export interface PartnerPriceRule extends PriceRuleBase {
  ruleType: PriceRuleType.PARTNER;
  partnerId: string;
  itemId?: string | null; // Ha null, az összes cikkre érvényes
  categoryId?: string | null; // Ha null, minden kategóriára
}

/**
 * Item-specific price rule
 */
export interface ItemPriceRule extends PriceRuleBase {
  ruleType: PriceRuleType.ITEM;
  itemId: string;
}

/**
 * Supplier-level price rule
 */
export interface SupplierPriceRule extends PriceRuleBase {
  ruleType: PriceRuleType.SUPPLIER;
  supplierId: string;
}

/**
 * Category-level price rule
 */
export interface CategoryPriceRule extends PriceRuleBase {
  ruleType: PriceRuleType.CATEGORY;
  categoryId: string;
}

/**
 * Union type for all price rules
 */
export type PriceRule =
  | PromotionPriceRule
  | PartnerPriceRule
  | ItemPriceRule
  | SupplierPriceRule
  | CategoryPriceRule
  | PriceRuleBase;

/**
 * Input for creating a price rule
 */
export interface CreatePriceRuleInput {
  name: string;
  description?: string | null;
  ruleType: PriceRuleType;
  calculationType: PriceCalculationType;
  value: number;
  priority?: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  // Type-specific fields
  itemId?: string;
  itemIds?: string[];
  categoryId?: string;
  categoryIds?: string[];
  supplierId?: string;
  partnerId?: string;
  minQuantity?: number;
  maxUsageCount?: number;
}

/**
 * Input for updating a price rule
 */
export interface UpdatePriceRuleInput {
  name?: string;
  description?: string | null;
  calculationType?: PriceCalculationType;
  value?: number;
  priority?: number;
  status?: PriceRuleStatus;
  validFrom?: Date | null;
  validTo?: Date | null;
  itemIds?: string[];
  categoryIds?: string[];
  minQuantity?: number;
  maxUsageCount?: number;
}

/**
 * Context for price calculation
 */
export interface PriceCalculationContext {
  itemId: string;
  categoryId?: string | null;
  supplierId?: string | null;
  partnerId?: string | null;
  quantity: number;
  basePrice: number; // Beszerzési ár vagy listaár
  date?: Date; // Kalkuláció dátuma (default: now)
}

/**
 * Result of price calculation
 */
export interface PriceCalculationResult {
  finalPrice: number; // Végső eladási ár
  basePrice: number; // Kiindulási ár
  appliedRules: AppliedRule[]; // Alkalmazott szabályok
  totalDiscount: number; // Összes kedvezmény (HUF)
  totalDiscountPercent: number; // Összes kedvezmény (%)
  calculatedAt: Date;
}

/**
 * Applied rule in calculation
 */
export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  ruleType: PriceRuleType;
  calculationType: PriceCalculationType;
  value: number;
  priceEffect: number; // Ár változás (HUF, + vagy -)
  priority: number;
}

/**
 * Price rule filter options
 */
export interface PriceRuleFilterOptions {
  ruleType?: PriceRuleType;
  status?: PriceRuleStatus;
  itemId?: string;
  categoryId?: string;
  supplierId?: string;
  partnerId?: string;
  activeOnly?: boolean; // Csak aktív és érvényes szabályok
  includeExpired?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Price rule list response
 */
export interface PriceRuleListResponse {
  data: PriceRule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Default priority values by rule type
 */
export const DEFAULT_PRIORITY: Record<PriceRuleType, number> = {
  [PriceRuleType.PROMOTION]: 100,
  [PriceRuleType.PARTNER]: 80,
  [PriceRuleType.ITEM]: 60,
  [PriceRuleType.SUPPLIER]: 40,
  [PriceRuleType.CATEGORY]: 20,
  [PriceRuleType.LIST]: 0,
};

/**
 * Validation constants
 */
export const PRICE_RULE_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  MIN_PERCENTAGE: -100, // -100% = ingyen
  MAX_PERCENTAGE: 1000, // 1000% árrés
  MIN_FIXED_PRICE: 0,
  MAX_FIXED_PRICE: 100_000_000, // 100M HUF
};
