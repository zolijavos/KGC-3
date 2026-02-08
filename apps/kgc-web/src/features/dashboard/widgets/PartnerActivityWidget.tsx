import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { Activity, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExpandableWidgetWrapper } from '../components';

interface ActivityItem {
  date: string;
  rentals: number;
  sales: number;
  services: number;
  total: number;
}

interface PartnerActivityData {
  activities: ActivityItem[];
  totalTransactions: number;
  previousTotalTransactions: number;
  deltaPercent: number;
  periodDays: number;
}

interface PartnerActivityApiResponse {
  data: PartnerActivityData;
}

/**
 * PartnerActivityWidget (Story 35-6)
 *
 * Shows partner transaction activity over time with chart
 * Expandable: Shows larger chart with more details
 */
export default function PartnerActivityWidget() {
  const {
    data: apiData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PartnerActivityApiResponse>({
    queryKey: ['dashboard-partner', 'activity'],
    queryFn: () => api.get('/dashboard/partner/activity?days=14'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const data = apiData?.data;
  const trend =
    (data?.deltaPercent ?? 0) > 0 ? 'up' : (data?.deltaPercent ?? 0) < 0 ? 'down' : 'neutral';

  // Format date for chart
  const chartData =
    data?.activities?.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    })) ?? [];

  const compactContent = (
    <Card className="partner-activity-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Partner aktivitás
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
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-[160px] bg-muted rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold">{data?.totalTransactions ?? 0}</span>
              <span className="text-sm text-muted-foreground">tranzakció</span>
              <span
                className={cn(
                  'flex items-center text-sm font-medium ml-2',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-gray-500'
                )}
              >
                {trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                {trend === 'neutral' && <Minus className="h-4 w-4 mr-1" />}
                {data?.deltaPercent !== undefined
                  ? `${data.deltaPercent > 0 ? '+' : ''}${data.deltaPercent.toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} labelStyle={{ fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                  <Bar
                    dataKey="rentals"
                    name="Bérlés"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="sales"
                    name="Eladás"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="services"
                    name="Szerviz"
                    stackId="a"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">Összes tranzakció</div>
          <div className="text-2xl font-bold">{data?.totalTransactions ?? 0}</div>
          <div
            className={cn(
              'flex items-center text-sm font-medium mt-1',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-gray-500'
            )}
          >
            {trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
            {trend === 'neutral' && <Minus className="h-4 w-4 mr-1" />}
            {data?.deltaPercent !== undefined
              ? `${data.deltaPercent > 0 ? '+' : ''}${data.deltaPercent.toFixed(1)}%`
              : '0%'}{' '}
            vs előző időszak
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground">Bérlések</div>
          <div className="text-2xl font-bold text-blue-600">
            {chartData.reduce((sum, d) => sum + d.rentals, 0)}
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground">Eladások</div>
          <div className="text-2xl font-bold text-green-600">
            {chartData.reduce((sum, d) => sum + d.sales, 0)}
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-sm text-muted-foreground">Szerviz</div>
          <div className="text-2xl font-bold text-amber-600">
            {chartData.reduce((sum, d) => sum + d.services, 0)}
          </div>
        </div>
      </div>

      {/* Large chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ fontSize: 14 }}
              labelStyle={{ fontWeight: 'bold' }}
              formatter={(value: number, name: string) => [value, name]}
              labelFormatter={label => {
                const item = chartData.find(d => d.date === label);
                return item?.fullDate ?? label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 14 }} />
            <Bar dataKey="rentals" name="Bérlés" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="sales" name="Eladás" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar
              dataKey="services"
              name="Szerviz"
              stackId="a"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Dátum</th>
              <th className="text-right p-3 font-medium">Bérlés</th>
              <th className="text-right p-3 font-medium">Eladás</th>
              <th className="text-right p-3 font-medium">Szerviz</th>
              <th className="text-right p-3 font-medium">Összesen</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                <td className="p-3">{row.fullDate}</td>
                <td className="p-3 text-right text-blue-600">{row.rentals}</td>
                <td className="p-3 text-right text-green-600">{row.sales}</td>
                <td className="p-3 text-right text-amber-600">{row.services}</td>
                <td className="p-3 text-right font-medium">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ExpandableWidgetWrapper
      title="Partner Aktivitás"
      icon={<Activity className="h-5 w-5" />}
      expandedContent={expandedContent}
    >
      {compactContent}
    </ExpandableWidgetWrapper>
  );
}
