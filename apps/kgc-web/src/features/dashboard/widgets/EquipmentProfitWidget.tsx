import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Fleet profit summary response
 */
interface FleetProfitSummaryData {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  averageRoi: number;
  equipmentCount: number;
  profitableCount: number;
  losingCount: number;
}

interface FleetSummaryApiResponse {
  data: FleetProfitSummaryData;
}

/**
 * Top equipment item
 */
interface TopEquipmentItem {
  equipmentId: string;
  equipmentCode: string;
  name: string;
  profit: number;
  roi: number;
  totalRevenue: number;
}

interface TopEquipmentApiResponse {
  data: TopEquipmentItem[];
}

/**
 * Format currency in HUF
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * EquipmentProfitWidget
 *
 * Dashboard widget showing fleet-wide profitability summary and top performers.
 * Epic 40: Story 40-4 - Bérgép megtérülés dashboard widget
 *
 * Features:
 * - Fleet-wide totals (revenue, costs, profit)
 * - Top 5 most profitable equipment
 * - Average ROI indicator
 */
export default function EquipmentProfitWidget() {
  // Fetch fleet summary
  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery<FleetSummaryApiResponse>({
    queryKey: ['dashboard-equipment-profit', 'summary'],
    queryFn: () => api.get('/dashboard/equipment-profit/summary'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Fetch top equipment
  const {
    data: topData,
    isLoading: topLoading,
    error: topError,
  } = useQuery<TopEquipmentApiResponse>({
    queryKey: ['dashboard-equipment-profit', 'top'],
    queryFn: () => api.get('/dashboard/equipment-profit/top?limit=5'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const isLoading = summaryLoading || topLoading;
  const hasError = summaryError || topError;

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError || !summaryData?.data) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Bérgép Megtérülés</h3>
        <p className="text-muted-foreground">Hiba az adatok betöltésekor.</p>
      </div>
    );
  }

  const summary = summaryData.data;
  const topEquipment = topData?.data ?? [];

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Bérgép Megtérülés</h3>
        <span
          className={`text-sm font-medium px-2 py-1 rounded ${
            summary.averageRoi >= 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}
        >
          Átl. ROI: {formatPercent(summary.averageRoi)}
        </span>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Összes bevétel</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Összes költség</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary.totalCosts)}
          </div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Összes profit</div>
          <div
            className={`text-lg font-bold ${
              summary.totalProfit >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(summary.totalProfit)}
          </div>
        </div>
      </div>

      {/* Equipment Stats */}
      <div className="flex justify-between text-sm text-muted-foreground mb-4 px-1">
        <span>Összes gép: {summary.equipmentCount}</span>
        <span className="text-green-600">Nyereséges: {summary.profitableCount}</span>
        <span className="text-red-600">Veszteséges: {summary.losingCount}</span>
      </div>

      {/* Top 5 Equipment */}
      {topEquipment.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top 5 Legjövedelmezőbb</h4>
          <div className="space-y-2">
            {topEquipment.map((eq, index) => (
              <div
                key={eq.equipmentId}
                className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}.</span>
                  <div>
                    <div className="text-sm font-medium truncate max-w-48">{eq.name}</div>
                    <div className="text-xs text-muted-foreground">{eq.equipmentCode}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(eq.profit)}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatPercent(eq.roi)} ROI</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
