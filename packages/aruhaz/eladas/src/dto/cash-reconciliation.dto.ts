/**
 * Cash Reconciliation DTOs with Zod validation
 */

import { z } from 'zod';

/**
 * Pénztár nyitás séma
 */
export const OpenRegisterSchema = z.object({
  tenantId: z.string().uuid({ message: 'Érvénytelen tenant azonosító' }),
  locationId: z.string().uuid({ message: 'Érvénytelen telephely azonosító' }),
  registerId: z.string().uuid({ message: 'Érvénytelen pénztárgép azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
  openingFloat: z.number().nonnegative({ message: 'Nyitó váltópénz nem lehet negatív' }),
});

export type OpenRegisterInput = z.infer<typeof OpenRegisterSchema>;

/**
 * Címlet bontás séma
 */
export const DenominationCountSchema = z.object({
  denomination: z.number().int().positive({ message: 'Címlet pozitív egész szám kell legyen' }),
  count: z.number().int().nonnegative({ message: 'Darabszám nem lehet negatív' }),
});

export type DenominationCountInput = z.infer<typeof DenominationCountSchema>;

/**
 * Készpénz számolás séma
 */
export const CashCountSchema = z.object({
  sessionId: z.string().uuid({ message: 'Érvénytelen session azonosító' }),
  denominations: z.array(DenominationCountSchema).min(1, { message: 'Minimum egy címlet megadása kötelező' }),
  otherAmount: z.number().nonnegative().optional(),
});

export type CashCountInput = z.infer<typeof CashCountSchema>;

/**
 * Eltérés dokumentálás séma
 */
export const DocumentVarianceSchema = z.object({
  sessionId: z.string().uuid({ message: 'Érvénytelen session azonosító' }),
  explanation: z.string().min(10, { message: 'Magyarázat minimum 10 karakter' }).max(1000),
});

export type DocumentVarianceInput = z.infer<typeof DocumentVarianceSchema>;

/**
 * Pénztár zárás kezdeményezés séma
 */
export const InitiateClosingSchema = z.object({
  registerId: z.string().uuid({ message: 'Érvénytelen pénztárgép azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type InitiateClosingInput = z.infer<typeof InitiateClosingSchema>;

/**
 * Riport jóváhagyás séma
 */
export const ApproveReportSchema = z.object({
  reportId: z.string().uuid({ message: 'Érvénytelen riport azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type ApproveReportInput = z.infer<typeof ApproveReportSchema>;

/**
 * Havi összesítő lekérdezés séma
 */
export const MonthlySummaryFilterSchema = z.object({
  registerId: z.string().uuid({ message: 'Érvénytelen pénztárgép azonosító' }),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export type MonthlySummaryFilterInput = z.infer<typeof MonthlySummaryFilterSchema>;

/**
 * Napi riport filter séma
 */
export const DailyReportFilterSchema = z.object({
  registerId: z.string().uuid({ message: 'Érvénytelen pénztárgép azonosító' }),
  date: z.coerce.date(),
});

export type DailyReportFilterInput = z.infer<typeof DailyReportFilterSchema>;
