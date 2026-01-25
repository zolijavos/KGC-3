/**
 * @kgc/partners - Loyalty Tier DTOs with Zod validation
 * Epic 7: Story 7-3: Törzsvendég kártya rendszer (ADR-034)
 */

import { z } from 'zod';

// ============================================
// TIER CODES
// ============================================

export const TierCodeSchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'CUSTOM']);
export type TierCode = z.infer<typeof TierCodeSchema>;

// ============================================
// CREATE LOYALTY TIER DTO
// ============================================

export const CreateLoyaltyTierSchema = z.object({
  /** Szint kód (egyedi tenant-en belül) */
  tierCode: z
    .string()
    .min(1, { message: 'A szint kód kötelező' })
    .max(20, { message: 'A szint kód maximum 20 karakter' })
    .toUpperCase(),

  /** Szint neve */
  tierName: z
    .string()
    .min(1, { message: 'A szint név kötelező' })
    .max(100, { message: 'A szint név maximum 100 karakter' }),

  /** Minimum tranzakciók száma a szint eléréséhez */
  minTransactions: z
    .number()
    .int()
    .min(0, { message: 'A minimum tranzakciószám nem lehet negatív' }),

  /** Minimum költés a szint eléréséhez */
  minSpend: z.number().min(0).optional(),

  /** Kedvezmény százalék */
  discountPercent: z
    .number()
    .min(0, { message: 'A kedvezmény nem lehet negatív' })
    .max(100, { message: 'A kedvezmény maximum 100%' }),

  /** Szint előnyei (JSON array) */
  benefits: z.array(z.string()).default([]),

  /** Jelvény színe (hex kód) */
  badgeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Érvénytelen hex szín' })
    .optional(),

  /** Rendezési sorrend */
  sortOrder: z.number().int().min(0).default(0),

  /** Aktív-e */
  isActive: z.boolean().default(true),
});

export type CreateLoyaltyTierInput = z.infer<typeof CreateLoyaltyTierSchema>;

// ============================================
// UPDATE LOYALTY TIER DTO
// ============================================

export const UpdateLoyaltyTierSchema = z.object({
  tierName: z.string().min(1).max(100).optional(),
  minTransactions: z.number().int().min(0).optional(),
  minSpend: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  benefits: z.array(z.string()).optional(),
  badgeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateLoyaltyTierInput = z.infer<typeof UpdateLoyaltyTierSchema>;

// ============================================
// ADD LOYALTY POINTS DTO
// ============================================

export const AddLoyaltyPointsSchema = z.object({
  /** Partner ID */
  partnerId: z.string().uuid({ message: 'Érvénytelen partner ID' }),

  /** Pontok száma (pozitív: hozzáadás, negatív: levonás) */
  points: z.number().int({ message: 'A pontszám egész szám kell legyen' }),

  /** Pont változás indoka */
  reason: z
    .string()
    .min(1, { message: 'Az indok kötelező' })
    .max(200, { message: 'Az indok maximum 200 karakter' }),

  /** Kapcsolódó tranzakció ID (opcionális) */
  transactionId: z.string().uuid().optional(),
});

export type AddLoyaltyPointsInput = z.infer<typeof AddLoyaltyPointsSchema>;

// ============================================
// ASSIGN TIER DTO
// ============================================

export const AssignTierSchema = z.object({
  /** Partner ID */
  partnerId: z.string().uuid({ message: 'Érvénytelen partner ID' }),

  /** Szint ID */
  tierId: z.string().uuid({ message: 'Érvénytelen szint ID' }),

  /** Kézi beállítás indoka */
  reason: z.string().max(200).optional(),
});

export type AssignTierInput = z.infer<typeof AssignTierSchema>;

// ============================================
// TIER CALCULATION RESULT
// ============================================

/**
 * Full tier calculation result for a specific partner
 * Used by services to determine if partner tier should change
 */
export interface PartnerTierCalculationResult {
  partnerId: string;
  currentTierId: string | null;
  calculatedTierId: string | null;
  shouldUpgrade: boolean;
  shouldDowngrade: boolean;
  totalTransactions: number;
  totalSpend: number;
  currentPoints: number;
  nextTierRequirements?: {
    tierId: string;
    tierName: string;
    transactionsNeeded: number;
    spendNeeded: number;
  };
}

/**
 * Simple tier calculation result from repository
 * Calculates tier based on transaction count and spend
 */
export interface TierCalculationResult {
  calculatedTierId: string | null;
  calculatedTierName: string | null;
  discountPercent: number;
  nextTierId: string | null;
  nextTierName: string | null;
  transactionsToNextTier: number | null;
  spendToNextTier: number | null;
}
