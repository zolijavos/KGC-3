/**
 * Create Supplier DTO with Zod validation
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { z } from 'zod';

/**
 * Supplier code pattern: uppercase letters, numbers, hyphens, underscores
 */
const SUPPLIER_CODE_REGEX = /^[A-Z0-9_-]+$/;

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL validation regex (basic)
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Phone validation (Hungarian and international formats)
 */
const PHONE_REGEX = /^[+]?[\d\s()-]+$/;

/**
 * Create Supplier schema
 */
export const createSupplierSchema = z.object({
  code: z
    .string()
    .min(1, 'Beszállító kód megadása kötelező')
    .max(50, 'Beszállító kód maximum 50 karakter lehet')
    .regex(SUPPLIER_CODE_REGEX, 'Beszállító kód csak nagybetűket, számokat, kötőjelet és aláhúzást tartalmazhat')
    .transform((val) => val.toUpperCase()),

  name: z
    .string()
    .min(1, 'Beszállító név megadása kötelező')
    .max(255, 'Beszállító név maximum 255 karakter lehet')
    .transform((val) => val.trim()),

  description: z.string().max(2000, 'Leírás maximum 2000 karakter lehet').optional().nullable(),

  contactName: z
    .string()
    .max(255, 'Kapcsolattartó név maximum 255 karakter lehet')
    .transform((val) => val.trim())
    .optional()
    .nullable(),

  email: z
    .string()
    .max(255, 'Email maximum 255 karakter lehet')
    .regex(EMAIL_REGEX, 'Érvénytelen email formátum')
    .optional()
    .nullable()
    .or(z.literal('')),

  phone: z
    .string()
    .max(50, 'Telefonszám maximum 50 karakter lehet')
    .regex(PHONE_REGEX, 'Érvénytelen telefonszám formátum')
    .optional()
    .nullable()
    .or(z.literal('')),

  website: z
    .string()
    .max(255, 'Weboldal URL maximum 255 karakter lehet')
    .regex(URL_REGEX, 'Weboldal URL-nek http:// vagy https:// előtaggal kell kezdődnie')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;

/**
 * Validate and parse CreateSupplierDto
 */
export function validateCreateSupplierDto(data: unknown): {
  success: true;
  data: CreateSupplierDto;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = createSupplierSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Parse CreateSupplierDto (throws on error)
 */
export function parseCreateSupplierDto(data: unknown): CreateSupplierDto {
  return createSupplierSchema.parse(data);
}
