/**
 * Rental Dashboard Service
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 *
 * Provides rental statistics for dashboard widgets:
 * - Average rental days with delta
 * - Popular equipment rankings
 * - Monthly seasonality trends
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 * - Implement real calculations from database
 *
 * Multi-tenancy: NEM ad hozzá manuálisan tenant_id-t!
 * RLS policy automatikusan szűri: current_setting('app.current_tenant_id')
 */

import { Injectable } from '@nestjs/common';
import type {
  PopularEquipmentResponse,
  RentalStatsResponse,
  SeasonalityResponse,
} from './dto/rental-dashboard.dto';

@Injectable()
export class RentalDashboardService {
  /**
   * Get Rental Statistics
   * Returns average rental days and metrics
   */
  async getStats(): Promise<RentalStatsResponse> {
    // TODO: Prisma aggregation
    // const rentals = await prisma.rental.findMany({
    //   where: { status: { in: ['ACTIVE', 'COMPLETED', 'OVERDUE'] } },
    // });
    // Calculate average rental duration...

    // Mock data for MVP - realistic numbers
    const averageRentalDays = 4.2;
    const averageRentalDaysDelta = 8.5; // +8.5% vs previous period
    const totalRentals = 342;
    const activeRentals = 28;
    const overdueRentals = 3;

    return {
      data: {
        averageRentalDays,
        averageRentalDaysDelta,
        totalRentals,
        activeRentals,
        overdueRentals,
      },
    };
  }

  /**
   * Get Popular Equipment
   * Returns top N equipment by rental count
   *
   * @param limit Number of equipment to return (default: 5)
   */
  async getPopularEquipment(limit: number = 5): Promise<PopularEquipmentResponse> {
    // TODO: Prisma aggregation
    // const equipment = await prisma.rentalEquipment.findMany({
    //   include: { _count: { select: { rentalItems: true } } },
    //   orderBy: { rentalItems: { _count: 'desc' } },
    //   take: limit,
    // });

    // Mock data for MVP - realistic Hungarian equipment names
    const mockPopularEquipment = [
      {
        id: 'eq-001',
        name: 'Makita HR2470 Fúrókalapács',
        rentalCount: 87,
        revenue: 485_000,
      },
      {
        id: 'eq-002',
        name: 'DeWalt DCD795 Akkus fúró',
        rentalCount: 72,
        revenue: 420_000,
      },
      {
        id: 'eq-003',
        name: 'Bosch GSR 18V Csavarbehajtó',
        rentalCount: 65,
        revenue: 365_000,
      },
      {
        id: 'eq-004',
        name: 'Milwaukee M18 Sarokcsiszoló',
        rentalCount: 58,
        revenue: 348_000,
      },
      {
        id: 'eq-005',
        name: 'Hilti TE 30 Kombikalapács',
        rentalCount: 51,
        revenue: 312_000,
      },
      {
        id: 'eq-006',
        name: 'Festool Kapex Gérvágó',
        rentalCount: 45,
        revenue: 288_000,
      },
      {
        id: 'eq-007',
        name: 'Metabo SBE 780 Ütvefúró',
        rentalCount: 42,
        revenue: 265_000,
      },
    ];

    return {
      data: {
        equipment: mockPopularEquipment.slice(0, limit),
      },
    };
  }

  /**
   * Get Seasonality Data
   * Returns monthly rental trends
   *
   * @param months Number of months to return (default: 12)
   */
  async getSeasonality(months: number = 12): Promise<SeasonalityResponse> {
    // TODO: Prisma aggregation
    // const startDate = subMonths(new Date(), months);
    // const rentals = await prisma.rental.groupBy({
    //   by: ['createdAt'],
    //   _count: true,
    //   _sum: { totalAmount: true },
    //   where: { createdAt: { gte: startDate } },
    // });

    // Mock data for MVP - 12 months of realistic data
    // Generate months from current date backwards
    const now = new Date();
    const mockData = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Seasonal pattern: higher in spring/summer, lower in winter
      const monthNum = date.getMonth();
      let baseFactor = 1.0;
      if (monthNum >= 3 && monthNum <= 8) {
        // Spring/Summer (April-September)
        baseFactor = 1.3;
      } else if (monthNum === 11 || monthNum === 0 || monthNum === 1) {
        // Winter (December-February)
        baseFactor = 0.7;
      }

      // Add some randomness for realistic data
      const randomFactor = 0.9 + Math.random() * 0.2;
      const rentalCount = Math.round(28 * baseFactor * randomFactor);
      const avgRevenuePerRental = 45_000;
      const revenue = Math.round(rentalCount * avgRevenuePerRental * randomFactor);

      mockData.push({
        month,
        rentalCount,
        revenue,
      });
    }

    return {
      data: mockData,
    };
  }
}
