/**
 * @kgc/sales-invoice - RevenueForecasterService Unit Tests
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * TDD Tests for revenue forecast functionality.
 * ADR-052: Kintlévőség Rendszerezés
 *
 * FORECAST SOURCES:
 * - rental: Aktív bérlések hátralékos díjai
 * - contract: Hosszú távú szerződések havi díja
 * - service: Nyitott munkalapok várható bevétele
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IRevenueForecastRepository,
  RevenueForecastFilters,
  RevenueSourceData,
} from '../src/services/revenue-forecaster.service';
import { RevenueForecasterService } from '../src/services/revenue-forecaster.service';

// Mock repository implementation
class MockRevenueForecastRepository implements IRevenueForecastRepository {
  private rentalRevenue: RevenueSourceData[] = [];
  private contractRevenue: RevenueSourceData[] = [];
  private serviceRevenue: RevenueSourceData[] = [];
  private previousMonthActual = 0;

  setRentalRevenue(data: RevenueSourceData[]): void {
    this.rentalRevenue = data;
  }

  setContractRevenue(data: RevenueSourceData[]): void {
    this.contractRevenue = data;
  }

  setServiceRevenue(data: RevenueSourceData[]): void {
    this.serviceRevenue = data;
  }

  setPreviousMonthActual(amount: number): void {
    this.previousMonthActual = amount;
  }

  async getActiveRentalRevenue(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]> {
    return this.rentalRevenue.filter(r => r.tenantId === tenantId);
  }

  async getLongTermContractRevenue(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]> {
    return this.contractRevenue.filter(r => r.tenantId === tenantId);
  }

  async getOpenServiceWorksheetRevenue(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters?: RevenueForecastFilters
  ): Promise<RevenueSourceData[]> {
    return this.serviceRevenue.filter(r => r.tenantId === tenantId);
  }

  async getPreviousMonthActualRevenue(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _month: Date
  ): Promise<number> {
    return tenantId ? this.previousMonthActual : 0;
  }
}

describe('RevenueForecasterService', () => {
  let service: RevenueForecasterService;
  let mockRepository: MockRevenueForecastRepository;

  beforeEach(() => {
    mockRepository = new MockRevenueForecastRepository();
    service = new RevenueForecasterService(mockRepository);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getForecast', () => {
    it('should return empty forecast when no revenue sources exist', async () => {
      mockRepository.setRentalRevenue([]);
      mockRepository.setContractRevenue([]);
      mockRepository.setServiceRevenue([]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.totalForecast).toBe(0);
      expect(forecast.sources).toHaveLength(3);
      expect(forecast.sources.every(s => s.amount === 0)).toBe(true);
    });

    it('should calculate rental revenue from active rentals', async () => {
      mockRepository.setRentalRevenue([
        createRevenueSource('tenant-1', 'rental', 250000),
        createRevenueSource('tenant-1', 'rental', 150000),
      ]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      const rentalSource = forecast.sources.find(s => s.type === 'rental');
      expect(rentalSource).toBeDefined();
      expect(rentalSource!.amount).toBe(400000);
    });

    it('should calculate contract revenue from long-term contracts', async () => {
      mockRepository.setContractRevenue([createRevenueSource('tenant-1', 'contract', 300000)]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      const contractSource = forecast.sources.find(s => s.type === 'contract');
      expect(contractSource).toBeDefined();
      expect(contractSource!.amount).toBe(300000);
    });

    it('should calculate service revenue from open worksheets', async () => {
      mockRepository.setServiceRevenue([
        createRevenueSource('tenant-1', 'service', 75000),
        createRevenueSource('tenant-1', 'service', 25000),
      ]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      const serviceSource = forecast.sources.find(s => s.type === 'service');
      expect(serviceSource).toBeDefined();
      expect(serviceSource!.amount).toBe(100000);
    });

    it('should calculate total forecast as sum of all sources', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 500000)]);
      mockRepository.setContractRevenue([createRevenueSource('tenant-1', 'contract', 300000)]);
      mockRepository.setServiceRevenue([createRevenueSource('tenant-1', 'service', 100000)]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.totalForecast).toBe(900000);
    });

    it('should include month-over-month comparison', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 800000)]);
      mockRepository.setPreviousMonthActual(750000);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.comparison).toBeDefined();
      expect(forecast.comparison.previousMonth).toBe(750000);
      expect(forecast.comparison.changePercent).toBeCloseTo(6.67, 1);
      expect(forecast.comparison.trend).toBe('up');
    });

    it('should show negative trend when forecast is lower than previous month', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 600000)]);
      mockRepository.setPreviousMonthActual(750000);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.comparison.changePercent).toBeCloseTo(-20.0, 1);
      expect(forecast.comparison.trend).toBe('down');
    });

    it('should show stable trend when change is less than 1%', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 752000)]);
      mockRepository.setPreviousMonthActual(750000);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.comparison.trend).toBe('stable');
    });

    it('should handle zero previous month (no comparison possible)', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 500000)]);
      mockRepository.setPreviousMonthActual(0);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.comparison.previousMonth).toBe(0);
      expect(forecast.comparison.changePercent).toBe(0);
      expect(forecast.comparison.trend).toBe('stable');
    });

    it('should include generatedAt timestamp', async () => {
      mockRepository.setRentalRevenue([]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.generatedAt.getTime()).toBe(new Date('2026-02-07').getTime());
    });

    it('should include forecastMonth in response', async () => {
      mockRepository.setRentalRevenue([]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-03'));

      expect(forecast.forecastMonth).toBe('2026-03');
    });

    it('should handle floating point amounts correctly', async () => {
      mockRepository.setRentalRevenue([
        createRevenueSource('tenant-1', 'rental', 99999.99),
        createRevenueSource('tenant-1', 'rental', 0.01),
      ]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.totalForecast).toBe(100000);
    });

    it('should calculate source percentages correctly', async () => {
      mockRepository.setRentalRevenue([createRevenueSource('tenant-1', 'rental', 500000)]);
      mockRepository.setContractRevenue([createRevenueSource('tenant-1', 'contract', 300000)]);
      mockRepository.setServiceRevenue([createRevenueSource('tenant-1', 'service', 200000)]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      const rentalSource = forecast.sources.find(s => s.type === 'rental');
      const contractSource = forecast.sources.find(s => s.type === 'contract');
      const serviceSource = forecast.sources.find(s => s.type === 'service');

      expect(rentalSource!.percentage).toBe(50);
      expect(contractSource!.percentage).toBe(30);
      expect(serviceSource!.percentage).toBe(20);
    });

    it('should handle percentage calculation with zero total', async () => {
      mockRepository.setRentalRevenue([]);
      mockRepository.setContractRevenue([]);
      mockRepository.setServiceRevenue([]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.sources.every(s => s.percentage === 0)).toBe(true);
    });

    it('should isolate data by tenant', async () => {
      mockRepository.setRentalRevenue([
        createRevenueSource('tenant-1', 'rental', 500000),
        createRevenueSource('tenant-2', 'rental', 300000),
      ]);

      const forecast = await service.getForecast('tenant-1', new Date('2026-02'));

      expect(forecast.totalForecast).toBe(500000);
    });
  });
});

// Helper function to create test revenue source data
function createRevenueSource(
  tenantId: string,
  type: 'rental' | 'contract' | 'service',
  amount: number
): RevenueSourceData {
  return {
    tenantId,
    type,
    amount,
    description: `${type} revenue`,
  };
}
