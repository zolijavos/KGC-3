import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Technician profit summary response
 * Story 46-4: Szerviz profit widget bekötés
 */
interface TechnicianProfitSummary {
  technicianId: string;
  technicianName: string;
  worksheetCount: number;
  totalRevenue: number;
  partsCost: number;
  laborRevenue: number;
  profit: number;
  profitMargin: number;
}

interface ServiceProfitSummaryData {
  totalRevenue: number;
  totalPartsCost: number;
  totalLaborRevenue: number;
  totalProfit: number;
  averageProfitMargin: number;
  worksheetCount: number;
  technicians: TechnicianProfitSummary[];
}

interface ServiceProfitApiResponse {
  data: ServiceProfitSummaryData;
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
 * ServiceProfitWidget
 *
 * Dashboard widget showing service/workshop profitability metrics.
 * Story 46-4: Szerviz profit widget bekötés
 * Connects to Epic 38: Szerviz Profitabilitás KPI backend
 *
 * Features:
 * - Total service revenue and profit
 * - Parts vs labor breakdown
 * - Top 5 technicians by profit
 * - Profit margin indicators
 */
export default function ServiceProfitWidget() {
  // Fetch service profit summary
  const {
    data: profitData,
    isLoading,
    error,
  } = useQuery<ServiceProfitApiResponse>({
    queryKey: ['dashboard-service-profit', 'summary'],
    queryFn: () => api.get('/dashboard/service/profit'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

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
  if (error || !profitData?.data) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Szerviz Profitabilitás</h3>
        <p className="text-muted-foreground">Hiba az adatok betöltésekor.</p>
      </div>
    );
  }

  const summary = profitData.data;
  // Top 5 technicians by profit
  const topTechnicians = summary.technicians.sort((a, b) => b.profit - a.profit).slice(0, 5);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Szerviz Profitabilitás</h3>
        <span
          className={`text-sm font-medium px-2 py-1 rounded ${
            summary.averageProfitMargin >= 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}
        >
          Átl. árrés: {formatPercent(summary.averageProfitMargin)}
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
          <div className="text-xs text-muted-foreground mb-1">Alkatrész költség</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary.totalPartsCost)}
          </div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Nettó profit</div>
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

      {/* Secondary stats */}
      <div className="flex justify-between text-sm text-muted-foreground mb-4 px-1">
        <span>Munkalapok: {summary.worksheetCount}</span>
        <span className="text-blue-600">Munkadíj: {formatCurrency(summary.totalLaborRevenue)}</span>
      </div>

      {/* Top 5 Technicians */}
      {topTechnicians.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top 5 Szerelő (Profit)</h4>
          <div className="space-y-2">
            {topTechnicians.map((tech, index) => (
              <div
                key={tech.technicianId}
                className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}.</span>
                  <div>
                    <div className="text-sm font-medium truncate max-w-48">
                      {tech.technicianName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tech.worksheetCount} munkalap
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-semibold ${
                      tech.profit >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(tech.profit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercent(tech.profitMargin)} árrés
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {topTechnicians.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nincs szerelő profit adat ebben az időszakban.
        </div>
      )}
    </div>
  );
}
