import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, WidgetError } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { Minus, RefreshCw, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { useState } from 'react';

type Period = 'day' | 'week' | 'month';

interface ServiceRevenueData {
  current: {
    total: number;
    laborFee: number;
    partsRevenue: number;
  };
  previous: {
    total: number;
    laborFee: number;
    partsRevenue: number;
  };
  delta: {
    totalPercent: number;
    laborPercent: number;
    partsPercent: number;
    trend: 'up' | 'down' | 'neutral';
  };
  period: Period;
  periodStart: string;
  periodEnd: string;
}

interface ServiceRevenueApiResponse {
  data: ServiceRevenueData;
}

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Ma',
  week: 'Hét',
  month: 'Hónap',
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(value);
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
};

/**
 * ServiceRevenueWidget (Story 35-5)
 *
 * Displays service revenue with labor/parts breakdown
 */
export default function ServiceRevenueWidget() {
  const [period, setPeriod] = useState<Period>('week');

  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<ServiceRevenueApiResponse>({
    queryKey: ['dashboard-service', 'revenue', period],
    queryFn: () => api.get(`/dashboard/service/revenue?period=${period}`),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  return (
    <Card className="service-revenue-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Szerviz bevétel
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="text-xs border rounded px-2 py-1 bg-background"
            aria-label="Időszak választás"
          >
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isFetching}
            aria-label="Frissítés"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-muted rounded w-28" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {formatCurrency(data?.current?.total ?? 0)}
              </span>
              <TrendIcon trend={data?.delta?.trend ?? 'neutral'} />
              <span
                className={cn(
                  'text-sm font-medium',
                  data?.delta?.trend === 'up' && 'text-green-600',
                  data?.delta?.trend === 'down' && 'text-red-600',
                  data?.delta?.trend === 'neutral' && 'text-gray-500'
                )}
              >
                {data?.delta?.totalPercent !== undefined
                  ? `${data.delta.totalPercent > 0 ? '+' : ''}${data.delta.totalPercent}%`
                  : '0%'}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Munkadíj</span>
                <span className="font-medium">{formatCurrency(data?.current?.laborFee ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alkatrész</span>
                <span className="font-medium">
                  {formatCurrency(data?.current?.partsRevenue ?? 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
