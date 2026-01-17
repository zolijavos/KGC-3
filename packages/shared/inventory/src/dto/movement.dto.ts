/**
 * @kgc/inventory - Movement DTOs with Zod validation
 * Story 9-4: Készlet mozgás audit trail
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const MovementTypeSchema = z.enum([
  'RECEIPT',
  'ISSUE',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT',
  'RETURN',
  'SCRAP',
  'RESERVATION',
  'RELEASE',
  'STATUS_CHANGE',
]);

export const MovementSourceModuleSchema = z.enum([
  'INVENTORY',
  'RENTAL',
  'SERVICE',
  'SALES',
  'STOCK_COUNT',
  'TRANSFER',
  'MANUAL',
]);

// ============================================
// CREATE MOVEMENT DTO
// ============================================

export const CreateMovementSchema = z.object({
  /** Készlet tétel ID */
  inventoryItemId: z
    .string()
    .uuid({ message: 'Érvénytelen készlet tétel azonosító' }),

  /** Raktár ID */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító' }),

  /** Cikk ID */
  productId: z
    .string()
    .uuid({ message: 'Érvénytelen cikk azonosító' }),

  /** Mozgás típusa */
  type: MovementTypeSchema,

  /** Forrás modul */
  sourceModule: MovementSourceModuleSchema,

  /** Hivatkozás ID (opcionális) */
  referenceId: z.string().uuid().optional(),

  /** Hivatkozás típus (opcionális) */
  referenceType: z.string().max(50).optional(),

  /** Mennyiség változás */
  quantityChange: z
    .number()
    .int({ message: 'A mennyiség változás egész szám kell legyen' }),

  /** Előző mennyiség */
  previousQuantity: z
    .number()
    .int({ message: 'Az előző mennyiség egész szám kell legyen' })
    .min(0, { message: 'Az előző mennyiség nem lehet negatív' }),

  /** Mértékegység */
  unit: z.string().min(1).max(20),

  /** Előző státusz */
  previousStatus: z.string().max(50).optional(),

  /** Új státusz */
  newStatus: z.string().max(50).optional(),

  /** Előző helykód */
  previousLocationCode: z.string().max(50).optional(),

  /** Új helykód */
  newLocationCode: z.string().max(50).optional(),

  /** Serial number */
  serialNumber: z.string().max(100).optional(),

  /** Batch number */
  batchNumber: z.string().max(50).optional(),

  /** Érték */
  value: z.number().min(0).optional(),

  /** Valuta */
  currency: z.string().length(3).optional(),

  /** Indoklás (kötelező negatív mennyiségváltozásnál) */
  reason: z
    .string()
    .max(500, { message: 'Az indoklás maximum 500 karakter' })
    .optional(),
}).refine(
  (data) => {
    // Negatív mennyiségváltozásnál kötelező az indoklás (audit)
    if (data.quantityChange < 0 && !data.reason) {
      return false;
    }
    return true;
  },
  {
    message: 'Negatív készletmódosításnál kötelező az indoklás megadása (audit követelmény)',
    path: ['reason'],
  },
);

export type CreateMovementInput = z.infer<typeof CreateMovementSchema>;

// ============================================
// QUERY DTO
// ============================================

export const MovementQuerySchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  type: z.union([MovementTypeSchema, z.array(MovementTypeSchema)]).optional(),
  sourceModule: MovementSourceModuleSchema.optional(),
  referenceId: z.string().uuid().optional(),
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['performedAt', 'createdAt', 'quantityChange']).optional().default('performedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type MovementQueryInput = z.infer<typeof MovementQuerySchema>;

// ============================================
// SUMMARY REQUEST DTO
// ============================================

export const MovementSummaryRequestSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine((data) => data.periodStart <= data.periodEnd, {
  message: 'A kezdő dátum nem lehet később mint a záró dátum',
});

export type MovementSummaryRequest = z.infer<typeof MovementSummaryRequestSchema>;
