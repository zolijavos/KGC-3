import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PartnerActivityResponseDto,
  PartnerOverviewResponseDto,
  TopPartnersResponseDto,
} from '../dto/partner-response.dto';
import { PartnerDashboardController } from '../partner.controller';
import { PartnerDashboardService } from '../partner.service';

/**
 * Partner Dashboard Controller Tests (Story 35-6)
 *
 * Unit tests for partner dashboard API endpoints
 * Priority: P1 (High - PR to main)
 */
describe('PartnerDashboardController', () => {
  let controller: PartnerDashboardController;
  let mockService: {
    getOverview: ReturnType<typeof vi.fn>;
    getTopPartners: ReturnType<typeof vi.fn>;
    getActivity: ReturnType<typeof vi.fn>;
  };

  const mockOverviewResponse: PartnerOverviewResponseDto = {
    totalActive: 156,
    newPartners: 12,
    byCategory: [
      { category: 'RETAIL', count: 98, color: 'blue' },
      { category: 'B2B', count: 45, color: 'purple' },
      { category: 'VIP', count: 13, color: 'amber' },
    ],
    periodStart: '2026-01-05T00:00:00.000Z',
    periodEnd: '2026-02-04T12:00:00.000Z',
  };

  const mockTopPartnersResponse: TopPartnersResponseDto = {
    partners: [
      {
        id: 'partner-1',
        name: 'Építő Kft.',
        totalRevenue: 2450000,
        rentalRevenue: 1800000,
        salesRevenue: 450000,
        serviceRevenue: 200000,
        trendPercent: 15.3,
      },
    ],
    period: 'month',
    periodStart: '2026-02-01T00:00:00.000Z',
    periodEnd: '2026-02-04T12:00:00.000Z',
  };

  const mockActivityResponse: PartnerActivityResponseDto = {
    activities: [
      { date: '2026-02-04', rentals: 12, sales: 8, services: 5, total: 25 },
      { date: '2026-02-03', rentals: 15, sales: 10, services: 7, total: 32 },
    ],
    totalTransactions: 450,
    previousTotalTransactions: 396,
    deltaPercent: 13.6,
    periodDays: 30,
  };

  beforeEach(() => {
    // Create mock service with vi.fn() methods
    mockService = {
      getOverview: vi.fn().mockResolvedValue(mockOverviewResponse),
      getTopPartners: vi.fn().mockResolvedValue(mockTopPartnersResponse),
      getActivity: vi.fn().mockResolvedValue(mockActivityResponse),
    };

    // Direct instantiation - no NestJS TestingModule needed
    controller = new PartnerDashboardController(mockService as unknown as PartnerDashboardService);
  });

  describe('GET /dashboard/partner/overview', () => {
    it('[P0] should return partner overview wrapped in data object', async () => {
      // GIVEN: Service returns overview data

      // WHEN: Calling getOverview endpoint
      const result = await controller.getOverview();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockOverviewResponse);
    });

    it('[P1] should call service getOverview method', async () => {
      // GIVEN: Service returns overview data

      // WHEN: Calling getOverview endpoint
      await controller.getOverview();

      // THEN: Service method was called
      expect(mockService.getOverview).toHaveBeenCalledTimes(1);
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns overview data

      // WHEN: Calling getOverview endpoint
      const result = await controller.getOverview();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('totalActive');
      expect(result.data).toHaveProperty('newPartners');
      expect(result.data).toHaveProperty('byCategory');
      expect(result.data).toHaveProperty('periodStart');
      expect(result.data).toHaveProperty('periodEnd');
    });
  });

  describe('GET /dashboard/partner/top', () => {
    it('[P0] should return top partners wrapped in data object', async () => {
      // GIVEN: Service returns top partners data

      // WHEN: Calling getTopPartners endpoint
      const result = await controller.getTopPartners();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockTopPartnersResponse);
    });

    it('[P1] should call service with default period (month) when not specified', async () => {
      // GIVEN: Service returns top partners data

      // WHEN: Calling getTopPartners without period
      await controller.getTopPartners();

      // THEN: Service called with 'month' default
      expect(mockService.getTopPartners).toHaveBeenCalledWith('month');
    });

    it('[P1] should pass period parameter to service', async () => {
      // GIVEN: Service returns top partners data

      // WHEN: Calling getTopPartners with period
      await controller.getTopPartners('quarter');

      // THEN: Service called with specified period
      expect(mockService.getTopPartners).toHaveBeenCalledWith('quarter');
    });

    it('[P1] should accept year period', async () => {
      // GIVEN: Service returns top partners data for year
      const yearResponse = { ...mockTopPartnersResponse, period: 'year' as const };
      mockService.getTopPartners.mockResolvedValue(yearResponse);

      // WHEN: Calling getTopPartners with year period
      const result = await controller.getTopPartners('year');

      // THEN: Returns year data
      expect(result.data.period).toBe('year');
      expect(mockService.getTopPartners).toHaveBeenCalledWith('year');
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns top partners data

      // WHEN: Calling getTopPartners endpoint
      const result = await controller.getTopPartners();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('partners');
      expect(result.data).toHaveProperty('period');
      expect(result.data).toHaveProperty('periodStart');
      expect(result.data).toHaveProperty('periodEnd');
      expect(Array.isArray(result.data.partners)).toBe(true);
    });
  });

  describe('GET /dashboard/partner/activity', () => {
    it('[P0] should return activity data wrapped in data object', async () => {
      // GIVEN: Service returns activity data

      // WHEN: Calling getActivity endpoint
      const result = await controller.getActivity();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockActivityResponse);
    });

    it('[P1] should call service with default days (30) when not specified', async () => {
      // GIVEN: Service returns activity data

      // WHEN: Calling getActivity without days
      await controller.getActivity();

      // THEN: Service called with 30 default
      expect(mockService.getActivity).toHaveBeenCalledWith(30);
    });

    it('[P1] should parse and pass days parameter to service', async () => {
      // GIVEN: Service returns activity data

      // WHEN: Calling getActivity with days string
      await controller.getActivity('14');

      // THEN: Service called with parsed integer
      expect(mockService.getActivity).toHaveBeenCalledWith(14);
    });

    it('[P1] should accept various days values', async () => {
      // GIVEN: Service returns activity data

      // WHEN: Calling getActivity with different days
      await controller.getActivity('7');

      // THEN: Service called with correct value
      expect(mockService.getActivity).toHaveBeenCalledWith(7);
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns activity data

      // WHEN: Calling getActivity endpoint
      const result = await controller.getActivity();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('activities');
      expect(result.data).toHaveProperty('totalTransactions');
      expect(result.data).toHaveProperty('previousTotalTransactions');
      expect(result.data).toHaveProperty('deltaPercent');
      expect(result.data).toHaveProperty('periodDays');
      expect(Array.isArray(result.data.activities)).toBe(true);
    });
  });
});
