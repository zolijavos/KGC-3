import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Revenue source type
 */
type RevenueSourceType = 'rental' | 'contract' | 'service';

/**
 * Source breakdown data
 */
interface RevenueSourceBreakdown {
  type: RevenueSourceType;
  label: string;
  amount: number;
  percentage: number;
  count: number;
}

/**
 * Month-over-month comparison
 */
interface RevenueComparison {
  previousMonth: number;
  changeAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Forecast response data
 */
interface RevenueForecastData {
  generatedAt: string;
  forecastMonth: string;
  totalForecast: number;
  sources: RevenueSourceBreakdown[];
  comparison: RevenueComparison;
}

interface RevenueForecastApiResponse {
  data: RevenueForecastData;
}

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

/**
 * Get color class for source type
 */
function getSourceColor(type: RevenueSourceType): string {
  switch (type) {
    case 'rental':
      return 'bg-blue-500';
    case 'contract':
      return 'bg-purple-500';
    case 'service':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get trend icon
 */
function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
  }
}

/**
 * Get trend color
 */
function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400';
    case 'down':
      return 'text-red-600 dark:text-red-400';
    case 'stable':
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Format month for display
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'Január',
    'Február',
    'Március',
    'Április',
    'Május',
    'Június',
    'Július',
    'Augusztus',
    'Szeptember',
    'Október',
    'November',
    'December',
  ];
  const monthIndex = parseInt(month ?? '1', 10) - 1;
  return `${year ?? ''} ${monthNames[monthIndex] ?? ''}`;
}

/**
 * RevenueForecastWidget Component
 *
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * Displays:
 * - Total forecasted revenue
 * - Source breakdown (rental, contract, service)
 * - Month-over-month comparison
 */
export function RevenueForecastWidget() {
  const { data, isLoading, error } = useQuery<RevenueForecastApiResponse>({
    queryKey: ['dashboard', 'revenue', 'forecast'],
    queryFn: async () => {
      const response = await api.get('/dashboard/revenue/forecast');
      return response.data as RevenueForecastApiResponse;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div
        className="rounded-lg border bg-card p-6"
        data-testid="revenue-forecast-loading"
        aria-label="Bevétel előrejelzés betöltése..."
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-16 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-6"
        data-testid="revenue-forecast-error"
        role="alert"
      >
        <h3 className="font-semibold text-destructive">Hiba történt</h3>
        <p className="text-sm text-muted-foreground">
          Nem sikerült betölteni a bevétel előrejelzést.
        </p>
      </div>
    );
  }

  const forecast = data?.data;

  if (!forecast) {
    return null;
  }

  return (
    <div
      className="rounded-lg border bg-card p-6"
      data-testid="revenue-forecast-widget"
      aria-label="Bevétel előrejelzés"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Várható Bevétel</h3>
        <span className="text-sm text-muted-foreground">{formatMonth(forecast.forecastMonth)}</span>
      </div>

      {/* Total with comparison */}
      <div className="mb-6">
        <div className="text-3xl font-bold" data-testid="total-forecast">
          {formatCurrency(forecast.totalForecast)}
        </div>
        <div
          className={`flex items-center gap-1 text-sm ${getTrendColor(forecast.comparison.trend)}`}
          data-testid="comparison"
        >
          <span>{getTrendIcon(forecast.comparison.trend)}</span>
          <span>
            {forecast.comparison.changePercent > 0 ? '+' : ''}
            {forecast.comparison.changePercent.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">előző hónaphoz képest</span>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="space-y-3" data-testid="sources">
        <h4 className="text-sm font-medium text-muted-foreground">Forrás szerinti bontás</h4>
        {forecast.sources.map(source => (
          <div key={source.type} className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getSourceColor(source.type)}`} />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm">{source.label}</span>
                <span className="text-sm font-medium">{formatCurrency(source.amount)}</span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={source.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${source.label} aránya: ${source.percentage}%`}
              >
                <div
                  className={`h-full ${getSourceColor(source.type)}`}
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{source.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Previous month reference */}
      {forecast.comparison.previousMonth > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Előző hónap tényleges</span>
            <span>{formatCurrency(forecast.comparison.previousMonth)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RevenueForecastWidget;
