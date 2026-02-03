import { TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

export interface StockMovement {
  date: string;
  inbound: number;
  outbound: number;
  net: number;
}

export interface StockMovementChartProps {
  data: StockMovement[];
  onClick?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * StockMovementChart Widget
 *
 * Displays stock inbound/outbound movement over time with line chart
 *
 * Features:
 * - Dual-axis line chart (inbound/outbound)
 * - Net movement line
 * - 30-day historical data
 * - Interactive tooltip
 *
 * @param data - Stock movement data array
 * @param onClick - Optional click handler for drill-down
 * @param onRefresh - Optional refresh handler
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function StockMovementChart({
  data,
  onClick,
  onRefresh,
  isLoading = false,
  className,
}: StockMovementChartProps) {
  if (isLoading) {
    return <WidgetSkeleton size="large" />;
  }

  return (
    <Card
      className={cn('transition-shadow hover:shadow-md', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role="article"
      aria-label="Készlet Mozgás widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <TrendingUp className="h-4 w-4" data-icon="TrendingUp" />
          Készlet Mozgás
        </CardTitle>
        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Frissítés"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" data-icon="RefreshCw" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        {/* FIX #9: Add responsive height - min 250px, max 400px for better mobile/desktop */}
        <ResponsiveContainer width="100%" height={300} minHeight={250} maxHeight={400}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('hu-HU');
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="inbound"
              name="Beérkezés"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="outbound"
              name="Kiadás"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Nettó"
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
