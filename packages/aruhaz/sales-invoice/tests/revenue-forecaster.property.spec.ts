/**
 * @kgc/sales-invoice - RevenueForecasterService Property-Based Tests
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * Property-based tests for revenue forecasting calculations
 * YOLO Pipeline - Auto-generated
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RevenueForecasterService,
  type IRevenueForecastRepository,
  type RevenueSourceData,
} from '../src/services/revenue-forecaster.service';

// Mock repository
class PropertyTestRepository implements IRevenueForecastRepository {
  private rentalRevenue: RevenueSourceData[] = [];
  private contractRevenue: RevenueSourceData[] = [];
  private serviceRevenue: RevenueSourceData[] = [];
  private previousMonthActual = 0;

  setData(
    rental: RevenueSourceData[],
    contract: RevenueSourceData[],
    service: RevenueSourceData[],
    previous: number
  ): void {
    this.rentalRevenue = rental;
    this.contractRevenue = contract;
    this.serviceRevenue = service;
    this.previousMonthActual = previous;
  }

  async getActiveRentalRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    return this.rentalRevenue.filter(r => r.tenantId === tenantId);
  }

  async getLongTermContractRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    return this.contractRevenue.filter(r => r.tenantId === tenantId);
  }

  async getOpenServiceWorksheetRevenue(tenantId: string): Promise<RevenueSourceData[]> {
    return this.serviceRevenue.filter(r => r.tenantId === tenantId);
  }

  async getPreviousMonthActualRevenue(tenantId: string): Promise<number> {
    return tenantId ? this.previousMonthActual : 0;
  }
}

// Arbitraries
const revenueAmountArb = fc.integer({ min: 0, max: 50_000_000 });
const previousMonthArb = fc.integer({ min: 0, max: 100_000_000 });

describe('RevenueForecasterService - Property-Based Tests', () => {
  let service: RevenueForecasterService;
  let repository: PropertyTestRepository;

  beforeEach(() => {
    repository = new PropertyTestRepository();
    service = new RevenueForecasterService(repository);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Total Forecast Calculation', () => {
    it('Property: Total forecast equals sum of all source amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          revenueAmountArb,
          revenueAmountArb,
          revenueAmountArb,
          async (rental, contract, serviceRev) => {
            repository.setData(
              [{ tenantId: 'tenant-1', type: 'rental', amount: rental }],
              [{ tenantId: 'tenant-1', type: 'contract', amount: contract }],
              [{ tenantId: 'tenant-1', type: 'service', amount: serviceRev }],
              0
            );

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            const expectedTotal = Math.round((rental + contract + serviceRev) * 100) / 100;
            expect(forecast.totalForecast).toBe(expectedTotal);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Multiple items per source are aggregated correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(revenueAmountArb, { minLength: 1, maxLength: 10 }),
          fc.array(revenueAmountArb, { minLength: 1, maxLength: 10 }),
          async (rentalAmounts, contractAmounts) => {
            const rentalData = rentalAmounts.map(amount => ({
              tenantId: 'tenant-1',
              type: 'rental' as const,
              amount,
            }));
            const contractData = contractAmounts.map(amount => ({
              tenantId: 'tenant-1',
              type: 'contract' as const,
              amount,
            }));

            repository.setData(rentalData, contractData, [], 0);

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            const expectedRental = rentalAmounts.reduce((sum, a) => sum + a, 0);
            const expectedContract = contractAmounts.reduce((sum, a) => sum + a, 0);
            const expectedTotal = Math.round((expectedRental + expectedContract) * 100) / 100;

            expect(forecast.totalForecast).toBe(expectedTotal);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Source Percentages', () => {
    it('Property: Source percentages sum to 100 when total > 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10_000_000 }),
          fc.integer({ min: 1, max: 10_000_000 }),
          fc.integer({ min: 1, max: 10_000_000 }),
          async (rental, contract, serviceRev) => {
            repository.setData(
              [{ tenantId: 'tenant-1', type: 'rental', amount: rental }],
              [{ tenantId: 'tenant-1', type: 'contract', amount: contract }],
              [{ tenantId: 'tenant-1', type: 'service', amount: serviceRev }],
              0
            );

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            const totalPercent = forecast.sources.reduce((sum, s) => sum + s.percentage, 0);
            // Allow for rounding differences
            expect(totalPercent).toBeGreaterThanOrEqual(99);
            expect(totalPercent).toBeLessThanOrEqual(101);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: All source percentages are 0 when total is 0', async () => {
      repository.setData([], [], [], 0);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.sources.every(s => s.percentage === 0)).toBe(true);
    });
  });

  describe('Month-over-Month Comparison', () => {
    it('Property: Trend is "up" when change percent > 1', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 100_000, max: 10_000_000 }), async previousMonth => {
          // Current forecast is at least 2% higher
          const currentAmount = Math.floor(previousMonth * 1.02) + 1;

          repository.setData(
            [{ tenantId: 'tenant-1', type: 'rental', amount: currentAmount }],
            [],
            [],
            previousMonth
          );

          const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

          expect(forecast.comparison.trend).toBe('up');
        }),
        { numRuns: 30 }
      );
    });

    it('Property: Trend is "down" when change percent < -1', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 100_000, max: 10_000_000 }), async previousMonth => {
          // Current forecast is at least 2% lower
          const currentAmount = Math.floor(previousMonth * 0.98) - 1;

          repository.setData(
            [{ tenantId: 'tenant-1', type: 'rental', amount: Math.max(0, currentAmount) }],
            [],
            [],
            previousMonth
          );

          const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

          expect(forecast.comparison.trend).toBe('down');
        }),
        { numRuns: 30 }
      );
    });

    it('Property: Trend is "stable" when change percent is within ±1%', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100_000, max: 10_000_000 }),
          fc.double({ min: -0.009, max: 0.009 }),
          async (previousMonth, changeRatio) => {
            const currentAmount = Math.round(previousMonth * (1 + changeRatio));

            repository.setData(
              [{ tenantId: 'tenant-1', type: 'rental', amount: currentAmount }],
              [],
              [],
              previousMonth
            );

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            expect(forecast.comparison.trend).toBe('stable');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Change amount equals current - previous', async () => {
      await fc.assert(
        fc.asyncProperty(revenueAmountArb, previousMonthArb, async (current, previous) => {
          repository.setData(
            [{ tenantId: 'tenant-1', type: 'rental', amount: current }],
            [],
            [],
            previous
          );

          const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

          if (previous === 0) {
            expect(forecast.comparison.changeAmount).toBe(0);
          } else {
            const expectedChange = Math.round((current - previous) * 100) / 100;
            expect(forecast.comparison.changeAmount).toBe(expectedChange);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Response Structure', () => {
    it('Property: All 3 source types always present in response', async () => {
      await fc.assert(
        fc.asyncProperty(
          revenueAmountArb,
          revenueAmountArb,
          revenueAmountArb,
          async (rental, contract, serviceRev) => {
            repository.setData(
              rental > 0 ? [{ tenantId: 'tenant-1', type: 'rental', amount: rental }] : [],
              contract > 0 ? [{ tenantId: 'tenant-1', type: 'contract', amount: contract }] : [],
              serviceRev > 0 ? [{ tenantId: 'tenant-1', type: 'service', amount: serviceRev }] : [],
              0
            );

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            expect(forecast.sources).toHaveLength(3);
            expect(forecast.sources.map(s => s.type)).toContain('rental');
            expect(forecast.sources.map(s => s.type)).toContain('contract');
            expect(forecast.sources.map(s => s.type)).toContain('service');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property: Source count equals number of data items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          async (rentalCount, contractCount) => {
            const rentalData = Array.from({ length: rentalCount }, (_, i) => ({
              tenantId: 'tenant-1',
              type: 'rental' as const,
              amount: 10000 + i * 1000,
            }));
            const contractData = Array.from({ length: contractCount }, (_, i) => ({
              tenantId: 'tenant-1',
              type: 'contract' as const,
              amount: 20000 + i * 1000,
            }));

            repository.setData(rentalData, contractData, [], 0);

            const forecast = await service.getForecast('tenant-1', new Date(2026, 1));

            const rentalSource = forecast.sources.find(s => s.type === 'rental');
            const contractSource = forecast.sources.find(s => s.type === 'contract');

            expect(rentalSource?.count).toBe(rentalCount);
            expect(contractSource?.count).toBe(contractCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: ForecastMonth format is YYYY-MM', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          async (year, month) => {
            repository.setData([], [], [], 0);

            const forecast = await service.getForecast('tenant-1', new Date(year, month - 1));

            const monthStr = String(month).padStart(2, '0');
            expect(forecast.forecastMonth).toBe(`${year}-${monthStr}`);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
