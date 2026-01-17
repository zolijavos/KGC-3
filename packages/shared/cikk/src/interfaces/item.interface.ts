/**
 * Item (Cikk) interfaces for @kgc/cikk
 * Story 8-1: Cikk CRUD
 */

/**
 * Item types - termék kategóriák
 */
export enum ItemType {
  PRODUCT = 'PRODUCT', // Termék (eladásra)
  PART = 'PART', // Alkatrész (szervizhez)
  SERVICE = 'SERVICE', // Szolgáltatás (munkadíj)
}

/**
 * Item status - cikk állapotok
 */
export enum ItemStatus {
  ACTIVE = 'ACTIVE', // Aktív
  INACTIVE = 'INACTIVE', // Soft deleted
  DISCONTINUED = 'DISCONTINUED', // Kifutott termék
}

/**
 * Item entity - Cikk
 */
export interface Item {
  id: string; // UUID
  tenantId: string; // FK to Tenant (RLS)
  code: string; // Cikkszám (unique per tenant)
  name: string; // Cikk neve
  description?: string | null; // Leírás
  itemType: ItemType; // PRODUCT | PART | SERVICE
  status: ItemStatus; // ACTIVE | INACTIVE | DISCONTINUED

  // Pricing
  listPrice?: number | null; // Listaár (HUF) - kötelező PRODUCT/PART-nál
  costPrice?: number | null; // Beszerzési ár
  vatRate: number; // ÁFA kulcs (default: 27)
  unitOfMeasure: string; // Mértékegység (db, kg, m, óra)

  // Barcode
  barcode?: string | null; // EAN-13 vonalkód (unique per tenant)
  alternativeBarcodes: string[]; // Alternatív vonalkódok

  // Category (Story 8-2)
  categoryId?: string | null; // FK to Category

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Item DTO input
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface CreateItemInput {
  code?: string | undefined; // Optional - auto-generated if not provided
  name: string;
  description?: string | undefined;
  itemType: ItemType;
  listPrice?: number | undefined;
  costPrice?: number | undefined;
  vatRate?: number | undefined; // Default: 27
  unitOfMeasure?: string | undefined; // Default: 'db'
  barcode?: string | undefined;
  alternativeBarcodes?: string[] | undefined;
  categoryId?: string | undefined;
}

/**
 * Update Item DTO input
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface UpdateItemInput {
  name?: string | undefined;
  description?: string | null | undefined;
  listPrice?: number | null | undefined;
  costPrice?: number | null | undefined;
  vatRate?: number | undefined;
  unitOfMeasure?: string | undefined;
  barcode?: string | null | undefined;
  alternativeBarcodes?: string[] | undefined;
  categoryId?: string | null | undefined;
  status?: ItemStatus | undefined;
}

/**
 * Item filter options for list queries
 * Note: undefined allowed for exactOptionalPropertyTypes compatibility
 */
export interface ItemFilterOptions {
  search?: string | undefined; // Keresés kód, név, vonalkód alapján
  itemType?: ItemType | undefined;
  status?: ItemStatus | undefined;
  categoryId?: string | undefined;
  page?: number | undefined; // Default: 1
  limit?: number | undefined; // Default: 20, max: 100
  sortBy?: 'name' | 'createdAt' | 'code' | undefined;
  sortDirection?: 'asc' | 'desc' | undefined;
  includeInactive?: boolean | undefined;
}

/**
 * Paginated item list response
 */
export interface ItemListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ItemListResponse {
  data: Item[];
  meta: ItemListMeta;
}

/**
 * Code generation prefix mapping
 */
export const ITEM_CODE_PREFIX: Record<ItemType, string> = {
  [ItemType.PRODUCT]: 'PRD',
  [ItemType.PART]: 'PRT',
  [ItemType.SERVICE]: 'SVC',
};

/**
 * Default values
 */
export const DEFAULT_VAT_RATE = 27; // Hungarian VAT rate
export const DEFAULT_UNIT_OF_MEASURE = 'db';
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
