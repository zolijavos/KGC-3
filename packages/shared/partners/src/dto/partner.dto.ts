/**
 * @kgc/partners - Partner DTOs with Zod validation
 * Epic 7: Story 7-1: Partner CRUD
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const PartnerTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);
export const PartnerStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']);

// ============================================
// CREATE PARTNER DTO
// ============================================

export const CreatePartnerSchema = z.object({
  /** Partner típus */
  type: PartnerTypeSchema.default('INDIVIDUAL'),

  /** Partner kód (egyedi tenant-en belül) */
  partnerCode: z
    .string()
    .min(1, { message: 'A partner kód kötelező' })
    .max(50, { message: 'A partner kód maximum 50 karakter' }),

  /** Név */
  name: z
    .string()
    .min(1, { message: 'A név kötelező' })
    .max(255, { message: 'A név maximum 255 karakter' }),

  /** Cégnév (cégeknél) */
  companyName: z.string().max(255).optional(),

  /** Kapcsolattartó neve */
  contactName: z.string().max(255).optional(),

  /** Adószám */
  taxNumber: z
    .string()
    .max(20)
    .regex(/^[0-9-]+$/, { message: 'Érvénytelen adószám formátum' })
    .optional(),

  /** EU VAT szám */
  euVatNumber: z.string().max(20).optional(),

  /** Email */
  email: z.string().email({ message: 'Érvénytelen email cím' }).optional(),

  /** Telefon */
  phone: z.string().max(30).optional(),

  /** Másodlagos telefon */
  phoneAlt: z.string().max(30).optional(),

  /** Ország (ISO kód) */
  country: z.string().length(2, { message: 'Ország kód 2 karakter' }).optional(),

  /** Irányítószám */
  postalCode: z.string().max(20).optional(),

  /** Város */
  city: z.string().max(100).optional(),

  /** Cím */
  address: z.string().max(255).optional(),

  /** Másodlagos cím */
  addressAlt: z.string().max(255).optional(),

  /** Születési dátum */
  birthDate: z.coerce.date().optional(),

  /** Személyi igazolvány szám */
  idCardNumber: z.string().max(50).optional(),

  /** Jogosítvány szám */
  drivingLicenseNo: z.string().max(50).optional(),

  /** Hitelkeret */
  creditLimit: z.number().min(0).optional(),

  /** Fizetési határidő (napokban) */
  paymentTermDays: z.number().int().min(0).max(365).default(0),

  /** Alapértelmezett kedvezmény % */
  defaultDiscountPc: z.number().min(0).max(100).default(0),

  /** Figyelmeztetés megjegyzés */
  warningNote: z.string().max(500).optional(),

  /** Megjegyzések */
  notes: z.string().optional(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;

// ============================================
// UPDATE PARTNER DTO
// ============================================

export const UpdatePartnerSchema = z.object({
  type: PartnerTypeSchema.optional(),
  status: PartnerStatusSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  companyName: z.string().max(255).nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  taxNumber: z.string().max(20).nullable().optional(),
  euVatNumber: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  phoneAlt: z.string().max(30).nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  addressAlt: z.string().max(255).nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
  idCardNumber: z.string().max(50).nullable().optional(),
  drivingLicenseNo: z.string().max(50).nullable().optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
  defaultDiscountPc: z.number().min(0).max(100).optional(),
  warningNote: z.string().max(500).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>;

// ============================================
// BLACKLIST PARTNER DTO
// ============================================

export const BlacklistPartnerSchema = z.object({
  /** Feketelistázás indoka */
  reason: z
    .string()
    .min(10, { message: 'Az indoklás legalább 10 karakter' })
    .max(500, { message: 'Az indoklás maximum 500 karakter' }),
});

export type BlacklistPartnerInput = z.infer<typeof BlacklistPartnerSchema>;

// ============================================
// UPDATE CREDIT LIMIT DTO
// ============================================

export const UpdateCreditLimitSchema = z.object({
  /** Új hitelkeret */
  creditLimit: z.number().min(0, { message: 'A hitelkeret nem lehet negatív' }),

  /** Megjegyzés a változáshoz */
  reason: z.string().max(200).optional(),
});

export type UpdateCreditLimitInput = z.infer<typeof UpdateCreditLimitSchema>;

// ============================================
// SEARCH PARTNER DTO
// ============================================

export const SearchPartnerSchema = z.object({
  /** Keresési kifejezés (név, kód, telefon, email) */
  query: z.string().min(2, { message: 'Minimum 2 karakter szükséges' }),

  /** Partner típus szűrő */
  type: PartnerTypeSchema.optional(),

  /** Csak aktív partnerek */
  activeOnly: z.boolean().default(true),

  /** Maximum találatok */
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchPartnerInput = z.infer<typeof SearchPartnerSchema>;
