import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, UserPlus, Users } from 'lucide-react';

interface CategoryItem {
  category: 'RETAIL' | 'B2B' | 'VIP';
  count: number;
  color: string;
}

interface PartnerOverviewData {
  totalActive: number;
  newPartners: number;
  byCategory: CategoryItem[];
  periodStart: string;
  periodEnd: string;
}

interface PartnerOverviewApiResponse {
  data: PartnerOverviewData;
}

const CATEGORY_LABELS: Record<string, string> = {
  RETAIL: 'Lakossági',
  B2B: 'Céges',
  VIP: 'Kiemelt',
};

const CATEGORY_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  amber: 'bg-amber-100 text-amber-800',
};

/**
 * PartnerOverviewWidget (Story 35-6)
 *
 * Displays partner summary by category with new partner count
 */
export default function PartnerOverviewWidget() {
  const {
    data: apiData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PartnerOverviewApiResponse>({
    queryKey: ['dashboard-partner', 'overview'],
    queryFn: () => api.get('/dashboard/partner/overview'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;

  return (
    <Card className="partner-overview-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Partner összesítés
        </CardTitle>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          disabled={isFetching}
          aria-label="Frissítés"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-muted rounded w-16" />
            <div className="flex gap-2">
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-20" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{data?.totalActive ?? 0}</span>
              <span className="flex items-center text-sm text-green-600">
                <UserPlus className="h-3 w-3 mr-1" />+{data?.newPartners ?? 0} (30 nap)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">aktív partner</p>
            <div className="flex flex-wrap gap-2">
              {data?.byCategory?.map(item => (
                <span
                  key={item.category}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                    CATEGORY_COLORS[item.color] ?? 'bg-gray-100 text-gray-800'
                  )}
                >
                  {CATEGORY_LABELS[item.category] ?? item.category}: {item.count}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
