import { api } from '@/api/client';
import { UtilizationCard, type UtilizationData } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';

interface StockSummaryApiResponse {
  data: {
    total: number;
    byLocation: Record<string, { count: number; percentage: number }>;
    byStatus: {
      available: number;
      rented: number;
      service: number;
    };
  };
}

/**
 * StockUtilizationWidget Wrapper
 *
 * Fetches stock summary data and transforms it to utilization metrics for UtilizationCard component
 */
export default function StockUtilizationWidget() {
  const {
    data: apiData,
    isLoading,
    refetch,
  } = useQuery<StockSummaryApiResponse>({
    queryKey: ['dashboard-inventory', 'summary'],
    queryFn: () => api.get('/dashboard/inventory/summary'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Transform summary to utilization data
  const utilizationData: UtilizationData | undefined = apiData?.data
    ? {
        utilized: apiData.data.byStatus.rented,
        total: apiData.data.total,
        warehouse: apiData.data.byStatus.available,
        service: apiData.data.byStatus.service,
      }
    : undefined;

  // Show loading state or render with data
  if (isLoading || !utilizationData) {
    return (
      <UtilizationCard
        data={{ utilized: 0, total: 0, warehouse: 0, service: 0 }}
        isLoading={true}
      />
    );
  }

  return <UtilizationCard data={utilizationData} onRefresh={() => refetch()} />;
}
