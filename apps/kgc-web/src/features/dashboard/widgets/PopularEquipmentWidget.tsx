/**
 * PopularEquipmentWidget
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Displays top 5 most rented equipment with rental count and revenue:
 * - Equipment name
 * - Rental count
 * - Total revenue generated
 */

import { Package, Trophy } from 'lucide-react';
import { usePopularEquipment } from '../hooks/useRentalDashboard';

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
 * Get medal color for top 3 positions
 */
function getMedalColor(position: number): string {
  switch (position) {
    case 1:
      return 'text-yellow-500'; // Gold
    case 2:
      return 'text-gray-400'; // Silver
    case 3:
      return 'text-amber-600'; // Bronze
    default:
      return 'text-muted-foreground';
  }
}

/**
 * PopularEquipmentWidget Component
 */
export function PopularEquipmentWidget() {
  const { data: equipment, isLoading, error } = usePopularEquipment(5);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        data-testid="popular-equipment-loading"
        aria-label="Népszerű gépek betöltése..."
      >
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !equipment) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-6"
        data-testid="popular-equipment-error"
        role="alert"
      >
        <h3 className="font-semibold text-destructive">Hiba történt</h3>
        <p className="text-sm text-muted-foreground">Nem sikerült betölteni a népszerű gépeket.</p>
      </div>
    );
  }

  // Empty state
  if (equipment.length === 0) {
    return (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        data-testid="popular-equipment-empty"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Népszerű Gépek
        </h3>
        <p className="text-muted-foreground text-center py-4">Még nincs elegendő bérlési adat.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-card p-6 shadow-sm"
      data-testid="popular-equipment-widget"
      aria-label="Népszerű gépek"
    >
      {/* Header */}
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Top 5 Népszerű Gép
      </h3>

      {/* Equipment List */}
      <div className="space-y-2">
        {equipment.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
            data-testid={`equipment-item-${index + 1}`}
          >
            <div className="flex items-center gap-3">
              {/* Position indicator */}
              <span className={`text-lg font-bold w-6 ${getMedalColor(index + 1)}`}>
                {index + 1}.
              </span>

              {/* Equipment info */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-48">{item.name}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="text-right">
              <div className="text-sm font-semibold" data-testid={`rental-count-${index + 1}`}>
                {item.rentalCount} bérlés
              </div>
              <div className="text-xs text-muted-foreground" data-testid={`revenue-${index + 1}`}>
                {formatCurrency(item.revenue)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Top 5 összesen</span>
          <span className="font-semibold">
            {formatCurrency(equipment.reduce((sum, item) => sum + item.revenue, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PopularEquipmentWidget;
