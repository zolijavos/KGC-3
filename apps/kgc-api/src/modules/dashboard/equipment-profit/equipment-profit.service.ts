/**
 * Equipment Profit Dashboard Service
 * Epic 40: Story 40-4 - Bérgép megtérülés dashboard widget
 *
 * Aggregates equipment profit data for dashboard widgets.
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 * - Implement real profit calculations from database
 *
 * Multi-tenancy: NEM ad hozzá manuálisan tenant_id-t!
 * RLS policy automatikusan szűri: current_setting('app.current_tenant_id')
 */

import { Injectable } from '@nestjs/common';
import type {
  EquipmentProfitDetailResponse,
  FleetProfitSummaryResponse,
  TopEquipmentResponse,
} from './dto/equipment-profit-dashboard.dto';

@Injectable()
export class EquipmentProfitDashboardService {
  /**
   * Get Fleet-wide Profit Summary
   * Aggregates total revenue, costs, profit for all equipment
   */
  async getSummary(): Promise<FleetProfitSummaryResponse> {
    // TODO: Prisma aggregation
    // const equipment = await prisma.rentalEquipment.findMany({
    //   include: {
    //     rentalItems: { include: { rental: true } },
    //     worksheets: true,
    //   },
    // });
    // Calculate aggregates...

    // Mock data for MVP - realistic numbers
    const totalRevenue = 12_450_000;
    const purchaseCosts = 6_500_000;
    const serviceCosts = 1_730_000;
    const totalCosts = purchaseCosts + serviceCosts;
    const totalProfit = totalRevenue - totalCosts;
    const equipmentCount = 87;
    const profitableCount = 62;
    const losingCount = 18;
    const breakEvenCount = 7;

    // Average ROI: (profit / purchase costs) * 100
    const averageRoi = Math.round((totalProfit / purchaseCosts) * 100 * 100) / 100;

    return {
      data: {
        totalRevenue,
        totalCosts,
        totalProfit,
        averageRoi,
        equipmentCount,
        profitableCount,
        losingCount: losingCount + breakEvenCount, // Combine for simplicity
      },
    };
  }

  /**
   * Get Top 5 Most Profitable Equipment
   * Returns equipment sorted by profit descending
   *
   * @param limit Number of equipment to return (default: 5)
   */
  async getTopEquipment(limit: number = 5): Promise<TopEquipmentResponse> {
    // TODO: Prisma aggregation
    // const equipment = await prisma.rentalEquipment.findMany({
    //   include: { rentalItems: { include: { rental: true } }, worksheets: true },
    // });
    // Sort by profit and take top N

    // Mock data for MVP
    const mockTopEquipment = [
      {
        equipmentId: 'eq-001',
        equipmentCode: 'BG-2023-0042',
        name: 'Makita HR2470 Fúrókalapács',
        profit: 285_000,
        roi: 47.5,
        totalRevenue: 485_000,
      },
      {
        equipmentId: 'eq-002',
        equipmentCode: 'BG-2022-0018',
        name: 'DeWalt DCD795 Akkus fúró',
        profit: 230_000,
        roi: 38.3,
        totalRevenue: 420_000,
      },
      {
        equipmentId: 'eq-003',
        equipmentCode: 'BG-2023-0067',
        name: 'Bosch GSR 18V Csavarbehajtó',
        profit: 195_000,
        roi: 32.5,
        totalRevenue: 365_000,
      },
      {
        equipmentId: 'eq-004',
        equipmentCode: 'BG-2024-0005',
        name: 'Milwaukee M18 Sarokcsiszoló',
        profit: 168_000,
        roi: 28.0,
        totalRevenue: 348_000,
      },
      {
        equipmentId: 'eq-005',
        equipmentCode: 'BG-2023-0089',
        name: 'Hilti TE 30 Kombikalapács',
        profit: 142_000,
        roi: 23.7,
        totalRevenue: 312_000,
      },
      {
        equipmentId: 'eq-006',
        equipmentCode: 'BG-2022-0055',
        name: 'Festool Kapex Gérvágó',
        profit: 128_000,
        roi: 21.3,
        totalRevenue: 288_000,
      },
      {
        equipmentId: 'eq-007',
        equipmentCode: 'BG-2023-0112',
        name: 'Metabo SBE 780 Ütvefúró',
        profit: 115_000,
        roi: 19.2,
        totalRevenue: 265_000,
      },
    ];

    return {
      data: mockTopEquipment.slice(0, limit),
    };
  }

  /**
   * Get Equipment Profit Detail
   * Returns detailed profit data for a specific equipment
   *
   * @param equipmentId Equipment ID
   */
  async getEquipmentDetail(equipmentId: string): Promise<EquipmentProfitDetailResponse | null> {
    // TODO: Prisma query
    // const equipment = await prisma.rentalEquipment.findUnique({
    //   where: { id: equipmentId },
    //   include: { rentalItems: { include: { rental: true } }, worksheets: true },
    // });

    // Mock data for MVP - find matching equipment
    const mockEquipment: Record<string, EquipmentProfitDetailResponse['data']> = {
      'eq-001': {
        equipmentId: 'eq-001',
        equipmentCode: 'BG-2023-0042',
        name: 'Makita HR2470 Fúrókalapács',
        purchasePrice: 600_000,
        totalRevenue: 485_000,
        totalServiceCost: 50_000,
        profit: 285_000,
        roi: 47.5,
        status: 'PROFITABLE',
        rentalCount: 42,
        lastRentalDate: '2026-02-05',
      },
      'eq-002': {
        equipmentId: 'eq-002',
        equipmentCode: 'BG-2022-0018',
        name: 'DeWalt DCD795 Akkus fúró',
        purchasePrice: 600_000,
        totalRevenue: 420_000,
        totalServiceCost: 30_000,
        profit: 230_000,
        roi: 38.3,
        status: 'PROFITABLE',
        rentalCount: 38,
        lastRentalDate: '2026-02-04',
      },
    };

    const data = mockEquipment[equipmentId];
    if (!data) {
      // Return a generic mock for unknown IDs
      return {
        data: {
          equipmentId,
          equipmentCode: 'BG-XXXX-XXXX',
          name: 'Unknown Equipment',
          purchasePrice: null,
          totalRevenue: 0,
          totalServiceCost: 0,
          profit: null,
          roi: null,
          status: 'INCOMPLETE',
          rentalCount: 0,
          lastRentalDate: null,
        },
      };
    }

    return { data };
  }
}
