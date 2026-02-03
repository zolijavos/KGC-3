import { cn } from '../../lib/utils';

export interface UtilizationGaugeProps {
  utilized: number;
  total: number;
  warehouseCount?: number;
  serviceCount?: number;
  className?: string;
}

/**
 * UtilizationGauge Component
 *
 * Displays utilization percentage with circular progress gauge and color coding
 *
 * Color scheme:
 * - Green (> 80%): Good utilization
 * - Yellow (60-80%): Medium utilization
 * - Red (< 60%): Low utilization
 *
 * @param utilized - Number of utilized items (e.g., rented machines)
 * @param total - Total number of items
 * @param warehouseCount - Optional warehouse count
 * @param serviceCount - Optional service count
 * @param className - Optional className for customization
 *
 * @example
 * <UtilizationGauge utilized={290} total={342} warehouseCount={34} serviceCount={18} />
 * // Renders: 84.8% gauge with green color
 */
export function UtilizationGauge({
  utilized,
  total,
  warehouseCount,
  serviceCount,
  className,
}: UtilizationGaugeProps) {
  // Guard against invalid values
  if (
    !Number.isFinite(utilized) ||
    !Number.isFinite(total) ||
    total === 0 ||
    utilized < 0 ||
    total < 0
  ) {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <div className="text-4xl font-bold text-gray-400">—</div>
        <div className="text-sm text-gray-500">Nincs adat</div>
      </div>
    );
  }

  // Calculate percentage
  const percentage = (utilized / total) * 100;

  // Additional NaN check after calculation
  if (!Number.isFinite(percentage)) {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <div className="text-4xl font-bold text-gray-400">—</div>
        <div className="text-sm text-gray-500">Nincs adat</div>
      </div>
    );
  }

  // Determine color based on percentage
  let color: 'green' | 'yellow' | 'red';
  let colorClass: string;

  if (percentage > 80) {
    color = 'green';
    colorClass = 'text-green-600';
  } else if (percentage >= 60) {
    color = 'yellow';
    colorClass = 'text-yellow-600';
  } else {
    color = 'red';
    colorClass = 'text-red-600';
  }

  // Calculate stroke-dasharray for circular progress (simplified version)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Format numbers with Hungarian locale
  const numberFormatter = new Intl.NumberFormat('hu-HU');

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Circular Progress Gauge */}
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-300', colorClass)}
          />
        </svg>
        {/* Percentage text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-2xl font-bold', colorClass)} data-color={color}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main label */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-600">Bérlésben:</div>
        <div className="text-lg font-semibold">
          {numberFormatter.format(utilized)} / {numberFormatter.format(total)} gép
        </div>
        <div className="mt-1 text-xs text-gray-500">
          ({percentage.toFixed(1)}%)
        </div>
      </div>

      {/* Subtext: Warehouse and Service counts */}
      {(warehouseCount !== undefined || serviceCount !== undefined) && (
        <div className="flex gap-4 text-sm text-gray-600">
          {warehouseCount !== undefined && (
            <div>
              <span className="font-medium">Raktár:</span>{' '}
              {numberFormatter.format(warehouseCount)} / {numberFormatter.format(total)}
            </div>
          )}
          {serviceCount !== undefined && (
            <div>
              <span className="font-medium">Szerviz:</span>{' '}
              {numberFormatter.format(serviceCount)} / {numberFormatter.format(total)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
