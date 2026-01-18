/**
 * @kgc/sales-quote - Quote DTOs
 * Story 18-1: Arajanlat generalas
 */

import { z } from 'zod';
import { QuoteItemType } from '../interfaces/quote.interface';

export const CreateQuoteItemSchema = z.object({
  type: z.nativeEnum(QuoteItemType),
  itemId: z.string().uuid().optional(),
  itemCode: z.string().max(50).optional(),
  description: z.string().min(1).max(500),
  explodedViewPosition: z.string().max(20).optional(),
  quantity: z.number().min(0.01).max(99999),
  unitPrice: z.number().min(0).max(999999999),
  discountPercent: z.number().min(0).max(100).default(0),
});

export type CreateQuoteItemDto = z.infer<typeof CreateQuoteItemSchema>;

export const CreateQuoteSchema = z.object({
  worksheetId: z.string().uuid(),
  validityDays: z.number().min(1).max(90).default(14),
  customerNote: z.string().max(2000).optional(),
  internalNote: z.string().max(2000).optional(),
  items: z.array(CreateQuoteItemSchema).min(1),
});

export type CreateQuoteDto = z.infer<typeof CreateQuoteSchema>;

export const UpdateQuoteSchema = z.object({
  validityDays: z.number().min(1).max(90).optional(),
  customerNote: z.string().max(2000).optional(),
  internalNote: z.string().max(2000).optional(),
});

export type UpdateQuoteDto = z.infer<typeof UpdateQuoteSchema>;
