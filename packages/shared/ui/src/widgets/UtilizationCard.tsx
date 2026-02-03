import { TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { UtilizationGauge } from '../components/dashboard/UtilizationGauge';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

export interface UtilizationData {
  utilized: number;
  total: number;
  warehouse: number;
  service: number;
}

export interface UtilizationCardProps {
  data: UtilizationData;
  onClick?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * UtilizationCard Widget
 *
 * Displays machine utilization gauge with percentage
 *
 * Features:
 * - Circular progress gauge (green > 80%, yellow 60-80%, red < 60%)
 * - Warehouse and service breakdown
 * - Click to drill-down
 * - Manual refresh button
 *
 * @param data - Utilization data
 * @param onClick - Optional click handler for drill-down
 * @param onRefresh - Optional refresh handler
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function UtilizationCard({
  data,
  onClick,
  onRefresh,
  isLoading = false,
  className,
}: UtilizationCardProps) {
  if (isLoading) {
    return <WidgetSkeleton size="medium" />;
  }

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role="article"
      aria-label="Kihasználtság widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <TrendingUp className="h-4 w-4" data-icon="TrendingUp" />
          Kihasználtság
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
      <CardContent className="flex justify-center">
        <UtilizationGauge
          utilized={data.utilized}
          total={data.total}
          warehouseCount={data.warehouse}
          serviceCount={data.service}
        />
      </CardContent>
    </Card>
  );
}
