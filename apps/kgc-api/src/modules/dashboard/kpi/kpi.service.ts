import { Injectable } from '@nestjs/common';
import type { KpiQueryDto } from './dto/kpi-query.dto';
import type { KpiResponseDto } from './dto/kpi-response.dto';

/**
 * KPI Service
 *
 * Aggregates financial KPI data from Invoice and Payment tables
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 * - Implement groupBy drill-down logic
 */
@Injectable()
export class KpiService {
  /**
   * Get Revenue KPI (Bruttó Bevétel)
   * SUM(Invoice.gross_amount) WHERE status != DRAFT
   */
  async getRevenue(query: KpiQueryDto): Promise<KpiResponseDto> {
    // TODO: Prisma aggregation
    // const current = await prisma.invoice.aggregate({
    //   _sum: { grossAmount: true },
    //   _count: true,
    //   where: {
    //     issuedAt: { gte: new Date(query.dateFrom), lte: new Date(query.dateTo) },
    //     status: { not: 'DRAFT' },
    //   },
    // });

    // Mock data for MVP
    const current = { value: 1234567, count: 45 };
    const previous = query.comparison ? { value: 1100000, count: 40 } : undefined;

    const delta = previous
      ? {
          absolute: current.value - previous.value,
          percentage: ((current.value - previous.value) / previous.value) * 100,
          trend: (current.value > previous.value
            ? 'up'
            : current.value < previous.value
              ? 'down'
              : 'neutral') as 'up' | 'down' | 'neutral',
        }
      : undefined;

    return {
      kpiType: 'revenue',
      period: {
        from: query.dateFrom,
        to: query.dateTo,
      },
      current: {
        value: current.value,
        currency: 'HUF',
        count: current.count,
      },
      previous: previous
        ? {
            value: previous.value,
            currency: 'HUF',
            count: previous.count,
          }
        : undefined,
      delta,
    };
  }

  /**
   * Get Net Revenue KPI (Nettó Bevétel)
   * SUM(Invoice.net_amount) WHERE status != DRAFT
   */
  async getNetRevenue(query: KpiQueryDto): Promise<KpiResponseDto> {
    // Mock data for MVP
    const current = { value: 972900, count: 45 }; // ~79% of gross (27% VAT)
    const previous = query.comparison ? { value: 866142, count: 40 } : undefined;

    const delta = previous
      ? {
          absolute: current.value - previous.value,
          percentage: ((current.value - previous.value) / previous.value) * 100,
          trend: (current.value > previous.value
            ? 'up'
            : current.value < previous.value
              ? 'down'
              : 'neutral') as 'up' | 'down' | 'neutral',
        }
      : undefined;

    return {
      kpiType: 'net-revenue',
      period: {
        from: query.dateFrom,
        to: query.dateTo,
      },
      current: {
        value: current.value,
        currency: 'HUF',
        count: current.count,
      },
      previous: previous
        ? {
            value: previous.value,
            currency: 'HUF',
            count: previous.count,
          }
        : undefined,
      delta,
    };
  }

  /**
   * Get Receivables KPI (Kintlévőség)
   * SUM(Partner.outstanding_balance)
   */
  async getReceivables(query: KpiQueryDto): Promise<KpiResponseDto> {
    // Mock data for MVP
    const current = { value: 567000, count: 12 }; // partners with outstanding balance
    const previous = query.comparison ? { value: 520000, count: 11 } : undefined;

    const delta = previous
      ? {
          absolute: current.value - previous.value,
          percentage: ((current.value - previous.value) / previous.value) * 100,
          trend: (current.value > previous.value
            ? 'up'
            : current.value < previous.value
              ? 'down'
              : 'neutral') as 'up' | 'down' | 'neutral',
        }
      : undefined;

    return {
      kpiType: 'receivables',
      period: {
        from: query.dateFrom,
        to: query.dateTo,
      },
      current: {
        value: current.value,
        currency: 'HUF',
        count: current.count,
      },
      previous: previous
        ? {
            value: previous.value,
            currency: 'HUF',
            count: previous.count,
          }
        : undefined,
      delta,
    };
  }

  /**
   * Get Payments KPI (Befizetések)
   * SUM(Payment.amount) WHERE created_at IN range
   */
  async getPayments(query: KpiQueryDto): Promise<KpiResponseDto> {
    // Mock data for MVP
    const current = { value: 890000, count: 38 };
    const previous = query.comparison ? { value: 750000, count: 32 } : undefined;

    const delta = previous
      ? {
          absolute: current.value - previous.value,
          percentage: ((current.value - previous.value) / previous.value) * 100,
          trend: (current.value > previous.value
            ? 'up'
            : current.value < previous.value
              ? 'down'
              : 'neutral') as 'up' | 'down' | 'neutral',
        }
      : undefined;

    return {
      kpiType: 'payments',
      period: {
        from: query.dateFrom,
        to: query.dateTo,
      },
      current: {
        value: current.value,
        currency: 'HUF',
        count: current.count,
      },
      previous: previous
        ? {
            value: previous.value,
            currency: 'HUF',
            count: previous.count,
          }
        : undefined,
      delta,
    };
  }
}
