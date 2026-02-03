import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type KPIType = 'revenue' | 'net-revenue' | 'receivables' | 'payments';

export interface KPIData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface UseKPIDataOptions {
  kpiType: KPIType;
  dateFrom: Date;
  dateTo: Date;
  period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  comparison?: boolean;
}

/**
 * TanStack Query hook for fetching KPI data
 *
 * Features:
 * - Auto-refresh every 5 minutes (refetchInterval)
 * - Data considered stale after 4 minutes (staleTime)
 * - Automatic retry on error
 *
 * @param options - KPI query options
 * @returns UseQueryResult with KPI data
 */
export function useKPIData({
  kpiType,
  dateFrom,
  dateTo,
  period = 'daily',
  comparison = true,
}: UseKPIDataOptions): UseQueryResult<KPIData, Error> {
  return useQuery<KPIData, Error>({
    queryKey: ['kpi', kpiType, dateFrom.toISOString(), dateTo.toISOString(), period, comparison],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        period,
        comparison: String(comparison),
      });

      const response = await fetch(`/api/v1/dashboard/kpi/${kpiType}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${kpiType} KPI`);
      }

      const data = await response.json();

      // Transform API response to KPIData format
      return {
        current: data.current.value,
        previous: data.previous?.value ?? 0,
        trend: data.delta?.trend ?? 'neutral',
      };
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 4 * 60 * 1000, // 4 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
