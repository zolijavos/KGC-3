/**
 * SeasonalityChartWidget
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Displays 12-month rental trends with Recharts AreaChart:
 * - Monthly rental count
 * - Monthly revenue
 * - Dual Y-axis for different scales
 */

import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSeasonality } from '../hooks/useRentalDashboard';

/**
 * Month names in Hungarian
 */
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Már',
  'Ápr',
  'Máj',
  'Jún',
  'Júl',
  'Aug',
  'Szep',
  'Okt',
  'Nov',
  'Dec',
];

/**
 * Format month string (2026-01) to short Hungarian name
 */
function formatMonth(monthStr: string): string {
  const parts = monthStr.split('-');
  const monthIndex = parseInt(parts[1] ?? '1', 10) - 1;
  return MONTH_NAMES[monthIndex] ?? monthStr;
}

/**
 * Format currency for tooltip
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
 * Custom tooltip component
 */
interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Parse month for display
  const [year, month] = (label ?? '').split('-');
  const monthIndex = parseInt(month ?? '1', 10) - 1;
  const monthName = MONTH_NAMES[monthIndex];

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
      <p className="font-medium mb-2">
        {year}. {monthName}
      </p>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">
            {item.dataKey === 'revenue' ? formatCurrency(item.value) : `${item.value} db`}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * SeasonalityChartWidget Component
 */
export function SeasonalityChartWidget() {
  const { data, isLoading, error } = useSeasonality(12);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        data-testid="seasonality-chart-loading"
        aria-label="Szezonális trend betöltése..."
      >
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-6"
        data-testid="seasonality-chart-error"
        role="alert"
      >
        <h3 className="font-semibold text-destructive">Hiba történt</h3>
        <p className="text-sm text-muted-foreground">
          Nem sikerült betölteni a szezonális trendet.
        </p>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        data-testid="seasonality-chart-empty"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Szezonális Trend
        </h3>
        <p className="text-muted-foreground text-center py-8">
          Még nincs elegendő adat a trend megjelenítéséhez.
        </p>
      </div>
    );
  }

  // Transform data for chart - add formatted month labels
  const chartData = data.map(item => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  return (
    <div
      className="rounded-lg border bg-card p-6 shadow-sm"
      data-testid="seasonality-chart-widget"
      aria-label="Szezonális trend"
    >
      {/* Header */}
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Bérlési Trend (12 hónap)
      </h3>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRentalCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Bérlések',
                angle: -90,
                position: 'insideLeft',
                fontSize: 11,
                fill: '#6b7280',
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
              label={{
                value: 'Bevétel (Ft)',
                angle: 90,
                position: 'insideRight',
                fontSize: 11,
                fill: '#6b7280',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="rentalCount"
              name="Bérlések"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRentalCount)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Bevétel"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Összes bérlés:</span>
          <span className="ml-2 font-semibold">
            {data.reduce((sum, item) => sum + item.rentalCount, 0)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Összes bevétel:</span>
          <span className="ml-2 font-semibold">
            {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SeasonalityChartWidget;
