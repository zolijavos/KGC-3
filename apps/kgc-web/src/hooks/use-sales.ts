/**
 * Sales Hooks
 * React hooks for sales/transactions data fetching
 */

import {
  PaymentStatus,
  salesApi,
  SaleStatus,
  type SaleItem,
  type SaleTransaction,
  type TransactionFilter,
} from '@/api/sales';
import { useCallback, useEffect, useState } from 'react';

// Re-export types and enums for convenience
export { PaymentStatus, SaleStatus };
export type { SaleItem, SaleTransaction, TransactionFilter };

/**
 * Hook to fetch all transactions with optional filtering
 */
export function useSales(filter?: TransactionFilter) {
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await salesApi.getTransactions(filter);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
    } finally {
      setIsLoading(false);
    }
  }, [filter?.status, filter?.search, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook to fetch a single transaction by ID
 */
export function useSale(id: string | undefined) {
  const [transaction, setTransaction] = useState<SaleTransaction | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!id) {
      setTransaction(null);
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [transactionData, itemsData] = await Promise.all([
        salesApi.getTransaction(id),
        salesApi.getTransactionItems(id),
      ]);
      setTransaction(transactionData);
      setItems(itemsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transaction'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return {
    transaction,
    items,
    isLoading,
    error,
    refetch: fetchTransaction,
  };
}

/**
 * Hook for sales mutations (void, etc.)
 */
export function useSaleMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const voidTransaction = useCallback(async (id: string, reason: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await salesApi.voidTransaction(id, reason);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to void transaction');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    voidTransaction,
    isLoading,
    error,
  };
}

/**
 * Hook to compute sales statistics from transactions
 */
export function useSalesStats(transactions: SaleTransaction[]) {
  const completed = transactions.filter(t => t.status === 'COMPLETED');

  return {
    totalCount: transactions.length,
    completedCount: completed.length,
    totalRevenue: completed.reduce((sum, t) => sum + t.total, 0),
    averageBasket:
      completed.length > 0
        ? Math.round(completed.reduce((sum, t) => sum + t.total, 0) / completed.length)
        : 0,
  };
}
