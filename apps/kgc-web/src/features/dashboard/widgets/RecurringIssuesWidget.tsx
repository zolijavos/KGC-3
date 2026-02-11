import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Badge, Card, CardContent, CardHeader, CardTitle, WidgetError } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';
import { useState } from 'react';
import { ServiceHistoryModal } from '../components/ServiceHistoryModal';
import { dashboardKeys } from '../lib/query-keys';

interface RecurringEquipmentItem {
  id: string;
  name: string;
  serialNumber: string;
  serviceCount: number;
  lastServiceDate: string;
  issues: string[];
  isCritical: boolean;
}

interface RecurringIssuesData {
  equipment: RecurringEquipmentItem[];
  totalCount: number;
  criticalCount: number;
}

interface RecurringIssuesApiResponse {
  data: RecurringIssuesData;
}

/** Performance: Pre-defined array to avoid inline creation during render */
const SKELETON_ROWS = [1, 2, 3, 4, 5] as const;

/**
 * Format date to Hungarian locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * RecurringIssuesWidget (Story 49-2)
 *
 * Displays equipment with recurring service issues
 * - Yellow badge for 3-4 services (warning)
 * - Red badge for 5+ services (critical)
 */
export default function RecurringIssuesWidget() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<RecurringIssuesApiResponse>({
    queryKey: dashboardKeys.serviceItem('recurring-issues'),
    queryFn: () => api.get('/dashboard/service/recurring-issues?threshold=3&days=90'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  const handleRowClick = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
  };

  const handleCloseModal = () => {
    setSelectedEquipmentId(null);
  };

  return (
    <>
      <Card className="recurring-issues-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Visszatero hibak
          </CardTitle>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isFetching}
            aria-label="Frissites"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {SKELETON_ROWS.map(i => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data?.totalCount ?? 0}</span>
                  <span className="text-xs text-muted-foreground">problemas gep</span>
                </div>
                {(data?.criticalCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{data?.criticalCount} kritikus</span>
                  </div>
                )}
              </div>

              {/* Equipment list */}
              {(data?.equipment?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nincs visszatero hiba</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {data?.equipment?.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-colors',
                        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
                        item.isCritical
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                          : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
                      )}
                      aria-label={`${item.name} szerviz elozmenyeinek megtekintese`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.name}</span>
                            <Badge
                              className={cn(
                                'shrink-0',
                                item.isCritical
                                  ? 'bg-red-500 hover:bg-red-600 text-white border-transparent'
                                  : 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
                              )}
                            >
                              {item.serviceCount}x
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.serialNumber}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Utolso szerviz</p>
                          <p className="text-xs font-medium">{formatDate(item.lastServiceDate)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.issues.slice(0, 3).map((issue, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {issue}
                          </span>
                        ))}
                        {item.issues.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            +{item.issues.length - 3} tovabb
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Service History Modal */}
      {selectedEquipmentId && (
        <ServiceHistoryModal
          equipmentId={selectedEquipmentId}
          open={!!selectedEquipmentId}
          onOpenChange={open => {
            if (!open) handleCloseModal();
          }}
        />
      )}
    </>
  );
}
