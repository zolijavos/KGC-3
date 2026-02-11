/**
 * RentalStatsWidget
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Displays average rental days with trend indicator and key metrics:
 * - Average rental days with delta percentage
 * - Total rentals count
 * - Active rentals
 * - Overdue rentals (highlighted if > 0)
 */

import { AlertTriangle, CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { useRentalStats } from '../hooks/useRentalDashboard';

/**
 * Format delta as percentage with sign
 */
function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

/**
 * Get color class based on delta value
 */
function getDeltaColor(delta: number): string {
  if (delta > 0) return 'text-green-600 dark:text-green-400';
  if (delta < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500';
}

/**
 * RentalStatsWidget Component
 */
export function RentalStatsWidget() {
  const { data, isLoading, error } = useRentalStats();

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        data-testid="rental-stats-loading"
        aria-label="Bérlési statisztika betöltése..."
      >
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-16 w-32 bg-muted rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-6"
        data-testid="rental-stats-error"
        role="alert"
      >
        <h3 className="font-semibold text-destructive">Hiba történt</h3>
        <p className="text-sm text-muted-foreground">
          Nem sikerült betölteni a bérlési statisztikát.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-card p-6 shadow-sm"
      data-testid="rental-stats-widget"
      aria-label="Bérlési statisztika"
    >
      {/* Header with title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          Bérlési Statisztika
        </h3>
      </div>

      {/* Main KPI: Average Rental Days */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold" data-testid="average-rental-days">
            {data.averageRentalDays.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">nap / bérlés</span>
        </div>
        <div
          className={`flex items-center gap-1 mt-1 text-sm ${getDeltaColor(data.averageRentalDaysDelta)}`}
          data-testid="rental-delta"
        >
          <TrendingUp className="h-4 w-4" />
          <span>{formatDelta(data.averageRentalDaysDelta)}</span>
          <span className="text-muted-foreground">előző időszakhoz képest</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Rentals */}
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <CalendarDays className="h-3 w-3" />
            Összes bérlés
          </div>
          <div className="text-2xl font-bold" data-testid="total-rentals">
            {data.totalRentals}
          </div>
        </div>

        {/* Active Rentals */}
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Aktív
          </div>
          <div
            className="text-2xl font-bold text-blue-600 dark:text-blue-400"
            data-testid="active-rentals"
          >
            {data.activeRentals}
          </div>
        </div>

        {/* Overdue Rentals */}
        <div
          className={`text-center p-3 rounded-lg ${
            data.overdueRentals > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-muted/50'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="h-3 w-3" />
            Lejárt
          </div>
          <div
            className={`text-2xl font-bold ${
              data.overdueRentals > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
            }`}
            data-testid="overdue-rentals"
          >
            {data.overdueRentals}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RentalStatsWidget;
