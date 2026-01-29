/**
 * Inventory API Client
 * Epic 9: Készlet nyilvántartás
 */

import { api } from './client';

// ============================================
// TYPES
// ============================================

export type InventoryItemType = 'PRODUCT' | 'RENTAL_EQUIPMENT' | 'PART' | 'CONSUMABLE';
export type InventoryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_TRANSIT'
  | 'IN_SERVICE'
  | 'SOLD'
  | 'RENTED'
  | 'DAMAGED'
  | 'LOST'
  | 'SCRAPPED';

export interface InventoryItem {
  id: string;
  tenantId: string;
  warehouseId: string;
  productId: string;
  type: InventoryItemType;
  status: InventoryStatus;
  serialNumber?: string;
  batchNumber?: string;
  locationCode?: string;
  quantity: number;
  reservedQuantity: number;
  unit: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
  productSku?: string;
  warehouseName?: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface InventoryResponse {
  data: InventoryItem;
}

export interface StockSummary {
  productId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  inTransit: number;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    available: number;
  }>;
}

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  warehouseId: string;
  warehouseName: string;
}

export interface InventoryFilters {
  warehouseId?: string;
  productId?: string;
  type?: InventoryItemType;
  status?: InventoryStatus;
  serialNumber?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of inventory items with filters
 */
export async function getInventory(filters: InventoryFilters = {}): Promise<InventoryListResponse> {
  const params = new URLSearchParams();

  if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
  if (filters.productId) params.append('productId', filters.productId);
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.serialNumber) params.append('serialNumber', filters.serialNumber);
  if (filters.search) params.append('search', filters.search);
  if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
  if (filters.limit !== undefined) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/inventory?${queryString}` : '/inventory';

  return api.get<InventoryListResponse>(endpoint);
}

/**
 * Get single inventory item by ID
 */
export async function getInventoryById(id: string): Promise<InventoryResponse> {
  return api.get<InventoryResponse>(`/inventory/${id}`);
}

/**
 * Get stock summary for a product
 */
export async function getStockSummary(
  productId: string,
  warehouseId?: string
): Promise<{ data: StockSummary }> {
  const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return api.get<{ data: StockSummary }>(`/inventory/stock-summary/${productId}${params}`);
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(warehouseId?: string): Promise<{ data: LowStockAlert[] }> {
  const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return api.get<{ data: LowStockAlert[] }>(`/inventory/alerts/low-stock${params}`);
}

/**
 * Create inventory item
 */
export async function createInventoryItem(data: {
  warehouseId: string;
  productId: string;
  type: InventoryItemType;
  status?: InventoryStatus;
  serialNumber?: string;
  batchNumber?: string;
  locationCode?: string;
  quantity: number;
  unit: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  purchasePrice?: number;
}): Promise<InventoryResponse> {
  return api.post<InventoryResponse>('/inventory', data);
}

/**
 * Update inventory item
 */
export async function updateInventoryItem(
  id: string,
  data: {
    warehouseId?: string;
    status?: InventoryStatus;
    locationCode?: string;
    quantity?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    purchasePrice?: number;
  }
): Promise<InventoryResponse> {
  return api.patch<InventoryResponse>(`/inventory/${id}`, data);
}

/**
 * Delete inventory item (soft delete)
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  return api.delete<void>(`/inventory/${id}`);
}

/**
 * Adjust inventory quantity
 */
export async function adjustQuantity(
  id: string,
  adjustment: number,
  reason?: string
): Promise<InventoryResponse> {
  return api.post<InventoryResponse>(`/inventory/${id}/adjust`, { adjustment, reason });
}

// ============================================
// WAREHOUSE API
// ============================================

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Get list of warehouses
 */
export async function getWarehouses(): Promise<{ data: Warehouse[] }> {
  return api.get<{ data: Warehouse[] }>('/warehouses');
}
