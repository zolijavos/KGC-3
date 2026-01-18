/**
 * Count Recording DTOs with Zod validation
 */

import { z } from 'zod';
import { CountingMode } from '../interfaces/count-recording.interface';

/**
 * Számláló session indítás séma
 */
export const StartCounterSessionSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
  assignedZone: z.string().max(50).optional(),
});

export type StartCounterSessionInput = z.infer<typeof StartCounterSessionSchema>;

/**
 * Számlálás rögzítés séma
 */
export const RecordCountSchema = z.object({
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  countedQuantity: z.number().int().nonnegative({ message: 'Mennyiség nem lehet negatív' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
  mode: z.nativeEnum(CountingMode, { message: 'Érvénytelen számlálás mód' }),
  scannedCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type RecordCountInput = z.infer<typeof RecordCountSchema>;

/**
 * Batch számlálás séma
 */
export const BatchCountSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    barcode: z.string().optional(),
    countedQuantity: z.number().int().nonnegative({ message: 'Mennyiség nem lehet negatív' }),
    locationCode: z.string().optional(),
  }).refine(
    (data) => data.productId !== undefined || data.barcode !== undefined,
    { message: 'Cikk azonosító vagy vonalkód megadása kötelező' }
  )).min(1, { message: 'Minimum egy tétel szükséges' }),
});

export type BatchCountInput = z.infer<typeof BatchCountSchema>;

/**
 * Tétel szűrő séma
 */
export const CountItemFilterSchema = z.object({
  uncountedOnly: z.boolean().optional(),
  varianceOnly: z.boolean().optional(),
  recountOnly: z.boolean().optional(),
  locationCode: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type CountItemFilterInput = z.infer<typeof CountItemFilterSchema>;

/**
 * Vonalkód keresés séma
 */
export const FindByBarcodeSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  barcode: z.string().min(1, { message: 'Vonalkód kötelező' }),
});

export type FindByBarcodeInput = z.infer<typeof FindByBarcodeSchema>;

/**
 * Újraszámlálás megjelölés séma
 */
export const MarkForRecountSchema = z.object({
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  reason: z.string().min(3, { message: 'Ok minimum 3 karakter' }).max(500),
});

export type MarkForRecountInput = z.infer<typeof MarkForRecountSchema>;

/**
 * Számlálás visszavonás séma
 */
export const UndoCountSchema = z.object({
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  userId: z.string().uuid({ message: 'Érvénytelen felhasználó azonosító' }),
});

export type UndoCountInput = z.infer<typeof UndoCountSchema>;
