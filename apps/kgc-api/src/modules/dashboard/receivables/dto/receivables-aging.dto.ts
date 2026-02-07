/**
 * Receivables Aging Dashboard DTOs
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Response DTOs for receivables aging dashboard endpoint.
 * ADR-052: Kintlévőség Rendszerezés
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query params for aging report
 */
export class AgingReportQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by partner ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

/**
 * Invoice in aging bucket
 */
export interface AgingInvoiceDto {
  /** Invoice ID */
  id: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Partner ID */
  partnerId: string;
  /** Partner name */
  partnerName: string;
  /** Due date (ISO string) */
  dueDate: string;
  /** Outstanding balance */
  balanceDue: number;
  /** Days overdue */
  daysOverdue: number;
}

/**
 * Aging bucket with invoices
 */
export interface AgingBucketDto {
  /** Bucket label (0-30, 31-60, 61-90, 90+) */
  label: '0-30' | '31-60' | '61-90' | '90+';
  /** Number of invoices */
  count: number;
  /** Total amount in HUF */
  totalAmount: number;
  /** Invoices in bucket (optional, for detailed view) */
  invoices?: AgingInvoiceDto[];
}

/**
 * Top debtor summary
 */
export interface TopDebtorDto {
  /** Partner ID */
  partnerId: string;
  /** Partner name */
  partnerName: string;
  /** Total debt amount */
  totalDebt: number;
  /** Number of unpaid invoices */
  invoiceCount: number;
  /** Oldest due date (ISO string) */
  oldestDueDate: string;
}

/**
 * Full aging report response
 */
export interface AgingReportData {
  /** Report generation timestamp (ISO string) */
  generatedAt: string;
  /** Total receivables amount */
  totalReceivables: number;
  /** Aging buckets */
  buckets: AgingBucketDto[];
  /** Top 5 debtors */
  topDebtors: TopDebtorDto[];
}

/**
 * API response wrapper
 */
export class AgingReportResponseDto {
  @ApiProperty({
    description: 'Aging report data',
  })
  data!: AgingReportData;
}
