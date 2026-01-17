/**
 * Create Invoice DTO
 * @package @kgc/nav-online
 */

import { z } from 'zod';

/**
 * ÁFA kulcs schema
 */
export const vatRateSchema = z.enum(['27', '18', '5', '0', 'AAM', 'TAM', 'EU', 'EUK', 'MAA', 'F.AFA', 'K.AFA']);

/**
 * Fizetési mód schema
 */
export const paymentMethodSchema = z.enum(['készpénz', 'átutalás', 'bankkártya', 'utánvét', 'PayPal', 'SZEP']);

/**
 * Számla tétel schema
 */
export const invoiceItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  unitPriceNet: z.number().nonnegative(),
  vatRate: vatRateSchema,
  productId: z.string().uuid().optional(),
});

/**
 * Számla tétel típus
 */
export type InvoiceItemDto = z.infer<typeof invoiceItemSchema>;

/**
 * Számla létrehozási schema
 */
export const createInvoiceSchema = z.object({
  tenantId: z.string().uuid(),
  partnerId: z.string().uuid(),

  type: z.enum(['CUSTOMER', 'PROFORMA', 'CORRECTION', 'STORNO']).default('CUSTOMER'),

  rentalId: z.string().uuid().optional(),
  serviceOrderId: z.string().uuid().optional(),

  invoiceDate: z.coerce.date().optional(),
  fulfillmentDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),

  paymentMethod: paymentMethodSchema,
  paymentTransactionId: z.string().optional(),

  items: z.array(invoiceItemSchema).min(1),

  notes: z.string().max(1000).optional(),

  createdBy: z.string().uuid(),

  // Sztornó/helyesbítő esetén
  referencedInvoiceId: z.string().uuid().optional(),
});

/**
 * Számla létrehozási DTO típus
 */
export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;

/**
 * Validációs függvény
 */
export function validateCreateInvoice(data: unknown): CreateInvoiceDto {
  return createInvoiceSchema.parse(data);
}
