import { z } from 'zod';
import { TenantStatus } from '../interfaces/tenant.interface';

/**
 * Tenant szűrés DTO - lista és keresés
 */
export const tenantFilterSchema = z.object({
  search: z.string()
    .max(100, { message: 'A keresés maximum 100 karakter lehet' })
    .optional(),

  status: z.nativeEnum(TenantStatus, {
    errorMap: () => ({ message: 'Érvénytelen tenant státusz' }),
  }).optional(),

  page: z.coerce.number()
    .int({ message: 'Az oldalszámnak egész számnak kell lennie' })
    .min(1, { message: 'Az oldalszám minimum 1 lehet' })
    .default(1),

  limit: z.coerce.number()
    .int({ message: 'A limitnek egész számnak kell lennie' })
    .min(1, { message: 'A limit minimum 1 lehet' })
    .max(100, { message: 'A limit maximum 100 lehet' })
    .default(20),

  parentTenantId: z.string().uuid({
    message: 'A szülő tenant ID-nak érvényes UUID-nak kell lennie'
  }).optional(),

  includeInactive: z.coerce.boolean().default(false),
}).strict();

export type TenantFilterDto = z.infer<typeof tenantFilterSchema>;

/**
 * DTO validálása
 */
export function validateTenantFilterDto(data: unknown): TenantFilterDto {
  return tenantFilterSchema.parse(data);
}

/**
 * DTO validálása biztonságosan
 */
export function safeValidateTenantFilterDto(data: unknown): z.SafeParseReturnType<unknown, TenantFilterDto> {
  return tenantFilterSchema.safeParse(data);
}
