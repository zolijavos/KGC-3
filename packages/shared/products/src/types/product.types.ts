/**
 * @kgc/products - Product Types
 * Epic 8: Product Management
 */

// ============================================
// ENUMS
// ============================================

export const ProductType = {
  PRODUCT: 'PRODUCT',
  RENTAL_EQUIPMENT: 'RENTAL_EQUIPMENT',
  PART: 'PART',
  CONSUMABLE: 'CONSUMABLE',
  SERVICE: 'SERVICE',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCONTINUED: 'DISCONTINUED',
  DRAFT: 'DRAFT',
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const PriceRuleType = {
  DISCOUNT: 'DISCOUNT',
  MARKUP: 'MARKUP',
  FIXED: 'FIXED',
} as const;

export type PriceRuleType = (typeof PriceRuleType)[keyof typeof PriceRuleType];

// ============================================
// ENTITY TYPES
// ============================================

export interface Product {
  id: string;
  tenantId: string;

  // Azonosítók
  sku: string;
  name: string;
  shortName: string | null;
  description: string | null;
  type: ProductType;
  status: ProductStatus;

  // Kategorizálás
  categoryId: string | null;
  supplierId: string | null;
  brand: string | null;
  model: string | null;

  // Vonalkód/QR
  barcode: string | null;
  barcodeType: string | null;
  qrCode: string | null;
  supplierSku: string | null;

  // Árazás
  purchasePrice: number | null;
  listPrice: number | null;
  sellingPrice: number | null;
  vatPercent: number;

  // Mértékegység
  unit: string;
  packageSize: number;
  packageUnit: string;

  // Készlet beállítások
  trackInventory: boolean;
  minStockLevel: number | null;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  leadTimeDays: number | null;

  // Robbantott ábra
  explodedDiagramId: string | null;
  explodedDiagramUrl: string | null;
  partNumber: string | null;

  // Fizikai tulajdonságok
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;

  // Képek
  imageUrl: string | null;
  thumbnailUrl: string | null;
  images: string[];

  notes: string | null;

  // Audit
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt: Date | null;

  // Relations (optional for queries)
  category?: ProductCategory | null;
  supplier?: Supplier | null;
  priceRules?: PriceRule[];
}

export interface ProductCategory {
  id: string;
  tenantId: string;

  code: string;
  name: string;
  description: string | null;

  // Hierarchia
  parentId: string | null;
  level: number;
  path: string;

  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  parent?: ProductCategory | null;
  children?: ProductCategory[];
  products?: Product[];
}

export interface Supplier {
  id: string;
  tenantId: string;

  code: string;
  name: string;
  taxNumber: string | null;

  // Kapcsolattartó
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;

  // Cím
  country: string | null;
  postalCode: string | null;
  city: string | null;
  address: string | null;

  // API integráció
  apiEnabled: boolean;
  apiEndpoint: string | null;
  apiKey: string | null;
  apiVersion: string | null;
  lastSyncAt: Date | null;

  // Fizetési feltételek
  paymentTermDays: number;
  defaultDiscountPc: number;
  currency: string;

  notes: string | null;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  products?: Product[];
}

export interface PriceRule {
  id: string;
  tenantId: string;

  productId: string | null;
  categoryId: string | null;

  ruleName: string;
  ruleType: PriceRuleType;
  discountPercent: number | null;
  discountAmount: number | null;
  fixedPrice: number | null;

  // Feltételek
  minQuantity: number | null;
  minAmount: number | null;
  partnerTier: string | null;
  applyToRental: boolean;
  applyToSales: boolean;

  // Érvényesség
  validFrom: Date;
  validUntil: Date | null;
  priority: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  product?: Product | null;
}

// ============================================
// QUERY TYPES
// ============================================

export interface ProductQuery {
  tenantId: string;
  type?: ProductType;
  status?: ProductStatus;
  categoryId?: string;
  supplierId?: string;
  brand?: string;
  search?: string;
  barcode?: string;
  sku?: string;
  hasInventory?: boolean;
  lowStock?: boolean;
  sortBy?: 'name' | 'sku' | 'createdAt' | 'sellingPrice' | 'purchasePrice';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface ProductQueryResult {
  products: Product[];
  total: number;
  offset: number;
  limit: number;
}

export interface CategoryQuery {
  tenantId: string;
  parentId?: string | null;
  isActive?: boolean;
  search?: string;
  level?: number;
  offset?: number;
  limit?: number;
}

export interface CategoryQueryResult {
  categories: ProductCategory[];
  total: number;
  offset: number;
  limit: number;
}

export interface SupplierQuery {
  tenantId: string;
  isActive?: boolean;
  apiEnabled?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface SupplierQueryResult {
  suppliers: Supplier[];
  total: number;
  offset: number;
  limit: number;
}

export interface PriceRuleQuery {
  tenantId: string;
  productId?: string;
  categoryId?: string;
  ruleType?: PriceRuleType;
  isActive?: boolean;
  validAt?: Date;
  partnerTier?: string;
}

export interface PriceRuleQueryResult {
  priceRules: PriceRule[];
  total: number;
}

// ============================================
// PRICE CALCULATION
// ============================================

export interface CalculatedPrice {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountPercent: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountApplied: number;
  }>;
  vatAmount: number;
  priceWithVat: number;
}
