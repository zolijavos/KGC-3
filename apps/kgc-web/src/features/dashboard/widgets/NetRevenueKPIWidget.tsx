import { useQuery } from '@tanstack/react-query';
import { NetRevenueKPICard, type KPIData } from '@kgc/ui';
import { api } from '@/api/client';

interface KpiApiResponse {
  kpiType: string;
  period: { from: string; to: string };
  current: { value: number; currency: string; count?: number };
  previous?: { value: number; currency: string; count?: number };
  delta?: { absolute: number; percentage: number; trend: 'up' | 'down' | 'neutral' };
}

/**
 * NetRevenueKPIWidget Wrapper
 *
 * Fetches net revenue KPI data from backend and transforms it for NetRevenueKPICard component
 */
export default function NetRevenueKPIWidget() {
  const { data: apiData, isLoading } = useQuery<KpiApiResponse>({
    queryKey: ['dashboard-kpi', 'net-revenue'],
    queryFn: () => api.get('/dashboard/kpi/net-revenue'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Transform API response to KPIData format
  const kpiData: KPIData | undefined = apiData
    ? {
        current: apiData.current.value,
        previous: apiData.previous?.value ?? apiData.current.value,
        trend: apiData.delta?.trend ?? 'neutral',
      }
    : undefined;

  // Show loading state or render with data
  if (isLoading || !kpiData) {
    return <NetRevenueKPICard data={{ current: 0, previous: 0, trend: 'neutral' }} isLoading={true} />;
  }

  return <NetRevenueKPICard data={kpiData} />;
}
