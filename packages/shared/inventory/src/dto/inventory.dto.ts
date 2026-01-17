/**
 * @kgc/inventory - Inventory DTOs with Zod validation
 * FR4-FR10: Készlet nyilvántartás alap
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const InventoryItemTypeSchema = z.enum([
  'PRODUCT',
  'RENTAL_EQUIPMENT',
  'PART',
  'CONSUMABLE',
]);

export const InventoryStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'IN_TRANSIT',
  'IN_SERVICE',
  'SOLD',
  'RENTED',
  'DAMAGED',
  'LOST',
  'SCRAPPED',
]);

// ============================================
// CREATE INVENTORY ITEM DTO
// ============================================

export const CreateInventoryItemSchema = z.object({
  /** Raktár ID - kötelező */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító (UUID formátum szükséges)' }),

  /** Cikk ID - kötelező */
  productId: z
    .string()
    .uuid({ message: 'Érvénytelen cikk azonosító (UUID formátum szükséges)' }),

  /** Tétel típusa */
  type: InventoryItemTypeSchema,

  /** Kezdeti státusz (alapértelmezett: AVAILABLE) */
  status: InventoryStatusSchema.optional().default('AVAILABLE'),

  /** Serial number (opcionális) */
  serialNumber: z
    .string()
    .min(1, { message: 'A serial number nem lehet üres' })
    .max(100, { message: 'A serial number maximum 100 karakter lehet' })
    .optional(),

  /** Batch number (opcionális) */
  batchNumber: z
    .string()
    .min(1, { message: 'A batch number nem lehet üres' })
    .max(50, { message: 'A batch number maximum 50 karakter lehet' })
    .optional(),

  /** K-P-D helykód (opcionális) */
  locationCode: z
    .string()
    .regex(/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/, {
      message: 'Érvénytelen helykód formátum (K-P-D: pl. K1-P2-D3)',
    })
    .optional(),

  /** Mennyiség - minimum 0 */
  quantity: z
    .number()
    .int({ message: 'A mennyiség egész szám kell legyen' })
    .min(0, { message: 'A mennyiség nem lehet negatív' }),

  /** Mértékegység */
  unit: z
    .string()
    .min(1, { message: 'A mértékegység kötelező' })
    .max(20, { message: 'A mértékegység maximum 20 karakter lehet' }),

  /** Minimális készlet szint (opcionális) */
  minStockLevel: z
    .number()
    .int({ message: 'A minimális készlet szint egész szám kell legyen' })
    .min(0, { message: 'A minimális készlet szint nem lehet negatív' })
    .optional(),

  /** Maximális készlet szint (opcionális) */
  maxStockLevel: z
    .number()
    .int({ message: 'A maximális készlet szint egész szám kell legyen' })
    .min(1, { message: 'A maximális készlet szint minimum 1 kell legyen' })
    .optional(),

  /** Beszerzési ár (opcionális) */
  purchasePrice: z
    .number()
    .min(0, { message: 'A beszerzési ár nem lehet negatív' })
    .optional(),

  /** Utolsó beszerzés dátuma (opcionális) */
  lastPurchaseDate: z.coerce.date().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;

// ============================================
// UPDATE INVENTORY ITEM DTO
// ============================================

export const UpdateInventoryItemSchema = z
  .object({
    /** Raktár ID */
    warehouseId: z
      .string()
      .uuid({ message: 'Érvénytelen raktár azonosító (UUID formátum szükséges)' })
      .optional(),

    /** Státusz */
    status: InventoryStatusSchema.optional(),

    /** K-P-D helykód */
    locationCode: z
      .string()
      .regex(/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/, {
        message: 'Érvénytelen helykód formátum (K-P-D: pl. K1-P2-D3)',
      })
      .nullable()
      .optional(),

    /** Mennyiség */
    quantity: z
      .number()
      .int({ message: 'A mennyiség egész szám kell legyen' })
      .min(0, { message: 'A mennyiség nem lehet negatív' })
      .optional(),

    /** Minimális készlet szint */
    minStockLevel: z
      .number()
      .int({ message: 'A minimális készlet szint egész szám kell legyen' })
      .min(0, { message: 'A minimális készlet szint nem lehet negatív' })
      .nullable()
      .optional(),

    /** Maximális készlet szint */
    maxStockLevel: z
      .number()
      .int({ message: 'A maximális készlet szint egész szám kell legyen' })
      .min(1, { message: 'A maximális készlet szint minimum 1 kell legyen' })
      .nullable()
      .optional(),

    /** Beszerzési ár */
    purchasePrice: z
      .number()
      .min(0, { message: 'A beszerzési ár nem lehet negatív' })
      .nullable()
      .optional(),

    /** Utolsó beszerzés dátuma */
    lastPurchaseDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;

// ============================================
// ADJUST QUANTITY DTO
// ============================================

export const AdjustQuantitySchema = z.object({
  /** Módosítás mértéke (pozitív: növelés, negatív: csökkentés) */
  adjustment: z
    .number()
    .int({ message: 'A módosítás egész szám kell legyen' })
    .refine((val) => val !== 0, {
      message: 'A módosítás nem lehet 0',
    }),

  /** Indoklás (opcionális de ajánlott) */
  reason: z
    .string()
    .min(1, { message: 'Az indoklás nem lehet üres' })
    .max(500, { message: 'Az indoklás maximum 500 karakter lehet' })
    .optional(),
});

export type AdjustQuantityInput = z.infer<typeof AdjustQuantitySchema>;

// ============================================
// QUERY DTO
// ============================================

export const InventoryQuerySchema = z.object({
  /** Raktár ID szűrő */
  warehouseId: z.string().uuid().optional(),

  /** Cikk ID szűrő */
  productId: z.string().uuid().optional(),

  /** Típus szűrő */
  type: InventoryItemTypeSchema.optional(),

  /** Státusz szűrő (egy vagy több) */
  status: z
    .union([InventoryStatusSchema, z.array(InventoryStatusSchema)])
    .optional(),

  /** Serial number keresés */
  serialNumber: z.string().optional(),

  /** Batch number keresés */
  batchNumber: z.string().optional(),

  /** K-P-D helykód keresés (prefix match) */
  locationCode: z.string().optional(),

  /** Minimum készlet alatt */
  belowMinStock: z.boolean().optional(),

  /** Szabad szöveges keresés */
  search: z.string().optional(),

  /** Rendezés mező */
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'quantity', 'locationCode'])
    .optional()
    .default('createdAt'),

  /** Rendezés irány */
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  /** Lapozás - offset */
  offset: z.number().int().min(0).optional().default(0),

  /** Lapozás - limit */
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type InventoryQueryInput = z.infer<typeof InventoryQuerySchema>;

// ============================================
// STOCK SUMMARY RESPONSE DTO
// ============================================

export const StockSummaryResponseSchema = z.object({
  tenantId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  productName: z.string(),
  totalQuantity: z.number().int(),
  availableQuantity: z.number().int(),
  reservedQuantity: z.number().int(),
  inTransitQuantity: z.number().int(),
  inServiceQuantity: z.number().int(),
  rentedQuantity: z.number().int(),
  unit: z.string(),
  minStockLevel: z.number().int().optional(),
  stockLevelStatus: z.enum(['OK', 'LOW', 'CRITICAL', 'OUT_OF_STOCK']),
  lastUpdated: z.date(),
});

export type StockSummaryResponse = z.infer<typeof StockSummaryResponseSchema>;

// ============================================
// BULK ADJUST QUANTITY DTO
// ============================================

export const BulkAdjustQuantitySchema = z.object({
  adjustments: z
    .array(
      z.object({
        /** Készlet tétel ID */
        id: z.string().uuid({ message: 'Érvénytelen készlet tétel azonosító' }),
        /** Módosítás mértéke */
        adjustment: z.number().int(),
      }),
    )
    .min(1, { message: 'Legalább egy tétel szükséges' })
    .max(100, { message: 'Maximum 100 tétel módosítható egyszerre' }),

  /** Közös indoklás */
  reason: z
    .string()
    .min(1, { message: 'Az indoklás kötelező bulk módosításnál' })
    .max(500, { message: 'Az indoklás maximum 500 karakter lehet' }),
});

export type BulkAdjustQuantityInput = z.infer<typeof BulkAdjustQuantitySchema>;
