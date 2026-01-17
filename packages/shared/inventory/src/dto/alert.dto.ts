/**
 * @kgc/inventory - Alert DTOs with Zod validation
 * Story 9-6: Minimum stock alert
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const StockAlertTypeSchema = z.enum([
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'OVERSTOCK',
  'EXPIRING_SOON',
  'WARRANTY_EXPIRING',
]);

export const AlertPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const AlertStatusSchema = z.enum([
  'ACTIVE',
  'ACKNOWLEDGED',
  'RESOLVED',
  'SNOOZED',
]);

// ============================================
// CREATE STOCK LEVEL SETTING DTO
// ============================================

export const CreateStockLevelSettingSchema = z.object({
  /** Cikk ID */
  productId: z
    .string()
    .uuid({ message: 'Érvénytelen cikk azonosító' }),

  /** Raktár ID (opcionális) */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító' })
    .optional(),

  /** Minimum szint */
  minimumLevel: z
    .number()
    .int({ message: 'A minimum szint egész szám kell legyen' })
    .min(0, { message: 'A minimum szint nem lehet negatív' }),

  /** Újrarendelési pont */
  reorderPoint: z
    .number()
    .int({ message: 'Az újrarendelési pont egész szám kell legyen' })
    .min(0, { message: 'Az újrarendelési pont nem lehet negatív' }),

  /** Újrarendelési mennyiség */
  reorderQuantity: z
    .number()
    .int({ message: 'Az újrarendelési mennyiség egész szám kell legyen' })
    .min(1, { message: 'Az újrarendelési mennyiség minimum 1' }),

  /** Maximum szint (opcionális) */
  maximumLevel: z
    .number()
    .int({ message: 'A maximum szint egész szám kell legyen' })
    .min(0, { message: 'A maximum szint nem lehet negatív' })
    .optional(),

  /** Mértékegység */
  unit: z.string().min(1).max(20),

  /** Lead time napokban */
  leadTimeDays: z
    .number()
    .int()
    .min(0)
    .optional(),

  /** Aktív-e (alapértelmezett: true) */
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => data.reorderPoint >= data.minimumLevel,
  {
    message: 'Az újrarendelési pont nem lehet kisebb a minimum szintnél',
    path: ['reorderPoint'],
  },
).refine(
  (data) => !data.maximumLevel || data.maximumLevel > data.reorderPoint,
  {
    message: 'A maximum szint nagyobb kell legyen az újrarendelési pontnál',
    path: ['maximumLevel'],
  },
);

export type CreateStockLevelSettingInput = z.infer<typeof CreateStockLevelSettingSchema>;

// ============================================
// UPDATE STOCK LEVEL SETTING DTO
// ============================================

export const UpdateStockLevelSettingSchema = z
  .object({
    minimumLevel: z.number().int().min(0).optional(),
    reorderPoint: z.number().int().min(0).optional(),
    reorderQuantity: z.number().int().min(1).optional(),
    maximumLevel: z.number().int().min(0).nullable().optional(),
    unit: z.string().min(1).max(20).optional(),
    leadTimeDays: z.number().int().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateStockLevelSettingInput = z.infer<typeof UpdateStockLevelSettingSchema>;

// ============================================
// ACKNOWLEDGE ALERT DTO
// ============================================

export const AcknowledgeAlertSchema = z.object({
  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type AcknowledgeAlertInput = z.infer<typeof AcknowledgeAlertSchema>;

// ============================================
// SNOOZE ALERT DTO
// ============================================

export const SnoozeAlertSchema = z.object({
  /** Elhalasztás ideje napokban */
  snoozeDays: z
    .number()
    .int()
    .min(1, { message: 'Minimum 1 nap elhalasztás' })
    .max(30, { message: 'Maximum 30 nap elhalasztás' }),

  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type SnoozeAlertInput = z.infer<typeof SnoozeAlertSchema>;

// ============================================
// QUERY DTOs
// ============================================

export const StockLevelSettingQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type StockLevelSettingQueryInput = z.infer<typeof StockLevelSettingQuerySchema>;

export const AlertQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  type: z.union([StockAlertTypeSchema, z.array(StockAlertTypeSchema)]).optional(),
  priority: z.union([AlertPrioritySchema, z.array(AlertPrioritySchema)]).optional(),
  status: z.union([AlertStatusSchema, z.array(AlertStatusSchema)]).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'priority', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type AlertQueryInput = z.infer<typeof AlertQuerySchema>;

// ============================================
// BULK CHECK STOCK LEVELS DTO
// ============================================

export const BulkCheckStockLevelsSchema = z.object({
  /** Cikk ID-k (opcionális - ha üres, az összes aktív beállítást ellenőrzi) */
  productIds: z.array(z.string().uuid()).optional(),

  /** Raktár ID (opcionális - ha üres, minden raktárt ellenőriz) */
  warehouseId: z.string().uuid().optional(),

  /** Alert létrehozása automatikusan */
  createAlerts: z.boolean().optional().default(true),
});

export type BulkCheckStockLevelsInput = z.infer<typeof BulkCheckStockLevelsSchema>;
