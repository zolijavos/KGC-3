/**
 * @kgc/sales-pos - Cart DTOs
 * Epic 22: Point of Sale - Story 22-1
 */

import { z } from 'zod';

/**
 * Hungarian VAT rates (2024)
 * Standard: 27%, Reduced: 18%, Lower: 5%, Exempt: 0%
 */
export const VALID_TAX_RATES = [0, 5, 18, 27] as const;
export type TaxRate = (typeof VALID_TAX_RATES)[number];

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  productCode: z.string().min(1).max(50),
  productName: z.string().min(1).max(200),
  quantity: z.number().min(0.001),
  unitPrice: z.number().min(0),
  taxRate: z.number().refine(val => VALID_TAX_RATES.includes(val as TaxRate), {
    message: `Tax rate must be one of: ${VALID_TAX_RATES.join(', ')}`,
  }),
  discountPercent: z.number().min(0).max(100).default(0),
  warehouseId: z.string().uuid().optional(),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().min(0.001).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

/**
 * Cart item with calculated totals
 */
export interface ICartItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  warehouseId?: string;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

/**
 * Cart totals
 */
export interface ICartTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  itemCount: number;
}

export type CartItemDto = z.infer<typeof CartItemSchema>;
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;
