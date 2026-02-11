import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ServiceRevenueResponseDto,
  ServiceSummaryResponseDto,
  ServiceWorkloadResponseDto,
  WarrantyRatioResponseDto,
} from '../dto/service-response.dto';
import { RecurringIssuesService } from '../recurring-issues.service';
import { ServiceDashboardController } from '../service.controller';
import { ServiceDashboardService } from '../service.service';

/**
 * Service Dashboard Controller Tests (Story 35-5)
 *
 * Unit tests for service dashboard API endpoints
 * Priority: P1 (High - PR to main)
 */
describe('ServiceDashboardController', () => {
  let controller: ServiceDashboardController;
  let mockService: {
    getSummary: ReturnType<typeof vi.fn>;
    getWorkload: ReturnType<typeof vi.fn>;
    getRevenue: ReturnType<typeof vi.fn>;
    getWarrantyRatio: ReturnType<typeof vi.fn>;
  };
  let mockRecurringIssuesService: {
    getRecurringIssues: ReturnType<typeof vi.fn>;
    getServiceHistory: ReturnType<typeof vi.fn>;
  };

  const mockSummaryResponse: ServiceSummaryResponseDto = {
    totalActive: 35,
    byStatus: [
      { status: 'DRAFT', count: 5, color: 'gray' },
      { status: 'DIAGNOSED', count: 8, color: 'purple' },
      { status: 'IN_PROGRESS', count: 15, color: 'blue' },
      { status: 'WAITING_PARTS', count: 7, color: 'yellow' },
      { status: 'COMPLETED', count: 4, color: 'green' },
      { status: 'CLOSED', count: 3, color: 'slate' },
    ],
    periodStart: '2026-02-01T00:00:00.000Z',
    periodEnd: '2026-02-04T12:00:00.000Z',
  };

  const mockWorkloadResponse: ServiceWorkloadResponseDto = {
    technicians: [
      {
        id: 'tech-1',
        name: 'Kovács János',
        activeWorksheets: 3,
        maxCapacity: 5,
        utilizationPercent: 60,
        worksheets: [{ id: 'ws-1', title: 'Makita fúró javítás', priority: 'HIGH' }],
      },
    ],
  };

  const mockRevenueResponse: ServiceRevenueResponseDto = {
    current: { total: 450000, laborFee: 280000, partsRevenue: 170000 },
    previous: { total: 380000, laborFee: 230000, partsRevenue: 150000 },
    delta: { totalPercent: 18.4, laborPercent: 21.7, partsPercent: 13.3, trend: 'up' },
    period: 'week',
    periodStart: '2026-01-28T00:00:00.000Z',
    periodEnd: '2026-02-04T12:00:00.000Z',
  };

  const mockWarrantyRatioResponse: WarrantyRatioResponseDto = {
    warranty: { count: 42, revenue: 0, percentage: 35.0 },
    paid: { count: 78, revenue: 1560000, percentage: 65.0 },
    trend: [
      { month: '2026-02', warrantyPercent: 35 },
      { month: '2026-01', warrantyPercent: 32 },
      { month: '2025-12', warrantyPercent: 38 },
      { month: '2025-11', warrantyPercent: 41 },
      { month: '2025-10', warrantyPercent: 28 },
      { month: '2025-09', warrantyPercent: 33 },
    ],
    periodStart: '2026-02-01T00:00:00.000Z',
    periodEnd: '2026-02-11T12:00:00.000Z',
  };

  beforeEach(() => {
    // Create mock service with vi.fn() methods
    mockService = {
      getSummary: vi.fn().mockResolvedValue(mockSummaryResponse),
      getWorkload: vi.fn().mockResolvedValue(mockWorkloadResponse),
      getRevenue: vi.fn().mockResolvedValue(mockRevenueResponse),
      getWarrantyRatio: vi.fn().mockResolvedValue(mockWarrantyRatioResponse),
    };

    // Create mock recurring issues service
    mockRecurringIssuesService = {
      getRecurringIssues: vi.fn().mockResolvedValue({ issues: [], total: 0 }),
      getServiceHistory: vi.fn().mockResolvedValue({ history: [] }),
    };

    // Direct instantiation - no NestJS TestingModule needed
    controller = new ServiceDashboardController(
      mockService as unknown as ServiceDashboardService,
      mockRecurringIssuesService as unknown as RecurringIssuesService
    );
  });

  describe('GET /dashboard/service/summary', () => {
    it('[P0] should return service summary wrapped in data object', async () => {
      // GIVEN: Service returns summary data

      // WHEN: Calling getSummary endpoint
      const result = await controller.getSummary();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockSummaryResponse);
    });

    it('[P1] should call service getSummary method', async () => {
      // GIVEN: Service returns summary data

      // WHEN: Calling getSummary endpoint
      await controller.getSummary();

      // THEN: Service method was called
      expect(mockService.getSummary).toHaveBeenCalledTimes(1);
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns summary data

      // WHEN: Calling getSummary endpoint
      const result = await controller.getSummary();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('totalActive');
      expect(result.data).toHaveProperty('byStatus');
      expect(result.data).toHaveProperty('periodStart');
      expect(result.data).toHaveProperty('periodEnd');
    });
  });

  describe('GET /dashboard/service/workload', () => {
    it('[P0] should return workload data wrapped in data object', async () => {
      // GIVEN: Service returns workload data

      // WHEN: Calling getWorkload endpoint
      const result = await controller.getWorkload();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockWorkloadResponse);
    });

    it('[P1] should call service getWorkload method', async () => {
      // GIVEN: Service returns workload data

      // WHEN: Calling getWorkload endpoint
      await controller.getWorkload();

      // THEN: Service method was called
      expect(mockService.getWorkload).toHaveBeenCalledTimes(1);
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns workload data

      // WHEN: Calling getWorkload endpoint
      const result = await controller.getWorkload();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('technicians');
      expect(Array.isArray(result.data.technicians)).toBe(true);
    });
  });

  describe('GET /dashboard/service/revenue', () => {
    it('[P0] should return revenue data wrapped in data object', async () => {
      // GIVEN: Service returns revenue data

      // WHEN: Calling getRevenue endpoint
      const result = await controller.getRevenue();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockRevenueResponse);
    });

    it('[P1] should call service with default period (week) when not specified', async () => {
      // GIVEN: Service returns revenue data

      // WHEN: Calling getRevenue without period
      await controller.getRevenue();

      // THEN: Service called with 'week' default
      expect(mockService.getRevenue).toHaveBeenCalledWith('week');
    });

    it('[P1] should pass period parameter to service', async () => {
      // GIVEN: Service returns revenue data

      // WHEN: Calling getRevenue with period
      await controller.getRevenue('month');

      // THEN: Service called with specified period
      expect(mockService.getRevenue).toHaveBeenCalledWith('month');
    });

    it('[P1] should accept day period', async () => {
      // GIVEN: Service returns revenue data for day
      const dayResponse = { ...mockRevenueResponse, period: 'day' as const };
      mockService.getRevenue.mockResolvedValue(dayResponse);

      // WHEN: Calling getRevenue with day period
      const result = await controller.getRevenue('day');

      // THEN: Returns day data
      expect(result.data.period).toBe('day');
      expect(mockService.getRevenue).toHaveBeenCalledWith('day');
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns revenue data

      // WHEN: Calling getRevenue endpoint
      const result = await controller.getRevenue();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('current');
      expect(result.data).toHaveProperty('previous');
      expect(result.data).toHaveProperty('delta');
      expect(result.data).toHaveProperty('period');
      expect(result.data).toHaveProperty('periodStart');
      expect(result.data).toHaveProperty('periodEnd');
    });
  });

  /**
   * Warranty Ratio Controller Tests (Story 49-1)
   */
  describe('GET /dashboard/service/warranty-ratio', () => {
    it('[P0] should return warranty ratio data wrapped in data object', async () => {
      // GIVEN: Service returns warranty ratio data

      // WHEN: Calling getWarrantyRatio endpoint
      const result = await controller.getWarrantyRatio();

      // THEN: Returns { data: ... } wrapper
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockWarrantyRatioResponse);
    });

    it('[P1] should call service with default period (month) when not specified', async () => {
      // GIVEN: Service returns warranty ratio data

      // WHEN: Calling getWarrantyRatio without period
      await controller.getWarrantyRatio();

      // THEN: Service called with 'month' default
      expect(mockService.getWarrantyRatio).toHaveBeenCalledWith('month');
    });

    it('[P1] should pass period parameter to service', async () => {
      // GIVEN: Service returns warranty ratio data

      // WHEN: Calling getWarrantyRatio with period
      await controller.getWarrantyRatio('week');

      // THEN: Service called with specified period
      expect(mockService.getWarrantyRatio).toHaveBeenCalledWith('week');
    });

    it('[P1] should accept day period', async () => {
      // GIVEN: Service returns warranty ratio data for day
      const dayResponse = { ...mockWarrantyRatioResponse };
      mockService.getWarrantyRatio.mockResolvedValue(dayResponse);

      // WHEN: Calling getWarrantyRatio with day period
      await controller.getWarrantyRatio('day');

      // THEN: Service called with day period
      expect(mockService.getWarrantyRatio).toHaveBeenCalledWith('day');
    });

    it('[P1] should return correct response structure', async () => {
      // GIVEN: Service returns warranty ratio data

      // WHEN: Calling getWarrantyRatio endpoint
      const result = await controller.getWarrantyRatio();

      // THEN: Response has correct structure
      expect(result.data).toHaveProperty('warranty');
      expect(result.data).toHaveProperty('paid');
      expect(result.data).toHaveProperty('trend');
      expect(result.data).toHaveProperty('periodStart');
      expect(result.data).toHaveProperty('periodEnd');
      expect(result.data.warranty).toHaveProperty('count');
      expect(result.data.warranty).toHaveProperty('revenue');
      expect(result.data.warranty).toHaveProperty('percentage');
    });
  });
});
