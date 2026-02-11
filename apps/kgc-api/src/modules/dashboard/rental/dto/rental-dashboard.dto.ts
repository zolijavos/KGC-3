/**
 * Rental Dashboard DTOs
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Response types for rental dashboard endpoints:
 * - /stats - Average rental days and metrics
 * - /popular - Top equipment by rental count
 * - /seasonality - Monthly trend data
 */

/**
 * Rental Stats Response
 * GET /api/v1/dashboard/rental/stats
 */
export interface RentalStatsData {
  averageRentalDays: number;
  averageRentalDaysDelta: number; // Change vs previous period (percentage)
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
}

export interface RentalStatsResponse {
  data: RentalStatsData;
}

/**
 * Popular Equipment Item
 */
export interface PopularEquipmentItem {
  id: string;
  name: string;
  rentalCount: number;
  revenue: number;
}

/**
 * Popular Equipment Response
 * GET /api/v1/dashboard/rental/popular
 */
export interface PopularEquipmentResponse {
  data: {
    equipment: PopularEquipmentItem[];
  };
}

/**
 * Monthly Seasonality Data Point
 */
export interface SeasonalityDataPoint {
  month: string; // Format: "2026-01"
  rentalCount: number;
  revenue: number;
}

/**
 * Seasonality Response
 * GET /api/v1/dashboard/rental/seasonality
 */
export interface SeasonalityResponse {
  data: SeasonalityDataPoint[];
}
