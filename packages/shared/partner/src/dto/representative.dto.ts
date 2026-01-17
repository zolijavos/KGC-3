/**
 * Representative DTO schemas with Zod validation
 * FR26: Meghatalmazott validálása
 */
import { z } from 'zod';

/**
 * Meghatalmazás típus enum
 */
export const AuthorizationTypeSchema = z.enum(['RENTAL', 'SERVICE', 'BOTH']);

/**
 * Meghatalmazott státusz enum
 */
export const RepresentativeStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);

/**
 * Meghatalmazott létrehozás DTO
 */
export const CreateRepresentativeDtoSchema = z
  .object({
    partnerId: z.string().uuid('Érvénytelen partner ID'),
    tenantId: z.string().uuid('Érvénytelen tenant ID'),
    name: z.string().min(2, 'Név minimum 2 karakter').max(100, 'Név maximum 100 karakter'),
    email: z.string().email('Érvénytelen email cím').optional(),
    phone: z.string().min(6, 'Telefonszám minimum 6 karakter').optional(),
    position: z.string().max(100, 'Beosztás maximum 100 karakter').optional(),
    personalId: z.string().max(20, 'Személyi ig. szám maximum 20 karakter').optional(),
    authorizationType: AuthorizationTypeSchema,
    isPrimary: z.boolean().default(false),
    validFrom: z.date().optional(),
    validTo: z
      .date()
      .optional()
      .refine((date) => !date || date > new Date(), {
        message: 'Érvényesség vége a jövőben kell legyen',
      }),
    notes: z.string().max(500, 'Megjegyzés maximum 500 karakter').optional(),
    createdBy: z.string().uuid('Érvénytelen createdBy ID'),
  })
  .refine(
    (data) => {
      // Ha validTo megadva, akkor validFrom-nál későbbi kell legyen
      if (data.validFrom && data.validTo && data.validTo <= data.validFrom) {
        return false;
      }
      return true;
    },
    {
      message: 'Érvényesség vége a kezdet után kell legyen',
      path: ['validTo'],
    }
  );

export type CreateRepresentativeDto = z.infer<typeof CreateRepresentativeDtoSchema>;

/**
 * Meghatalmazott frissítés DTO
 */
export const UpdateRepresentativeDtoSchema = z.object({
  name: z.string().min(2, 'Név minimum 2 karakter').max(100, 'Név maximum 100 karakter').optional(),
  email: z.string().email('Érvénytelen email cím').optional().nullable(),
  phone: z.string().min(6, 'Telefonszám minimum 6 karakter').optional().nullable(),
  position: z.string().max(100, 'Beosztás maximum 100 karakter').optional().nullable(),
  authorizationType: AuthorizationTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
  validTo: z.date().optional().nullable(),
  notes: z.string().max(500, 'Megjegyzés maximum 500 karakter').optional().nullable(),
  updatedBy: z.string().uuid('Érvénytelen updatedBy ID'),
});

export type UpdateRepresentativeDto = z.infer<typeof UpdateRepresentativeDtoSchema>;

/**
 * Meghatalmazás visszavonás DTO
 */
export const RevokeRepresentativeDtoSchema = z.object({
  revokedBy: z.string().uuid('Érvénytelen revokedBy ID'),
  revokeReason: z
    .string()
    .min(10, 'Visszavonási ok minimum 10 karakter')
    .max(500, 'Visszavonási ok maximum 500 karakter'),
});

export type RevokeRepresentativeDto = z.infer<typeof RevokeRepresentativeDtoSchema>;

/**
 * Meghatalmazott keresés DTO
 */
export const RepresentativeQueryDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  status: RepresentativeStatusSchema.optional(),
  authorizationType: AuthorizationTypeSchema.optional(),
  onlyActive: z.boolean().default(true),
  includeExpired: z.boolean().default(false),
});

export type RepresentativeQueryDto = z.infer<typeof RepresentativeQueryDtoSchema>;

/**
 * Meghatalmazott ID paraméter
 */
export const RepresentativeIdParamSchema = z.object({
  id: z.string().uuid('Érvénytelen meghatalmazott ID'),
  partnerId: z.string().uuid('Érvénytelen partner ID'),
});

export type RepresentativeIdParam = z.infer<typeof RepresentativeIdParamSchema>;
