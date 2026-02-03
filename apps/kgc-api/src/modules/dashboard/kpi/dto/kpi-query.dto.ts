import { z } from 'zod';

/**
 * Period enum for KPI queries
 */
export const PeriodEnum = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export type Period = z.infer<typeof PeriodEnum>;

/**
 * GroupBy enum for drill-down queries
 */
export const GroupByEnum = z.enum(['location', 'service', 'partner']);
export type GroupBy = z.infer<typeof GroupByEnum>;

/**
 * KPI Query DTO Schema
 *
 * Validates query parameters for KPI endpoints
 */
export const KpiQuerySchema = z
  .object({
    dateFrom: z.string().datetime(),
    dateTo: z.string().datetime(),
    period: PeriodEnum.optional().default('daily'),
    comparison: z.boolean().optional().default(false),
    groupBy: GroupByEnum.optional(),
  })
  .refine((data) => new Date(data.dateFrom) <= new Date(data.dateTo), {
    message: 'dateFrom must be before or equal to dateTo',
    path: ['dateFrom'],
  });

export type KpiQueryDto = z.infer<typeof KpiQuerySchema>;
