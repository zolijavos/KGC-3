import { api } from '@/api/client';
import { StockSummaryCard, type StockSummaryData } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from '../lib/query-keys';

interface StockSummaryApiResponse {
  data: StockSummaryData;
}

/**
 * StockSummaryWidget Wrapper
 *
 * Fetches stock summary data from backend and passes it to StockSummaryCard component
 */
export default function StockSummaryWidget() {
  const {
    data: apiData,
    isLoading,
    refetch,
  } = useQuery<StockSummaryApiResponse>({
    queryKey: dashboardKeys.inventoryItem('summary'),
    queryFn: () => api.get('/dashboard/inventory/summary'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Show loading state or render with data
  if (isLoading || !apiData?.data) {
    return (
      <StockSummaryCard
        data={{ total: 0, byLocation: {}, byStatus: { available: 0, rented: 0, service: 0 } }}
        isLoading={true}
      />
    );
  }

  return <StockSummaryCard data={apiData.data} onRefresh={() => refetch()} />;
}
