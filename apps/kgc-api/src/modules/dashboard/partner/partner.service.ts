import { Injectable } from '@nestjs/common';
import {
  DEFAULT_GIFT_THRESHOLD,
  type PartnerActivityResponseDto,
  type PartnerCategory,
  type PartnerOverviewResponseDto,
  type TopPartnersResponseDto,
} from './dto/partner-response.dto';

/**
 * Partner Dashboard Service
 *
 * Aggregates partner data for dashboard widgets
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Integrate with Twenty CRM for real partner data
 * - Add tenant-aware queries (RLS automatic)
 */
@Injectable()
export class PartnerDashboardService {
  /**
   * Category colors for partner categories
   */
  private readonly CATEGORY_COLORS: Record<PartnerCategory, string> = {
    RETAIL: 'blue',
    B2B: 'purple',
    VIP: 'amber',
  };

  /**
   * Get Partner Overview (Partner összesítés)
   * Aggregates active partners by category
   */
  async getOverview(): Promise<PartnerOverviewResponseDto> {
    // TODO: Replace with Prisma/Twenty CRM aggregation
    // const partnerCounts = await prisma.partner.groupBy({
    //   by: ['category'],
    //   _count: true,
    //   where: { isActive: true },
    // });
    // const newPartners = await prisma.partner.count({
    //   where: { createdAt: { gte: thirtyDaysAgo } },
    // });

    // Mock data for MVP
    const mockByCategory: { category: PartnerCategory; count: number }[] = [
      { category: 'RETAIL', count: 98 },
      { category: 'B2B', count: 45 },
      { category: 'VIP', count: 13 },
    ];

    const totalActive = mockByCategory.reduce((sum, c) => sum + c.count, 0);
    const newPartners = 12; // Mock: új partnerek 30 nap alatt

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      totalActive,
      newPartners,
      byCategory: mockByCategory.map(c => ({
        category: c.category,
        count: c.count,
        color: this.CATEGORY_COLORS[c.category],
      })),
      periodStart: thirtyDaysAgo.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /**
   * Get Top Partners (Top partnerek)
   * Returns top 10 partners by revenue
   */
  async getTopPartners(
    period: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<TopPartnersResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const topPartners = await prisma.$queryRaw`
    //   SELECT p.id, p.name,
    //     SUM(CASE WHEN t.type = 'RENTAL' THEN t.amount ELSE 0 END) as rental_revenue,
    //     SUM(CASE WHEN t.type = 'SALE' THEN t.amount ELSE 0 END) as sales_revenue,
    //     SUM(CASE WHEN t.type = 'SERVICE' THEN t.amount ELSE 0 END) as service_revenue
    //   FROM partners p
    //   JOIN transactions t ON t.partner_id = p.id
    //   WHERE t.created_at >= ${periodStart}
    //   GROUP BY p.id
    //   ORDER BY SUM(t.amount) DESC
    //   LIMIT 10
    // `;

    // Mock data for MVP (Story 41-3: Extended with lastPurchaseDate)
    const now = new Date();
    const mockPartners = [
      {
        id: 'partner-1',
        name: 'Építő Kft.',
        rentalRevenue: 1800000,
        salesRevenue: 450000,
        serviceRevenue: 200000,
        trendPercent: 15.3,
        lastPurchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-2',
        name: 'Megabau Zrt.',
        rentalRevenue: 1500000,
        salesRevenue: 320000,
        serviceRevenue: 180000,
        trendPercent: 8.7,
        lastPurchaseDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-3',
        name: 'Profi Szerelő Bt.',
        rentalRevenue: 980000,
        salesRevenue: 580000,
        serviceRevenue: 350000,
        trendPercent: -2.4,
        lastPurchaseDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-4',
        name: 'Kovács és Társa',
        rentalRevenue: 750000,
        salesRevenue: 420000,
        serviceRevenue: 280000,
        trendPercent: 22.1,
        lastPurchaseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-5',
        name: 'Felújító Csoport Kft.',
        rentalRevenue: 620000,
        salesRevenue: 380000,
        serviceRevenue: 220000,
        trendPercent: 5.8,
        lastPurchaseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-6',
        name: 'Mester Szerszám Kft.',
        rentalRevenue: 540000,
        salesRevenue: 480000,
        serviceRevenue: 150000,
        trendPercent: -8.2,
        lastPurchaseDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-7',
        name: 'Nagy József EV',
        rentalRevenue: 480000,
        salesRevenue: 180000,
        serviceRevenue: 320000,
        trendPercent: 12.5,
        lastPurchaseDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-8',
        name: 'Építőipari Kft.',
        rentalRevenue: 420000,
        salesRevenue: 350000,
        serviceRevenue: 180000,
        trendPercent: 0,
        lastPurchaseDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-9',
        name: 'Barkács Centrum',
        rentalRevenue: 380000,
        salesRevenue: 420000,
        serviceRevenue: 120000,
        trendPercent: 4.2,
        lastPurchaseDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'partner-10',
        name: 'Profi Kivitelező',
        rentalRevenue: 320000,
        salesRevenue: 280000,
        serviceRevenue: 250000,
        trendPercent: -3.1,
        lastPurchaseDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    let periodStart: Date;

    switch (period) {
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Story 41-3: Calculate gift eligibility based on annual revenue
    return {
      partners: mockPartners.map(p => {
        const totalRevenue = p.rentalRevenue + p.salesRevenue + p.serviceRevenue;
        return {
          id: p.id,
          name: p.name,
          totalRevenue,
          rentalRevenue: p.rentalRevenue,
          salesRevenue: p.salesRevenue,
          serviceRevenue: p.serviceRevenue,
          trendPercent: p.trendPercent,
          lastPurchaseDate: p.lastPurchaseDate,
          giftEligible: totalRevenue >= DEFAULT_GIFT_THRESHOLD,
        };
      }),
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /**
   * Get Partner Activity (Partner aktivitás)
   * Returns daily transaction counts for last 30 days
   */
  async getActivity(days: number = 30): Promise<PartnerActivityResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const activities = await prisma.$queryRaw`
    //   SELECT DATE(created_at) as date,
    //     COUNT(CASE WHEN type = 'RENTAL' THEN 1 END) as rentals,
    //     COUNT(CASE WHEN type = 'SALE' THEN 1 END) as sales,
    //     COUNT(CASE WHEN type = 'SERVICE' THEN 1 END) as services
    //   FROM transactions
    //   WHERE created_at >= ${daysAgo}
    //   GROUP BY DATE(created_at)
    //   ORDER BY date ASC
    // `;

    // Mock data for MVP - generate realistic daily data
    const activities = [];
    const now = new Date();
    let totalTransactions = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Simulate business patterns (weekends have less activity)
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const multiplier = isWeekend ? 0.4 : 1;

      const rentals = Math.floor((8 + Math.random() * 10) * multiplier);
      const sales = Math.floor((5 + Math.random() * 8) * multiplier);
      const services = Math.floor((3 + Math.random() * 6) * multiplier);
      const total = rentals + sales + services;

      activities.push({
        date: dateStr ?? '',
        rentals,
        sales,
        services,
        total,
      });

      totalTransactions += total;
    }

    // Mock previous period total (slightly lower)
    const previousTotalTransactions = Math.floor(totalTransactions * 0.88);
    const deltaPercent =
      previousTotalTransactions > 0
        ? Math.round(
            ((totalTransactions - previousTotalTransactions) / previousTotalTransactions) * 1000
          ) / 10
        : 0;

    return {
      activities,
      totalTransactions,
      previousTotalTransactions,
      deltaPercent,
      periodDays: days,
    };
  }
}
