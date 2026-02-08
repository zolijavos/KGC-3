import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, WidgetError } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { Gift, Minus, RefreshCw, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ExpandableWidgetWrapper } from '../components';

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

const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(value);
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

/** Compact partner row for widget view */
const PartnerRowCompact = ({ partner, index }: { partner: TopPartnerItem; index: number }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0">
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
      <span className="text-sm font-medium">{formatCurrency(partner.totalRevenue)}</span>
      <TrendIndicator percent={partner.trendPercent} />
    </div>
  </div>
);

/** Expanded partner row with full details */
const PartnerRowExpanded = ({ partner, index }: { partner: TopPartnerItem; index: number }) => (
  <div
    className={cn(
      'grid grid-cols-7 gap-4 py-3 px-4 items-center',
      'border-b border-slate-200 dark:border-slate-700 last:border-0',
      'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
    )}
  >
    {/* Rank */}
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold',
          index === 0 && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
          index === 1 && 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          index === 2 && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
          index > 2 && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        )}
      >
        {index + 1}
      </span>
    </div>

    {/* Name + Gift */}
    <div className="col-span-2 flex items-center gap-2">
      <span className="font-semibold text-slate-800 dark:text-slate-100">{partner.name}</span>
      {partner.giftEligible && (
        <Gift className="h-4 w-4 text-amber-500" title="Ajándékra jogosult" />
      )}
    </div>

    {/* Total Revenue */}
    <div className="text-right">
      <div className="font-bold text-slate-900 dark:text-white">
        {formatCurrencyFull(partner.totalRevenue)}
      </div>
      <TrendIndicator percent={partner.trendPercent} />
    </div>

    {/* Breakdown - Enhanced visibility */}
    <div className="text-right text-sm">
      <div className="text-blue-700 dark:text-blue-400 font-medium">
        Bérlés: {formatCurrency(partner.rentalRevenue)}
      </div>
    </div>
    <div className="text-right text-sm">
      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
        Eladás: {formatCurrency(partner.salesRevenue)}
      </div>
    </div>
    <div className="text-right text-sm">
      <div className="text-orange-700 dark:text-orange-400 font-medium">
        Szerviz: {formatCurrency(partner.serviceRevenue)}
      </div>
    </div>
  </div>
);

/**
 * TopPartnersWidget (Story 35-6 + Story 41-3)
 *
 * Shows top 10 partners by revenue with trend indicators
 * Story 41-3: Added gift eligibility badge
 * Expandable: Shows full details in modal
 */
export default function TopPartnersWidget() {
  const [period, setPeriod] = useState<Period>('month');

  const {
    data: apiData,
    isLoading,
    error,
    isError,
    refetch,
    isFetching,
  } = useQuery<TopPartnersApiResponse>({
    queryKey: ['dashboard-partner', 'top', period],
    queryFn: () => api.get(`/dashboard/partner/top?period=${period}`),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  // Error state handling
  if (isError) {
    return <WidgetError error={error} onRetry={() => refetch()} />;
  }

  const compactContent = (
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
          <div className="space-y-1">
            {data?.partners?.slice(0, 5).map((partner, index) => (
              <PartnerRowCompact key={partner.id} partner={partner} index={index} />
            ))}
            {(data?.partners?.length ?? 0) > 5 && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                +{(data?.partners?.length ?? 0) - 5} további partner
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const expandedContent = (
    <div className="space-y-4">
      {/* Period selector in expanded view */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Időszak: {data?.periodStart} - {data?.periodEnd}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
            disabled={isFetching}
            aria-label="Frissítés"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-7 gap-4 py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-t-lg text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
        <div>#</div>
        <div className="col-span-2">Partner</div>
        <div className="text-right">Össz. bevétel</div>
        <div className="text-right text-blue-700 dark:text-blue-400">Bérlés</div>
        <div className="text-right text-emerald-700 dark:text-emerald-400">Eladás</div>
        <div className="text-right text-orange-700 dark:text-orange-400">Szerviz</div>
      </div>

      {/* Partner rows */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-b-lg bg-white dark:bg-slate-900">
        {data?.partners?.map((partner, index) => (
          <PartnerRowExpanded key={partner.id} partner={partner} index={index} />
        ))}
      </div>
    </div>
  );

  return (
    <ExpandableWidgetWrapper
      title="Top Partnerek"
      icon={<Trophy className="h-5 w-5" />}
      expandedContent={expandedContent}
    >
      {compactContent}
    </ExpandableWidgetWrapper>
  );
}
