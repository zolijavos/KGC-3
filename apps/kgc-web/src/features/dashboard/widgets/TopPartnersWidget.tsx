import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { Gift, Minus, RefreshCw, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';

type Period = 'month' | 'quarter' | 'year';

interface TopPartnerItem {
  id: string;
  name: string;
  totalRevenue: number;
  rentalRevenue: number;
  salesRevenue: number;
  serviceRevenue: number;
  trendPercent: number;
  /** Story 41-3: Last purchase date */
  lastPurchaseDate: string;
  /** Story 41-3: Gift eligibility */
  giftEligible: boolean;
}

interface TopPartnersData {
  partners: TopPartnerItem[];
  period: Period;
  periodStart: string;
  periodEnd: string;
}

interface TopPartnersApiResponse {
  data: TopPartnersData;
}

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Hónap',
  quarter: 'Negyedév',
  year: 'Év',
};

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M Ft`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k Ft`;
  }
  return `${value} Ft`;
};

const TrendIndicator = ({ percent }: { percent: number }) => {
  if (percent > 0) {
    return (
      <span className="flex items-center text-xs text-green-600">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{percent.toFixed(1)}%
      </span>
    );
  }
  if (percent < 0) {
    return (
      <span className="flex items-center text-xs text-red-600">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {percent.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-xs text-gray-400">
      <Minus className="h-3 w-3 mr-0.5" />
      0%
    </span>
  );
};

/**
 * TopPartnersWidget (Story 35-6 + Story 41-3)
 *
 * Shows top 10 partners by revenue with trend indicators
 * Story 41-3: Added gift eligibility badge
 */
export default function TopPartnersWidget() {
  const [period, setPeriod] = useState<Period>('month');

  const {
    data: apiData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<TopPartnersApiResponse>({
    queryKey: ['dashboard-partner', 'top', period],
    queryFn: () => api.get(`/dashboard/partner/top?period=${period}`),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  return (
    <Card className="top-partners-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Top partnerek
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="text-xs border rounded px-2 py-1 bg-background"
            aria-label="Időszak választás"
          >
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isFetching}
            aria-label="Frissítés"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center py-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {data?.partners?.slice(0, 10).map((partner, index) => (
              <div
                key={partner.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-5 h-5 flex items-center justify-center rounded text-xs font-medium',
                      index === 0 && 'bg-yellow-100 text-yellow-800',
                      index === 1 && 'bg-gray-100 text-gray-800',
                      index === 2 && 'bg-amber-100 text-amber-800',
                      index > 2 && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[120px]">{partner.name}</span>
                  {partner.giftEligible && (
                    <Gift
                      className="h-3.5 w-3.5 text-amber-500"
                      aria-label="Ajándékra jogosult"
                      title="Ajándékra jogosult"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(partner.totalRevenue)}
                  </span>
                  <TrendIndicator percent={partner.trendPercent} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
