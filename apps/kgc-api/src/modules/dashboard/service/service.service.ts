import { Injectable } from '@nestjs/common';
import type {
  ServiceRevenueResponseDto,
  ServiceSummaryResponseDto,
  ServiceWorkloadResponseDto,
  WarrantyRatioResponseDto,
  WorksheetStatus,
} from './dto/service-response.dto';

/**
 * Service Dashboard Service
 *
 * Aggregates service/worksheet data for dashboard widgets
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 */
@Injectable()
export class ServiceDashboardService {
  /**
   * Status colors for worksheet statuses
   */
  private readonly STATUS_COLORS: Record<WorksheetStatus, string> = {
    DRAFT: 'gray',
    DIAGNOSED: 'purple',
    IN_PROGRESS: 'blue',
    WAITING_PARTS: 'yellow',
    COMPLETED: 'green',
    CLOSED: 'slate',
  };

  /**
   * Get Service Summary (Munkalap összesítés)
   * Aggregates worksheet counts by status
   */
  async getSummary(): Promise<ServiceSummaryResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const worksheetCounts = await prisma.worksheet.groupBy({
    //   by: ['status'],
    //   _count: true,
    //   where: { status: { not: 'CLOSED' } },
    // });

    // Mock data for MVP
    const mockByStatus: { status: WorksheetStatus; count: number }[] = [
      { status: 'DRAFT', count: 5 },
      { status: 'DIAGNOSED', count: 8 },
      { status: 'IN_PROGRESS', count: 15 },
      { status: 'WAITING_PARTS', count: 7 },
      { status: 'COMPLETED', count: 4 },
      { status: 'CLOSED', count: 3 },
    ];

    const activeStatuses: WorksheetStatus[] = [
      'DRAFT',
      'DIAGNOSED',
      'IN_PROGRESS',
      'WAITING_PARTS',
    ];
    const totalActive = mockByStatus
      .filter(s => activeStatuses.includes(s.status))
      .reduce((sum, s) => sum + s.count, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      totalActive,
      byStatus: mockByStatus.map(s => ({
        status: s.status,
        count: s.count,
        color: this.STATUS_COLORS[s.status],
      })),
      periodStart: startOfMonth.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /**
   * Get Technician Workload (Szerelő terhelés)
   * Shows active worksheets per technician with capacity utilization
   */
  async getWorkload(): Promise<ServiceWorkloadResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const technicianWorkloads = await prisma.worksheet.groupBy({
    //   by: ['assignedTechnicianId'],
    //   _count: true,
    //   where: { status: { in: ['IN_PROGRESS', 'DIAGNOSED', 'WAITING_PARTS'] } },
    // });

    // Mock data for MVP
    const MAX_CAPACITY = 5;

    const mockTechnicians = [
      {
        id: 'tech-1',
        name: 'Kovács János',
        worksheets: [
          { id: 'ws-1', title: 'Makita fúró javítás', priority: 'HIGH' as const },
          { id: 'ws-2', title: 'Bosch flex szerviz', priority: 'NORMAL' as const },
          { id: 'ws-3', title: 'DeWalt csavarbehajtó', priority: 'URGENT' as const },
        ],
      },
      {
        id: 'tech-2',
        name: 'Nagy Péter',
        worksheets: [
          { id: 'ws-4', title: 'Hilti kalapács', priority: 'NORMAL' as const },
          { id: 'ws-5', title: 'Milwaukee akkumulátor', priority: 'LOW' as const },
        ],
      },
      {
        id: 'tech-3',
        name: 'Szabó István',
        worksheets: [
          { id: 'ws-6', title: 'Metabo sarokcsiszoló', priority: 'HIGH' as const },
          { id: 'ws-7', title: 'Festool porszívó', priority: 'NORMAL' as const },
          { id: 'ws-8', title: 'Stihl láncfűrész', priority: 'NORMAL' as const },
          { id: 'ws-9', title: 'Husqvarna vágó', priority: 'HIGH' as const },
        ],
      },
      {
        id: 'tech-4',
        name: 'Tóth Gábor',
        worksheets: [{ id: 'ws-10', title: 'Kärcher magasnyomású', priority: 'LOW' as const }],
      },
    ];

    return {
      technicians: mockTechnicians.map(tech => ({
        id: tech.id,
        name: tech.name,
        activeWorksheets: tech.worksheets.length,
        maxCapacity: MAX_CAPACITY,
        utilizationPercent: Math.round((tech.worksheets.length / MAX_CAPACITY) * 100),
        worksheets: tech.worksheets,
      })),
    };
  }

  /**
   * Get Service Revenue (Szerviz bevétel)
   * Aggregates revenue from completed worksheets
   */
  async getRevenue(period: 'day' | 'week' | 'month' = 'week'): Promise<ServiceRevenueResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const revenue = await prisma.worksheet.aggregate({
    //   _sum: { totalLaborFee: true, totalPartsValue: true },
    //   where: {
    //     status: { in: ['COMPLETED', 'CLOSED'] },
    //     completedAt: { gte: periodStart, lte: periodEnd },
    //   },
    // });

    // Mock data for MVP
    const mockData = {
      day: {
        current: { laborFee: 45000, partsRevenue: 32000 },
        previous: { laborFee: 38000, partsRevenue: 28000 },
      },
      week: {
        current: { laborFee: 280000, partsRevenue: 170000 },
        previous: { laborFee: 230000, partsRevenue: 150000 },
      },
      month: {
        current: { laborFee: 1120000, partsRevenue: 680000 },
        previous: { laborFee: 980000, partsRevenue: 620000 },
      },
    };

    const data = mockData[period];
    const current = {
      total: data.current.laborFee + data.current.partsRevenue,
      laborFee: data.current.laborFee,
      partsRevenue: data.current.partsRevenue,
    };
    const previous = {
      total: data.previous.laborFee + data.previous.partsRevenue,
      laborFee: data.previous.laborFee,
      partsRevenue: data.previous.partsRevenue,
    };

    const calcPercent = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const totalPercent = calcPercent(current.total, previous.total);

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      current,
      previous,
      delta: {
        totalPercent,
        laborPercent: calcPercent(current.laborFee, previous.laborFee),
        partsPercent: calcPercent(current.partsRevenue, previous.partsRevenue),
        trend: totalPercent > 0 ? 'up' : totalPercent < 0 ? 'down' : 'neutral',
      },
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /**
   * Get Warranty Ratio (Garanciális vs Fizetős arány) (Story 49-1)
   * Aggregates warranty vs paid service counts and revenue
   */
  async getWarrantyRatio(
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<WarrantyRatioResponseDto> {
    // TODO: Replace with Prisma aggregation
    // const worksheetCounts = await prisma.worksheet.groupBy({
    //   by: ['isWarranty'],
    //   _count: true,
    //   _sum: { totalRevenue: true },
    //   where: {
    //     status: { in: ['COMPLETED', 'CLOSED'] },
    //     completedAt: { gte: periodStart, lte: periodEnd },
    //   },
    // });

    // Mock data for MVP - simulating warranty vs paid service ratio
    const mockData = {
      day: {
        warranty: { count: 4, revenue: 0 },
        paid: { count: 11, revenue: 165000 },
      },
      week: {
        warranty: { count: 18, revenue: 0 },
        paid: { count: 42, revenue: 840000 },
      },
      month: {
        warranty: { count: 42, revenue: 0 },
        paid: { count: 78, revenue: 1560000 },
      },
    };

    const data = mockData[period];
    const totalCount = data.warranty.count + data.paid.count;

    // Calculate percentages
    const warrantyPercentage =
      totalCount > 0 ? Math.round((data.warranty.count / totalCount) * 1000) / 10 : 0;
    const paidPercentage =
      totalCount > 0 ? Math.round((data.paid.count / totalCount) * 1000) / 10 : 0;

    // Mock 6-month trend data (warranty percentage per month)
    const trendData = [
      { month: '2026-02', warrantyPercent: 35 },
      { month: '2026-01', warrantyPercent: 32 },
      { month: '2025-12', warrantyPercent: 38 },
      { month: '2025-11', warrantyPercent: 41 },
      { month: '2025-10', warrantyPercent: 28 },
      { month: '2025-09', warrantyPercent: 33 },
    ];

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      warranty: {
        count: data.warranty.count,
        revenue: data.warranty.revenue,
        percentage: warrantyPercentage,
      },
      paid: {
        count: data.paid.count,
        revenue: data.paid.revenue,
        percentage: paidPercentage,
      },
      trend: trendData,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    };
  }
}
