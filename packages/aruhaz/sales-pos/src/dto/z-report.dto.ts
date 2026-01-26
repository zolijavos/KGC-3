/**
 * @kgc/sales-pos - Z-Report DTOs with Zod validation
 * Epic 22: Point of Sale - Story 22-3 Napi pénztárzárás
 */

import { z } from 'zod';

/**
 * Export Z-report to JSON DTO
 */
export const ExportZReportJsonSchema = z.object({
  includeDetails: z.boolean().optional().default(false),
});

export type ExportZReportJsonDto = z.infer<typeof ExportZReportJsonSchema>;

/**
 * Export Z-report to PDF DTO
 */
export const ExportZReportPdfSchema = z.object({
  includeDetails: z.boolean().optional().default(false),
  companyName: z.string().min(1).optional(),
  companyAddress: z.string().optional(),
  companyTaxNumber: z.string().optional(),
});

export type ExportZReportPdfDto = z.infer<typeof ExportZReportPdfSchema>;

/**
 * Approve variance DTO
 */
export const ApproveVarianceSchema = z.object({
  approverNote: z.string().max(500).optional(),
});

export type ApproveVarianceDto = z.infer<typeof ApproveVarianceSchema>;

/**
 * Reject variance DTO
 */
export const RejectVarianceSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

export type RejectVarianceDto = z.infer<typeof RejectVarianceSchema>;
