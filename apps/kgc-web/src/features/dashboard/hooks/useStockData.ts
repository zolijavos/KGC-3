import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export interface StockLocationData {
  count: number;
  percentage: number;
}

export interface StockStatusData {
  available: number;
  rented: number;
  service: number;
}

export interface StockSummaryData {
  total: number;
  byLocation: Record<string, StockLocationData>;
  byStatus: StockStatusData;
}

/**
 * TanStack Query hook for fetching stock summary data
 *
 * Features:
 * - Auto-refresh every 5 minutes (refetchInterval)
 * - Data considered stale after 4 minutes (staleTime)
 * - Automatic retry on error
 *
 * @returns UseQueryResult with stock summary data
 */
export function useStockData(): UseQueryResult<StockSummaryData, Error> {
  return useQuery<StockSummaryData, Error>({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const response = await fetch('/api/v1/dashboard/inventory/summary');

      if (!response.ok) {
        throw new Error('Failed to fetch stock summary');
      }

      const result = await response.json();
      return result.data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 4 * 60 * 1000, // 4 minutes
    retry: 3,
    // FIX #5: Reduce max retry delay from 30s to 10s (more reasonable for 5min refetch)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
