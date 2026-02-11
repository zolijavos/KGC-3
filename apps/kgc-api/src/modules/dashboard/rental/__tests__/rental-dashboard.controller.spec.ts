/**
 * RentalDashboardController Tests
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Unit tests for rental dashboard endpoints
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PopularEquipmentResponse,
  RentalStatsResponse,
  SeasonalityResponse,
} from '../dto/rental-dashboard.dto';
import { RentalDashboardController } from '../rental-dashboard.controller';
import type { RentalDashboardService } from '../rental-dashboard.service';

describe('RentalDashboardController', () => {
  let controller: RentalDashboardController;
  let mockService: {
    getStats: ReturnType<typeof vi.fn>;
    getPopularEquipment: ReturnType<typeof vi.fn>;
    getSeasonality: ReturnType<typeof vi.fn>;
  };

  const mockStatsResponse: RentalStatsResponse = {
    data: {
      averageRentalDays: 4.2,
      averageRentalDaysDelta: 8.5,
      totalRentals: 342,
      activeRentals: 28,
      overdueRentals: 3,
    },
  };

  const mockPopularEquipmentResponse: PopularEquipmentResponse = {
    data: {
      equipment: [
        { id: 'eq-001', name: 'Makita HR2470', rentalCount: 87, revenue: 485000 },
        { id: 'eq-002', name: 'DeWalt DCD795', rentalCount: 72, revenue: 420000 },
        { id: 'eq-003', name: 'Bosch GSR 18V', rentalCount: 65, revenue: 365000 },
        { id: 'eq-004', name: 'Milwaukee M18', rentalCount: 58, revenue: 348000 },
        { id: 'eq-005', name: 'Hilti TE 30', rentalCount: 51, revenue: 312000 },
      ],
    },
  };

  const mockSeasonalityResponse: SeasonalityResponse = {
    data: [
      { month: '2026-01', rentalCount: 28, revenue: 1260000 },
      { month: '2026-02', rentalCount: 32, revenue: 1440000 },
    ],
  };

  beforeEach(() => {
    mockService = {
      getStats: vi.fn().mockResolvedValue(mockStatsResponse),
      getPopularEquipment: vi.fn().mockResolvedValue(mockPopularEquipmentResponse),
      getSeasonality: vi.fn().mockResolvedValue(mockSeasonalityResponse),
    };

    controller = new RentalDashboardController(mockService as unknown as RentalDashboardService);
  });

  describe('GET /dashboard/rental/stats', () => {
    it('[P0] should return rental statistics', async () => {
      const result = await controller.getStats();

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockStatsResponse.data);
    });

    it('[P0] should call service getStats', async () => {
      await controller.getStats();

      expect(mockService.getStats).toHaveBeenCalled();
    });

    it('[P1] should return averageRentalDays', async () => {
      const result = await controller.getStats();

      expect(result.data.averageRentalDays).toBe(4.2);
    });

    it('[P1] should return averageRentalDaysDelta', async () => {
      const result = await controller.getStats();

      expect(result.data.averageRentalDaysDelta).toBe(8.5);
    });
  });

  describe('GET /dashboard/rental/popular', () => {
    it('[P0] should return popular equipment list', async () => {
      const result = await controller.getPopularEquipment();

      expect(result).toBeDefined();
      expect(result.data.equipment).toHaveLength(5);
    });

    it('[P0] should call service with default limit', async () => {
      await controller.getPopularEquipment();

      expect(mockService.getPopularEquipment).toHaveBeenCalledWith(5);
    });

    it('[P1] should respect limit parameter', async () => {
      await controller.getPopularEquipment('3');

      expect(mockService.getPopularEquipment).toHaveBeenCalledWith(3);
    });

    it('[P1] should cap limit at 20', async () => {
      await controller.getPopularEquipment('100');

      expect(mockService.getPopularEquipment).toHaveBeenCalledWith(20);
    });
  });

  describe('GET /dashboard/rental/seasonality', () => {
    it('[P0] should return seasonality data', async () => {
      const result = await controller.getSeasonality();

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
    });

    it('[P0] should call service with default months', async () => {
      await controller.getSeasonality();

      expect(mockService.getSeasonality).toHaveBeenCalledWith(12);
    });

    it('[P1] should respect months parameter', async () => {
      await controller.getSeasonality('6');

      expect(mockService.getSeasonality).toHaveBeenCalledWith(6);
    });

    it('[P1] should cap months at 24', async () => {
      await controller.getSeasonality('100');

      expect(mockService.getSeasonality).toHaveBeenCalledWith(24);
    });
  });
});
