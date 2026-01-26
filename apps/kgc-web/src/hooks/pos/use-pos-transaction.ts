/**
 * POS Transaction React Query Hooks
 * Handles sales transaction operations (create, add items, void)
 */

import type {
  AddItemDto,
  ApiResponse,
  CreateTransactionDto,
  CustomerSearchParams,
  PaginatedResponse,
  POSCustomer,
  POSProduct,
  ProductSearchParams,
  SaleTransaction,
  UpdateItemDto,
  VoidTransactionDto,
} from '@/types/pos.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1/pos';
const PRODUCTS_API = '/api/v1/products';
const CUSTOMERS_API = '/api/v1/partners';

// ============================================
// API Functions - Transactions
// ============================================

async function createTransaction(dto: CreateTransactionDto): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create transaction');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function fetchTransaction(transactionId: string): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch transaction');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function addTransactionItem(
  transactionId: string,
  dto: AddItemDto
): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add item');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function updateTransactionItem(
  transactionId: string,
  itemId: string,
  dto: UpdateItemDto
): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update item');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function removeTransactionItem(
  transactionId: string,
  itemId: string
): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to remove item');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function voidTransaction(
  transactionId: string,
  dto: VoidTransactionDto
): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to void transaction');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

// ============================================
// API Functions - Products
// ============================================

async function searchProducts(params: ProductSearchParams): Promise<POSProduct[]> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.barcode) queryParams.set('barcode', params.barcode);
  if (params.category) queryParams.set('category', params.category);
  if (params.limit) queryParams.set('limit', String(params.limit));

  const response = await fetch(`${PRODUCTS_API}?${queryParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search products');
  }

  const result: PaginatedResponse<POSProduct> = await response.json();
  return result.data;
}

async function findProductByBarcode(barcode: string): Promise<POSProduct | null> {
  const response = await fetch(`${PRODUCTS_API}?barcode=${encodeURIComponent(barcode)}&limit=1`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to find product');
  }

  const result: PaginatedResponse<POSProduct> = await response.json();
  return result.data[0] ?? null;
}

// ============================================
// API Functions - Customers
// ============================================

async function searchCustomers(params: CustomerSearchParams): Promise<POSCustomer[]> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.taxNumber) queryParams.set('taxNumber', params.taxNumber);
  if (params.limit) queryParams.set('limit', String(params.limit));

  const response = await fetch(`${CUSTOMERS_API}?${queryParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search customers');
  }

  const result: PaginatedResponse<POSCustomer> = await response.json();
  return result.data;
}

// ============================================
// Query Keys
// ============================================

export const posTransactionKeys = {
  all: ['pos-transactions'] as const,
  detail: (id: string) => [...posTransactionKeys.all, id] as const,
  products: (params: ProductSearchParams) => ['pos-products', params] as const,
  productByBarcode: (barcode: string) => ['pos-products', 'barcode', barcode] as const,
  customers: (params: CustomerSearchParams) => ['pos-customers', params] as const,
};

// ============================================
// React Query Hooks - Transactions
// ============================================

/**
 * Hook to create a new transaction
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
    },
  });
}

/**
 * Hook to fetch a specific transaction
 */
export function useTransaction(transactionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posTransactionKeys.detail(transactionId),
    queryFn: () => fetchTransaction(transactionId),
    enabled: options?.enabled ?? !!transactionId,
  });
}

/**
 * Hook to add an item to a transaction
 */
export function useAddTransactionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: AddItemDto }) =>
      addTransactionItem(transactionId, dto),
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
    },
  });
}

/**
 * Hook to update an item in a transaction
 */
export function useUpdateTransactionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      itemId,
      dto,
    }: {
      transactionId: string;
      itemId: string;
      dto: UpdateItemDto;
    }) => updateTransactionItem(transactionId, itemId, dto),
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
    },
  });
}

/**
 * Hook to remove an item from a transaction
 */
export function useRemoveTransactionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, itemId }: { transactionId: string; itemId: string }) =>
      removeTransactionItem(transactionId, itemId),
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
    },
  });
}

/**
 * Hook to void a transaction
 */
export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: VoidTransactionDto }) =>
      voidTransaction(transactionId, dto),
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
      queryClient.invalidateQueries({ queryKey: posTransactionKeys.all });
    },
  });
}

// ============================================
// React Query Hooks - Products
// ============================================

/**
 * Hook to search for products
 */
export function useProductSearch(params: ProductSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posTransactionKeys.products(params),
    queryFn: () => searchProducts(params),
    enabled: options?.enabled ?? !!(params.search || params.barcode || params.category),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to find a product by barcode
 */
export function useFindProductByBarcode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: findProductByBarcode,
    onSuccess: (product, barcode) => {
      if (product) {
        queryClient.setQueryData(posTransactionKeys.productByBarcode(barcode), product);
      }
    },
  });
}

// ============================================
// React Query Hooks - Customers
// ============================================

/**
 * Hook to search for customers
 */
export function useCustomerSearch(params: CustomerSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posTransactionKeys.customers(params),
    queryFn: () => searchCustomers(params),
    enabled: options?.enabled ?? !!(params.search || params.taxNumber),
    staleTime: 60 * 1000, // 1 minute
  });
}
