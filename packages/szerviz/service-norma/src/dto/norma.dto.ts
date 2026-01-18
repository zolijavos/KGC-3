/**
 * @kgc/service-norma - Norma DTOs
 * Epic 20: Service Standards for Makita warranty pricing
 */

import { z } from 'zod';

export const NormaImportRowSchema = z.object({
  normaCode: z.string().max(50),
  description: z.string().max(500),
  normaHours: z.number().max(100),
  hourlyRate: z.number().optional(),
  category: z.string().max(100).optional(),
});

export const ImportNormaListSchema = z.object({
  supplier: z.string().min(1).max(100),
  versionNumber: z.string().min(1).max(50),
  effectiveFrom: z.date(),
  defaultHourlyRate: z.number().min(0),
  items: z.array(NormaImportRowSchema).min(1),
});

export const CalculateLaborCostSchema = z.object({
  normaCode: z.string().min(1),
  worksheetId: z.string().uuid(),
  deviationPercent: z.number().min(-100).max(100).optional(),
  deviationReason: z.string().max(500).optional(),
});

export const UpdateNormaVersionSchema = z.object({
  effectiveTo: z.date().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export type ImportNormaListDto = z.infer<typeof ImportNormaListSchema>;
export type NormaImportRowDto = z.infer<typeof NormaImportRowSchema>;
export type CalculateLaborCostDto = z.infer<typeof CalculateLaborCostSchema>;
export type UpdateNormaVersionDto = z.infer<typeof UpdateNormaVersionSchema>;
