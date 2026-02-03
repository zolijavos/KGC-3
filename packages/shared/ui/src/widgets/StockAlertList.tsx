import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { StockAlertBadge } from '../components/dashboard/StockAlertBadge';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

// FIX #6: Module-level Hungarian number formatter (avoid re-creation on every render)
const numberFormatter = new Intl.NumberFormat('hu-HU');

export interface StockAlert {
  id: string;
  model: string;
  type: string;
  currentStock: number;
  minimumThreshold: number;
  severity: 'critical' | 'warning';
  lastPurchase: string;
}

export interface StockAlertListProps {
  data: StockAlert[];
  onAlertClick?: (alert: StockAlert) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * StockAlertList Widget
 *
 * Displays stock shortage alerts with severity badges
 *
 * Features:
 * - Critical (< 50% threshold) and warning (50-100%) alerts
 * - Max 10 alerts displayed
 * - Click to view details
 * - Empty state when no alerts
 *
 * @param data - Stock alert data array
 * @param onAlertClick - Optional click handler for drill-down
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function StockAlertList({
  data,
  onAlertClick,
  isLoading = false,
  className,
}: StockAlertListProps) {
  if (isLoading) {
    return <WidgetSkeleton size="large" />;
  }

  const limitedData = data.slice(0, 10); // Max 10 alerts

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)} role="article" aria-label="Készlethiány Alertek widget">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <AlertTriangle className="h-4 w-4" data-icon="AlertTriangle" />
          Készlethiány Alertek
          {data.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              {/* FIX #8: Show actual displayed count (max 10) or indicate overflow */}
              {data.length > 10 ? '10+' : data.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="mb-2 h-12 w-12 text-green-600" />
            <div className="text-lg font-semibold text-gray-700">Nincs készlethiány</div>
            <div className="mt-1 text-sm text-gray-500">Minden termék megfelelő készletszinten</div>
          </div>
        ) : (
          // Alert table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-gray-500">
                  <th className="pb-2">Modell</th>
                  <th className="pb-2">Típus</th>
                  <th className="pb-2 text-right">Készlet</th>
                  <th className="pb-2 text-right">Min</th>
                  <th className="pb-2 text-center">Státusz</th>
                </tr>
              </thead>
              <tbody>
                {limitedData.map((alert) => (
                  <tr
                    key={alert.id}
                    className={cn(
                      'border-b transition-colors',
                      onAlertClick && 'cursor-pointer hover:bg-gray-50',
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <td className="py-3 text-sm font-semibold">{alert.model}</td>
                    <td className="py-3 text-sm text-gray-600">{alert.type}</td>
                    <td className="py-3 text-right text-sm font-semibold">
                      {numberFormatter.format(alert.currentStock)}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      {numberFormatter.format(alert.minimumThreshold)}
                    </td>
                    <td className="py-3 text-center">
                      <StockAlertBadge severity={alert.severity}>
                        {alert.severity === 'critical' ? 'Kritikus' : 'Figyelmeztetés'}
                      </StockAlertBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
