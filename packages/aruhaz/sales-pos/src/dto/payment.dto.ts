/**
 * @kgc/sales-pos - Payment DTOs with Zod validation
 * Epic 22: Point of Sale - Story 22-2 Payment Methods
 */

import { z } from 'zod';
import { PaymentMethod } from '../interfaces/payment.interface.js';

/**
 * Process cash payment DTO
 * AC1: Cash payment with change calculation
 */
export const ProcessCashPaymentSchema = z.object({
  receivedAmount: z.number().positive('Received amount must be positive'),
});

export type ProcessCashPaymentDto = z.infer<typeof ProcessCashPaymentSchema>;

/**
 * Process card payment DTO
 * AC2: Card payment via MyPos
 */
export const ProcessCardPaymentSchema = z.object({
  // Amount is taken from transaction total, no input needed
  // Currency defaults to HUF
});

export type ProcessCardPaymentDto = z.infer<typeof ProcessCardPaymentSchema>;

/**
 * Add partial payment DTO
 * AC3: Mixed payment support
 */
export const AddPartialPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive('Payment amount must be positive'),
  // Optional card data (for CARD method)
  cardTransactionId: z.string().optional(),
  cardLastFour: z.string().length(4).optional(),
  cardBrand: z.string().optional(),
  // Optional transfer data (for TRANSFER method)
  transferReference: z.string().optional(),
  // Optional voucher data (for VOUCHER method)
  voucherCode: z.string().optional(),
});

export type AddPartialPaymentDto = z.infer<typeof AddPartialPaymentSchema>;

/**
 * Finalize payment DTO
 * AC4: Complete payment with inventory deduction
 */
export const FinalizePaymentSchema = z.object({
  skipInventoryDeduction: z.boolean().optional().default(false),
});

export type FinalizePaymentDto = z.infer<typeof FinalizePaymentSchema>;

/**
 * Refund payment DTO
 * AC5: Refund on void
 */
export const RefundPaymentSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  reason: z.string().min(1, 'Refund reason is required'),
});

export type RefundPaymentDto = z.infer<typeof RefundPaymentSchema>;

/**
 * Payment validation constants
 */
export const PAYMENT_CONSTANTS = {
  DEFAULT_CURRENCY: 'HUF',
  MIN_PAYMENT_AMOUNT: 1,
  MAX_PAYMENT_AMOUNT: 99_999_999, // 99 million HUF max
};
