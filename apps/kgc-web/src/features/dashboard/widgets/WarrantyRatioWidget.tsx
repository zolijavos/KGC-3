import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, WidgetError } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Shield } from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { dashboardKeys } from '../lib/query-keys';

/**
 * Warranty Ratio Category
 */
interface WarrantyRatioCategory {
  count: number;
  revenue: number;
  percentage: number;
}

/**
 * Trend Item for 6-month history
 */
interface WarrantyRatioTrendItem {
  month: string;
  warrantyPercent: number;
}

/**
 * Warranty Ratio API Response
 */
interface WarrantyRatioData {
  warranty: WarrantyRatioCategory;
  paid: WarrantyRatioCategory;
  trend: WarrantyRatioTrendItem[];
  periodStart: string;
  periodEnd: string;
}

interface WarrantyRatioApiResponse {
  data: WarrantyRatioData;
}

/**
 * Chart colors as specified in Story 49-1
 */
const CHART_COLORS = {
  warranty: '#3B82F6', // Blue
  paid: '#10B981', // Green
};

/**
 * Format currency in HUF
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Performance: Pre-defined array to avoid inline creation during render */
const SKELETON_ITEMS = [1, 2] as const;

/**
 * Mini sparkline component for 6-month trend
 */
function TrendSparkline({ trend }: { trend: WarrantyRatioTrendItem[] }) {
  if (trend.length === 0) return null;

  // Reverse to show oldest to newest (left to right)
  const reversedTrend = [...trend].reverse();
  const maxVal = Math.max(...reversedTrend.map(t => t.warrantyPercent), 1);
  const minVal = Math.min(...reversedTrend.map(t => t.warrantyPercent), 0);
  const range = maxVal - minVal || 1;

  // Calculate trend direction
  const firstVal = reversedTrend[0]?.warrantyPercent ?? 0;
  const lastVal = reversedTrend[reversedTrend.length - 1]?.warrantyPercent ?? 0;
  const trendDirection = lastVal > firstVal ? 'up' : lastVal < firstVal ? 'down' : 'neutral';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-0.5 h-6">
        {reversedTrend.map(item => {
          const height = ((item.warrantyPercent - minVal) / range) * 100;
          return (
            <div
              key={item.month}
              className="w-2 bg-blue-400 rounded-t-sm transition-all"
              style={{ height: `${Math.max(height, 10)}%` }}
              title={`${item.month}: ${item.warrantyPercent}%`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>6 hó trend:</span>
        <span
          className={cn(
            'font-medium',
            trendDirection === 'up' && 'text-red-500',
            trendDirection === 'down' && 'text-green-500',
            trendDirection === 'neutral' && 'text-gray-500'
          )}
        >
          {trendDirection === 'up' && '↑ nő'}
          {trendDirection === 'down' && '↓ csökken'}
          {trendDirection === 'neutral' && '→ stabil'}
        </span>
      </div>
    </div>
  );
}

/**
 * Custom tooltip for PieChart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { count: number; revenue: number } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  if (!data) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
      <p className="font-medium">{data.name}</p>
      <p>{data.value.toFixed(1)}%</p>
      <p className="text-muted-foreground">{data.payload.count} javítás</p>
      {data.payload.revenue > 0 && (
        <p className="text-muted-foreground">{formatCurrency(data.payload.revenue)}</p>
      )}
    </div>
  );
}

/**
 * WarrantyRatioWidget (Story 49-1)
 *
 * Displays warranty vs paid service ratio with pie chart and 6-month trend sparkline.
 * Replaces the WarrantyRatioPlaceholder.
 *
 * Features:
 * - Recharts PieChart for warranty vs paid ratio
 * - Mini sparkline for 6-month trend
 * - Display counts and revenue
 */
export default function WarrantyRatioWidget() {
  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<WarrantyRatioApiResponse>({
    queryKey: dashboardKeys.serviceItem('warranty-ratio'),
    queryFn: () => api.get('/dashboard/service/warranty-ratio'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  // Prepare pie chart data
  const pieData = data
    ? [
        {
          name: 'Garanciális',
          value: data.warranty.percentage,
          count: data.warranty.count,
          revenue: data.warranty.revenue,
          fill: CHART_COLORS.warranty,
        },
        {
          name: 'Fizetős',
          value: data.paid.percentage,
          count: data.paid.count,
          revenue: data.paid.revenue,
          fill: CHART_COLORS.paid,
        },
      ]
    : [];

  return (
    <Card className="warranty-ratio-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Garanciális arány
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
            <div className="flex justify-center">
              <div className="h-24 w-24 bg-muted rounded-full" />
            </div>
            <div className="flex gap-4 justify-center">
              {SKELETON_ITEMS.map(i => (
                <div key={i} className="h-6 bg-muted rounded w-20" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pie Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with counts */}
            <div className="flex justify-around text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.warranty }}
                />
                <div>
                  <p className="font-medium">Garanciális</p>
                  <p className="text-muted-foreground text-xs">
                    {data?.warranty.count ?? 0} db ({data?.warranty.percentage.toFixed(1) ?? 0}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.paid }}
                />
                <div>
                  <p className="font-medium">Fizetős</p>
                  <p className="text-muted-foreground text-xs">
                    {data?.paid.count ?? 0} db ({data?.paid.percentage.toFixed(1) ?? 0}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue for paid services */}
            {data && data.paid.revenue > 0 && (
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Fizetős bevétel: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(data.paid.revenue)}
                </span>
              </div>
            )}

            {/* 6-month Trend Sparkline */}
            {data && data.trend.length > 0 && (
              <div className="pt-2 border-t">
                <TrendSparkline trend={data.trend} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
