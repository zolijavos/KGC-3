import { z } from 'zod';

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for CategoryFilterDto
 * Story 8-2: Cikkcsoport Hierarchia - AC3
 *
 * @kgc/cikk
 */
export const categoryFilterSchema = z.object({
  search: z
    .string()
    .max(100, 'A keresés maximum 100 karakter lehet')
    .optional()
    .transform((val) => val?.trim() || undefined),

  parentId: z
    .string()
    .regex(UUID_REGEX, 'Érvénytelen szülő kategória ID formátum')
    .optional()
    .nullable(),

  rootOnly: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional()
    .default(false),

  includeInactive: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional()
    .default(false),

  maxDepth: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .refine((val) => !isNaN(val) && val >= 0 && val <= 5, {
      message: 'A maxDepth 0 és 5 között kell legyen',
    })
    .optional(),

  // Pagination
  page: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Az oldal szám minimum 1 kell legyen',
    })
    .optional()
    .default(1),

  limit: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'A limit 1 és 100 között kell legyen',
    })
    .optional()
    .default(20),

  // Sorting
  sortBy: z
    .enum(['name', 'code', 'createdAt', 'depth'], {
      errorMap: () => ({
        message: 'Érvénytelen rendezési mező. Lehetséges értékek: name, code, createdAt, depth',
      }),
    })
    .optional()
    .default('name'),

  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({
        message: 'Érvénytelen rendezési irány. Lehetséges értékek: asc, desc',
      }),
    })
    .optional()
    .default('asc'),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type CategoryFilterDto = z.infer<typeof categoryFilterSchema>;

/**
 * Validate CategoryFilterDto - throws on invalid input
 */
export function validateCategoryFilterDto(data: unknown): CategoryFilterDto {
  return categoryFilterSchema.parse(data);
}

/**
 * Safely validate CategoryFilterDto - returns result object
 */
export function safeValidateCategoryFilterDto(data: unknown): z.SafeParseReturnType<unknown, CategoryFilterDto> {
  return categoryFilterSchema.safeParse(data);
}

/**
 * Parse category filter from Express query params
 */
export function parseCategoryFilterFromQuery(query: Record<string, unknown>): CategoryFilterDto {
  return categoryFilterSchema.parse(query);
}
