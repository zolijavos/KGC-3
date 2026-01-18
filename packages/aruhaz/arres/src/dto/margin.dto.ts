/**
 * Margin DTOs with Zod validation
 */

import { z } from 'zod';

/**
 * Árrés kalkuláció séma
 */
export const CalculateMarginSchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
});

export type CalculateMarginInput = z.infer<typeof CalculateMarginSchema>;

/**
 * Batch árrés kalkuláció séma
 */
export const CalculateMarginsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, { message: 'Minimum egy cikk azonosító szükséges' }),
});

export type CalculateMarginsInput = z.infer<typeof CalculateMarginsSchema>;

/**
 * Cikk árrés összesítő séma
 */
export const GetProductMarginSummarySchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetProductMarginSummaryInput = z.infer<typeof GetProductMarginSummarySchema>;

/**
 * Kategória árrés összesítő séma
 */
export const GetCategoryMarginSummarySchema = z.object({
  categoryId: z.string().uuid({ message: 'Érvénytelen kategória azonosító' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetCategoryMarginSummaryInput = z.infer<typeof GetCategoryMarginSummarySchema>;

/**
 * Árrés riport generálás séma
 */
export const GenerateMarginReportSchema = z.object({
  tenantId: z.string().uuid({ message: 'Érvénytelen tenant azonosító' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  groupBy: z.enum(['PRODUCT', 'CATEGORY', 'SUPPLIER']),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GenerateMarginReportInput = z.infer<typeof GenerateMarginReportSchema>;

/**
 * Árrés riport export séma
 */
export const ExportMarginReportSchema = z.object({
  reportId: z.string().uuid({ message: 'Érvénytelen riport azonosító' }),
  format: z.enum(['CSV', 'XLSX', 'PDF']),
});

export type ExportMarginReportInput = z.infer<typeof ExportMarginReportSchema>;

/**
 * Top jövedelmező cikkek séma
 */
export const GetTopProfitableProductsSchema = z.object({
  limit: z.number().int().min(1).max(100, { message: 'Limit 1-100 között lehet' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetTopProfitableProductsInput = z.infer<typeof GetTopProfitableProductsSchema>;

/**
 * Alacsony árrésű cikkek séma
 */
export const GetLowMarginProductsSchema = z.object({
  thresholdPercent: z.number().min(0).max(100, { message: 'Küszöbérték 0-100% között lehet' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetLowMarginProductsInput = z.infer<typeof GetLowMarginProductsSchema>;

/**
 * Árrés trend séma
 */
export const GetMarginTrendSchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  granularity: z.enum(['DAY', 'WEEK', 'MONTH']),
}).refine(
  (data) => data.periodStart <= data.periodEnd,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetMarginTrendInput = z.infer<typeof GetMarginTrendSchema>;
