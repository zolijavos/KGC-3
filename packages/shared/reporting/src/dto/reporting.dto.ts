/**
 * @kgc/reporting - Reporting DTOs
 * Epic 27: Reporting Engine
 */

import { z } from 'zod';

export const WidgetTypeEnum = z.enum([
  'COUNTER',
  'CHART_BAR',
  'CHART_LINE',
  'CHART_PIE',
  'TABLE',
  'TREND',
]);

export const ReportTypeEnum = z.enum([
  'RENTAL_SUMMARY',
  'SERVICE_SUMMARY',
  'SALES_SUMMARY',
  'INVENTORY_STATUS',
  'FINANCIAL_OVERVIEW',
  'CUSTOMER_ACTIVITY',
  'EQUIPMENT_UTILIZATION',
]);

export const ReportFormatEnum = z.enum(['JSON', 'CSV', 'PDF', 'EXCEL']);

export const DateRangeEnum = z.enum([
  'TODAY',
  'YESTERDAY',
  'THIS_WEEK',
  'LAST_WEEK',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_QUARTER',
  'THIS_YEAR',
  'CUSTOM',
]);

export const WidgetPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(6),
});

export const CreateWidgetSchema = z.object({
  type: WidgetTypeEnum,
  title: z.string().min(1).max(100),
  dataSource: z.string().min(1).max(100),
  refreshInterval: z.number().int().min(10).max(3600).optional(),
  position: WidgetPositionSchema,
  config: z.record(z.unknown()).optional(),
});

export const UpdateWidgetSchema = CreateWidgetSchema.partial();

export const GetWidgetDataSchema = z.object({
  widgetId: z.string().uuid(),
  dateRange: DateRangeEnum.default('THIS_MONTH'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const GenerateReportSchema = z.object({
  reportType: ReportTypeEnum,
  dateRange: DateRangeEnum.default('THIS_MONTH'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  format: ReportFormatEnum.default('JSON'),
  parameters: z.record(z.unknown()).optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
  offset: z.number().int().min(0).default(0),
});

export const CrossTenantReportSchema = z.object({
  reportType: ReportTypeEnum,
  tenantIds: z.array(z.string().uuid()).min(1).max(50),
  dateRange: DateRangeEnum.default('THIS_MONTH'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  aggregateBy: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum'),
});

export const ScheduleReportSchema = z.object({
  reportId: z.string().uuid(),
  name: z.string().min(1).max(100),
  schedule: z.string().min(1).max(50), // cron expression
  format: ReportFormatEnum.default('PDF'),
  recipients: z.array(z.string().email()).min(1).max(20),
  enabled: z.boolean().default(true),
});

export type CreateWidgetDto = z.infer<typeof CreateWidgetSchema>;
export type UpdateWidgetDto = z.infer<typeof UpdateWidgetSchema>;
export type GetWidgetDataDto = z.infer<typeof GetWidgetDataSchema>;
export type GenerateReportDto = z.infer<typeof GenerateReportSchema>;
export type CrossTenantReportDto = z.infer<typeof CrossTenantReportSchema>;
export type ScheduleReportDto = z.infer<typeof ScheduleReportSchema>;
