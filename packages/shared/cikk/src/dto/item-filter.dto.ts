import { z } from 'zod';
import { ItemType, ItemStatus, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../interfaces/item.interface';

/**
 * Zod schema for ItemFilterDto
 * Story 8-1: AC5 - Lista és Keresés
 *
 * @kgc/cikk
 */
export const itemFilterSchema = z.object({
  search: z
    .string()
    .max(100, 'A keresési kifejezés maximum 100 karakter lehet')
    .optional(),
  itemType: z
    .nativeEnum(ItemType, {
      errorMap: () => ({ message: 'Érvénytelen cikk típus' }),
    })
    .optional(),
  status: z
    .nativeEnum(ItemStatus, {
      errorMap: () => ({ message: 'Érvénytelen státusz' }),
    })
    .optional(),
  categoryId: z.string().uuid('Érvénytelen kategória ID formátum').optional(),
  page: z
    .number()
    .int('Az oldal szám egész szám kell legyen')
    .min(1, 'Az oldal szám minimum 1')
    .default(DEFAULT_PAGE),
  limit: z
    .number()
    .int('A limit egész szám kell legyen')
    .min(1, 'A limit minimum 1')
    .max(MAX_LIMIT, `A limit maximum ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
  sortBy: z
    .enum(['name', 'createdAt', 'code'], {
      errorMap: () => ({ message: 'Érvénytelen rendezési mező (name, createdAt, code)' }),
    })
    .default('name'),
  sortDirection: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'Érvénytelen rendezési irány (asc, desc)' }),
    })
    .default('asc'),
  includeInactive: z.boolean().default(false),
});

export type ItemFilterDto = z.infer<typeof itemFilterSchema>;

/**
 * Validate ItemFilterDto
 * @throws ZodError if validation fails
 */
export function validateItemFilterDto(data: unknown): ItemFilterDto {
  return itemFilterSchema.parse(data);
}

/**
 * Safe validation - returns success/error object
 */
export function safeValidateItemFilterDto(data: unknown): z.SafeParseReturnType<unknown, ItemFilterDto> {
  return itemFilterSchema.safeParse(data);
}

/**
 * Parse query params to ItemFilterDto
 * Handles string to number conversion for query params
 */
export function parseItemFilterFromQuery(query: Record<string, unknown>): ItemFilterDto {
  const parsed = {
    ...query,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    includeInactive: query.includeInactive === 'true' || query.includeInactive === true,
  };
  return validateItemFilterDto(parsed);
}
