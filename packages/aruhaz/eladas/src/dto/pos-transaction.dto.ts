/**
 * POS Transaction DTOs with Zod validation
 */

import { z } from 'zod';
import { PaymentMethod, TransactionStatus } from '../interfaces/pos-transaction.interface';

/**
 * Tranzakció létrehozás séma
 */
export const CreateTransactionSchema = z.object({
  tenantId: z.string().uuid({ message: 'Érvénytelen tenant azonosító' }),
  locationId: z.string().uuid({ message: 'Érvénytelen telephely azonosító' }),
  registerId: z.string().uuid({ message: 'Érvénytelen pénztárgép azonosító' }),
  operatorId: z.string().uuid({ message: 'Érvénytelen operátor azonosító' }),
  partnerId: z.string().uuid().optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

/**
 * Tétel hozzáadás séma
 */
export const AddItemSchema = z.object({
  productId: z.string().uuid().optional(),
  barcode: z.string().min(1).optional(),
  quantity: z.number().int().positive({ message: 'Mennyiség pozitív egész szám kell legyen' }),
}).refine(
  (data) => data.productId !== undefined || data.barcode !== undefined,
  { message: 'Cikk azonosító vagy vonalkód megadása kötelező' }
);

export type AddItemInput = z.infer<typeof AddItemSchema>;

/**
 * Mennyiség módosítás séma
 */
export const UpdateQuantitySchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  quantity: z.number().int().positive({ message: 'Mennyiség pozitív egész szám kell legyen' }),
});

export type UpdateQuantityInput = z.infer<typeof UpdateQuantitySchema>;

/**
 * Kedvezmény alkalmazás séma
 */
export const ApplyDiscountSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  itemId: z.string().uuid({ message: 'Érvénytelen tétel azonosító' }),
  discountPercent: z.number().min(0).max(100, { message: 'Kedvezmény 0-100% között lehet' }),
});

export type ApplyDiscountInput = z.infer<typeof ApplyDiscountSchema>;

/**
 * Fizetés hozzáadás séma
 */
export const AddPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod, { message: 'Érvénytelen fizetési mód' }),
  amount: z.number().positive({ message: 'Összeg pozitív kell legyen' }),
  reference: z.string().optional(),
});

export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;

/**
 * Tranzakció lekérdezés filter
 */
export const TransactionFilterSchema = z.object({
  registerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  operatorId: z.string().uuid().optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  partnerId: z.string().uuid().optional(),
});

export type TransactionFilterInput = z.infer<typeof TransactionFilterSchema>;

/**
 * Tranzakció visszavonás séma
 */
export const CancelTransactionSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  reason: z.string().min(5, { message: 'Visszavonás ok minimum 5 karakter' }).max(500),
});

export type CancelTransactionInput = z.infer<typeof CancelTransactionSchema>;
