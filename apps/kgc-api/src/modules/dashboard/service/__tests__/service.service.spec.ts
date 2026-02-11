import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ServiceDashboardService } from '../service.service';

/**
 * Service Dashboard Service Tests (Story 35-5)
 *
 * Unit tests for service dashboard data aggregation
 * Priority: P1 (High - PR to main)
 */
describe('ServiceDashboardService', () => {
  let service: ServiceDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceDashboardService],
    }).compile();

    service = module.get<ServiceDashboardService>(ServiceDashboardService);
  });

  describe('getSummary', () => {
    it('[P1] should return service summary with totalActive count', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: Returns summary with totalActive count
      expect(result).toHaveProperty('totalActive');
      expect(typeof result.totalActive).toBe('number');
      expect(result.totalActive).toBeGreaterThanOrEqual(0);
    });

    it('[P1] should return service summary with status breakdown', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: Returns status breakdown
      expect(result).toHaveProperty('byStatus');
      expect(Array.isArray(result.byStatus)).toBe(true);
      expect(result.byStatus.length).toBeGreaterThan(0);
    });

    it('[P1] should include all expected worksheet statuses', async () => {
      // GIVEN: Expected worksheet statuses
      const expectedStatuses = [
        'DRAFT',
        'DIAGNOSED',
        'IN_PROGRESS',
        'WAITING_PARTS',
        'COMPLETED',
        'CLOSED',
      ];

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: All statuses are present
      const returnedStatuses = result.byStatus.map(s => s.status);
      expectedStatuses.forEach(status => {
        expect(returnedStatuses).toContain(status);
      });
    });

    it('[P1] should return status items with count and color', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: Each status item has count and color
      result.byStatus.forEach(item => {
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('color');
        expect(typeof item.count).toBe('number');
        expect(typeof item.color).toBe('string');
      });
    });

    it('[P1] should return valid period dates', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: Period dates are valid ISO strings
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(new Date(result.periodStart).toISOString()).toBe(result.periodStart);
      expect(new Date(result.periodEnd).toISOString()).toBe(result.periodEnd);
    });

    it('[P2] should calculate totalActive from active statuses only', async () => {
      // GIVEN: Active statuses that should be counted
      const activeStatuses = ['DRAFT', 'DIAGNOSED', 'IN_PROGRESS', 'WAITING_PARTS'];

      // WHEN: Getting service summary
      const result = await service.getSummary();

      // THEN: totalActive equals sum of active status counts
      const expectedTotal = result.byStatus
        .filter(s => activeStatuses.includes(s.status))
        .reduce((sum, s) => sum + s.count, 0);
      expect(result.totalActive).toBe(expectedTotal);
    });
  });

  describe('getWorkload', () => {
    it('[P1] should return technician workload data', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting workload data
      const result = await service.getWorkload();

      // THEN: Returns technicians array
      expect(result).toHaveProperty('technicians');
      expect(Array.isArray(result.technicians)).toBe(true);
    });

    it('[P1] should return technician details with required fields', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting workload data
      const result = await service.getWorkload();

      // THEN: Each technician has required fields
      result.technicians.forEach(tech => {
        expect(tech).toHaveProperty('id');
        expect(tech).toHaveProperty('name');
        expect(tech).toHaveProperty('activeWorksheets');
        expect(tech).toHaveProperty('maxCapacity');
        expect(tech).toHaveProperty('utilizationPercent');
        expect(tech).toHaveProperty('worksheets');
      });
    });

    it('[P1] should calculate utilization percentage correctly', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting workload data
      const result = await service.getWorkload();

      // THEN: Utilization is calculated as (activeWorksheets / maxCapacity) * 100
      result.technicians.forEach(tech => {
        const expectedUtilization = Math.round((tech.activeWorksheets / tech.maxCapacity) * 100);
        expect(tech.utilizationPercent).toBe(expectedUtilization);
      });
    });

    it('[P2] should include worksheet details for each technician', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting workload data
      const result = await service.getWorkload();

      // THEN: Worksheets have id, title, and priority
      result.technicians.forEach(tech => {
        expect(Array.isArray(tech.worksheets)).toBe(true);
        tech.worksheets.forEach(ws => {
          expect(ws).toHaveProperty('id');
          expect(ws).toHaveProperty('title');
          expect(ws).toHaveProperty('priority');
        });
      });
    });

    it('[P2] should have valid priority values in worksheets', async () => {
      // GIVEN: Valid priority values
      const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

      // WHEN: Getting workload data
      const result = await service.getWorkload();

      // THEN: All worksheet priorities are valid
      result.technicians.forEach(tech => {
        tech.worksheets.forEach(ws => {
          expect(validPriorities).toContain(ws.priority);
        });
      });
    });
  });

  describe('getRevenue', () => {
    it('[P1] should return revenue data for default period (week)', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue without period parameter
      const result = await service.getRevenue();

      // THEN: Returns week data by default
      expect(result).toHaveProperty('period');
      expect(result.period).toBe('week');
    });

    it('[P1] should return revenue data for specified period', async () => {
      // GIVEN: Different period options
      const periods: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];

      for (const period of periods) {
        // WHEN: Getting revenue for specific period
        const result = await service.getRevenue(period);

        // THEN: Returns correct period
        expect(result.period).toBe(period);
      }
    });

    it('[P1] should return current and previous revenue data', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Returns current and previous data
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('previous');
      expect(result.current).toHaveProperty('total');
      expect(result.current).toHaveProperty('laborFee');
      expect(result.current).toHaveProperty('partsRevenue');
      expect(result.previous).toHaveProperty('total');
    });

    it('[P1] should calculate total as sum of laborFee and partsRevenue', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Total equals laborFee + partsRevenue
      expect(result.current.total).toBe(result.current.laborFee + result.current.partsRevenue);
      expect(result.previous.total).toBe(result.previous.laborFee + result.previous.partsRevenue);
    });

    it('[P1] should return delta percentages', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Delta contains percentages and trend
      expect(result).toHaveProperty('delta');
      expect(result.delta).toHaveProperty('totalPercent');
      expect(result.delta).toHaveProperty('laborPercent');
      expect(result.delta).toHaveProperty('partsPercent');
      expect(result.delta).toHaveProperty('trend');
    });

    it('[P2] should have valid trend value', async () => {
      // GIVEN: Valid trend values
      const validTrends = ['up', 'down', 'neutral'];

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Trend is valid
      expect(validTrends).toContain(result.delta.trend);
    });

    it('[P2] should calculate trend based on totalPercent', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Trend matches totalPercent direction
      if (result.delta.totalPercent > 0) {
        expect(result.delta.trend).toBe('up');
      } else if (result.delta.totalPercent < 0) {
        expect(result.delta.trend).toBe('down');
      } else {
        expect(result.delta.trend).toBe('neutral');
      }
    });

    it('[P1] should return valid period dates', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting revenue
      const result = await service.getRevenue('week');

      // THEN: Period dates are valid ISO strings
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(new Date(result.periodStart).toISOString()).toBe(result.periodStart);
      expect(new Date(result.periodEnd).toISOString()).toBe(result.periodEnd);
    });
  });

  /**
   * Warranty Ratio Tests (Story 49-1)
   */
  describe('getWarrantyRatio', () => {
    it('[P1] should return warranty ratio data for default period (month)', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting warranty ratio without period parameter
      const result = await service.getWarrantyRatio();

      // THEN: Returns warranty and paid data
      expect(result).toHaveProperty('warranty');
      expect(result).toHaveProperty('paid');
      expect(result.warranty).toHaveProperty('count');
      expect(result.warranty).toHaveProperty('revenue');
      expect(result.warranty).toHaveProperty('percentage');
    });

    it('[P1] should return warranty ratio for specified period', async () => {
      // GIVEN: Different period options
      const periods: ('day' | 'week' | 'month')[] = ['day', 'week', 'month'];

      for (const period of periods) {
        // WHEN: Getting warranty ratio for specific period
        const result = await service.getWarrantyRatio(period);

        // THEN: Returns valid data
        expect(result.warranty.count).toBeGreaterThanOrEqual(0);
        expect(result.paid.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('[P1] should calculate percentages correctly (sum to 100)', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Percentages sum to approximately 100 (allow for rounding)
      const totalPercentage = result.warranty.percentage + result.paid.percentage;
      expect(totalPercentage).toBeGreaterThan(99);
      expect(totalPercentage).toBeLessThanOrEqual(100.1);
    });

    it('[P1] should return 6-month trend data', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Trend array has 6 months
      expect(result).toHaveProperty('trend');
      expect(Array.isArray(result.trend)).toBe(true);
      expect(result.trend.length).toBe(6);
    });

    it('[P1] should have valid trend items with month and warrantyPercent', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Each trend item has month and warrantyPercent
      result.trend.forEach(item => {
        expect(item).toHaveProperty('month');
        expect(item).toHaveProperty('warrantyPercent');
        expect(typeof item.month).toBe('string');
        expect(typeof item.warrantyPercent).toBe('number');
        // Month format should be YYYY-MM
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    it('[P1] should return valid period dates', async () => {
      // GIVEN: Service dashboard service is initialized

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Period dates are valid ISO strings
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(new Date(result.periodStart).toISOString()).toBe(result.periodStart);
      expect(new Date(result.periodEnd).toISOString()).toBe(result.periodEnd);
    });

    it('[P2] should have zero revenue for warranty services', async () => {
      // GIVEN: Warranty services should not generate revenue

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Warranty revenue is 0 (garanciális javítások nem termelnek bevételt)
      expect(result.warranty.revenue).toBe(0);
    });

    it('[P2] should have positive revenue for paid services', async () => {
      // GIVEN: Paid services should generate revenue

      // WHEN: Getting warranty ratio
      const result = await service.getWarrantyRatio('month');

      // THEN: Paid revenue is positive
      expect(result.paid.revenue).toBeGreaterThan(0);
    });
  });
});
