/**
 * @kgc/bevetelezes - Avizo DTOs
 * Epic 21: Story 21-1 - Avizo Kezeles
 */

import { z } from 'zod';

export const AvizoItemSchema = z.object({
  productId: z.string().uuid(),
  productCode: z.string().min(1).max(50),
  productName: z.string().min(1).max(200),
  expectedQuantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const CreateAvizoSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string().min(1).max(200),
  expectedDate: z.date(),
  items: z.array(AvizoItemSchema).min(1),
  notes: z.string().max(1000).optional(),
});

export const UpdateAvizoSchema = z.object({
  expectedDate: z.date().optional(),
  notes: z.string().max(1000).optional(),
  pdfUrl: z.string().url().optional(),
});

export type CreateAvizoDto = z.infer<typeof CreateAvizoSchema>;
export type AvizoItemDto = z.infer<typeof AvizoItemSchema>;
export type UpdateAvizoDto = z.infer<typeof UpdateAvizoSchema>;
