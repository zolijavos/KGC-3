import { api } from '@/api/client';
import { RevenueKPICard, type KPIData } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from '../lib/query-keys';

interface KpiApiResponse {
  kpiType: string;
  period: { from: string; to: string };
  current: { value: number; currency: string; count?: number };
  previous?: { value: number; currency: string; count?: number };
  delta?: { absolute: number; percentage: number; trend: 'up' | 'down' | 'neutral' };
}

/**
 * RevenueKPIWidget Wrapper
 *
 * Fetches revenue KPI data from backend and transforms it for RevenueKPICard component
 */
export default function RevenueKPIWidget() {
  const { data: apiData, isLoading } = useQuery<KpiApiResponse>({
    queryKey: dashboardKeys.kpi('revenue'),
    queryFn: () => api.get('/dashboard/kpi/revenue'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Transform API response to KPIData format with defensive checks
  const kpiData: KPIData | undefined =
    apiData?.current?.value !== undefined
      ? {
          current: apiData.current.value,
          previous: apiData.previous?.value ?? apiData.current.value,
          trend: apiData.delta?.trend ?? 'neutral',
        }
      : undefined;

  // Show loading state or render with data
  if (isLoading || !kpiData) {
    return <RevenueKPICard data={{ current: 0, previous: 0, trend: 'neutral' }} isLoading={true} />;
  }

  return <RevenueKPICard data={kpiData} />;
}
