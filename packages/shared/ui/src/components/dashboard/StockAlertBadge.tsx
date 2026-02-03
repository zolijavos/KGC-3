import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StockAlertBadgeProps {
  severity: 'critical' | 'warning';
  children?: React.ReactNode;
  className?: string;
}

/**
 * StockAlertBadge Component
 *
 * Displays severity badge for stock alerts
 *
 * - Critical: Red background, exclamation icon, white text
 * - Warning: Yellow background, warning icon, black text
 *
 * @param severity - Alert severity level ('critical' | 'warning')
 * @param children - Optional badge text/content
 * @param className - Optional className for customization
 *
 * @example
 * <StockAlertBadge severity="critical">Kritikus hiány</StockAlertBadge>
 * <StockAlertBadge severity="warning">Figyelmeztetés</StockAlertBadge>
 */
export function StockAlertBadge({ severity, children, className }: StockAlertBadgeProps) {
  const isCritical = severity === 'critical';

  const IconComponent = isCritical ? AlertCircle : AlertTriangle;
  const iconDataAttr = isCritical ? 'AlertCircle' : 'AlertTriangle';

  const badgeClasses = cn(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
    isCritical ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black',
    className,
  );

  return (
    <span className={badgeClasses} data-severity={severity}>
      <IconComponent className="h-3 w-3" data-icon={iconDataAttr} />
      {children}
    </span>
  );
}
