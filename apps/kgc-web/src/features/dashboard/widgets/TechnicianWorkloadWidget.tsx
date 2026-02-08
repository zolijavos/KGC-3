import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  WidgetError,
} from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, RefreshCw, Users } from 'lucide-react';
import { ExpandableWidgetWrapper } from '../components';

interface WorksheetItem {
  id: string;
  title: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface TechnicianItem {
  id: string;
  name: string;
  activeWorksheets: number;
  maxCapacity: number;
  utilizationPercent: number;
  worksheets: WorksheetItem[];
}

interface ServiceWorkloadData {
  technicians: TechnicianItem[];
}

interface ServiceWorkloadApiResponse {
  data: ServiceWorkloadData;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-600 bg-gray-100',
  NORMAL: 'text-blue-600 bg-blue-100',
  HIGH: 'text-orange-600 bg-orange-100',
  URGENT: 'text-red-600 bg-red-100',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Alacsony',
  NORMAL: 'Normál',
  HIGH: 'Magas',
  URGENT: 'Sürgős',
};

const getUtilizationColor = (percent: number): string => {
  if (percent >= 80) return 'bg-red-500';
  if (percent >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getUtilizationTextColor = (percent: number): string => {
  if (percent >= 80) return 'text-red-600';
  if (percent >= 60) return 'text-yellow-600';
  return 'text-green-600';
};

/**
 * TechnicianWorkloadWidget (Story 35-5)
 *
 * Shows technician workload with capacity utilization
 * Expandable: Shows detailed worksheet list per technician
 */
export default function TechnicianWorkloadWidget() {
  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<ServiceWorkloadApiResponse>({
    queryKey: ['dashboard-service', 'workload'],
    queryFn: () => api.get('/dashboard/service/workload'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  const compactContent = (
    <Card className="technician-workload-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Szerelő terhelés
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
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-4">
              {data?.technicians?.slice(0, 4).map(tech => (
                <Tooltip key={tech.id}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-pointer">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-muted-foreground">
                          {tech.activeWorksheets}/{tech.maxCapacity}
                        </span>
                      </div>
                      <Progress
                        value={tech.utilizationPercent}
                        className="h-2"
                        indicatorClassName={getUtilizationColor(tech.utilizationPercent)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-medium mb-1">{tech.name} munkalapjai:</p>
                    <ul className="text-xs space-y-1">
                      {tech.worksheets.slice(0, 3).map(ws => (
                        <li key={ws.id} className="flex items-center gap-1">
                          <span
                            className={cn(
                              'font-medium px-1 rounded text-xs',
                              PRIORITY_COLORS[ws.priority]
                            )}
                          >
                            {PRIORITY_LABELS[ws.priority]}
                          </span>
                          <span className="truncate">{ws.title}</span>
                        </li>
                      ))}
                      {tech.worksheets.length > 3 && (
                        <li className="text-muted-foreground">
                          +{tech.worksheets.length - 3} további
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ))}
              {(data?.technicians?.length ?? 0) > 4 && (
                <div className="text-center text-xs text-muted-foreground">
                  +{(data?.technicians?.length ?? 0) - 4} további szerelő
                </div>
              )}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Összes szerelő: {data?.technicians?.length ?? 0}
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
          disabled={isFetching}
          aria-label="Frissítés"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Technician cards */}
      <div className="grid gap-4">
        {data?.technicians?.map(tech => (
          <div key={tech.id} className="border rounded-lg p-4 space-y-3">
            {/* Technician header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-semibold">{tech.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {tech.activeWorksheets} aktív / {tech.maxCapacity} max
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'text-2xl font-bold',
                  getUtilizationTextColor(tech.utilizationPercent)
                )}
              >
                {tech.utilizationPercent}%
              </div>
            </div>

            {/* Progress bar */}
            <Progress
              value={tech.utilizationPercent}
              className="h-3"
              indicatorClassName={getUtilizationColor(tech.utilizationPercent)}
            />

            {/* Worksheets list */}
            {tech.worksheets.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Aktív munkalapok
                </div>
                <div className="space-y-2">
                  {tech.worksheets.map(ws => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded"
                    >
                      <div className="flex items-center gap-2">
                        {ws.priority === 'URGENT' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {ws.priority === 'HIGH' && <Clock className="h-4 w-4 text-orange-500" />}
                        <span className="text-sm">{ws.title}</span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded',
                          PRIORITY_COLORS[ws.priority]
                        )}
                      >
                        {PRIORITY_LABELS[ws.priority]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tech.worksheets.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Nincs aktív munkalap
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ExpandableWidgetWrapper
      title="Szerelő Terhelés"
      icon={<Users className="h-5 w-5" />}
      expandedContent={expandedContent}
    >
      {compactContent}
    </ExpandableWidgetWrapper>
  );
}
