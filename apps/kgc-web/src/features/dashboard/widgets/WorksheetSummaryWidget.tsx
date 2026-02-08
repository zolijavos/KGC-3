import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, WidgetError } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { FileText, RefreshCw } from 'lucide-react';
import { dashboardKeys } from '../lib/query-keys';

interface StatusItem {
  status: string;
  count: number;
  color: string;
}

interface ServiceSummaryData {
  totalActive: number;
  byStatus: StatusItem[];
  periodStart: string;
  periodEnd: string;
}

interface ServiceSummaryApiResponse {
  data: ServiceSummaryData;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Vázlat',
  DIAGNOSED: 'Diagnosztizált',
  IN_PROGRESS: 'Folyamatban',
  WAITING_PARTS: 'Alkatrészre vár',
  COMPLETED: 'Befejezett',
  CLOSED: 'Lezárt',
};

const STATUS_COLORS: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-800',
  purple: 'bg-purple-100 text-purple-800',
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  slate: 'bg-slate-100 text-slate-800',
};

/** Performance: Pre-defined array to avoid inline creation during render */
const SKELETON_ITEMS = [1, 2, 3, 4] as const;

/**
 * WorksheetSummaryWidget (Story 35-5)
 *
 * Displays worksheet counts by status for service dashboard
 */
export default function WorksheetSummaryWidget() {
  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<ServiceSummaryApiResponse>({
    queryKey: dashboardKeys.serviceItem('summary'),
    queryFn: () => api.get('/dashboard/service/summary'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  return (
    <Card className="worksheet-summary-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Munkalapok
        </CardTitle>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          disabled={isFetching}
          aria-label="Frissítés"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-muted rounded w-20" />
            <div className="flex flex-wrap gap-2">
              {SKELETON_ITEMS.map(i => (
                <div key={i} className="h-6 bg-muted rounded w-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{data?.totalActive ?? 0}</div>
            <p className="text-xs text-muted-foreground mb-3">aktív munkalap</p>
            <div className="flex flex-wrap gap-2">
              {data?.byStatus?.map(item => (
                <span
                  key={item.status}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                    STATUS_COLORS[item.color] ?? 'bg-gray-100 text-gray-800'
                  )}
                >
                  {STATUS_LABELS[item.status] ?? item.status}: {item.count}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
