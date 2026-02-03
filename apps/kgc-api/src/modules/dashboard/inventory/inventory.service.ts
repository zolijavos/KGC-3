import { Injectable } from '@nestjs/common';
import type { InventoryQueryDto } from './dto/inventory-query.dto';
import type {
  StockSummaryResponse,
  StockAlertResponse,
  StockMovementResponse,
  StockHeatmapResponse,
} from './dto/inventory-response.dto';

/**
 * Inventory Service
 *
 * Aggregates stock data for dashboard widgets
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 * - Implement real-time threshold calculations from database
 *
 * Multi-tenancy: NEM ad hozzá manuálisan tenant_id-t!
 * RLS policy automatikusan szűri: current_setting('app.current_tenant_id')
 */
@Injectable()
export class InventoryService {
  /**
   * Get Stock Summary
   * Aggregates total count, location breakdown, status breakdown
   */
  async getSummary(): Promise<StockSummaryResponse> {
    // TODO: Prisma aggregation
    // const machines = await prisma.machine.groupBy({
    //   by: ['locationId', 'status'],
    //   _count: true,
    // });

    // Mock data for MVP
    const total = 342;
    const byLocation = {
      bolt_1: { count: 180, percentage: 52.6 },
      bolt_2: { count: 140, percentage: 40.9 },
      warehouse: { count: 22, percentage: 6.4 },
    };
    const byStatus = {
      available: 52,
      rented: 290,
      service: 0,
    };

    // FIX #1: Proper response wrapper structure
    return {
      data: {
        total,
        byLocation,
        byStatus,
      },
    } as StockSummaryResponse;
  }

  /**
   * Get Stock Alerts
   * Returns machines with stock below threshold
   * Critical: < 50% threshold, Warning: 50-100% threshold
   *
   * @param query - Optional severity filter and days range
   */
  async getAlerts(query: InventoryQueryDto): Promise<StockAlertResponse> {
    // TODO: Prisma query with threshold comparison
    // const alerts = await prisma.machine.findMany({
    //   where: {
    //     currentStock: { lt: prisma.raw('minimum_threshold') },
    //   },
    //   take: 10,
    //   orderBy: [{ severity: 'desc' }, { currentStock: 'asc' }],
    // });

    // Mock data for MVP
    const allAlerts = [
      {
        id: 'machine-001',
        model: 'Makita DHP485',
        type: 'Fúrócsavarbelyegzőgép',
        currentStock: 8,
        minimumThreshold: 20,
        severity: 'critical' as const,
        lastPurchase: '2026-01-15',
      },
      {
        id: 'machine-002',
        model: 'DeWalt DCD795',
        type: 'Csavarbelyegzőgép',
        currentStock: 22,
        minimumThreshold: 30,
        severity: 'warning' as const,
        lastPurchase: '2026-01-20',
      },
      {
        id: 'machine-003',
        model: 'Bosch GSR 18V',
        type: 'Akkus csavarbelyegző',
        currentStock: 5,
        minimumThreshold: 15,
        severity: 'critical' as const,
        lastPurchase: '2026-01-10',
      },
      {
        id: 'machine-004',
        model: 'Milwaukee M18',
        type: 'Ütvecsavarozó',
        currentStock: 18,
        minimumThreshold: 25,
        severity: 'warning' as const,
        lastPurchase: '2026-01-22',
      },
      {
        id: 'machine-005',
        model: 'Hilti SF 6H',
        type: 'Fúrókalapács',
        currentStock: 3,
        minimumThreshold: 10,
        severity: 'critical' as const,
        lastPurchase: '2026-01-05',
      },
    ];

    // Filter by severity
    // FIX #2: Defensive programming - handle empty string
    let filteredAlerts = allAlerts;
    const severityFilter = query.severity?.trim();
    if (severityFilter && severityFilter !== 'all') {
      filteredAlerts = allAlerts.filter((alert) => alert.severity === severityFilter);
    }

    // Limit to max 10 alerts
    return { data: filteredAlerts.slice(0, 10) } as StockAlertResponse;
  }

  /**
   * Get Stock Movement
   * Returns daily inbound/outbound movement for last N days
   *
   * @param query - Days to look back (default: 30)
   */
  async getMovement(query: InventoryQueryDto): Promise<StockMovementResponse> {
    // TODO: Prisma aggregation from rental_history
    // const movements = await prisma.rentalHistory.groupBy({
    //   by: ['date'],
    //   _count: { _all: true },
    //   where: {
    //     date: { gte: daysAgo(query.days ?? 30) },
    //   },
    // });

    const days = query.days ?? 30;
    const movements: Array<{ date: string; inbound: number; outbound: number; net: number }> = [];

    // Generate mock data for last N days
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // FIX #3: Document magic numbers - realistic machine rental patterns
      // Inbound: 2-16 machines/day (average 9) - purchases and returns
      // Outbound: 5-24 machines/day (average 14.5) - rentals
      const inbound = Math.floor(Math.random() * 15) + 2;
      const outbound = Math.floor(Math.random() * 20) + 5;
      const net = inbound - outbound;

      // FIX #4: Timezone-safe date formatting (avoid UTC midnight conversion)
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateString = localDate.toISOString().split('T')[0]!;

      movements.push({
        date: dateString,
        inbound,
        outbound,
        net,
      });
    }

    return { data: movements } as StockMovementResponse;
  }

  /**
   * Get Stock Heatmap
   * Returns machine type x location utilization grid
   */
  async getHeatmap(): Promise<StockHeatmapResponse> {
    // TODO: Prisma aggregation
    // const heatmap = await prisma.machine.groupBy({
    //   by: ['type', 'locationId'],
    //   _count: true,
    //   _avg: { utilizationPercent: true },
    // });

    // Mock data for MVP
    const machineTypes = [
      'Fúrócsavarbelyegzőgép',
      'Csavarbelyegzőgép',
      'Akkus csavarbelyegző',
      'Fúrókalapács',
      'Sarokcsiszoló',
    ];
    const locations = ['Bolt 1', 'Bolt 2', 'Raktár', 'Szerviz'];

    const heatmapData: Array<{
      machineType: string;
      location: string;
      count: number;
      utilizationPercent: number;
    }> = [];

    for (const machineType of machineTypes) {
      for (const location of locations) {
        // Mock count and utilization
        const count = Math.floor(Math.random() * 60) + 10; // 10-69
        const utilizationPercent = Math.floor(Math.random() * 100); // 0-99

        heatmapData.push({
          machineType,
          location,
          count,
          utilizationPercent,
        });
      }
    }

    return { data: heatmapData } as StockHeatmapResponse;
  }
}
