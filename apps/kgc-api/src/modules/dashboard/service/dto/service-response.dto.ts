import { ApiProperty } from '@nestjs/swagger';

/**
 * Worksheet status for service dashboard
 */
export type WorksheetStatus =
  | 'DRAFT'
  | 'DIAGNOSED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'COMPLETED'
  | 'CLOSED';

/**
 * Service Summary Response DTO
 * GET /dashboard/service/summary
 */
export interface ServiceSummaryResponseDto {
  totalActive: number;
  byStatus: {
    status: WorksheetStatus;
    count: number;
    color: string;
  }[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Technician workload item
 */
export interface TechnicianWorkloadItem {
  id: string;
  name: string;
  activeWorksheets: number;
  maxCapacity: number;
  utilizationPercent: number;
  worksheets: {
    id: string;
    title: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  }[];
}

/**
 * Service Workload Response DTO
 * GET /dashboard/service/workload
 */
export interface ServiceWorkloadResponseDto {
  technicians: TechnicianWorkloadItem[];
}

/**
 * Service Revenue Response DTO
 * GET /dashboard/service/revenue
 */
export interface ServiceRevenueResponseDto {
  current: {
    total: number;
    laborFee: number;
    partsRevenue: number;
  };
  previous: {
    total: number;
    laborFee: number;
    partsRevenue: number;
  };
  delta: {
    totalPercent: number;
    laborPercent: number;
    partsPercent: number;
    trend: 'up' | 'down' | 'neutral';
  };
  period: 'day' | 'week' | 'month';
  periodStart: string;
  periodEnd: string;
}

/**
 * Swagger DTO classes for documentation
 */
export class ServiceSummaryResponseSwagger {
  @ApiProperty({ example: 42 })
  totalActive!: number;

  @ApiProperty({
    example: [
      { status: 'IN_PROGRESS', count: 15, color: 'blue' },
      { status: 'WAITING_PARTS', count: 8, color: 'yellow' },
    ],
  })
  byStatus!: { status: string; count: number; color: string }[];

  @ApiProperty({ example: '2026-02-01T00:00:00Z' })
  periodStart!: string;

  @ApiProperty({ example: '2026-02-04T23:59:59Z' })
  periodEnd!: string;
}

export class ServiceWorkloadResponseSwagger {
  @ApiProperty({
    example: [
      {
        id: 'tech-1',
        name: 'Kovács János',
        activeWorksheets: 3,
        maxCapacity: 5,
        utilizationPercent: 60,
        worksheets: [{ id: 'ws-1', title: 'Makita javítás', priority: 'HIGH' }],
      },
    ],
  })
  technicians!: TechnicianWorkloadItem[];
}

export class ServiceRevenueResponseSwagger {
  @ApiProperty({ example: { total: 450000, laborFee: 280000, partsRevenue: 170000 } })
  current!: { total: number; laborFee: number; partsRevenue: number };

  @ApiProperty({ example: { total: 380000, laborFee: 230000, partsRevenue: 150000 } })
  previous!: { total: number; laborFee: number; partsRevenue: number };

  @ApiProperty({
    example: { totalPercent: 18.4, laborPercent: 21.7, partsPercent: 13.3, trend: 'up' },
  })
  delta!: { totalPercent: number; laborPercent: number; partsPercent: number; trend: string };

  @ApiProperty({ example: 'week' })
  period!: string;
}

/**
 * Warranty Ratio Category
 */
export interface WarrantyRatioCategoryDto {
  count: number;
  revenue: number;
  percentage: number;
}

/**
 * Warranty Ratio Trend Item
 */
export interface WarrantyRatioTrendItemDto {
  month: string; // "2026-01"
  warrantyPercent: number;
}

/**
 * Warranty Ratio Response DTO (Story 49-1)
 * GET /dashboard/service/warranty-ratio
 */
export interface WarrantyRatioResponseDto {
  warranty: WarrantyRatioCategoryDto;
  paid: WarrantyRatioCategoryDto;
  trend: WarrantyRatioTrendItemDto[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Swagger DTO for Warranty Ratio (Story 49-1)
 */
export class WarrantyRatioResponseSwagger {
  @ApiProperty({
    example: { count: 42, revenue: 0, percentage: 35.0 },
    description: 'Garanciális javítások (nincs bevétel - garanciális)',
  })
  warranty!: WarrantyRatioCategoryDto;

  @ApiProperty({
    example: { count: 78, revenue: 1560000, percentage: 65.0 },
    description: 'Fizetős javítások (bevétellel)',
  })
  paid!: WarrantyRatioCategoryDto;

  @ApiProperty({
    example: [
      { month: '2026-01', warrantyPercent: 32 },
      { month: '2025-12', warrantyPercent: 38 },
    ],
    description: '6 havi trend a garanciális arányról',
  })
  trend!: WarrantyRatioTrendItemDto[];

  @ApiProperty({ example: '2026-02-01T00:00:00Z' })
  periodStart!: string;

  @ApiProperty({ example: '2026-02-11T23:59:59Z' })
  periodEnd!: string;
}

/**
 * Technician Profit Summary (Story 49-1)
 */
export interface TechnicianProfitSummaryDto {
  technicianId: string;
  technicianName: string;
  worksheetCount: number;
  totalRevenue: number;
  partsCost: number;
  laborRevenue: number;
  profit: number;
  profitMargin: number;
}

/**
 * Service Profit Response DTO (Story 49-1)
 * GET /dashboard/service/profit
 */
export interface ServiceProfitResponseDto {
  totalRevenue: number;
  totalPartsCost: number;
  totalLaborRevenue: number;
  totalProfit: number;
  averageProfitMargin: number;
  worksheetCount: number;
  technicians: TechnicianProfitSummaryDto[];
}

/**
 * Swagger DTO for Service Profit (Story 49-1)
 */
export class ServiceProfitResponseSwagger {
  @ApiProperty({ example: 2500000, description: 'Összes bevétel' })
  totalRevenue!: number;

  @ApiProperty({ example: 800000, description: 'Összes alkatrész költség' })
  totalPartsCost!: number;

  @ApiProperty({ example: 1700000, description: 'Összes munkadíj bevétel' })
  totalLaborRevenue!: number;

  @ApiProperty({ example: 1700000, description: 'Összes profit (bevétel - alkatrész költség)' })
  totalProfit!: number;

  @ApiProperty({ example: 68.0, description: 'Átlagos profit margin %' })
  averageProfitMargin!: number;

  @ApiProperty({ example: 45, description: 'Munkalapok száma' })
  worksheetCount!: number;

  @ApiProperty({
    example: [
      {
        technicianId: 'tech-1',
        technicianName: 'Kovács János',
        worksheetCount: 12,
        totalRevenue: 650000,
        partsCost: 180000,
        laborRevenue: 470000,
        profit: 470000,
        profitMargin: 72.3,
      },
    ],
    description: 'Szerelőnkénti profit összesítés',
  })
  technicians!: TechnicianProfitSummaryDto[];
}
