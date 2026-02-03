import { Package, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

// FIX #6: Module-level Hungarian number formatter (avoid re-creation on every render)
const numberFormatter = new Intl.NumberFormat('hu-HU');

export interface LocationBreakdown {
  count: number;
  percentage: number;
}

export interface StockSummaryData {
  total: number;
  byLocation: Record<string, LocationBreakdown>;
  byStatus: {
    available: number;
    rented: number;
    service: number;
  };
}

export interface StockSummaryCardProps {
  data: StockSummaryData;
  onClick?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * StockSummaryCard Widget
 *
 * Displays inventory summary with location breakdown
 *
 * Features:
 * - Total machine count
 * - Location breakdown (by store/warehouse)
 * - Status breakdown (available/rented/service)
 * - Click to drill-down
 * - Manual refresh button
 *
 * @param data - Stock summary data
 * @param onClick - Optional click handler for drill-down
 * @param onRefresh - Optional refresh handler
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function StockSummaryCard({
  data,
  onClick,
  onRefresh,
  isLoading = false,
  className,
}: StockSummaryCardProps) {
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
      aria-label="Készlet Összesítés widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Package className="h-4 w-4" data-icon="Package" />
          Készlet Összesítés
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
        {/* Total count */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-600">Összes Gép</div>
          <div className="text-3xl font-bold">{numberFormatter.format(data.total)}</div>
        </div>

        {/* Location breakdown */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600">Helyszín szerint</div>
          {Object.entries(data.byLocation).map(([locationKey, locationData]) => (
            <div key={locationKey} className="flex items-center justify-between">
              {/* FIX #7: Replace ALL underscores, not just the first one */}
              <span className="text-sm capitalize">{locationKey.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {numberFormatter.format(locationData.count)}
                </span>
                <span className="text-xs text-gray-500">
                  {locationData.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="mt-4 space-y-1 border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Elérhető</span>
            <span className="font-semibold">{numberFormatter.format(data.byStatus.available)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Bérlésben</span>
            <span className="font-semibold">{numberFormatter.format(data.byStatus.rented)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Szervizben</span>
            <span className="font-semibold">{numberFormatter.format(data.byStatus.service)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
