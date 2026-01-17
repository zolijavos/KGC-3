/**
 * Partner DTO schemas with Zod validation
 * FR25: Partner adatok validálása
 */
import { z } from 'zod';

/**
 * Cím validáció
 */
export const AddressSchema = z.object({
  street: z.string().min(1, 'Utca megadása kötelező'),
  city: z.string().min(1, 'Város megadása kötelező'),
  postalCode: z.string().min(4, 'Irányítószám minimum 4 karakter'),
  country: z.string().default('Magyarország'),
});

/**
 * Kontakt személy validáció
 */
export const ContactPersonSchema = z.object({
  name: z.string().min(2, 'Név minimum 2 karakter'),
  email: z.string().email('Érvénytelen email cím').optional(),
  phone: z.string().min(6, 'Telefonszám minimum 6 karakter').optional(),
  position: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

/**
 * Partner típus enum
 */
export const PartnerTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);

/**
 * Partner státusz enum
 */
export const PartnerStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'DELETED']);

/**
 * Magyar adószám validáció (8 számjegy + kötőjel + 1 számjegy + kötőjel + 2 számjegy)
 * Formátum: 12345678-1-12
 * Az első 8 számjegy ellenőrző összegű: (1*d1 + 2*d2 + 3*d3 + 4*d4 + 5*d5 + 6*d6 + 7*d7) mod 10 = d8
 */
export const HungarianTaxNumberSchema = z
  .string()
  .regex(/^\d{8}-\d{1}-\d{2}$/, 'Érvénytelen magyar adószám formátum (12345678-1-12)')
  .refine(
    (value) => {
      // Extract the 8-digit base number
      const digits = value.replace(/-/g, '').slice(0, 8);
      // Calculate checksum: weights 1-7 for first 7 digits
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const digit = digits[i];
        if (digit !== undefined) {
          sum += (i + 1) * parseInt(digit, 10);
        }
      }
      const expectedCheckDigit = sum % 10;
      const actualCheckDigit = parseInt(digits[7] ?? '0', 10);
      return expectedCheckDigit === actualCheckDigit;
    },
    { message: 'Érvénytelen adószám ellenőrző számjegy' }
  )
  .optional();

/**
 * Magyar cégjegyzékszám validáció
 * Formátum: 01-09-123456
 */
export const RegistrationNumberSchema = z
  .string()
  .regex(/^\d{2}-\d{2}-\d{6}$/, 'Érvénytelen cégjegyzékszám formátum (01-09-123456)')
  .optional();

/**
 * Partner létrehozás DTO
 */
export const CreatePartnerDtoSchema = z
  .object({
    tenantId: z.string().uuid('Érvénytelen tenant ID'),
    type: PartnerTypeSchema,
    name: z.string().min(2, 'Név minimum 2 karakter').max(200, 'Név maximum 200 karakter'),
    email: z.string().email('Érvénytelen email cím').optional(),
    phone: z.string().min(6, 'Telefonszám minimum 6 karakter').optional(),
    address: AddressSchema.optional(),
    notes: z.string().max(1000, 'Megjegyzés maximum 1000 karakter').optional(),

    // Cég specifikus
    taxNumber: HungarianTaxNumberSchema,
    registrationNumber: RegistrationNumberSchema,
    contactPersons: z.array(ContactPersonSchema).optional(),

    createdBy: z.string().uuid('Érvénytelen createdBy ID'),
  })
  .refine(
    (data) => {
      // Cég esetén adószám kötelező
      if (data.type === 'COMPANY' && !data.taxNumber) {
        return false;
      }
      return true;
    },
    {
      message: 'Cég típusú partner esetén az adószám megadása kötelező',
      path: ['taxNumber'],
    }
  );

export type CreatePartnerDto = z.infer<typeof CreatePartnerDtoSchema>;

/**
 * Partner frissítés DTO
 */
export const UpdatePartnerDtoSchema = z.object({
  name: z.string().min(2, 'Név minimum 2 karakter').max(200, 'Név maximum 200 karakter').optional(),
  email: z.string().email('Érvénytelen email cím').optional().nullable(),
  phone: z.string().min(6, 'Telefonszám minimum 6 karakter').optional().nullable(),
  address: AddressSchema.optional().nullable(),
  notes: z.string().max(1000, 'Megjegyzés maximum 1000 karakter').optional().nullable(),
  status: PartnerStatusSchema.optional(),

  // Cég specifikus
  taxNumber: HungarianTaxNumberSchema,
  registrationNumber: RegistrationNumberSchema,

  updatedBy: z.string().uuid('Érvénytelen updatedBy ID'),
});

export type UpdatePartnerDto = z.infer<typeof UpdatePartnerDtoSchema>;

/**
 * Partner keresés DTO
 */
export const PartnerQueryDtoSchema = z.object({
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  type: PartnerTypeSchema.optional(),
  status: PartnerStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.boolean().default(false),
});

export type PartnerQueryDto = z.infer<typeof PartnerQueryDtoSchema>;

/**
 * Partner ID paraméter validáció
 */
export const PartnerIdParamSchema = z.object({
  id: z.string().uuid('Érvénytelen partner ID'),
});

export type PartnerIdParam = z.infer<typeof PartnerIdParamSchema>;
