import { z } from 'zod';
import { ItemType } from '../interfaces/item.interface';

/**
 * Zod schema for CreateItemDto
 * Story 8-1: AC1, AC4, AC6
 *
 * @kgc/cikk
 */
export const createItemSchema = z
  .object({
    code: z
      .string()
      .min(1, 'A cikkszám nem lehet üres')
      .max(50, 'A cikkszám maximum 50 karakter lehet')
      .optional(),
    name: z
      .string()
      .min(1, 'A cikk neve kötelező')
      .max(255, 'A cikk neve maximum 255 karakter lehet'),
    description: z.string().max(2000, 'A leírás maximum 2000 karakter lehet').optional(),
    itemType: z.nativeEnum(ItemType, {
      errorMap: () => ({ message: 'Érvénytelen cikk típus (PRODUCT, PART, SERVICE)' }),
    }),
    listPrice: z
      .number()
      .min(0, 'A listaár nem lehet negatív')
      .optional(),
    costPrice: z
      .number()
      .min(0, 'A beszerzési ár nem lehet negatív')
      .optional(),
    vatRate: z
      .number()
      .min(0, 'Az ÁFA kulcs nem lehet negatív')
      .max(100, 'Az ÁFA kulcs maximum 100% lehet')
      .default(27),
    unitOfMeasure: z
      .string()
      .min(1, 'A mértékegység nem lehet üres')
      .max(20, 'A mértékegység maximum 20 karakter lehet')
      .default('db'),
    barcode: z
      .string()
      .regex(/^\d{13}$/, 'A vonalkód 13 számjegyű EAN-13 formátumú legyen')
      .optional(),
    alternativeBarcodes: z.array(z.string()).default([]),
    categoryId: z.string().uuid('Érvénytelen kategória ID formátum').optional(),
  })
  .refine(
    (data) => {
      // listPrice required for PRODUCT and PART
      if (
        (data.itemType === ItemType.PRODUCT || data.itemType === ItemType.PART) &&
        data.listPrice === undefined
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Listaár kötelező termék és alkatrész típusnál',
      path: ['listPrice'],
    }
  );

export type CreateItemDto = z.infer<typeof createItemSchema>;

/**
 * Validate CreateItemDto
 * @throws ZodError if validation fails
 */
export function validateCreateItemDto(data: unknown): CreateItemDto {
  return createItemSchema.parse(data);
}

/**
 * Safe validation - returns success/error object
 */
export function safeValidateCreateItemDto(data: unknown): z.SafeParseReturnType<unknown, CreateItemDto> {
  return createItemSchema.safeParse(data);
}
