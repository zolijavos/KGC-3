import { z } from 'zod';
import { CategoryStatus } from '../interfaces/category.interface';

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for UpdateCategoryDto
 * Story 8-2: Cikkcsoport Hierarchia - AC1
 *
 * Partial update - all fields optional
 *
 * @kgc/cikk
 */
export const updateCategorySchema = z.object({
  name: z
    .string({
      invalid_type_error: 'A kategória neve szöveg kell legyen',
    })
    .min(1, 'A kategória neve nem lehet üres')
    .max(255, 'A kategória neve maximum 255 karakter lehet')
    .transform((val) => val.trim())
    .optional(),

  description: z
    .string()
    .max(2000, 'A leírás maximum 2000 karakter lehet')
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val?.trim() || null)),

  parentId: z
    .string()
    .regex(UUID_REGEX, 'Érvénytelen szülő kategória ID formátum')
    .optional()
    .nullable(),

  status: z
    .nativeEnum(CategoryStatus, {
      errorMap: () => ({
        message: 'Érvénytelen státusz. Lehetséges értékek: ACTIVE, INACTIVE',
      }),
    })
    .optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

/**
 * Validate UpdateCategoryDto - throws on invalid input
 */
export function validateUpdateCategoryDto(data: unknown): UpdateCategoryDto {
  return updateCategorySchema.parse(data);
}

/**
 * Safely validate UpdateCategoryDto - returns result object
 */
export function safeValidateUpdateCategoryDto(data: unknown): z.SafeParseReturnType<unknown, UpdateCategoryDto> {
  return updateCategorySchema.safeParse(data);
}
