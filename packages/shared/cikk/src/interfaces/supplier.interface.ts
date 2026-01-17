/**
 * Supplier (Beszállító) interfaces for @kgc/cikk
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Supplier status - beszállító állapotok
 */
export enum SupplierStatus {
  ACTIVE = 'ACTIVE', // Aktív beszállító
  INACTIVE = 'INACTIVE', // Inaktív (soft deleted)
}

/**
 * Supplier entity - Beszállító
 */
export interface Supplier {
  id: string; // UUID
  tenantId: string; // FK to Tenant (RLS)
  code: string; // Beszállító kód (MAKITA, STIHL, HIKOKI)
  name: string; // Beszállító neve
  description?: string | null; // Leírás
  contactName?: string | null; // Kapcsolattartó neve
  email?: string | null; // Email cím
  phone?: string | null; // Telefonszám
  website?: string | null; // Weboldal URL
  status: SupplierStatus;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SupplierItem entity - Beszállító-Cikk kapcsolat
 */
export interface SupplierItem {
  id: string; // UUID
  tenantId: string; // FK to Tenant (RLS)
  supplierId: string; // FK to Supplier
  itemId: string; // FK to Item
  supplierCode: string; // Beszállító saját cikkszáma
  costPrice: number | Decimal; // Beszerzési ár
  currency: string; // Pénznem (HUF, EUR)
  leadTimeDays?: number | null; // Szállítási idő napokban
  minOrderQty?: number | null; // Minimum rendelési mennyiség
  isPrimary: boolean; // Elsődleges beszállító-e

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SupplierItem with relations
 */
export interface SupplierItemWithRelations extends SupplierItem {
  supplier?: Supplier;
  item?: {
    id: string;
    code: string;
    name: string;
    barcode?: string | null;
  };
}

/**
 * Price history record
 */
export interface PriceHistory {
  id: string;
  tenantId: string;
  supplierItemId: string;
  costPrice: number | Decimal;
  currency: string;
  effectiveFrom: Date;
  source?: string | null; // MANUAL, CSV_IMPORT, API_SYNC
  createdAt: Date;
}

/**
 * Price change source types
 */
export enum PriceChangeSource {
  MANUAL = 'MANUAL',
  CSV_IMPORT = 'CSV_IMPORT',
  API_SYNC = 'API_SYNC',
}

/**
 * Create Supplier input
 */
export interface CreateSupplierInput {
  code: string;
  name: string;
  description?: string | undefined | null;
  contactName?: string | undefined | null;
  email?: string | undefined | null;
  phone?: string | undefined | null;
  website?: string | undefined | null;
}

/**
 * Update Supplier input
 */
export interface UpdateSupplierInput {
  name?: string | undefined;
  description?: string | null | undefined;
  contactName?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  website?: string | null | undefined;
  status?: SupplierStatus | undefined;
}

/**
 * Supplier filter options
 */
export interface SupplierFilterOptions {
  search?: string | undefined;
  status?: SupplierStatus | undefined;
  includeInactive?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Supplier list response
 */
export interface SupplierListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplierListResponse {
  data: Supplier[];
  meta: SupplierListMeta;
}

/**
 * Link Item to Supplier input
 */
export interface LinkItemToSupplierInput {
  supplierId: string;
  itemId: string;
  supplierCode: string;
  costPrice: number;
  currency?: string | undefined; // Default: HUF
  leadTimeDays?: number | undefined | null;
  minOrderQty?: number | undefined | null;
  isPrimary?: boolean | undefined; // Default: false
}

/**
 * Update SupplierItem input
 */
export interface UpdateSupplierItemInput {
  supplierCode?: string | undefined;
  costPrice?: number | undefined;
  currency?: string | undefined;
  leadTimeDays?: number | null | undefined;
  minOrderQty?: number | null | undefined;
  isPrimary?: boolean | undefined;
}

/**
 * CSV Import options
 */
export interface CsvImportOptions {
  skipHeader?: boolean | undefined; // Default: true
  updateExisting?: boolean | undefined; // Default: true
  createMissingItems?: boolean | undefined; // Default: false
  defaultCategoryId?: string | undefined;
}

/**
 * CSV Import row
 */
export interface CsvImportRow {
  supplierCode: string;
  barcode?: string | undefined;
  name: string;
  description?: string | undefined;
  costPrice: number;
  listPrice?: number | undefined;
  categoryCode?: string | undefined;
  unit?: string | undefined;
}

/**
 * CSV Import validation result
 */
export interface CsvRowValidationResult {
  valid: boolean;
  rowIndex: number;
  errors: string[];
  data?: CsvImportRow | undefined;
}

/**
 * CSV Import result
 */
export interface CsvImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  errorCount: number;
  errors: Array<{
    rowIndex: number;
    errors: string[];
  }>;
}

/**
 * Default values
 */
export const DEFAULT_CURRENCY = 'HUF';
export const SUPPORTED_CURRENCIES = ['HUF', 'EUR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
