import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { ExpandableWidgetWrapper } from '../components';

/**
 * Aging bucket label
 */
type AgingBucketLabel = '0-30' | '31-60' | '61-90' | '90+';

/**
 * Aging bucket data
 */
interface AgingBucket {
  label: AgingBucketLabel;
  count: number;
  totalAmount: number;
}

/**
 * Top debtor data
 */
interface TopDebtor {
  partnerId: string;
  partnerName: string;
  totalDebt: number;
  invoiceCount: number;
  oldestDueDate: string;
}

/**
 * Aging report response
 */
interface AgingReportData {
  generatedAt: string;
  totalReceivables: number;
  buckets: AgingBucket[];
  topDebtors: TopDebtor[];
}

interface AgingReportApiResponse {
  data: AgingReportData;
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
 * Get color class for bucket
 */
function getBucketColor(label: AgingBucketLabel): string {
  switch (label) {
    case '0-30':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case '31-60':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case '61-90':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case '90+':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get bucket display name in Hungarian
 */
function getBucketName(label: AgingBucketLabel): string {
  switch (label) {
    case '0-30':
      return '0-30 nap';
    case '31-60':
      return '31-60 nap';
    case '61-90':
      return '61-90 nap';
    case '90+':
      return '90+ nap';
    default:
      return label;
  }
}

/**
 * Calculate percentage of total
 */
function getPercentage(amount: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((amount / total) * 100);
}

/**
 * Compact aging view for dashboard widget
 */
function AgingCompactView({
  report,
  totalAmount,
}: {
  report: AgingReportData;
  totalAmount: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Kintlévőség Aging</h3>
        <span className="text-xs text-muted-foreground">
          {new Date(report.generatedAt).toLocaleString('hu-HU')}
        </span>
      </div>

      {/* Total Receivables */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-1">Összes kintlévőség</div>
        <div className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
      </div>

      {/* Aging Buckets */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {report.buckets.map(bucket => (
          <div
            key={bucket.label}
            className={`p-3 rounded-lg text-center ${getBucketColor(bucket.label)}`}
          >
            <div className="text-xs font-medium mb-1">{getBucketName(bucket.label)}</div>
            <div className="text-lg font-bold">{formatCurrency(bucket.totalAmount)}</div>
            <div className="text-xs opacity-80">
              {bucket.count} számla ({getPercentage(bucket.totalAmount, totalAmount)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar Visualization */}
      <div className="h-3 rounded-full overflow-hidden bg-muted mb-6 flex">
        {report.buckets.map(bucket => {
          const width = getPercentage(bucket.totalAmount, totalAmount);
          if (width === 0) return null;
          return (
            <div
              key={bucket.label}
              className={`h-full ${
                bucket.label === '0-30'
                  ? 'bg-green-500'
                  : bucket.label === '31-60'
                    ? 'bg-yellow-500'
                    : bucket.label === '61-90'
                      ? 'bg-orange-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${width}%` }}
              title={`${getBucketName(bucket.label)}: ${formatCurrency(bucket.totalAmount)}`}
            />
          );
        })}
      </div>

      {/* Top 3 Debtors (compact) */}
      {report.topDebtors.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top 3 Adós</h4>
          <div className="space-y-2">
            {report.topDebtors.slice(0, 3).map((debtor, index) => (
              <div
                key={debtor.partnerId}
                className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}.</span>
                  <span className="text-sm font-medium truncate max-w-32">
                    {debtor.partnerName}
                  </span>
                </div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(debtor.totalDebt)}
                </span>
              </div>
            ))}
          </div>
          {report.topDebtors.length > 3 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              +{report.topDebtors.length - 3} további adós
            </p>
          )}
        </>
      )}

      {report.topDebtors.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nincs kintlévőség</p>
      )}
    </div>
  );
}

/**
 * Expanded aging view with full details
 */
function AgingExpandedView({
  report,
  totalAmount,
}: {
  report: AgingReportData;
  totalAmount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">Összes kintlévőség</div>
          <div className="text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Frissítve: {new Date(report.generatedAt).toLocaleString('hu-HU')}
          </div>
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">Összesen</div>
          <div className="text-3xl font-bold">{report.topDebtors.length}</div>
          <div className="text-xs text-muted-foreground mt-1">partner tartozik</div>
        </div>
      </div>

      {/* Large Aging Buckets */}
      <div>
        <h4 className="text-lg font-semibold mb-4">Aging korosztály bontás</h4>
        <div className="grid grid-cols-4 gap-4">
          {report.buckets.map(bucket => (
            <div key={bucket.label} className={`p-4 rounded-lg ${getBucketColor(bucket.label)}`}>
              <div className="text-sm font-medium mb-2">{getBucketName(bucket.label)}</div>
              <div className="text-2xl font-bold">{formatCurrency(bucket.totalAmount)}</div>
              <div className="text-sm opacity-80 mt-1">{bucket.count} számla</div>
              <div className="text-sm font-medium mt-1">
                {getPercentage(bucket.totalAmount, totalAmount)}% az összesből
              </div>
            </div>
          ))}
        </div>

        {/* Large Progress Bar */}
        <div className="h-6 rounded-full overflow-hidden bg-muted mt-4 flex">
          {report.buckets.map(bucket => {
            const width = getPercentage(bucket.totalAmount, totalAmount);
            if (width === 0) return null;
            return (
              <div
                key={bucket.label}
                className={`h-full flex items-center justify-center text-xs font-medium text-white ${
                  bucket.label === '0-30'
                    ? 'bg-green-500'
                    : bucket.label === '31-60'
                      ? 'bg-yellow-500'
                      : bucket.label === '61-90'
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                }`}
                style={{ width: `${width}%` }}
              >
                {width > 10 && `${width}%`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Debtors Table */}
      <div>
        <h4 className="text-lg font-semibold mb-4">Összes Adós ({report.topDebtors.length})</h4>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Partner</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Tartozás</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Számlák</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Legrégebbi lejárat</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Késedelem</th>
              </tr>
            </thead>
            <tbody>
              {report.topDebtors.map((debtor, index) => {
                const daysOverdue = Math.floor(
                  (Date.now() - new Date(debtor.oldestDueDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <tr
                    key={debtor.partnerId}
                    className="border-t hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-bold text-muted-foreground">
                      {index + 1}.
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{debtor.partnerName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                      {formatCurrency(debtor.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{debtor.invoiceCount} db</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(debtor.oldestDueDate).toLocaleDateString('hu-HU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          daysOverdue > 90
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : daysOverdue > 60
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                              : daysOverdue > 30
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {daysOverdue} nap
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * ReceivablesAgingWidget
 *
 * Dashboard widget showing receivables aging report with 30/60/90/90+ day buckets.
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Features:
 * - Aging buckets visualization (0-30, 31-60, 61-90, 90+ days)
 * - Total receivables amount
 * - Top 5 debtors list
 * - Expandable view with full details
 */
export default function ReceivablesAgingWidget() {
  const {
    data: reportData,
    isLoading,
    error,
  } = useQuery<AgingReportApiResponse>({
    queryKey: ['dashboard-receivables', 'aging'],
    queryFn: () => api.get('/dashboard/receivables/aging'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-8 w-64 bg-muted rounded mb-6" />
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
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
  if (error || !reportData?.data) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">Kintlévőség Aging</h3>
        <p className="text-muted-foreground">Hiba az adatok betöltésekor.</p>
      </div>
    );
  }

  const report = reportData.data;
  const totalAmount = report.totalReceivables;

  return (
    <ExpandableWidgetWrapper
      title="Kintlévőség Aging Report"
      icon={<Clock className="h-5 w-5" />}
      expandedContent={<AgingExpandedView report={report} totalAmount={totalAmount} />}
    >
      <AgingCompactView report={report} totalAmount={totalAmount} />
    </ExpandableWidgetWrapper>
  );
}
