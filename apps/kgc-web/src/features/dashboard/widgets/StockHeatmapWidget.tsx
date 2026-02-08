import { api } from '@/api/client';
import { StockHeatmap, type HeatmapCell } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { ExpandableWidgetWrapper } from '../components';

interface StockHeatmapApiResponse {
  data: {
    machineType: string;
    location: string;
    count: number;
    utilizationPercent: number;
  }[];
}

/**
 * StockHeatmapWidget Wrapper
 *
 * Fetches stock heatmap data from backend and transforms it for StockHeatmap component
 * Expandable: Shows full heatmap in modal
 */
export default function StockHeatmapWidget() {
  const { data: apiData, isLoading } = useQuery<StockHeatmapApiResponse>({
    queryKey: ['dashboard-inventory', 'heatmap'],
    queryFn: () => api.get('/dashboard/inventory/heatmap'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Transform API response to HeatmapCell format
  const heatmapData: HeatmapCell[] = apiData?.data
    ? apiData.data.map(item => ({
        machineType: item.machineType,
        location: item.location,
        value: item.count,
        utilization: item.utilizationPercent,
      }))
    : [];

  // Show loading state or render with data
  if (isLoading) {
    return <StockHeatmap data={[]} isLoading={true} />;
  }

  const compactContent = <StockHeatmap data={heatmapData} />;

  const expandedContent = (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Készlet eloszlás géptípus és lokáció szerint
      </div>
      <div className="min-h-[400px]">
        <StockHeatmap data={heatmapData} />
      </div>
    </div>
  );

  return (
    <ExpandableWidgetWrapper title="Készlet Hőtérkép" icon="🗺️" expandedContent={expandedContent}>
      {compactContent}
    </ExpandableWidgetWrapper>
  );
}
