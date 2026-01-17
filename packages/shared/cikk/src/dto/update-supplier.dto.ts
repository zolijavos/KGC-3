/**
 * Update Supplier DTO with Zod validation
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { z } from 'zod';
import { SupplierStatus } from '../interfaces/supplier.interface';

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
 * Update Supplier schema
 */
export const updateSupplierSchema = z.object({
  name: z
    .string()
    .min(1, 'Beszállító név nem lehet üres')
    .max(255, 'Beszállító név maximum 255 karakter lehet')
    .transform((val) => val.trim())
    .optional(),

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

  status: z.nativeEnum(SupplierStatus).optional(),
});

export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;

/**
 * Validate and parse UpdateSupplierDto
 */
export function validateUpdateSupplierDto(data: unknown): {
  success: true;
  data: UpdateSupplierDto;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = updateSupplierSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Parse UpdateSupplierDto (throws on error)
 */
export function parseUpdateSupplierDto(data: unknown): UpdateSupplierDto {
  return updateSupplierSchema.parse(data);
}
