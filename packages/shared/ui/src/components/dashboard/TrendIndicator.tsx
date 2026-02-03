import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  className?: string;
}

/**
 * TrendIndicator Component
 *
 * Displays delta percentage and trend icon (↑ green / ↓ red / → gray)
 *
 * @param value - Current period value
 * @param previousValue - Previous period value for comparison
 * @param className - Optional className for customization
 *
 * @example
 * <TrendIndicator value={120} previousValue={100} />
 * // Renders: +20.0% with green ↑ icon
 */
export function TrendIndicator({ value, previousValue, className }: TrendIndicatorProps) {
  // Guard against invalid values (NaN, Infinity, zero)
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(previousValue) ||
    previousValue === 0
  ) {
    return (
      <div className={cn('flex items-center gap-1 text-gray-400', className)}>
        <Minus className="h-4 w-4" data-trend="neutral" />
        <span className="text-sm font-medium">—</span>
      </div>
    );
  }

  // Calculate delta percentage
  const delta = ((value - previousValue) / previousValue) * 100;

  // Additional NaN check after calculation
  if (!Number.isFinite(delta)) {
    return (
      <div className={cn('flex items-center gap-1 text-gray-400', className)}>
        <Minus className="h-4 w-4" data-trend="neutral" />
        <span className="text-sm font-medium">—</span>
      </div>
    );
  }

  // Determine trend direction
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Select icon and color
  const IconComponent = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const trendColor = isPositive
    ? 'text-green-600'
    : isNegative
      ? 'text-red-600'
      : 'text-gray-400';

  const trendDataAttr = isPositive ? 'up' : isNegative ? 'down' : 'neutral';

  // Format percentage with sign
  const formattedDelta = `${isPositive ? '+' : ''}${delta.toFixed(1)}%`;

  return (
    <div className={cn('flex items-center gap-1', trendColor, className)}>
      <IconComponent className="h-4 w-4" data-trend={trendDataAttr} />
      <span className="text-sm font-medium">{formattedDelta}</span>
    </div>
  );
}
