/**
 * @kgc/inventory - Tracking DTOs with Zod validation
 * Story 9-5: Serial number és batch tracking
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const SerialNumberStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'RENTED',
  'IN_SERVICE',
  'SOLD',
  'DAMAGED',
  'LOST',
  'SCRAPPED',
]);

export const BatchStatusSchema = z.enum([
  'ACTIVE',
  'QUARANTINE',
  'EXPIRED',
  'RECALLED',
  'DEPLETED',
]);

// ============================================
// CREATE SERIAL NUMBER DTO
// ============================================

export const CreateSerialNumberSchema = z.object({
  /** Serial number érték */
  serialNumber: z
    .string()
    .min(1, { message: 'A serial number kötelező' })
    .max(100, { message: 'A serial number maximum 100 karakter' })
    .regex(/^[A-Za-z0-9_\-./]+$/, {
      message: 'A serial number csak betűket, számokat, kötőjelet, aláhúzást, pontot és perjelet tartalmazhat',
    }),

  /** Cikk ID */
  productId: z
    .string()
    .uuid({ message: 'Érvénytelen cikk azonosító' }),

  /** Készlet tétel ID (opcionális) */
  inventoryItemId: z
    .string()
    .uuid({ message: 'Érvénytelen készlet tétel azonosító' })
    .optional(),

  /** Raktár ID (opcionális) */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító' })
    .optional(),

  /** Helykód (opcionális) */
  locationCode: z.string().max(50).optional(),

  /** Státusz (alapértelmezett: AVAILABLE) */
  status: SerialNumberStatusSchema.optional().default('AVAILABLE'),

  /** Gyári szám */
  manufacturerSerialNumber: z.string().max(100).optional(),

  /** Gyártási dátum */
  manufacturingDate: z.coerce.date().optional(),

  /** Garancia lejárata */
  warrantyExpiryDate: z.coerce.date().optional(),

  /** Beszerzési dátum */
  purchaseDate: z.coerce.date().optional(),

  /** Beszerzési ár */
  purchasePrice: z
    .number()
    .min(0, { message: 'A beszerzési ár nem lehet negatív' })
    .optional(),

  /** Aktuális érték */
  currentValue: z
    .number()
    .min(0, { message: 'Az érték nem lehet negatív' })
    .optional(),

  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type CreateSerialNumberInput = z.infer<typeof CreateSerialNumberSchema>;

// ============================================
// UPDATE SERIAL NUMBER DTO
// ============================================

export const UpdateSerialNumberSchema = z
  .object({
    inventoryItemId: z.string().uuid().nullable().optional(),
    warehouseId: z.string().uuid().nullable().optional(),
    locationCode: z.string().max(50).nullable().optional(),
    status: SerialNumberStatusSchema.optional(),
    manufacturerSerialNumber: z.string().max(100).nullable().optional(),
    manufacturingDate: z.coerce.date().nullable().optional(),
    warrantyExpiryDate: z.coerce.date().nullable().optional(),
    purchaseDate: z.coerce.date().nullable().optional(),
    purchasePrice: z.number().min(0).nullable().optional(),
    currentValue: z.number().min(0).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateSerialNumberInput = z.infer<typeof UpdateSerialNumberSchema>;

// ============================================
// CREATE BATCH DTO
// ============================================

export const CreateBatchSchema = z.object({
  /** Batch number érték */
  batchNumber: z
    .string()
    .min(1, { message: 'A batch number kötelező' })
    .max(50, { message: 'A batch number maximum 50 karakter' })
    .regex(/^[A-Za-z0-9_\-./]+$/, {
      message: 'A batch number csak betűket, számokat, kötőjelet, aláhúzást, pontot és perjelet tartalmazhat',
    }),

  /** Cikk ID */
  productId: z
    .string()
    .uuid({ message: 'Érvénytelen cikk azonosító' }),

  /** Raktár ID */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító' })
    .optional(),

  /** Státusz (alapértelmezett: ACTIVE) */
  status: BatchStatusSchema.optional().default('ACTIVE'),

  /** Eredeti mennyiség */
  originalQuantity: z
    .number()
    .int({ message: 'A mennyiség egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 tétel szükséges' }),

  /** Aktuális mennyiség (alapértelmezetten = originalQuantity) */
  currentQuantity: z
    .number()
    .int({ message: 'A mennyiség egész szám kell legyen' })
    .min(0, { message: 'A mennyiség nem lehet negatív' })
    .optional(),

  /** Mértékegység */
  unit: z.string().min(1).max(20),

  /** Gyártási dátum */
  manufacturingDate: z.coerce.date().optional(),

  /** Lejárati dátum */
  expiryDate: z.coerce.date().optional(),

  /** Beszállító batch száma */
  supplierBatchNumber: z.string().max(50).optional(),

  /** Beszállító ID */
  supplierId: z.string().uuid().optional(),

  /** Bevételezés dátuma */
  receivedDate: z.coerce.date().optional(),

  /** Egységár */
  unitCost: z
    .number()
    .min(0, { message: 'Az egységár nem lehet negatív' })
    .optional(),

  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;

// ============================================
// UPDATE BATCH DTO
// ============================================

export const UpdateBatchSchema = z
  .object({
    warehouseId: z.string().uuid().nullable().optional(),
    status: BatchStatusSchema.optional(),
    manufacturingDate: z.coerce.date().nullable().optional(),
    expiryDate: z.coerce.date().nullable().optional(),
    supplierBatchNumber: z.string().max(50).nullable().optional(),
    supplierId: z.string().uuid().nullable().optional(),
    receivedDate: z.coerce.date().nullable().optional(),
    unitCost: z.number().min(0).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateBatchInput = z.infer<typeof UpdateBatchSchema>;

// ============================================
// QUERY DTOs
// ============================================

export const SerialNumberQuerySchema = z.object({
  serialNumber: z.string().optional(),
  serialNumberExact: z.string().optional(),
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  status: z.union([SerialNumberStatusSchema, z.array(SerialNumberStatusSchema)]).optional(),
  warrantyExpiringBefore: z.coerce.date().optional(),
  warrantyExpiringAfter: z.coerce.date().optional(),
  sortBy: z.enum(['serialNumber', 'createdAt', 'status', 'warrantyExpiryDate']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type SerialNumberQueryInput = z.infer<typeof SerialNumberQuerySchema>;

export const BatchQuerySchema = z.object({
  batchNumber: z.string().optional(),
  batchNumberExact: z.string().optional(),
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.union([BatchStatusSchema, z.array(BatchStatusSchema)]).optional(),
  expiringBefore: z.coerce.date().optional(),
  expiringAfter: z.coerce.date().optional(),
  minQuantity: z.number().int().min(0).optional(),
  sortBy: z.enum(['batchNumber', 'createdAt', 'expiryDate', 'currentQuantity']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type BatchQueryInput = z.infer<typeof BatchQuerySchema>;

// ============================================
// BATCH QUANTITY ADJUSTMENT DTO
// ============================================

export const AdjustBatchQuantitySchema = z.object({
  /** Mennyiség változás (pozitív: növelés, negatív: csökkentés) */
  quantityChange: z
    .number()
    .int({ message: 'A mennyiség változás egész szám kell legyen' }),

  /** Indoklás */
  reason: z.string().max(500).optional(),
});

export type AdjustBatchQuantityInput = z.infer<typeof AdjustBatchQuantitySchema>;
