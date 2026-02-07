import { ApiProperty } from '@nestjs/swagger';

/**
 * Partner category types from Twenty CRM
 */
export type PartnerCategory = 'RETAIL' | 'B2B' | 'VIP';

/**
 * Partner Overview Response DTO
 * GET /dashboard/partner/overview
 */
export interface PartnerOverviewResponseDto {
  totalActive: number;
  newPartners: number;
  byCategory: {
    category: PartnerCategory;
    count: number;
    color: string;
  }[];
  periodStart: string;
  periodEnd: string;
}

/**
 * Top Partner item
 * Story 41-3: Extended with gift eligibility fields
 */
export interface TopPartnerItem {
  id: string;
  name: string;
  totalRevenue: number;
  rentalRevenue: number;
  salesRevenue: number;
  serviceRevenue: number;
  trendPercent: number;
  /** Story 41-3: Last purchase date */
  lastPurchaseDate: string;
  /** Story 41-3: Gift eligibility (annual revenue > threshold) */
  giftEligible: boolean;
}

/** Story 41-3: Default gift eligibility threshold in HUF */
export const DEFAULT_GIFT_THRESHOLD = 500_000;

/**
 * Top Partners Response DTO
 * GET /dashboard/partner/top
 */
export interface TopPartnersResponseDto {
  partners: TopPartnerItem[];
  period: 'month' | 'quarter' | 'year';
  periodStart: string;
  periodEnd: string;
}

/**
 * Activity data point
 */
export interface PartnerActivityItem {
  date: string;
  rentals: number;
  sales: number;
  services: number;
  total: number;
}

/**
 * Partner Activity Response DTO
 * GET /dashboard/partner/activity
 */
export interface PartnerActivityResponseDto {
  activities: PartnerActivityItem[];
  totalTransactions: number;
  previousTotalTransactions: number;
  deltaPercent: number;
  periodDays: number;
}

/**
 * Swagger DTO classes for documentation
 */
export class PartnerOverviewResponseSwagger {
  @ApiProperty({ example: 156 })
  totalActive!: number;

  @ApiProperty({ example: 12 })
  newPartners!: number;

  @ApiProperty({
    example: [
      { category: 'RETAIL', count: 98, color: 'blue' },
      { category: 'B2B', count: 45, color: 'purple' },
      { category: 'VIP', count: 13, color: 'amber' },
    ],
  })
  byCategory!: { category: string; count: number; color: string }[];

  @ApiProperty({ example: '2026-01-05T00:00:00Z' })
  periodStart!: string;

  @ApiProperty({ example: '2026-02-04T23:59:59Z' })
  periodEnd!: string;
}

export class TopPartnersResponseSwagger {
  @ApiProperty({
    example: [
      {
        id: 'partner-1',
        name: 'Építő Kft.',
        totalRevenue: 2450000,
        rentalRevenue: 1800000,
        salesRevenue: 450000,
        serviceRevenue: 200000,
        trendPercent: 15.3,
        lastPurchaseDate: '2026-02-05T10:30:00Z',
        giftEligible: true,
      },
    ],
    description: 'Story 41-3: Extended with gift eligibility',
  })
  partners!: TopPartnerItem[];

  @ApiProperty({ example: 'month' })
  period!: string;

  @ApiProperty({ example: '2026-02-01T00:00:00Z' })
  periodStart!: string;

  @ApiProperty({ example: '2026-02-04T23:59:59Z' })
  periodEnd!: string;
}

export class PartnerActivityResponseSwagger {
  @ApiProperty({
    example: [
      { date: '2026-02-01', rentals: 12, sales: 8, services: 5, total: 25 },
      { date: '2026-02-02', rentals: 15, sales: 6, services: 7, total: 28 },
    ],
  })
  activities!: PartnerActivityItem[];

  @ApiProperty({ example: 245 })
  totalTransactions!: number;

  @ApiProperty({ example: 220 })
  previousTotalTransactions!: number;

  @ApiProperty({ example: 11.4 })
  deltaPercent!: number;

  @ApiProperty({ example: 30 })
  periodDays!: number;
}
