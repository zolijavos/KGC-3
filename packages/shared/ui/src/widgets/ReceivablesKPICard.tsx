import { AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TrendIndicator } from '../components/dashboard/TrendIndicator';
import { ComparisonText } from '../components/dashboard/ComparisonText';
import { WidgetSkeleton } from '../components/dashboard/WidgetSkeleton';
import { cn } from '../lib/utils';
import type { KPIData } from './RevenueKPICard';

export interface ReceivablesKPICardProps {
  data: KPIData;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
  threshold?: number; // Default: from env or 500,000 Ft
}

// Default threshold from environment or fallback
const DEFAULT_THRESHOLD = Number(process.env.NEXT_PUBLIC_RECEIVABLES_THRESHOLD) || 500000;

/**
 * ReceivablesKPICard Widget
 *
 * Displays receivables (kintlévőség) KPI with threshold alert
 * Red badge when value > threshold (default from env or 500,000 Ft)
 */
export function ReceivablesKPICard({
  data,
  onClick,
  isLoading = false,
  className,
  threshold = DEFAULT_THRESHOLD,
}: ReceivablesKPICardProps) {
  if (isLoading) {
    return <WidgetSkeleton size="medium" />;
  }

  const numberFormatter = new Intl.NumberFormat('hu-HU');
  const isOverThreshold = data.current > threshold;

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      role="article"
      aria-label="Kintlévőség KPI widget"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
            {isOverThreshold ? (
              <AlertCircle className="h-4 w-4 text-red-600" data-icon="AlertCircle" />
            ) : (
              <TrendingUp className="h-4 w-4" data-icon="TrendingUp" />
            )}
            Kintlévőség
          </CardTitle>
          {isOverThreshold && (
            <Badge variant="destructive" data-testid="threshold-badge">
              Magas
            </Badge>
          )}
        </div>
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
