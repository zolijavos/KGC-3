import { z } from 'zod';
import { TenantStatus } from '../interfaces/tenant.interface';

/**
 * Slug validációs regex - URL-safe karakterek
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tenant beállítások Zod schema (partial)
 */
const tenantSettingsUpdateSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
  features: z.array(z.string()).optional(),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    companyName: z.string().optional(),
  }).optional(),
}).strict().partial();

/**
 * Tenant frissítés DTO - Zod validáció magyar hibaüzenetekkel
 * Minden mező opcionális (partial update)
 */
export const updateTenantSchema = z.object({
  name: z.string({
    invalid_type_error: 'A tenant nevének szövegnek kell lennie',
  })
    .min(2, { message: 'A tenant neve legalább 2 karakter hosszú kell legyen' })
    .max(255, { message: 'A tenant neve maximum 255 karakter lehet' })
    .trim()
    .optional(),

  slug: z.string({
    invalid_type_error: 'A slug-nak szövegnek kell lennie',
  })
    .min(2, { message: 'A slug legalább 2 karakter hosszú kell legyen' })
    .max(100, { message: 'A slug maximum 100 karakter lehet' })
    .regex(SLUG_REGEX, {
      message: 'A slug csak kisbetűket, számokat és kötőjeleket tartalmazhat'
    })
    .toLowerCase()
    .optional(),

  status: z.nativeEnum(TenantStatus, {
    errorMap: () => ({ message: 'Érvénytelen tenant státusz' }),
  }).optional(),

  settings: tenantSettingsUpdateSchema.optional(),

  parentTenantId: z.string().uuid({
    message: 'A szülő tenant ID-nak érvényes UUID-nak kell lennie'
  }).nullable().optional(),
}).strict();

export type UpdateTenantDto = z.infer<typeof updateTenantSchema>;

/**
 * DTO validálása - visszaad validált adatot vagy hibát dob
 */
export function validateUpdateTenantDto(data: unknown): UpdateTenantDto {
  return updateTenantSchema.parse(data);
}

/**
 * DTO validálása biztonságosan
 */
export function safeValidateUpdateTenantDto(data: unknown): z.SafeParseReturnType<unknown, UpdateTenantDto> {
  return updateTenantSchema.safeParse(data);
}
