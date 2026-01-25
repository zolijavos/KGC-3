/**
 * @kgc/products - Product DTOs with Zod validation
 * Epic 8: Story 8-1: Cikk CRUD
 */

import { z } from 'zod';

// ============================================
// PRODUCT TYPE & STATUS SCHEMAS
// ============================================

export const ProductTypeSchema = z.enum([
  'PRODUCT',
  'RENTAL_EQUIPMENT',
  'PART',
  'CONSUMABLE',
  'SERVICE',
]);

export const ProductStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DRAFT']);

// ============================================
// CREATE PRODUCT DTO
// ============================================

export const CreateProductSchema = z.object({
  /** Cikkszám (SKU) */
  sku: z
    .string()
    .min(1, { message: 'A cikkszám kötelező' })
    .max(100, { message: 'A cikkszám maximum 100 karakter' }),

  /** Terméknév */
  name: z
    .string()
    .min(1, { message: 'A terméknév kötelező' })
    .max(255, { message: 'A terméknév maximum 255 karakter' }),

  /** Rövid név */
  shortName: z.string().max(100).optional(),

  /** Leírás */
  description: z.string().optional(),

  /** Termék típus */
  type: ProductTypeSchema.default('PRODUCT'),

  /** Státusz */
  status: ProductStatusSchema.default('ACTIVE'),

  /** Kategória ID */
  categoryId: z.string().uuid().optional(),

  /** Beszállító ID */
  supplierId: z.string().uuid().optional(),

  /** Márka */
  brand: z.string().max(100).optional(),

  /** Modell */
  model: z.string().max(100).optional(),

  /** Vonalkód */
  barcode: z.string().max(100).optional(),

  /** Vonalkód típus */
  barcodeType: z.string().max(20).optional(),

  /** QR kód */
  qrCode: z.string().max(255).optional(),

  /** Beszállítói cikkszám */
  supplierSku: z.string().max(100).optional(),

  /** Beszerzési ár (Ft) */
  purchasePrice: z.number().min(0).optional(),

  /** Listaár (Ft) */
  listPrice: z.number().min(0).optional(),

  /** Eladási ár (Ft) */
  sellingPrice: z.number().min(0).optional(),

  /** ÁFA százalék */
  vatPercent: z.number().min(0).max(100).default(27),

  /** Mértékegység */
  unit: z.string().min(1, { message: 'A mértékegység kötelező' }).max(20).default('db'),

  /** Kiszerelés mérete */
  packageSize: z.number().int().min(1).default(1),

  /** Kiszerelés egysége */
  packageUnit: z.string().max(20).default('db'),

  /** Készlet követés */
  trackInventory: z.boolean().default(true),

  /** Minimum készletszint */
  minStockLevel: z.number().int().min(0).optional(),

  /** Rendelési pont */
  reorderPoint: z.number().int().min(0).optional(),

  /** Rendelési mennyiség */
  reorderQuantity: z.number().int().min(1).optional(),

  /** Szállítási idő (nap) */
  leadTimeDays: z.number().int().min(0).optional(),

  /** Súly (kg) */
  weight: z.number().min(0).optional(),

  /** Hosszúság (cm) */
  length: z.number().min(0).optional(),

  /** Szélesség (cm) */
  width: z.number().min(0).optional(),

  /** Magasság (cm) */
  height: z.number().min(0).optional(),

  /** Fő kép URL */
  imageUrl: z.string().url().optional(),

  /** Bélyegkép URL */
  thumbnailUrl: z.string().url().optional(),

  /** További képek */
  images: z.array(z.string().url()).default([]),

  /** Megjegyzések */
  notes: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// ============================================
// UPDATE PRODUCT DTO
// ============================================

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  shortName: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  type: ProductTypeSchema.optional(),
  status: ProductStatusSchema.optional(),
  categoryId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  barcodeType: z.string().max(20).nullable().optional(),
  qrCode: z.string().max(255).nullable().optional(),
  supplierSku: z.string().max(100).nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  listPrice: z.number().min(0).nullable().optional(),
  sellingPrice: z.number().min(0).nullable().optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  packageSize: z.number().int().min(1).optional(),
  packageUnit: z.string().max(20).optional(),
  trackInventory: z.boolean().optional(),
  minStockLevel: z.number().int().min(0).nullable().optional(),
  reorderPoint: z.number().int().min(0).nullable().optional(),
  reorderQuantity: z.number().int().min(1).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  length: z.number().min(0).nullable().optional(),
  width: z.number().min(0).nullable().optional(),
  height: z.number().min(0).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// ============================================
// SEARCH PRODUCT DTO
// ============================================

export const SearchProductSchema = z.object({
  /** Keresési kifejezés */
  searchTerm: z.string().min(1).max(100),

  /** Termék típus szűrő */
  type: ProductTypeSchema.optional(),

  /** Kategória szűrő */
  categoryId: z.string().uuid().optional(),

  /** Csak aktív termékek */
  activeOnly: z.boolean().default(true),

  /** Maximum találatok */
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchProductInput = z.infer<typeof SearchProductSchema>;

// ============================================
// BARCODE LOOKUP DTO
// ============================================

export const BarcodeLookupSchema = z.object({
  /** Vonalkód */
  barcode: z.string().min(1, { message: 'A vonalkód kötelező' }),
});

export type BarcodeLookupInput = z.infer<typeof BarcodeLookupSchema>;

// ============================================
// BULK UPDATE STATUS DTO
// ============================================

export const BulkUpdateStatusSchema = z.object({
  /** Termék ID-k */
  productIds: z.array(z.string().uuid()).min(1, { message: 'Legalább egy termék ID szükséges' }),

  /** Új státusz */
  status: ProductStatusSchema,
});

export type BulkUpdateStatusInput = z.infer<typeof BulkUpdateStatusSchema>;
