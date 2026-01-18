/**
 * Purchase Price DTOs with Zod validation
 */

import { z } from 'zod';
import { PriceAveragingMethod } from '../interfaces/purchase-price.interface';

/**
 * Beszerzési ár rögzítés séma
 */
export const RecordPurchasePriceSchema = z.object({
  tenantId: z.string().uuid({ message: 'Érvénytelen tenant azonosító' }),
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
  supplierId: z.string().uuid({ message: 'Érvénytelen beszállító azonosító' }),
  receiptId: z.string().uuid({ message: 'Érvénytelen bevételezés azonosító' }),
  unitPrice: z.number().positive({ message: 'Egységár pozitív kell legyen' }),
  quantity: z.number().int().positive({ message: 'Mennyiség pozitív egész szám kell legyen' }),
  currency: z.string().length(3).default('HUF'),
  receiptDate: z.coerce.date(),
});

export type RecordPurchasePriceInput = z.infer<typeof RecordPurchasePriceSchema>;

/**
 * Beszerzési ár lekérdezés séma
 */
export const GetPurchasePriceSchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
  method: z.nativeEnum(PriceAveragingMethod).optional(),
});

export type GetPurchasePriceInput = z.infer<typeof GetPurchasePriceSchema>;

/**
 * Ár history lekérdezés séma
 */
export const GetPriceHistorySchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
}).refine(
  (data) => data.dateFrom <= data.dateTo,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type GetPriceHistoryInput = z.infer<typeof GetPriceHistorySchema>;

/**
 * Beszállító ár összehasonlítás séma
 */
export const CompareSupplierPricesSchema = z.object({
  productId: z.string().uuid({ message: 'Érvénytelen cikk azonosító' }),
});

export type CompareSupplierPricesInput = z.infer<typeof CompareSupplierPricesSchema>;

/**
 * Ár változás riasztás séma
 */
export const GetPriceChangeAlertsSchema = z.object({
  thresholdPercent: z.number().min(1).max(100, { message: 'Küszöbérték 1-100% között lehet' }),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type GetPriceChangeAlertsInput = z.infer<typeof GetPriceChangeAlertsSchema>;

/**
 * Batch beszerzési ár lekérdezés séma
 */
export const GetBatchPurchasePricesSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, { message: 'Minimum egy cikk azonosító szükséges' }),
});

export type GetBatchPurchasePricesInput = z.infer<typeof GetBatchPurchasePricesSchema>;
