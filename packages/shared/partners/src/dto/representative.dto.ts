/**
 * @kgc/partners - Representative DTOs with Zod validation
 * Epic 7: Story 7-2: Meghatalmazott kezelés
 */

import { z } from 'zod';

// ============================================
// CREATE REPRESENTATIVE DTO
// ============================================

export const CreateRepresentativeSchema = z.object({
  /** Partner ID */
  partnerId: z.string().uuid({ message: 'Érvénytelen partner ID' }),

  /** Név */
  name: z
    .string()
    .min(1, { message: 'A név kötelező' })
    .max(255, { message: 'A név maximum 255 karakter' }),

  /** Telefon */
  phone: z.string().max(30).optional(),

  /** Email */
  email: z.string().email({ message: 'Érvénytelen email cím' }).optional(),

  /** Igazolványszám */
  idNumber: z.string().max(50).optional(),

  /** Érvényesség kezdete */
  validFrom: z.coerce.date().default(() => new Date()),

  /** Érvényesség vége */
  validUntil: z.coerce.date().optional(),

  /** Jogosultságok */
  canRent: z.boolean().default(true),
  canReturn: z.boolean().default(true),
  canSign: z.boolean().default(true),
  canPayCash: z.boolean().default(false),

  /** Megjegyzés */
  notes: z.string().max(500).optional(),
});

export type CreateRepresentativeInput = z.infer<typeof CreateRepresentativeSchema>;

// ============================================
// UPDATE REPRESENTATIVE DTO
// ============================================

export const UpdateRepresentativeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  idNumber: z.string().max(50).nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  canRent: z.boolean().optional(),
  canReturn: z.boolean().optional(),
  canSign: z.boolean().optional(),
  canPayCash: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateRepresentativeInput = z.infer<typeof UpdateRepresentativeSchema>;

// ============================================
// VALIDATE REPRESENTATIVE DTO
// ============================================

export const ValidateRepresentativeSchema = z.object({
  /** Partner ID */
  partnerId: z.string().uuid(),

  /** Meghatalmazott ID */
  representativeId: z.string().uuid(),

  /** Ellenőrizendő művelet */
  action: z.enum(['rent', 'return', 'sign', 'pay_cash']),
});

export type ValidateRepresentativeInput = z.infer<typeof ValidateRepresentativeSchema>;

export interface RepresentativeValidationResult {
  isValid: boolean;
  representative: {
    id: string;
    name: string;
  } | null;
  errorCode?: 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'NO_PERMISSION';
  errorMessage?: string;
}
