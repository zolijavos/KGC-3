import { Grid3x3, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';

export interface StockHeatmapData {
  machineType: string;
  location: string;
  count: number;
  utilizationPercent: number;
}

export interface StockHeatmapProps {
  data: StockHeatmapData[];
  onClick?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * StockHeatmap Widget
 *
 * Displays stock distribution heatmap by machine type and location
 *
 * Features:
 * - Color intensity based on utilization percentage
 * - Grid layout with machine types (X-axis) and locations (Y-axis)
 * - Tooltip with count and percentage
 * - Responsive with horizontal scroll for many types
 *
 * @param data - Stock heatmap data array
 * @param onClick - Optional click handler for drill-down
 * @param onRefresh - Optional refresh handler
 * @param isLoading - Show skeleton loader
 * @param className - Additional CSS classes
 */
export function StockHeatmap({
  data,
  onClick,
  onRefresh,
  isLoading = false,
  className,
}: StockHeatmapProps) {
  if (isLoading) {
    return <WidgetSkeleton size="large" />;
  }

  // Extract unique machine types and locations
  const machineTypes = Array.from(new Set(data.map((d) => d.machineType)));
  const locations = Array.from(new Set(data.map((d) => d.location)));

  // Create lookup map for quick access
  const dataMap = new Map<string, StockHeatmapData>();
  data.forEach((item) => {
    const key = `${item.machineType}-${item.location}`;
    dataMap.set(key, item);
  });

  // Get cell data or return empty
  const getCellData = (machineType: string, location: string) => {
    const key = `${machineType}-${location}`;
    return dataMap.get(key);
  };

  // FIX #10: More intuitive color intensity scale with smoother gradations
  // 0%: gray (unused), 1-40%: light blue, 41-70%: medium blue, 71-90%: strong blue, 91-100%: dark blue
  const getColorIntensity = (percent: number) => {
    if (percent === 0) return 'bg-gray-100';
    if (percent <= 40) return 'bg-blue-200';
    if (percent <= 70) return 'bg-blue-400';
    if (percent <= 90) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  return (
    <Card
      className={cn('transition-shadow hover:shadow-md', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role="article"
      aria-label="Készlet Hőtérkép widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Grid3x3 className="h-4 w-4" data-icon="Grid3x3" />
          Készlet Hőtérkép
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
        <div className="overflow-x-auto" data-testid="heatmap-container">
          {machineTypes.length === 0 || locations.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Nincs adat</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-gray-500"></th>
                  {machineTypes.map((type) => (
                    <th
                      key={type}
                      className="min-w-[100px] p-2 text-center text-xs font-medium text-gray-500"
                    >
                      {type}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location}>
                    <td className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-gray-700">
                      {location}
                    </td>
                    {machineTypes.map((type) => {
                      const cellData = getCellData(type, location);
                      return (
                        <td key={`${type}-${location}`} className="p-1">
                          {cellData ? (
                            <div
                              className={cn(
                                'flex flex-col items-center justify-center rounded p-2',
                                getColorIntensity(cellData.utilizationPercent),
                                // FIX #10: Adjust text color threshold to match new scale (90%+)
                                cellData.utilizationPercent > 90 && 'text-white',
                              )}
                              title={`${cellData.count} gép (${cellData.utilizationPercent}%)`}
                            >
                              <div className="text-sm font-semibold">{cellData.count}</div>
                              <div className="text-xs">{cellData.utilizationPercent}%</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center rounded bg-gray-50 p-2 text-gray-400">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
