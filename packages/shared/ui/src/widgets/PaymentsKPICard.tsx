import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendIndicator } from '../components/dashboard/TrendIndicator';
import { ComparisonText } from '../components/dashboard/ComparisonText';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';
import type { KPIData } from './RevenueKPICard';

export interface PaymentsKPICardProps {
  data: KPIData;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * PaymentsKPICard Widget
 *
 * Displays payments (befizetések) KPI
 */
export function PaymentsKPICard({
  data,
  onClick,
  isLoading = false,
  className,
}: PaymentsKPICardProps) {
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
      aria-label="Befizetések KPI widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <CreditCard className="h-4 w-4" data-icon="CreditCard" />
          Befizetések
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
