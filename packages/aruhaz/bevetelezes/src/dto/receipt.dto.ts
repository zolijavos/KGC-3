/**
 * @kgc/bevetelezes - Receipt DTOs
 * Epic 21: Story 21-2 & 21-3 - Bevetelezes Workflow & Elteres Kezeles
 */

import { z } from 'zod';

export const ReceiptItemSchema = z.object({
  avizoItemId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  productCode: z.string().min(1).max(50),
  productName: z.string().min(1).max(200),
  expectedQuantity: z.number().int().min(0),
  receivedQuantity: z.number().int().min(0),
  unitPrice: z.number().min(0),
  locationCode: z.string().max(20).optional(),
});

export const CreateReceiptSchema = z.object({
  avizoId: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  supplierName: z.string().min(1).max(200),
  items: z.array(ReceiptItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});

export const CreateDiscrepancySchema = z.object({
  receiptItemId: z.string().uuid(),
  type: z.enum(['SHORTAGE', 'SURPLUS', 'DAMAGED', 'WRONG_ITEM']),
  expectedQuantity: z.number().int().min(0),
  actualQuantity: z.number().int().min(0),
  reason: z.string().max(500).optional(),
});

export const ResolveDiscrepancySchema = z.object({
  resolutionNote: z.string().min(1).max(500),
  notifySupplier: z.boolean().default(false),
});

export type CreateReceiptDto = z.infer<typeof CreateReceiptSchema>;
export type ReceiptItemDto = z.infer<typeof ReceiptItemSchema>;
export type CreateDiscrepancyDto = z.infer<typeof CreateDiscrepancySchema>;
export type ResolveDiscrepancyDto = z.infer<typeof ResolveDiscrepancySchema>;
