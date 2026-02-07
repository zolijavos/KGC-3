/**
 * Revenue Forecast Dashboard Service
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * Service for revenue forecast dashboard.
 * Interfaces with @kgc/sales-invoice RevenueForecasterService.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { RevenueForecastData } from './dto/revenue-forecast.dto';

/**
 * Revenue source data interface
 */
interface RevenueSourceData {
  tenantId: string;
  type: 'rental' | 'contract' | 'service';
  amount: number;
  description?: string;
}

/**
 * In-Memory Revenue Forecast Repository for MVP
 *
 * TODO: Replace with PrismaRevenueForecastRepository when ready
 */
class InMemoryRevenueForecastRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_prisma: PrismaClient) {
    // Prisma will be used in PrismaRevenueForecastRepository
  }

  async getActiveRentalRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    // Mock data for development/demo
    return [
      {
        tenantId,
        type: 'rental',
        amount: 350000,
        description: 'Aktív bérlés: B-2026-001',
      },
      {
        tenantId,
        type: 'rental',
        amount: 150000,
        description: 'Aktív bérlés: B-2026-002',
      },
    ];
  }

  async getLongTermContractRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    // Mock data for long-term contracts
    return [
      {
        tenantId,
        type: 'contract',
        amount: 300000,
        description: 'Havi szerződés: Kovács Építőipari Kft.',
      },
    ];
  }

  async getOpenServiceWorksheetRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    // Mock data for open worksheets
    return [
      {
        tenantId,
        type: 'service',
        amount: 85000,
        description: 'Munkalap: ML-2026-001',
      },
      {
        tenantId,
        type: 'service',
        amount: 65000,
        description: 'Munkalap: ML-2026-002',
      },
    ];
  }

  async getPreviousMonthActualRevenue(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tenantId: string
  ): Promise<number> {
    // Mock previous month revenue
    return 890000;
  }
}

@Injectable()
export class RevenueForecastDashboardService {
  private readonly repository: InMemoryRevenueForecastRepository;

  constructor(@Inject('PRISMA_CLIENT') prisma: PrismaClient) {
    this.repository = new InMemoryRevenueForecastRepository(prisma);
  }

  /**
   * Get revenue forecast for a specific month
   * @param tenantId Tenant ID (ADR-001)
   * @param month Target month (Date or undefined for current month)
   */
  async getForecast(tenantId: string, month?: Date): Promise<RevenueForecastData> {
    const targetMonth = month ?? new Date();

    // Fetch all revenue sources
    const [rentalData, contractData, serviceData, previousMonthActual] = await Promise.all([
      this.repository.getActiveRentalRevenue(tenantId),
      this.repository.getLongTermContractRevenue(tenantId),
      this.repository.getOpenServiceWorksheetRevenue(tenantId),
      this.repository.getPreviousMonthActualRevenue(tenantId),
    ]);

    // Sum amounts by source
    const rentalAmount = this.sumAndRound(rentalData);
    const contractAmount = this.sumAndRound(contractData);
    const serviceAmount = this.sumAndRound(serviceData);

    const totalForecast = Math.round((rentalAmount + contractAmount + serviceAmount) * 100) / 100;

    // Build source breakdown
    const sources = [
      this.buildSource('rental', 'Bérlési díjak', rentalAmount, rentalData.length, totalForecast),
      this.buildSource(
        'contract',
        'Szerződéses bevétel',
        contractAmount,
        contractData.length,
        totalForecast
      ),
      this.buildSource(
        'service',
        'Szerviz bevétel',
        serviceAmount,
        serviceData.length,
        totalForecast
      ),
    ];

    // Calculate comparison
    const comparison = this.calculateComparison(totalForecast, previousMonthActual);

    return {
      generatedAt: new Date().toISOString(),
      forecastMonth: this.formatMonth(targetMonth),
      totalForecast,
      sources,
      comparison,
    };
  }

  private sumAndRound(data: RevenueSourceData[]): number {
    const sum = data.reduce((acc, item) => acc + item.amount, 0);
    return Math.round(sum * 100) / 100;
  }

  private buildSource(
    type: 'rental' | 'contract' | 'service',
    label: string,
    amount: number,
    count: number,
    total: number
  ) {
    return {
      type,
      label,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      count,
    };
  }

  private calculateComparison(current: number, previous: number) {
    if (previous === 0) {
      return {
        previousMonth: 0,
        changeAmount: 0,
        changePercent: 0,
        trend: 'stable' as const,
      };
    }

    const changeAmount = Math.round((current - previous) * 100) / 100;
    const changePercent = Math.round(((current - previous) / previous) * 10000) / 100;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 1) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      previousMonth: previous,
      changeAmount,
      changePercent,
      trend,
    };
  }

  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
