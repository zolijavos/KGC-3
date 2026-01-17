/**
 * Supplier-Item DTOs with Zod validation
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../interfaces/supplier.interface';

/**
 * UUID regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Link Item to Supplier schema
 */
export const linkItemToSupplierSchema = z.object({
  supplierId: z.string().regex(UUID_REGEX, 'Érvénytelen beszállító azonosító'),

  itemId: z.string().regex(UUID_REGEX, 'Érvénytelen cikk azonosító'),

  supplierCode: z
    .string()
    .min(1, 'Beszállító cikkszám megadása kötelező')
    .max(100, 'Beszállító cikkszám maximum 100 karakter lehet')
    .transform((val) => val.trim()),

  costPrice: z
    .number()
    .min(0, 'Beszerzési ár nem lehet negatív')
    .max(999999999999, 'Beszerzési ár túl nagy'),

  currency: z.enum(SUPPORTED_CURRENCIES).default('HUF').optional(),

  leadTimeDays: z
    .number()
    .int('Szállítási idő egész szám kell legyen')
    .min(0, 'Szállítási idő nem lehet negatív')
    .max(365, 'Szállítási idő maximum 365 nap')
    .optional()
    .nullable(),

  minOrderQty: z
    .number()
    .int('Minimum rendelési mennyiség egész szám kell legyen')
    .min(1, 'Minimum rendelési mennyiség legalább 1')
    .max(999999, 'Minimum rendelési mennyiség túl nagy')
    .optional()
    .nullable(),

  isPrimary: z.boolean().default(false).optional(),
});

export type LinkItemToSupplierDto = z.infer<typeof linkItemToSupplierSchema>;

/**
 * Update SupplierItem schema
 */
export const updateSupplierItemSchema = z.object({
  supplierCode: z
    .string()
    .min(1, 'Beszállító cikkszám nem lehet üres')
    .max(100, 'Beszállító cikkszám maximum 100 karakter lehet')
    .transform((val) => val.trim())
    .optional(),

  costPrice: z
    .number()
    .min(0, 'Beszerzési ár nem lehet negatív')
    .max(999999999999, 'Beszerzési ár túl nagy')
    .optional(),

  currency: z.enum(SUPPORTED_CURRENCIES).optional(),

  leadTimeDays: z
    .number()
    .int('Szállítási idő egész szám kell legyen')
    .min(0, 'Szállítási idő nem lehet negatív')
    .max(365, 'Szállítási idő maximum 365 nap')
    .optional()
    .nullable(),

  minOrderQty: z
    .number()
    .int('Minimum rendelési mennyiség egész szám kell legyen')
    .min(1, 'Minimum rendelési mennyiség legalább 1')
    .max(999999, 'Minimum rendelési mennyiség túl nagy')
    .optional()
    .nullable(),

  isPrimary: z.boolean().optional(),
});

export type UpdateSupplierItemDto = z.infer<typeof updateSupplierItemSchema>;

/**
 * Validate and parse LinkItemToSupplierDto
 */
export function validateLinkItemToSupplierDto(data: unknown): {
  success: true;
  data: LinkItemToSupplierDto;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = linkItemToSupplierSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Parse LinkItemToSupplierDto (throws on error)
 */
export function parseLinkItemToSupplierDto(data: unknown): LinkItemToSupplierDto {
  return linkItemToSupplierSchema.parse(data);
}

/**
 * Validate and parse UpdateSupplierItemDto
 */
export function validateUpdateSupplierItemDto(data: unknown): {
  success: true;
  data: UpdateSupplierItemDto;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = updateSupplierItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Parse UpdateSupplierItemDto (throws on error)
 */
export function parseUpdateSupplierItemDto(data: unknown): UpdateSupplierItemDto {
  return updateSupplierItemSchema.parse(data);
}
