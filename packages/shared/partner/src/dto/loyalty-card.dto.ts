/**
 * Loyalty Card DTO schemas with Zod validation
 * FR27: Törzsvendég kártya validálása
 */
import { z } from 'zod';

/**
 * Kártya típus enum
 */
export const LoyaltyCardTypeSchema = z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']);

/**
 * Kártya státusz enum
 */
export const LoyaltyCardStatusSchema = z.enum(['ACTIVE', 'BLOCKED', 'EXPIRED', 'REPLACED']);

/**
 * Pont tranzakció típus enum
 */
export const PointTransactionTypeSchema = z.enum(['EARN', 'REDEEM', 'ADJUST', 'EXPIRE', 'TRANSFER']);

/**
 * Kártya csere ok enum
 */
export const ReplaceReasonSchema = z.enum(['LOST', 'DAMAGED', 'STOLEN', 'UPGRADE', 'EXPIRED']);

/**
 * Kártya kiállítás DTO
 */
export const IssueLoyaltyCardDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  type: LoyaltyCardTypeSchema.default('STANDARD'),
  expiresAt: z.date().optional(),
  initialPoints: z.number().int().min(0, 'Pontok nem lehetnek negatívak').default(0),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
  notes: z.string().max(500, 'Megjegyzés maximum 500 karakter').optional(),
});

export type IssueLoyaltyCardDto = z.infer<typeof IssueLoyaltyCardDtoSchema>;

/**
 * Pont módosítás DTO
 */
export const AdjustPointsDtoSchema = z.object({
  cardId: z.string().uuid('Érvénytelen kártya ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  points: z.number().int().refine((val) => val !== 0, {
    message: 'Pontok nem lehetnek 0',
  }),
  type: PointTransactionTypeSchema,
  description: z
    .string()
    .min(3, 'Leírás minimum 3 karakter')
    .max(200, 'Leírás maximum 200 karakter'),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid('Érvénytelen reference ID').optional(),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
});

export type AdjustPointsDto = z.infer<typeof AdjustPointsDtoSchema>;

/**
 * Kártya csere DTO
 */
export const ReplaceCardDtoSchema = z.object({
  oldCardId: z.string().uuid('Érvénytelen régi kártya ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  reason: ReplaceReasonSchema,
  newType: LoyaltyCardTypeSchema.optional(),
  transferPoints: z.boolean().default(true),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
});

export type ReplaceCardDto = z.infer<typeof ReplaceCardDtoSchema>;

/**
 * Kártya scan DTO
 */
export const ScanCardDtoSchema = z.object({
  code: z.string().min(1, 'Kód megadása kötelező'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  operatorId: z.string().uuid('Érvénytelen operátor ID'),
  locationId: z.string().uuid('Érvénytelen location ID').optional(),
});

export type ScanCardDto = z.infer<typeof ScanCardDtoSchema>;

/**
 * Pont beváltás DTO
 */
export const RedeemPointsDtoSchema = z.object({
  cardId: z.string().uuid('Érvénytelen kártya ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  points: z.number().int().min(1, 'Minimum 1 pont beváltható'),
  description: z.string().min(3, 'Leírás minimum 3 karakter'),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
});

export type RedeemPointsDto = z.infer<typeof RedeemPointsDtoSchema>;
