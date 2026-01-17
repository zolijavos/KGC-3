import { z } from 'zod';
import { ItemStatus } from '../interfaces/item.interface';

/**
 * Zod schema for UpdateItemDto
 * Story 8-1: AC3
 *
 * All fields are optional for partial updates
 *
 * @kgc/cikk
 */
export const updateItemSchema = z.object({
  name: z
    .string()
    .min(1, 'A cikk neve nem lehet üres')
    .max(255, 'A cikk neve maximum 255 karakter lehet')
    .optional(),
  description: z
    .string()
    .max(2000, 'A leírás maximum 2000 karakter lehet')
    .nullable()
    .optional(),
  listPrice: z
    .number()
    .min(0, 'A listaár nem lehet negatív')
    .nullable()
    .optional(),
  costPrice: z
    .number()
    .min(0, 'A beszerzési ár nem lehet negatív')
    .nullable()
    .optional(),
  vatRate: z
    .number()
    .min(0, 'Az ÁFA kulcs nem lehet negatív')
    .max(100, 'Az ÁFA kulcs maximum 100% lehet')
    .optional(),
  unitOfMeasure: z
    .string()
    .min(1, 'A mértékegység nem lehet üres')
    .max(20, 'A mértékegység maximum 20 karakter lehet')
    .optional(),
  barcode: z
    .string()
    .regex(/^\d{13}$/, 'A vonalkód 13 számjegyű EAN-13 formátumú legyen')
    .nullable()
    .optional(),
  alternativeBarcodes: z.array(z.string()).optional(),
  categoryId: z.string().uuid('Érvénytelen kategória ID formátum').nullable().optional(),
  status: z
    .nativeEnum(ItemStatus, {
      errorMap: () => ({ message: 'Érvénytelen státusz (ACTIVE, INACTIVE, DISCONTINUED)' }),
    })
    .optional(),
});

export type UpdateItemDto = z.infer<typeof updateItemSchema>;

/**
 * Validate UpdateItemDto
 * @throws ZodError if validation fails
 */
export function validateUpdateItemDto(data: unknown): UpdateItemDto {
  return updateItemSchema.parse(data);
}

/**
 * Safe validation - returns success/error object
 */
export function safeValidateUpdateItemDto(data: unknown): z.SafeParseReturnType<unknown, UpdateItemDto> {
  return updateItemSchema.safeParse(data);
}
