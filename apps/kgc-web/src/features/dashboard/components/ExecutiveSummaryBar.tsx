import { cn } from '@kgc/ui';

export type WidgetStatus = 'healthy' | 'warning' | 'critical' | 'neutral';

export type BusinessHealthStatus = 'excellent' | 'good' | 'attention' | 'problem' | 'critical';

export interface KpiSummaryData {
  id: string;
  label: string;
  value: string;
  trend?: string;
  subtext?: string;
  icon: string;
  status: WidgetStatus;
}

export interface ExecutiveSummaryBarProps {
  kpiData: KpiSummaryData[];
  className?: string;
}

/**
 * Status color mapping for KPI cards
 * Based on Dashboard Design System (ADR-053)
 */
/** Performance: Pre-defined array to avoid inline creation during render */
const SKELETON_ITEMS = [0, 1, 2, 3, 4] as const;

const STATUS_CLASSES: Record<WidgetStatus, { border: string; bg: string; text: string }> = {
  healthy: {
    border: 'border-status-healthy',
    bg: 'bg-status-healthy-bg',
    text: 'text-status-healthy',
  },
  warning: {
    border: 'border-status-warning',
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning',
  },
  critical: {
    border: 'border-status-critical',
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
  },
  neutral: {
    border: 'border-status-neutral',
    bg: 'bg-status-neutral-bg',
    text: 'text-status-neutral',
  },
};

/**
 * Individual KPI Summary Card component
 */
function KpiSummaryCard({ data }: { data: KpiSummaryData }) {
  const statusClasses = STATUS_CLASSES[data.status];
  const isCritical = data.status === 'critical';

  return (
    <div
      data-testid={`kpi-card-${data.id}`}
      className={cn(
        'flex flex-col items-center justify-center',
        'flex-1 px-5 py-4 min-w-[160px]',
        'rounded-xl border-[6px]',
        'elevation-1',
        'transition-all duration-200',
        'hover:elevation-2 hover:scale-[1.02]',
        statusClasses.border,
        statusClasses.bg,
        isCritical && 'animate-pulse-critical'
      )}
    >
      {/* Icon */}
      <span className="text-2xl mb-1" aria-hidden="true">
        {data.icon}
      </span>

      {/* Label */}
      <span className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
        {data.label}
      </span>

      {/* Value */}
      <span className={cn('text-xl font-bold', statusClasses.text)}>{data.value}</span>

      {/* Trend with arrow indicator */}
      {data.trend && (
        <span className={cn('text-sm font-semibold flex items-center gap-1', statusClasses.text)}>
          {data.trend.startsWith('+') && <span>↑</span>}
          {data.trend.startsWith('-') && <span>↓</span>}
          {data.trend}
        </span>
      )}
      {data.subtext && <span className="text-xs text-muted-foreground mt-0.5">{data.subtext}</span>}
    </div>
  );
}

/**
 * Business Health Indicator - First KPI showing overall health
 */
function BusinessHealthIndicator({ data }: { data: KpiSummaryData }) {
  const statusClasses = STATUS_CLASSES[data.status];
  const isCritical = data.status === 'critical';
  const isHealthy = data.status === 'healthy';

  return (
    <div
      data-testid="business-health-indicator"
      className={cn(
        'flex flex-col items-center justify-center',
        'flex-1 px-6 py-4 min-w-[160px]',
        'rounded-xl border-[6px]',
        'relative overflow-hidden',
        'elevation-2',
        statusClasses.border,
        statusClasses.bg,
        isCritical && 'animate-pulse-critical'
      )}
    >
      {/* Decorative background glow */}
      <div
        className={cn(
          'absolute inset-0 opacity-20',
          isHealthy && 'bg-gradient-radial from-green-400/30 to-transparent',
          data.status === 'warning' && 'bg-gradient-radial from-yellow-400/30 to-transparent',
          isCritical && 'bg-gradient-radial from-red-400/30 to-transparent'
        )}
      />

      {/* Health Icon */}
      <span className="text-3xl mb-2 relative z-10" aria-hidden="true">
        {data.icon}
      </span>

      {/* Label */}
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider relative z-10">
        {data.label}
      </span>

      {/* Status Text */}
      <span className={cn('text-2xl font-bold relative z-10', statusClasses.text)}>
        {data.value}
      </span>
    </div>
  );
}

/**
 * Executive Summary Bar Component (Story 35-8)
 *
 * Pinned summary bar showing 5 key KPIs with status coloring.
 * Always visible at the top of the dashboard, non-collapsible.
 *
 * @see ADR-053 Dashboard Hibrid Layout
 * @see dashboard-design-system.md for color specifications
 */
export function ExecutiveSummaryBar({ kpiData, className }: ExecutiveSummaryBarProps) {
  // Loading state when no data
  if (kpiData.length === 0) {
    return (
      <div
        data-testid="executive-summary-loading"
        className={cn(
          'sticky top-0 z-10',
          'p-4 rounded-xl',
          'bg-card border-2 border-primary',
          'animate-pulse',
          className
        )}
      >
        <div className="flex items-center justify-center gap-4">
          {SKELETON_ITEMS.map(i => (
            <div key={i} className="h-20 w-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Separate health KPI from other KPIs
  const healthKpi = kpiData.find(kpi => kpi.id === 'health');
  const otherKpis = kpiData.filter(kpi => kpi.id !== 'health');

  return (
    <div
      data-testid="executive-summary-bar"
      role="region"
      aria-label="Executive Summary - Fő mutatók"
      className={cn(
        'sticky top-0 z-10',
        'p-5',
        'section-theme-executive',
        'backdrop-blur-sm',
        className
      )}
    >
      {/* Header with Pin Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Executive Summary
          </h2>
        </div>
        <span
          data-testid="pin-indicator"
          className="text-primary text-lg"
          title="Mindig látható - nem összecsukható"
          aria-label="Rögzített szekció"
        >
          📌
        </span>
      </div>

      {/* KPI Cards Container */}
      <div data-testid="kpi-container" className="flex items-stretch justify-evenly gap-4">
        {/* Business Health Indicator (first position) */}
        {healthKpi && <BusinessHealthIndicator data={healthKpi} />}

        {/* Other KPI Cards */}
        {otherKpis.map(kpi => (
          <KpiSummaryCard key={kpi.id} data={kpi} />
        ))}
      </div>
    </div>
  );
}
