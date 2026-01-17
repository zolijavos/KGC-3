/**
 * @kgc/inventory - Warehouse DTOs with Zod validation
 * Story 9-3: Multi-warehouse támogatás
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const WarehouseTypeSchema = z.enum(['MAIN', 'BRANCH', 'VIRTUAL', 'TRANSIT']);
export const WarehouseStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']);
export const TransferStatusSchema = z.enum(['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']);

// ============================================
// CREATE WAREHOUSE DTO
// ============================================

export const CreateWarehouseSchema = z.object({
  /** Raktár kód */
  code: z
    .string()
    .min(1, { message: 'A raktár kód kötelező' })
    .max(20, { message: 'A raktár kód maximum 20 karakter' })
    .regex(/^[A-Z0-9_-]+$/i, {
      message: 'A raktár kód csak betűket, számokat, kötőjelet és aláhúzást tartalmazhat',
    }),

  /** Raktár név */
  name: z
    .string()
    .min(1, { message: 'A raktár név kötelező' })
    .max(100, { message: 'A raktár név maximum 100 karakter' }),

  /** Típus */
  type: WarehouseTypeSchema,

  /** Státusz (alapértelmezett: ACTIVE) */
  status: WarehouseStatusSchema.optional().default('ACTIVE'),

  /** Cím */
  address: z.string().max(200).optional(),

  /** Város */
  city: z.string().max(50).optional(),

  /** Irányítószám */
  postalCode: z.string().max(10).optional(),

  /** Kapcsolattartó neve */
  contactName: z.string().max(100).optional(),

  /** Kapcsolattartó telefonszáma */
  contactPhone: z.string().max(20).optional(),

  /** Kapcsolattartó emailje */
  contactEmail: z.string().email({ message: 'Érvénytelen email cím' }).optional(),

  /** Alapértelmezett raktár-e (service automatikusan beállítja ha nem adják meg) */
  isDefault: z.boolean().optional(),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

// ============================================
// UPDATE WAREHOUSE DTO
// ============================================

export const UpdateWarehouseSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: WarehouseTypeSchema.optional(),
    status: WarehouseStatusSchema.optional(),
    address: z.string().max(200).nullable().optional(),
    city: z.string().max(50).nullable().optional(),
    postalCode: z.string().max(10).nullable().optional(),
    contactName: z.string().max(100).nullable().optional(),
    contactPhone: z.string().max(20).nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;

// ============================================
// TRANSFER ITEM DTO
// ============================================

export const TransferItemSchema = z.object({
  /** Készlet tétel ID */
  inventoryItemId: z
    .string()
    .uuid({ message: 'Érvénytelen készlet tétel azonosító' }),

  /** Serial number (opcionális) */
  serialNumber: z.string().max(100).optional(),

  /** Mennyiség */
  quantity: z
    .number()
    .int({ message: 'A mennyiség egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 tétel szükséges' }),

  /** Mértékegység */
  unit: z.string().min(1).max(20),

  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type TransferItemInput = z.infer<typeof TransferItemSchema>;

// ============================================
// CREATE TRANSFER DTO (FR9)
// ============================================

export const CreateTransferSchema = z.object({
  /** Forrás raktár ID */
  sourceWarehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen forrás raktár azonosító' }),

  /** Cél raktár ID */
  targetWarehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen cél raktár azonosító' }),

  /** Indoklás */
  reason: z.string().max(500).optional(),

  /** Átmozgatandó tételek */
  items: z
    .array(TransferItemSchema)
    .min(1, { message: 'Legalább egy tétel szükséges az átmozgatáshoz' })
    .max(100, { message: 'Maximum 100 tétel mozgatható egyszerre' }),
});

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

// ============================================
// COMPLETE TRANSFER DTO
// ============================================

export const CompleteTransferSchema = z.object({
  /** Ténylegesen átvett mennyiségek (eltérés kezeléshez) */
  receivedItems: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        receivedQuantity: z.number().int().min(0),
        note: z.string().max(500).optional(),
      }),
    )
    .optional(),

  /** Megjegyzés */
  note: z.string().max(500).optional(),
});

export type CompleteTransferInput = z.infer<typeof CompleteTransferSchema>;

// ============================================
// QUERY DTOs
// ============================================

export const WarehouseQuerySchema = z.object({
  type: z.union([WarehouseTypeSchema, z.array(WarehouseTypeSchema)]).optional(),
  status: WarehouseStatusSchema.optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'code', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type WarehouseQueryInput = z.infer<typeof WarehouseQuerySchema>;

export const TransferQuerySchema = z.object({
  sourceWarehouseId: z.string().uuid().optional(),
  targetWarehouseId: z.string().uuid().optional(),
  status: z.union([TransferStatusSchema, z.array(TransferStatusSchema)]).optional(),
  initiatedBy: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['initiatedAt', 'completedAt', 'status']).optional().default('initiatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type TransferQueryInput = z.infer<typeof TransferQuerySchema>;
