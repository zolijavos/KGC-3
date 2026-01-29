/**
 * Products API Client
 * Epic 8: Product Management
 */

import { api } from './client';

// ============================================
// TYPES
// ============================================

export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type ProductCategory =
  | 'power_tool'
  | 'hand_tool'
  | 'accessory'
  | 'consumable'
  | 'spare_part'
  | 'rental_equipment'
  | 'other';

export interface Supplier {
  id: string;
  name: string;
  code: string;
}

export interface Product {
  id: string;
  status: ProductStatus;
  category: string;
  categoryId?: string;
  sku: string;
  barcode?: string;
  manufacturerCode?: string;
  name: string;
  shortName?: string;
  description?: string;
  brand?: string;
  model?: string;
  purchasePrice: number;
  sellingPriceNet: number;
  sellingPriceGross: number;
  vatRate: number;
  marginPercent: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel: number;
  reorderQuantity: number;
  location?: string;
  supplier?: Supplier;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  rentalDailyRate?: number;
  rentalWeeklyRate?: number;
  rentalMonthlyRate?: number;
  rentalDepositAmount?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ProductListResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface ProductResponse {
  data: Product;
}

export interface ProductStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface ProductFilters {
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  categoryId?: string;
  supplierId?: string;
  search?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of products with filters
 */
export async function getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.supplierId) params.append('supplierId', filters.supplierId);
  if (filters.search) params.append('search', filters.search);
  if (filters.lowStock) params.append('lowStock', 'true');
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/products-direct?${queryString}` : '/products-direct';

  return api.get<ProductListResponse>(endpoint);
}

/**
 * Get single product by ID
 */
export async function getProductById(id: string): Promise<ProductResponse> {
  return api.get<ProductResponse>(`/products-direct/${id}`);
}

/**
 * Get product statistics
 */
export async function getProductStats(): Promise<{ data: ProductStats }> {
  return api.get<{ data: ProductStats }>('/products-direct/stats');
}

/**
 * Get product categories
 */
export async function getProductCategories(): Promise<{ data: CategoryDTO[] }> {
  return api.get<{ data: CategoryDTO[] }>('/products-direct/categories');
}

/**
 * Create new product
 */
export async function createProduct(data: {
  sku: string;
  name: string;
  shortName?: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  vatPercent?: number;
  unit?: string;
  minStockLevel?: number;
  reorderQuantity?: number;
}): Promise<ProductResponse> {
  return api.post<ProductResponse>('/products-direct', data);
}

/**
 * Update product
 */
export async function updateProduct(
  id: string,
  data: {
    status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
    name?: string;
    shortName?: string;
    description?: string;
    categoryId?: string;
    brand?: string;
    model?: string;
    barcode?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    vatPercent?: number;
    minStockLevel?: number;
    reorderQuantity?: number;
  }
): Promise<ProductResponse> {
  return api.patch<ProductResponse>(`/products-direct/${id}`, data);
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/products-direct/${id}`);
}
