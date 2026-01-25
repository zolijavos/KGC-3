/**
 * @kgc/products - Supplier DTOs with Zod validation
 * Epic 8: Story 8-3: Beszállító kezelés
 */

import { z } from 'zod';

// ============================================
// CREATE SUPPLIER DTO
// ============================================

export const CreateSupplierSchema = z.object({
  /** Beszállító kód (egyedi tenant-en belül) */
  code: z
    .string()
    .min(1, { message: 'A beszállító kód kötelező' })
    .max(50, { message: 'A beszállító kód maximum 50 karakter' })
    .toUpperCase(),

  /** Beszállító neve */
  name: z
    .string()
    .min(1, { message: 'A beszállító név kötelező' })
    .max(255, { message: 'A beszállító név maximum 255 karakter' }),

  /** Adószám */
  taxNumber: z.string().max(20).optional(),

  /** Kapcsolattartó neve */
  contactName: z.string().max(255).optional(),

  /** Kapcsolattartó email */
  contactEmail: z.string().email({ message: 'Érvénytelen email cím' }).optional(),

  /** Kapcsolattartó telefon */
  contactPhone: z.string().max(30).optional(),

  /** Ország (ISO 3166-1 alpha-2) */
  country: z.string().length(2).optional(),

  /** Irányítószám */
  postalCode: z.string().max(20).optional(),

  /** Város */
  city: z.string().max(100).optional(),

  /** Cím */
  address: z.string().max(255).optional(),

  /** API integráció engedélyezve */
  apiEnabled: z.boolean().default(false),

  /** API végpont URL */
  apiEndpoint: z.string().url().optional(),

  /** API kulcs */
  apiKey: z.string().max(255).optional(),

  /** API verzió */
  apiVersion: z.string().max(20).optional(),

  /** Fizetési határidő (nap) */
  paymentTermDays: z.number().int().min(0).max(365).default(30),

  /** Alapértelmezett kedvezmény % */
  defaultDiscountPc: z.number().min(0).max(100).default(0),

  /** Pénznem */
  currency: z.string().length(3).default('HUF'),

  /** Megjegyzések */
  notes: z.string().optional(),

  /** Aktív-e */
  isActive: z.boolean().default(true),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// ============================================
// UPDATE SUPPLIER DTO
// ============================================

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  taxNumber: z.string().max(20).nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  apiEnabled: z.boolean().optional(),
  apiEndpoint: z.string().url().nullable().optional(),
  apiKey: z.string().max(255).nullable().optional(),
  apiVersion: z.string().max(20).nullable().optional(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
  defaultDiscountPc: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

// ============================================
// SYNC SUPPLIER DTO
// ============================================

export const SyncSupplierSchema = z.object({
  /** Beszállító ID */
  supplierId: z.string().uuid({ message: 'Érvénytelen beszállító ID' }),

  /** Szinkronizálandó adatok típusa */
  syncType: z.enum(['products', 'prices', 'stock', 'all']).default('all'),
});

export type SyncSupplierInput = z.infer<typeof SyncSupplierSchema>;

// ============================================
// SUPPLIER SYNC RESULT
// ============================================

export interface SupplierSyncResult {
  supplierId: string;
  syncType: string;
  success: boolean;
  productsUpdated: number;
  pricesUpdated: number;
  stockUpdated: number;
  errors: string[];
  syncedAt: Date;
}
