/**
 * Product Hooks - React hooks for product data management
 */

import {
  getProductById,
  getProductCategories,
  getProducts,
  getProductStats,
  type CategoryDTO,
  type Product,
  type ProductFilters,
  type ProductListResponse,
  type ProductStats,
} from '@/api/products';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseProductsResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseProductResult {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseProductStatsResult {
  stats: ProductStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCategoriesResult {
  categories: CategoryDTO[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage product list
 */
export function useProducts(filters: ProductFilters = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: ProductListResponse = await getProducts(filters);
      setProducts(response.data);
      setMeta(response.meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.status,
    filters.categoryId,
    filters.supplierId,
    filters.search,
    filters.lowStock,
    filters.page,
    filters.pageSize,
  ]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    hasMore: meta.hasMore,
    isLoading,
    error,
    refetch: fetchProducts,
  };
}

/**
 * Hook to fetch single product
 */
export function useProduct(id: string | undefined): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductById(id);
      setProduct(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch product';
      setError(message);
      console.error('Error fetching product:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    isLoading,
    error,
    refetch: fetchProduct,
  };
}

/**
 * Hook to fetch product statistics
 */
export function useProductStats(): UseProductStatsResult {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductStats();
      setStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch product stats';
      setError(message);
      console.error('Error fetching product stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook to fetch product categories
 */
export function useProductCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductCategories();
      setCategories(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(message);
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
