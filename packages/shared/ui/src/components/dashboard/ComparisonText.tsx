import { cn } from '../../lib/utils';

export interface ComparisonTextProps {
  current: number;
  previous: number;
  format?: 'currency' | 'number';
  className?: string;
}

/**
 * ComparisonText Component
 *
 * Displays current vs. previous value comparison with delta and percentage
 *
 * Format: "1,234,567 Ft vs. 1,100,000 Ft (+134,567 Ft, +12.2%)"
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @param format - Format type: 'currency' (default) or 'number'
 * @param className - Optional className for customization
 *
 * @example
 * <ComparisonText current={1234567} previous={1100000} format="currency" />
 */
export function ComparisonText({
  current,
  previous,
  format = 'currency',
  className,
}: ComparisonTextProps) {
  // Hungarian number formatter
  const numberFormatter = new Intl.NumberFormat('hu-HU');

  // Format value based on type
  const formatValue = (value: number): string => {
    if (format === 'currency') {
      return `${numberFormatter.format(value)} Ft`;
    }
    return numberFormatter.format(value);
  };

  // Calculate delta
  const absoluteDelta = current - previous;
  const percentageDelta = previous !== 0 ? (absoluteDelta / previous) * 100 : 0;

  // Determine sign and color
  const isPositive = absoluteDelta > 0;
  const isNegative = absoluteDelta < 0;

  const deltaColor = isPositive
    ? 'text-green-600'
    : isNegative
      ? 'text-red-600'
      : 'text-gray-500';

  const deltaDataAttr = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

  // Format delta values (add + sign for positive, Hungarian formatter handles - sign)
  const formattedAbsoluteDelta =
    format === 'currency'
      ? `${absoluteDelta > 0 ? '+' : ''}${numberFormatter.format(absoluteDelta)} Ft`
      : `${absoluteDelta > 0 ? '+' : ''}${numberFormatter.format(absoluteDelta)}`;

  const formattedPercentageDelta = `${percentageDelta >= 0 ? '+' : ''}${percentageDelta.toFixed(1)}%`;

  return (
    <div className={cn('text-sm', className)}>
      <span className="text-gray-700">{formatValue(current)}</span>
      <span className="text-gray-500"> vs. </span>
      <span className="text-gray-600">{formatValue(previous)}</span>
      <span className={cn('ml-1', deltaColor)} data-delta-sign={deltaDataAttr}>
        ({formattedAbsoluteDelta}, {formattedPercentageDelta})
      </span>
    </div>
  );
}
