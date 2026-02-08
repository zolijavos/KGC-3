import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { StockMovementChart, type StockMovement } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { ExpandableWidgetWrapper } from '../components';

interface StockMovementApiResponse {
  data: StockMovement[];
}

/**
 * StockMovementChartWidget Wrapper
 *
 * Fetches stock movement data from backend and passes it to StockMovementChart component
 * Expandable: Shows larger chart with more data points
 */
export default function StockMovementChartWidget() {
  const {
    data: apiData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<StockMovementApiResponse>({
    queryKey: ['dashboard-inventory', 'movement'],
    queryFn: () => api.get('/dashboard/inventory/movement?days=30'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const compactContent = (
    <div className="relative">
      {isLoading || !apiData?.data ? (
        <StockMovementChart data={[]} isLoading={true} />
      ) : (
        <StockMovementChart data={apiData.data} />
      )}
    </div>
  );

  const expandedContent = (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Készlet mozgások - utolsó 30 nap</div>
        <button
          onClick={() => refetch()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          disabled={isFetching}
          aria-label="Frissítés"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Large chart container */}
      <div className="h-[500px]">
        {isLoading || !apiData?.data ? (
          <div className="w-full h-full bg-muted/30 animate-pulse rounded-lg" />
        ) : (
          <StockMovementChart data={apiData.data} height={500} />
        )}
      </div>

      {/* Summary stats */}
      {apiData?.data && (
        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {apiData.data.reduce((sum, d) => sum + (d.incoming ?? 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Bejövő</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {apiData.data.reduce((sum, d) => sum + (d.outgoing ?? 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Kimenő</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {apiData.data.reduce((sum, d) => sum + (d.returns ?? 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Visszavett</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {apiData.data.reduce(
                (sum, d) => sum + (d.incoming ?? 0) - (d.outgoing ?? 0) + (d.returns ?? 0),
                0
              )}
            </div>
            <div className="text-sm text-muted-foreground">Nettó változás</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ExpandableWidgetWrapper
      title="Készlet Mozgások"
      icon={<TrendingUp className="h-5 w-5" />}
      expandedContent={expandedContent}
    >
      {compactContent}
    </ExpandableWidgetWrapper>
  );
}
