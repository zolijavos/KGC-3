/**
 * Payment DTOs with Zod validation
 */

import { z } from 'zod';
import { PaymentMethod } from '../interfaces/pos-transaction.interface';
import { CardType } from '../interfaces/payment.interface';

/**
 * Készpénz fizetés séma
 */
export const CashPaymentSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  amount: z.number().positive({ message: 'Összeg pozitív kell legyen' }),
  receivedAmount: z.number().positive({ message: 'Kapott összeg pozitív kell legyen' }),
}).refine(
  (data) => data.receivedAmount >= data.amount,
  { message: 'Kapott összeg nem lehet kevesebb a fizetendőnél' }
);

export type CashPaymentInput = z.infer<typeof CashPaymentSchema>;

/**
 * Kártya fizetés indítás séma
 */
export const CardPaymentInitSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  amount: z.number().positive({ message: 'Összeg pozitív kell legyen' }),
  terminalId: z.string().min(1, { message: 'Terminál azonosító kötelező' }),
});

export type CardPaymentInitInput = z.infer<typeof CardPaymentInitSchema>;

/**
 * Kártya fizetés callback séma
 */
export const CardPaymentCallbackSchema = z.object({
  paymentId: z.string().uuid({ message: 'Érvénytelen fizetés azonosító' }),
  success: z.boolean(),
  cardType: z.nativeEnum(CardType).optional(),
  lastFourDigits: z.string().length(4).optional(),
  transactionId: z.string().optional(),
  authorizationCode: z.string().optional(),
  contactless: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

export type CardPaymentCallbackInput = z.infer<typeof CardPaymentCallbackSchema>;

/**
 * Átutalás rögzítés séma
 */
export const TransferPaymentSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  amount: z.number().positive({ message: 'Összeg pozitív kell legyen' }),
  accountNumber: z.string().min(8, { message: 'Bankszámlaszám minimum 8 karakter' }),
  reference: z.string().min(1, { message: 'Közlemény kötelező' }),
  expectedDate: z.coerce.date(),
});

export type TransferPaymentInput = z.infer<typeof TransferPaymentSchema>;

/**
 * Utalvány beváltás séma
 */
export const VoucherRedeemSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  voucherCode: z.string().min(4, { message: 'Utalvány kód minimum 4 karakter' }).max(50),
});

export type VoucherRedeemInput = z.infer<typeof VoucherRedeemSchema>;

/**
 * Vegyes fizetés séma
 */
export const MixedPaymentSchema = z.object({
  transactionId: z.string().uuid({ message: 'Érvénytelen tranzakció azonosító' }),
  payments: z.array(z.object({
    method: z.nativeEnum(PaymentMethod),
    amount: z.number().positive({ message: 'Összeg pozitív kell legyen' }),
    reference: z.string().optional(),
  })).min(1, { message: 'Minimum egy fizetés szükséges' }),
});

export type MixedPaymentInput = z.infer<typeof MixedPaymentSchema>;

/**
 * Visszatérítés séma
 */
export const RefundPaymentSchema = z.object({
  paymentId: z.string().uuid({ message: 'Érvénytelen fizetés azonosító' }),
  reason: z.string().min(5, { message: 'Visszatérítés ok minimum 5 karakter' }).max(500),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
