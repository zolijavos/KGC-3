import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PartnerDashboardService } from '../partner.service';

/**
 * Partner Dashboard Service Tests (Story 35-6)
 *
 * Unit tests for partner dashboard data aggregation
 * Priority: P1 (High - PR to main)
 */
describe('PartnerDashboardService', () => {
  let service: PartnerDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerDashboardService],
    }).compile();

    service = module.get<PartnerDashboardService>(PartnerDashboardService);
  });

  describe('getOverview', () => {
    it('[P1] should return partner overview with totalActive count', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: Returns overview with totalActive count
      expect(result).toHaveProperty('totalActive');
      expect(typeof result.totalActive).toBe('number');
      expect(result.totalActive).toBeGreaterThan(0);
    });

    it('[P1] should return newPartners count', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: Returns newPartners count
      expect(result).toHaveProperty('newPartners');
      expect(typeof result.newPartners).toBe('number');
      expect(result.newPartners).toBeGreaterThanOrEqual(0);
    });

    it('[P1] should return category breakdown', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: Returns category breakdown
      expect(result).toHaveProperty('byCategory');
      expect(Array.isArray(result.byCategory)).toBe(true);
      expect(result.byCategory.length).toBeGreaterThan(0);
    });

    it('[P1] should include all expected partner categories', async () => {
      // GIVEN: Expected partner categories
      const expectedCategories = ['RETAIL', 'B2B', 'VIP'];

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: All categories are present
      const returnedCategories = result.byCategory.map(c => c.category);
      expectedCategories.forEach(category => {
        expect(returnedCategories).toContain(category);
      });
    });

    it('[P1] should return category items with count and color', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: Each category item has count and color
      result.byCategory.forEach(item => {
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('color');
        expect(typeof item.count).toBe('number');
        expect(typeof item.color).toBe('string');
      });
    });

    it('[P2] should calculate totalActive from all category counts', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: totalActive equals sum of all category counts
      const expectedTotal = result.byCategory.reduce((sum, c) => sum + c.count, 0);
      expect(result.totalActive).toBe(expectedTotal);
    });

    it('[P1] should return valid period dates', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting partner overview
      const result = await service.getOverview();

      // THEN: Period dates are valid ISO strings
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(new Date(result.periodStart).toISOString()).toBe(result.periodStart);
      expect(new Date(result.periodEnd).toISOString()).toBe(result.periodEnd);
    });
  });

  describe('getTopPartners', () => {
    it('[P1] should return top partners data', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners
      const result = await service.getTopPartners();

      // THEN: Returns partners array
      expect(result).toHaveProperty('partners');
      expect(Array.isArray(result.partners)).toBe(true);
    });

    it('[P1] should return partners with required fields', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners
      const result = await service.getTopPartners();

      // THEN: Each partner has required fields
      result.partners.forEach(partner => {
        expect(partner).toHaveProperty('id');
        expect(partner).toHaveProperty('name');
        expect(partner).toHaveProperty('totalRevenue');
        expect(partner).toHaveProperty('rentalRevenue');
        expect(partner).toHaveProperty('salesRevenue');
        expect(partner).toHaveProperty('serviceRevenue');
        expect(partner).toHaveProperty('trendPercent');
      });
    });

    it('[P1] should calculate totalRevenue correctly', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners
      const result = await service.getTopPartners();

      // THEN: totalRevenue equals sum of rental + sales + service
      result.partners.forEach(partner => {
        const expectedTotal = partner.rentalRevenue + partner.salesRevenue + partner.serviceRevenue;
        expect(partner.totalRevenue).toBe(expectedTotal);
      });
    });

    it('[P1] should return default period (month) when not specified', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners without period
      const result = await service.getTopPartners();

      // THEN: Returns month period
      expect(result).toHaveProperty('period');
      expect(result.period).toBe('month');
    });

    it('[P1] should accept different period values', async () => {
      // GIVEN: Different period options
      const periods: ('month' | 'quarter' | 'year')[] = ['month', 'quarter', 'year'];

      for (const period of periods) {
        // WHEN: Getting top partners for specific period
        const result = await service.getTopPartners(period);

        // THEN: Returns correct period
        expect(result.period).toBe(period);
      }
    });

    it('[P2] should return up to 10 partners', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners
      const result = await service.getTopPartners();

      // THEN: Returns maximum 10 partners
      expect(result.partners.length).toBeLessThanOrEqual(10);
    });

    it('[P1] should return valid period dates', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting top partners
      const result = await service.getTopPartners();

      // THEN: Period dates are valid ISO strings
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(new Date(result.periodStart).toISOString()).toBe(result.periodStart);
      expect(new Date(result.periodEnd).toISOString()).toBe(result.periodEnd);
    });
  });

  describe('getActivity', () => {
    it('[P1] should return activity data', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Returns activities array
      expect(result).toHaveProperty('activities');
      expect(Array.isArray(result.activities)).toBe(true);
    });

    it('[P1] should return activities with required fields', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Each activity item has required fields
      result.activities.forEach(item => {
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('rentals');
        expect(item).toHaveProperty('sales');
        expect(item).toHaveProperty('services');
        expect(item).toHaveProperty('total');
      });
    });

    it('[P1] should calculate total correctly for each day', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: total equals sum of rentals + sales + services
      result.activities.forEach(item => {
        expect(item.total).toBe(item.rentals + item.sales + item.services);
      });
    });

    it('[P1] should return totalTransactions count', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Returns totalTransactions
      expect(result).toHaveProperty('totalTransactions');
      expect(typeof result.totalTransactions).toBe('number');
      expect(result.totalTransactions).toBeGreaterThanOrEqual(0);
    });

    it('[P1] should return default days (30) when not specified', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity without days parameter
      const result = await service.getActivity();

      // THEN: Returns 30 days of data
      expect(result).toHaveProperty('periodDays');
      expect(result.periodDays).toBe(30);
      expect(result.activities.length).toBe(30);
    });

    it('[P1] should accept custom days parameter', async () => {
      // GIVEN: Custom days value
      const days = 14;

      // WHEN: Getting activity for 14 days
      const result = await service.getActivity(days);

      // THEN: Returns correct number of days
      expect(result.periodDays).toBe(days);
      expect(result.activities.length).toBe(days);
    });

    it('[P1] should return delta percentage', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Returns deltaPercent
      expect(result).toHaveProperty('deltaPercent');
      expect(typeof result.deltaPercent).toBe('number');
    });

    it('[P2] should return previousTotalTransactions', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Returns previousTotalTransactions
      expect(result).toHaveProperty('previousTotalTransactions');
      expect(typeof result.previousTotalTransactions).toBe('number');
    });

    it('[P2] should return valid date strings in activities', async () => {
      // GIVEN: Partner dashboard service is initialized

      // WHEN: Getting activity
      const result = await service.getActivity();

      // THEN: Each activity has valid date string
      result.activities.forEach(item => {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});
