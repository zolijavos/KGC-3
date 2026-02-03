import { z } from 'zod';

/**
 * KPI Response DTO Schema
 *
 * Standardized response format for all KPI endpoints
 */
export const KpiResponseSchema = z.object({
  kpiType: z.enum(['revenue', 'net-revenue', 'receivables', 'payments']),
  period: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  current: z.object({
    value: z.number(),
    currency: z.string().default('HUF'),
    count: z.number().optional(), // transaction count
  }),
  previous: z
    .object({
      value: z.number(),
      currency: z.string().default('HUF'),
      count: z.number().optional(),
    })
    .optional(),
  delta: z
    .object({
      absolute: z.number(),
      percentage: z.number(),
      trend: z.enum(['up', 'down', 'neutral']),
    })
    .optional(),
  breakdown: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        percentage: z.number(),
      }),
    )
    .optional(),
});

export type KpiResponseDto = z.infer<typeof KpiResponseSchema>;
