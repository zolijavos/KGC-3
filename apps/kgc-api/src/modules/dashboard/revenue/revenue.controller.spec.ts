/**
 * Revenue Forecast Dashboard Controller Tests
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RevenueForecastData } from './dto/revenue-forecast.dto';
import { RevenueForecastController } from './revenue.controller';
import type { RevenueForecastDashboardService } from './revenue.service';

describe('RevenueForecastController', () => {
  let controller: RevenueForecastController;
  let mockService: {
    getForecast: ReturnType<typeof vi.fn>;
  };

  const mockForecastData: RevenueForecastData = {
    generatedAt: '2026-02-07T12:00:00.000Z',
    forecastMonth: '2026-02',
    totalForecast: 950000,
    sources: [
      { type: 'rental', label: 'Bérlési díjak', amount: 500000, percentage: 53, count: 2 },
      { type: 'contract', label: 'Szerződéses bevétel', amount: 300000, percentage: 32, count: 1 },
      { type: 'service', label: 'Szerviz bevétel', amount: 150000, percentage: 16, count: 2 },
    ],
    comparison: {
      previousMonth: 890000,
      changeAmount: 60000,
      changePercent: 6.74,
      trend: 'up',
    },
  };

  beforeEach(() => {
    mockService = {
      getForecast: vi.fn().mockResolvedValue(mockForecastData),
    };

    controller = new RevenueForecastController(
      mockService as unknown as RevenueForecastDashboardService
    );
  });

  describe('GET /dashboard/revenue/forecast', () => {
    it('[P0] should return forecast with all sources', async () => {
      const result = await controller.getForecast({});

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockForecastData);
      expect(result.data.sources).toHaveLength(3);
    });

    it('[P0] should call service with correct parameters', async () => {
      await controller.getForecast({ month: '2026-03' });

      expect(mockService.getForecast).toHaveBeenCalledWith('default-tenant', expect.any(Date));
    });

    it('[P1] should return total forecast', async () => {
      const result = await controller.getForecast({});

      expect(result.data.totalForecast).toBe(950000);
    });

    it('[P1] should return month-over-month comparison', async () => {
      const result = await controller.getForecast({});

      expect(result.data.comparison).toBeDefined();
      expect(result.data.comparison.previousMonth).toBe(890000);
      expect(result.data.comparison.trend).toBe('up');
    });

    it('[P1] should include generatedAt timestamp', async () => {
      const result = await controller.getForecast({});

      expect(result.data.generatedAt).toBe('2026-02-07T12:00:00.000Z');
    });

    it('[P1] should handle empty month query', async () => {
      await controller.getForecast({});

      expect(mockService.getForecast).toHaveBeenCalledWith('default-tenant', undefined);
    });
  });
});
