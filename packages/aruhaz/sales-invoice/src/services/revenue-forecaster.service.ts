/**
 * @kgc/sales-invoice - RevenueForecasterService
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * Service for forecasting monthly revenue.
 * ADR-052: Kintlévőség Rendszerezés
 *
 * FORECAST SOURCES:
 * - rental: Aktív bérlések hátralékos díjai
 * - contract: Hosszú távú szerződések havi díja
 * - service: Nyitott munkalapok várható bevétele
 */

/** Revenue source type */
export type RevenueSourceType = 'rental' | 'contract' | 'service';

/** Revenue source data from repository */
export interface RevenueSourceData {
  tenantId: string;
  type: RevenueSourceType;
  amount: number;
  description?: string;
}

/** Aggregated source breakdown */
export interface RevenueSourceBreakdown {
  type: RevenueSourceType;
  label: string;
  amount: number;
  percentage: number;
  count: number;
}

/** Month-over-month comparison */
export interface RevenueComparison {
  previousMonth: number;
  changeAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

/** Complete forecast response */
export interface RevenueForecast {
  generatedAt: Date;
  forecastMonth: string;
  totalForecast: number;
  sources: RevenueSourceBreakdown[];
  comparison: RevenueComparison;
}

/** Filters for forecast query */
export interface RevenueForecastFilters {
  month?: Date;
}

/** Repository interface */
export interface IRevenueForecastRepository {
  getActiveRentalRevenue(
    tenantId: string,
    filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]>;

  getLongTermContractRevenue(
    tenantId: string,
    filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]>;

  getOpenServiceWorksheetRevenue(
    tenantId: string,
    filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]>;

  getPreviousMonthActualRevenue(tenantId: string, month: Date): Promise<number>;
}

/** Source labels for display */
const SOURCE_LABELS: Record<RevenueSourceType, string> = {
  rental: 'Bérlési díjak',
  contract: 'Szerződéses bevétel',
  service: 'Szerviz bevétel',
};

/** Threshold for stable trend (±1%) */
const STABLE_THRESHOLD_PERCENT = 1;

export class RevenueForecasterService {
  constructor(private readonly repository: IRevenueForecastRepository) {}

  /**
   * Get revenue forecast for a specific month
   * @param tenantId Tenant ID (ADR-001)
   * @param month Target month for forecast
   */
  async getForecast(tenantId: string, month: Date): Promise<RevenueForecast> {
    // Fetch all revenue sources in parallel
    const [rentalData, contractData, serviceData, previousMonthActual] = await Promise.all([
      this.repository.getActiveRentalRevenue(tenantId, { month }),
      this.repository.getLongTermContractRevenue(tenantId, { month }),
      this.repository.getOpenServiceWorksheetRevenue(tenantId, { month }),
      this.repository.getPreviousMonthActualRevenue(tenantId, month),
    ]);

    // Aggregate by source type
    const rentalAmount = this.sumAndRound(rentalData);
    const contractAmount = this.sumAndRound(contractData);
    const serviceAmount = this.sumAndRound(serviceData);

    const totalForecast = Math.round((rentalAmount + contractAmount + serviceAmount) * 100) / 100;

    // Build source breakdown with percentages
    const sources: RevenueSourceBreakdown[] = [
      this.buildSourceBreakdown('rental', rentalData, rentalAmount, totalForecast),
      this.buildSourceBreakdown('contract', contractData, contractAmount, totalForecast),
      this.buildSourceBreakdown('service', serviceData, serviceAmount, totalForecast),
    ];

    // Calculate month-over-month comparison
    const comparison = this.calculateComparison(totalForecast, previousMonthActual);

    return {
      generatedAt: new Date(),
      forecastMonth: this.formatMonth(month),
      totalForecast,
      sources,
      comparison,
    };
  }

  private sumAndRound(data: RevenueSourceData[]): number {
    const sum = data.reduce((acc, item) => acc + item.amount, 0);
    return Math.round(sum * 100) / 100;
  }

  private buildSourceBreakdown(
    type: RevenueSourceType,
    data: RevenueSourceData[],
    amount: number,
    total: number
  ): RevenueSourceBreakdown {
    return {
      type,
      label: SOURCE_LABELS[type],
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      count: data.length,
    };
  }

  private calculateComparison(currentForecast: number, previousMonth: number): RevenueComparison {
    if (previousMonth === 0) {
      return {
        previousMonth: 0,
        changeAmount: 0,
        changePercent: 0,
        trend: 'stable',
      };
    }

    const changeAmount = currentForecast - previousMonth;
    const changePercent = (changeAmount / previousMonth) * 100;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < STABLE_THRESHOLD_PERCENT) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      previousMonth,
      changeAmount: Math.round(changeAmount * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
    };
  }

  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
