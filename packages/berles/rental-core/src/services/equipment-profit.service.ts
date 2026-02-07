/**
 * @kgc/rental-core - Equipment Profit Service
 * Epic 40: Story 40-2 - Bérgép megtérülés kalkuláció
 *
 * Service for calculating equipment profitability (megtérülés).
 * ADR-051: Bérgép Megtérülés Kalkuláció
 *
 * KÉPLET:
 * PROFIT = Σ(Rental.totalAmount) - purchasePrice - Σ(Worksheet.totalCost WHERE !isWarranty)
 * ROI % = (PROFIT / purchasePrice) × 100
 *
 * ÜZLETI SZABÁLY (Meeting 02-04):
 * - A vételár KÖTELEZŐ a megtérülés számításhoz
 * - A garanciális munkalapok NEM számítanak ráfordításnak
 * - ROI = (profit / vételár) × 100, 2 tizedesre kerekítve
 */

/**
 * Profit status enum
 */
export enum EquipmentProfitStatus {
  /** Equipment is profitable (profit > 0) */
  PROFITABLE = 'PROFITABLE',
  /** Equipment is losing money (profit < 0) */
  LOSING = 'LOSING',
  /** Equipment is at break-even (profit = 0) */
  BREAK_EVEN = 'BREAK_EVEN',
  /** Missing required data for calculation */
  INCOMPLETE = 'INCOMPLETE',
}

/**
 * Equipment profit data from repository
 */
export interface EquipmentProfitData {
  /** Equipment unique ID */
  equipmentId: string;
  /** Purchase price (vételár) - null if not set */
  purchasePrice: number | null;
  /** Total rental revenue (összes bérleti bevétel) */
  totalRentalRevenue: number;
  /** Total service cost (összes szerviz ráfordítás - non-warranty only) */
  totalServiceCost: number;
}

/**
 * Equipment profit calculation result
 */
export interface EquipmentProfitResult {
  /** Equipment unique ID */
  equipmentId: string;
  /** Purchase price (vételár) */
  purchasePrice: number | null;
  /** Total rental revenue */
  totalRentalRevenue: number;
  /** Total service cost (non-warranty) */
  totalServiceCost: number;
  /** Calculated profit (null if INCOMPLETE) */
  profit: number | null;
  /** Return on Investment % (null if INCOMPLETE) */
  roi: number | null;
  /** Profit status */
  status: EquipmentProfitStatus;
  /** Error message if INCOMPLETE */
  error?: string;
}

/**
 * Repository interface for equipment profit data
 */
export interface IEquipmentProfitRepository {
  /**
   * Get profit calculation data for an equipment
   * @param equipmentId Equipment unique ID
   * @param tenantId Optional tenant ID for multi-tenancy (ADR-001)
   * @returns Equipment profit data or null if not found
   */
  getEquipmentProfitData(
    equipmentId: string,
    tenantId?: string
  ): Promise<EquipmentProfitData | null>;
}

/**
 * Equipment Profit Service
 *
 * Calculates profitability (megtérülés) for rental equipment.
 * Uses TDD-developed logic per Story 40-2.
 */
export class EquipmentProfitService {
  constructor(private readonly repository: IEquipmentProfitRepository) {}

  /**
   * Calculate profit for an equipment
   *
   * KÉPLET:
   * PROFIT = totalRentalRevenue - purchasePrice - totalServiceCost
   * ROI = (PROFIT / purchasePrice) × 100
   *
   * @param equipmentId Equipment unique ID
   * @param tenantId Optional tenant ID for multi-tenancy (ADR-001)
   * @returns Profit calculation result
   */
  async calculateProfit(equipmentId: string, tenantId?: string): Promise<EquipmentProfitResult> {
    // Input validation
    if (!equipmentId || equipmentId.trim() === '') {
      return this.createIncompleteResult(equipmentId, 'Equipment ID szükséges');
    }

    // Fetch data from repository
    const data = await this.repository.getEquipmentProfitData(equipmentId, tenantId);

    // Handle non-existent equipment
    if (!data) {
      return this.createIncompleteResult(equipmentId, 'Bérgép nem található');
    }

    // Validate purchase price (required for profit calculation)
    // M1 fix: Also check for negative values (invalid business data)
    if (data.purchasePrice === null || data.purchasePrice <= 0) {
      return {
        equipmentId: data.equipmentId,
        purchasePrice: data.purchasePrice,
        totalRentalRevenue: data.totalRentalRevenue,
        totalServiceCost: data.totalServiceCost,
        profit: null,
        roi: null,
        status: EquipmentProfitStatus.INCOMPLETE,
        error:
          data.purchasePrice !== null && data.purchasePrice < 0
            ? 'Vételár nem lehet negatív'
            : 'Vételár szükséges a megtérülés számításhoz',
      };
    }

    // Calculate profit with floating point precision
    // PROFIT = totalRentalRevenue - purchasePrice - totalServiceCost
    const rawProfit = data.totalRentalRevenue - data.purchasePrice - data.totalServiceCost;
    const profit = Math.round(rawProfit * 100) / 100;

    // Calculate ROI with 2 decimal precision
    // ROI = (PROFIT / purchasePrice) × 100
    // M2 fix: Use rawProfit for ROI to avoid double rounding error
    const rawRoi = (rawProfit / data.purchasePrice) * 100;
    const roi = Math.round(rawRoi * 100) / 100;

    // Determine status
    let status: EquipmentProfitStatus;
    if (profit > 0) {
      status = EquipmentProfitStatus.PROFITABLE;
    } else if (profit < 0) {
      status = EquipmentProfitStatus.LOSING;
    } else {
      status = EquipmentProfitStatus.BREAK_EVEN;
    }

    return {
      equipmentId: data.equipmentId,
      purchasePrice: data.purchasePrice,
      totalRentalRevenue: data.totalRentalRevenue,
      totalServiceCost: data.totalServiceCost,
      profit,
      roi,
      status,
    };
  }

  /**
   * Create an INCOMPLETE result with error message
   */
  private createIncompleteResult(equipmentId: string, error: string): EquipmentProfitResult {
    return {
      equipmentId: equipmentId || '',
      purchasePrice: null,
      totalRentalRevenue: 0,
      totalServiceCost: 0,
      profit: null,
      roi: null,
      status: EquipmentProfitStatus.INCOMPLETE,
      error,
    };
  }
}
