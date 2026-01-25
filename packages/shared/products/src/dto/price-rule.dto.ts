/**
 * @kgc/products - PriceRule DTOs with Zod validation
 * Epic 8: Story 8-5: Árszabály kezelés
 */

import { z } from 'zod';

// ============================================
// RULE TYPE SCHEMA
// ============================================

export const PriceRuleTypeSchema = z.enum(['DISCOUNT', 'MARKUP', 'FIXED']);

// ============================================
// CREATE PRICE RULE DTO
// ============================================

export const CreatePriceRuleSchema = z
  .object({
    /** Termék ID (opcionális - null = összes termék) */
    productId: z.string().uuid().optional(),

    /** Kategória ID (opcionális) */
    categoryId: z.string().uuid().optional(),

    /** Szabály neve */
    ruleName: z
      .string()
      .min(1, { message: 'A szabály név kötelező' })
      .max(100, { message: 'A szabály név maximum 100 karakter' }),

    /** Szabály típusa */
    ruleType: PriceRuleTypeSchema,

    /** Kedvezmény százalék (DISCOUNT típushoz) */
    discountPercent: z.number().min(0).max(100).optional(),

    /** Kedvezmény összeg (DISCOUNT típushoz) */
    discountAmount: z.number().min(0).optional(),

    /** Fix ár (FIXED típushoz) */
    fixedPrice: z.number().min(0).optional(),

    /** Minimum mennyiség feltétel */
    minQuantity: z.number().int().min(1).optional(),

    /** Minimum összeg feltétel */
    minAmount: z.number().min(0).optional(),

    /** Partner szint feltétel */
    partnerTier: z.string().max(20).optional(),

    /** Bérlésre vonatkozik */
    applyToRental: z.boolean().default(false),

    /** Értékesítésre vonatkozik */
    applyToSales: z.boolean().default(true),

    /** Érvényesség kezdete */
    validFrom: z.coerce.date(),

    /** Érvényesség vége */
    validUntil: z.coerce.date().optional(),

    /** Prioritás (magasabb = előbb alkalmazódik) */
    priority: z.number().int().min(0).default(0),

    /** Aktív-e */
    isActive: z.boolean().default(true),
  })
  .refine(
    data => {
      // DISCOUNT típushoz kell discountPercent vagy discountAmount
      if (data.ruleType === 'DISCOUNT') {
        return data.discountPercent !== undefined || data.discountAmount !== undefined;
      }
      // FIXED típushoz kell fixedPrice
      if (data.ruleType === 'FIXED') {
        return data.fixedPrice !== undefined;
      }
      return true;
    },
    {
      message: 'A szabály típusnak megfelelő árértéket kell megadni',
      path: ['ruleType'],
    }
  );

export type CreatePriceRuleInput = z.infer<typeof CreatePriceRuleSchema>;

// ============================================
// UPDATE PRICE RULE DTO
// ============================================

export const UpdatePriceRuleSchema = z.object({
  ruleName: z.string().min(1).max(100).optional(),
  ruleType: PriceRuleTypeSchema.optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  discountAmount: z.number().min(0).nullable().optional(),
  fixedPrice: z.number().min(0).nullable().optional(),
  minQuantity: z.number().int().min(1).nullable().optional(),
  minAmount: z.number().min(0).nullable().optional(),
  partnerTier: z.string().max(20).nullable().optional(),
  applyToRental: z.boolean().optional(),
  applyToSales: z.boolean().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePriceRuleInput = z.infer<typeof UpdatePriceRuleSchema>;

// ============================================
// CALCULATE PRICE DTO
// ============================================

export const CalculatePriceSchema = z.object({
  /** Termék ID */
  productId: z.string().uuid({ message: 'Érvénytelen termék ID' }),

  /** Mennyiség */
  quantity: z.number().int().min(1).default(1),

  /** Partner ID (opcionális - törzsvendég kedvezmény) */
  partnerId: z.string().uuid().optional(),

  /** Bérlés vagy értékesítés */
  transactionType: z.enum(['rental', 'sales']).default('sales'),

  /** Számítás dátuma */
  calculateAt: z.coerce.date().default(() => new Date()),
});

export type CalculatePriceInput = z.infer<typeof CalculatePriceSchema>;

// ============================================
// BULK APPLY RULE DTO
// ============================================

export const BulkApplyRuleSchema = z.object({
  /** Alkalmazandó szabály ID */
  ruleId: z.string().uuid({ message: 'Érvénytelen szabály ID' }),

  /** Termék ID-k amikre alkalmazandó */
  productIds: z.array(z.string().uuid()).min(1, { message: 'Legalább egy termék ID szükséges' }),
});

export type BulkApplyRuleInput = z.infer<typeof BulkApplyRuleSchema>;
