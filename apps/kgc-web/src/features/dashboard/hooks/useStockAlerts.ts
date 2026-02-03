import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type AlertSeverity = 'critical' | 'warning' | 'all';

export interface StockAlert {
  id: string;
  model: string;
  type: string;
  currentStock: number;
  minimumThreshold: number;
  severity: 'critical' | 'warning';
  lastPurchase: string;
}

export interface UseStockAlertsOptions {
  severity?: AlertSeverity;
}

/**
 * TanStack Query hook for fetching stock alerts
 *
 * Features:
 * - Auto-refresh every 5 minutes (refetchInterval)
 * - Data considered stale after 4 minutes (staleTime)
 * - Optional severity filtering (critical, warning, all)
 * - Automatic retry on error
 *
 * @param options - Query options with optional severity filter
 * @returns UseQueryResult with stock alerts data
 */
export function useStockAlerts(
  options: UseStockAlertsOptions = {}
): UseQueryResult<StockAlert[], Error> {
  const { severity } = options;

  return useQuery<StockAlert[], Error>({
    queryKey: ['inventory', 'alerts', severity ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (severity && severity !== 'all') {
        params.append('severity', severity);
      }

      const url = `/api/v1/dashboard/inventory/alerts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch stock alerts');
      }

      const result = await response.json();
      return result.data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes (critical for alerts)
    staleTime: 4 * 60 * 1000, // 4 minutes
    retry: 3,
    // FIX #5: Reduce max retry delay from 30s to 10s (more reasonable for 5min refetch)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
