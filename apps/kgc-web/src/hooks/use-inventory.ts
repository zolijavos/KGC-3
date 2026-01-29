/**
 * Inventory Hooks - React hooks for inventory data management
 */

import {
  getInventory,
  getInventoryById,
  getLowStockAlerts,
  getWarehouses,
  type InventoryFilters,
  type InventoryItem,
  type InventoryListResponse,
  type LowStockAlert,
  type Warehouse,
} from '@/api/inventory';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseInventoryResult {
  items: InventoryItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseInventoryItemResult {
  item: InventoryItem | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseLowStockAlertsResult {
  alerts: LowStockAlert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseWarehousesResult {
  warehouses: Warehouse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage inventory list
 */
export function useInventory(filters: InventoryFilters = {}): UseInventoryResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: InventoryListResponse = await getInventory(filters);
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventory';
      setError(message);
      console.error('Error fetching inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.warehouseId,
    filters.productId,
    filters.type,
    filters.status,
    filters.search,
    filters.offset,
    filters.limit,
  ]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  return {
    items,
    total,
    isLoading,
    error,
    refetch: fetchInventory,
  };
}

/**
 * Hook to fetch single inventory item
 */
export function useInventoryItem(id: string | undefined): UseInventoryItemResult {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!id) {
      setItem(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getInventoryById(id);
      setItem(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventory item';
      setError(message);
      console.error('Error fetching inventory item:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchItem();
  }, [fetchItem]);

  return {
    item,
    isLoading,
    error,
    refetch: fetchItem,
  };
}

/**
 * Hook to fetch low stock alerts
 */
export function useLowStockAlerts(warehouseId?: string): UseLowStockAlertsResult {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getLowStockAlerts(warehouseId);
      setAlerts(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch low stock alerts';
      setError(message);
      console.error('Error fetching low stock alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    error,
    refetch: fetchAlerts,
  };
}

/**
 * Hook to fetch warehouses
 */
export function useWarehouses(): UseWarehousesResult {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getWarehouses();
      // API returns { data: { warehouses: [...], total, offset, limit } }
      const warehouseData = response.data as { warehouses: Warehouse[] } | Warehouse[];
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : warehouseData.warehouses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch warehouses';
      setError(message);
      console.error('Error fetching warehouses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWarehouses();
  }, [fetchWarehouses]);

  return {
    warehouses,
    isLoading,
    error,
    refetch: fetchWarehouses,
  };
}
