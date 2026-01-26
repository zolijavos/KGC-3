/**
 * @kgc/sales-pos - Transaction DTOs
 * Epic 22: Point of Sale - Story 22-1
 */

import { z } from 'zod';
import { VALID_TAX_RATES } from './cart.dto.js';

export const CreateTransactionSchema = z.object({
  sessionId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().max(200).optional(),
  customerTaxNumber: z.string().max(20).optional(),
});

// Hungarian VAT rate validation: 0%, 5%, 18%, 27%
const TaxRateSchema = z.number().refine(val => VALID_TAX_RATES.includes(val as 0 | 5 | 18 | 27), {
  message: `Tax rate must be one of: ${VALID_TAX_RATES.join(', ')}`,
});

export const AddItemSchema = z.object({
  productId: z.string().uuid(),
  productCode: z.string().min(1).max(50),
  productName: z.string().min(1).max(200),
  quantity: z.number().min(0.001),
  unitPrice: z.number().min(0),
  taxRate: TaxRateSchema,
  discountPercent: z.number().min(0).max(100).default(0),
  warehouseId: z.string().uuid().optional(),
});

export const UpdateItemSchema = z.object({
  quantity: z.number().min(0.001).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const VoidTransactionSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const SetCustomerSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().max(200).optional(),
  customerTaxNumber: z.string().max(20).optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
export type AddItemDto = z.infer<typeof AddItemSchema>;
export type UpdateItemDto = z.infer<typeof UpdateItemSchema>;
export type VoidTransactionDto = z.infer<typeof VoidTransactionSchema>;
export type SetCustomerDto = z.infer<typeof SetCustomerSchema>;
