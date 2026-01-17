import { z } from 'zod';

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for CreateCategoryDto
 * Story 8-2: Cikkcsoport Hierarchia - AC1
 *
 * @kgc/cikk
 */
export const createCategorySchema = z.object({
  code: z
    .string({
      required_error: 'A kategória kód megadása kötelező',
      invalid_type_error: 'A kategória kód szöveg kell legyen',
    })
    .min(1, 'A kategória kód nem lehet üres')
    .max(50, 'A kategória kód maximum 50 karakter lehet')
    .regex(/^[A-Z0-9_-]+$/i, 'A kategória kód csak betűket, számokat, kötőjelet és aláhúzást tartalmazhat'),

  name: z
    .string({
      required_error: 'A kategória neve kötelező',
      invalid_type_error: 'A kategória neve szöveg kell legyen',
    })
    .min(1, 'A kategória neve nem lehet üres')
    .max(255, 'A kategória neve maximum 255 karakter lehet')
    .transform((val) => val.trim()),

  description: z
    .string()
    .max(2000, 'A leírás maximum 2000 karakter lehet')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  parentId: z
    .string()
    .regex(UUID_REGEX, 'Érvénytelen szülő kategória ID formátum')
    .optional()
    .nullable(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

/**
 * Validate CreateCategoryDto - throws on invalid input
 */
export function validateCreateCategoryDto(data: unknown): CreateCategoryDto {
  return createCategorySchema.parse(data);
}

/**
 * Safely validate CreateCategoryDto - returns result object
 */
export function safeValidateCreateCategoryDto(data: unknown): z.SafeParseReturnType<unknown, CreateCategoryDto> {
  return createCategorySchema.safeParse(data);
}

/**
 * Format Zod errors to Hungarian messages
 */
export function formatCategoryValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }

  return errors;
}
