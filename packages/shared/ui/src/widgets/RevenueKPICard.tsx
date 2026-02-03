import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendIndicator } from '../components/dashboard/TrendIndicator';
import { ComparisonText } from '../components/dashboard/ComparisonText';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

export interface KPIData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface RevenueKPICardProps {
  data: KPIData;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * RevenueKPICard Widget
 *
 * Displays gross revenue (bruttó bevétel) KPI with trend and comparison
 *
 * Features:
 * - Large formatted current value
 * - Trend indicator (top right)
 * - Comparison text with previous period
 * - Click to drill-down
 * - Loading skeleton
 *
 * @param data - KPI data (current, previous, trend)
 * @param onClick - Optional click handler for drill-down
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function RevenueKPICard({
  data,
  onClick,
  isLoading = false,
  className,
}: RevenueKPICardProps) {
  if (isLoading) {
    return <WidgetSkeleton size="medium" />;
  }

  const numberFormatter = new Intl.NumberFormat('hu-HU');

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role="article"
      aria-label="Bruttó Bevétel KPI widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <DollarSign className="h-4 w-4" data-icon="DollarSign" />
          Bruttó Bevétel
        </CardTitle>
        <TrendIndicator value={data.current} previousValue={data.previous} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{numberFormatter.format(data.current)} Ft</div>
        <div className="mt-2">
          <ComparisonText current={data.current} previous={data.previous} format="currency" />
        </div>
      </CardContent>
    </Card>
  );
}
