/**
 * Equipment Profit Dashboard DTOs
 * Epic 40: Story 40-4 - Bérgép megtérülés dashboard widget
 *
 * Response DTOs for equipment profit dashboard endpoints.
 */

/**
 * Fleet-wide profit summary
 */
export interface FleetProfitSummaryData {
  /** Total revenue from all equipment rentals */
  totalRevenue: number;
  /** Total costs (purchase + service) */
  totalCosts: number;
  /** Total profit (revenue - costs) */
  totalProfit: number;
  /** Fleet-wide average ROI percentage */
  averageRoi: number;
  /** Total number of equipment in fleet */
  equipmentCount: number;
  /** Number of profitable equipment (profit > 0) */
  profitableCount: number;
  /** Number of equipment at loss (profit < 0) */
  losingCount: number;
}

export interface FleetProfitSummaryResponse {
  data: FleetProfitSummaryData;
}

/**
 * Top performing equipment item
 */
export interface TopEquipmentItem {
  /** Equipment ID */
  equipmentId: string;
  /** Equipment code */
  equipmentCode: string;
  /** Equipment name/model */
  name: string;
  /** Total profit for this equipment */
  profit: number;
  /** ROI percentage */
  roi: number;
  /** Total rental revenue */
  totalRevenue: number;
}

export interface TopEquipmentResponse {
  data: TopEquipmentItem[];
}

/**
 * Single equipment profit detail for dropdown selection
 */
export interface EquipmentProfitDetailData {
  equipmentId: string;
  equipmentCode: string;
  name: string;
  purchasePrice: number | null;
  totalRevenue: number;
  totalServiceCost: number;
  profit: number | null;
  roi: number | null;
  status: 'PROFITABLE' | 'LOSING' | 'BREAK_EVEN' | 'INCOMPLETE';
  rentalCount: number;
  lastRentalDate: string | null;
}

export interface EquipmentProfitDetailResponse {
  data: EquipmentProfitDetailData;
}
