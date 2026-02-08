/**
 * Dashboard Status Utilities (Story 35-8)
 *
 * Functions for calculating widget status and business health.
 * Based on Dashboard Design System and ADR-053.
 */

export type WidgetStatus = 'healthy' | 'warning' | 'critical' | 'neutral';
export type BusinessHealthStatus = 'excellent' | 'good' | 'attention' | 'problem' | 'critical';

export interface StatusThresholds {
  /** Value at which status becomes warning (percentage) */
  warningAt: number;
  /** Value at which status becomes critical (percentage) */
  criticalAt: number;
  /** If true, lower values are better (e.g., receivables) */
  inverse?: boolean;
}

/**
 * Default thresholds for common KPI types
 */
export const DEFAULT_THRESHOLDS: Record<string, StatusThresholds> = {
  revenue: { warningAt: 80, criticalAt: 60, inverse: false },
  inventory: { warningAt: 70, criticalAt: 50, inverse: false },
  receivables: { warningAt: 80, criticalAt: 100, inverse: true },
  alerts: { warningAt: 3, criticalAt: 5, inverse: true },
};

/**
 * Calculate widget status based on value vs target
 *
 * @param value - Current value
 * @param target - Target value (100% achievement)
 * @param thresholds - Status thresholds configuration
 * @returns Widget status: healthy, warning, critical, or neutral
 *
 * @example
 * // Revenue at 85% of target -> healthy
 * calculateWidgetStatus(850000, 1000000, { warningAt: 80, criticalAt: 60 })
 *
 * // Receivables at 120% of acceptable -> critical
 * calculateWidgetStatus(120000, 100000, { warningAt: 80, criticalAt: 100, inverse: true })
 */
export function calculateWidgetStatus(
  value: number,
  target: number,
  thresholds: StatusThresholds
): WidgetStatus {
  if (target === 0) return 'neutral';

  const percentage = (value / target) * 100;

  if (thresholds.inverse) {
    // Lower is better (e.g., receivables, alerts)
    if (percentage >= thresholds.criticalAt) return 'critical';
    if (percentage >= thresholds.warningAt) return 'warning';
    return 'healthy';
  } else {
    // Higher is better (e.g., revenue, inventory)
    if (percentage <= thresholds.criticalAt) return 'critical';
    if (percentage <= thresholds.warningAt) return 'warning';
    return 'healthy';
  }
}

/**
 * Calculate overall business health based on KPI statuses
 *
 * Rules:
 * - excellent (☀️): All KPIs green
 * - good (🌤️): Max 1 yellow KPI
 * - attention (⛅): 2+ yellow OR 1 red
 * - problem (🌧️): 2+ red KPIs
 * - critical (⛈️): 3+ red OR critical alert
 *
 * @param kpiStatuses - Array of widget statuses
 * @param hasCriticalAlert - Whether there's a critical alert
 * @returns Business health status
 */
export function calculateBusinessHealth(
  kpiStatuses: WidgetStatus[],
  hasCriticalAlert: boolean = false
): BusinessHealthStatus {
  const criticalCount = kpiStatuses.filter(s => s === 'critical').length;
  const warningCount = kpiStatuses.filter(s => s === 'warning').length;

  if (hasCriticalAlert || criticalCount >= 3) return 'critical';
  if (criticalCount >= 2) return 'problem';
  if (criticalCount >= 1 || warningCount >= 2) return 'attention';
  if (warningCount >= 1) return 'good';
  return 'excellent';
}

/**
 * Health status to icon mapping
 */
export const HEALTH_ICONS: Record<BusinessHealthStatus, { emoji: string; label: string }> = {
  excellent: { emoji: '☀️', label: 'Kiváló' },
  good: { emoji: '🌤️', label: 'Jó' },
  attention: { emoji: '⛅', label: 'Figyelj' },
  problem: { emoji: '🌧️', label: 'Problémás' },
  critical: { emoji: '⛈️', label: 'Kritikus' },
};

/**
 * Get health icon and label for a status
 */
export function getHealthIcon(health: BusinessHealthStatus): { emoji: string; label: string } {
  return HEALTH_ICONS[health];
}

/**
 * Status color mapping for CSS classes
 */
export const STATUS_COLORS: Record<WidgetStatus, { border: string; bg: string; text: string }> = {
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
 * Get CSS classes for a widget status
 */
export function getStatusColors(status: WidgetStatus): {
  border: string;
  bg: string;
  text: string;
} {
  return STATUS_COLORS[status];
}
