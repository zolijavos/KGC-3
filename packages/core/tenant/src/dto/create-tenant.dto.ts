import { z } from 'zod';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * Slug validációs regex - URL-safe karakterek
 * Megengedett: kisbetűk, számok, kötőjel
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tenant beállítások Zod schema
 */
const tenantSettingsSchema = z.object({
  timezone: z.string().default('Europe/Budapest'),
  currency: z.string().default('HUF'),
  locale: z.string().default('hu-HU'),
  features: z.array(z.string()).default([]),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    companyName: z.string().optional(),
  }).optional(),
}).strict();

/**
 * Tenant létrehozás DTO - Zod validáció magyar hibaüzenetekkel
 */
export const createTenantSchema = z.object({
  name: z.string({
    required_error: 'A tenant neve kötelező',
    invalid_type_error: 'A tenant nevének szövegnek kell lennie',
  })
    .min(2, { message: 'A tenant neve legalább 2 karakter hosszú kell legyen' })
    .max(255, { message: 'A tenant neve maximum 255 karakter lehet' })
    .trim(),

  slug: z.string({
    required_error: 'A slug kötelező',
    invalid_type_error: 'A slug-nak szövegnek kell lennie',
  })
    .min(2, { message: 'A slug legalább 2 karakter hosszú kell legyen' })
    .max(100, { message: 'A slug maximum 100 karakter lehet' })
    .regex(SLUG_REGEX, {
      message: 'A slug csak kisbetűket, számokat és kötőjeleket tartalmazhat'
    })
    .toLowerCase(),

  status: z.nativeEnum(TenantStatus, {
    errorMap: () => ({ message: 'Érvénytelen tenant státusz' }),
  }).optional().default(TenantStatus.PENDING),

  settings: tenantSettingsSchema.optional().default(DEFAULT_TENANT_SETTINGS),

  parentTenantId: z.string().uuid({
    message: 'A szülő tenant ID-nak érvényes UUID-nak kell lennie'
  }).nullable().optional(),
}).strict();

export type CreateTenantDto = z.infer<typeof createTenantSchema>;
export type CreateTenantInput = z.input<typeof createTenantSchema>;

/**
 * DTO validálása - visszaad validált adatot vagy hibát dob
 */
export function validateCreateTenantDto(data: unknown): CreateTenantDto {
  return createTenantSchema.parse(data);
}

/**
 * DTO validálása biztonságosan - success/error objektumot ad vissza
 */
export function safeValidateCreateTenantDto(data: unknown): z.SafeParseReturnType<unknown, CreateTenantDto> {
  return createTenantSchema.safeParse(data);
}
