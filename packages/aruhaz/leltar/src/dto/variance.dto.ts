/**
 * Variance DTOs with Zod validation
 */

import { z } from 'zod';
import { VarianceReasonCategory } from '../interfaces/variance.interface';

/**
 * Eltérés ok dokumentálás séma
 */
export const DocumentVarianceReasonSchema = z.object({
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  category: z.nativeEnum(VarianceReasonCategory, { message: 'Érvénytelen ok kategória' }),
  description: z.string().min(5, { message: 'Leírás minimum 5 karakter' }).max(1000),
});

export type DocumentVarianceReasonInput = z.infer<typeof DocumentVarianceReasonSchema>;

/**
 * Korrekció létrehozás séma
 */
export const CreateAdjustmentSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type CreateAdjustmentInput = z.infer<typeof CreateAdjustmentSchema>;

/**
 * Korrekció jóváhagyás séma
 */
export const ApproveAdjustmentSchema = z.object({
  adjustmentId: z.string().uuid({ message: 'Érvénytelen korrekció azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type ApproveAdjustmentInput = z.infer<typeof ApproveAdjustmentSchema>;

/**
 * Korrekció elutasítás séma
 */
export const RejectAdjustmentSchema = z.object({
  adjustmentId: z.string().uuid({ message: 'Érvénytelen korrekció azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
  reason: z.string().min(5, { message: 'Ok minimum 5 karakter' }).max(500),
});

export type RejectAdjustmentInput = z.infer<typeof RejectAdjustmentSchema>;

/**
 * Korrekció végrehajtás séma
 */
export const ApplyAdjustmentSchema = z.object({
  adjustmentId: z.string().uuid({ message: 'Érvénytelen korrekció azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type ApplyAdjustmentInput = z.infer<typeof ApplyAdjustmentSchema>;

/**
 * Leltár lezárás séma
 */
export const CompleteStockCountSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type CompleteStockCountInput = z.infer<typeof CompleteStockCountSchema>;

/**
 * Eltérés export séma
 */
export const ExportVariancesSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  format: z.enum(['CSV', 'XLSX']),
});

export type ExportVariancesInput = z.infer<typeof ExportVariancesSchema>;
