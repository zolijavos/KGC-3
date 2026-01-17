/**
 * Credit Limit DTO schemas with Zod validation
 * FR28: Partner hitelkeret validálása
 */
import { z } from 'zod';

/**
 * Hitelkeret státusz enum
 */
export const CreditLimitStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'EXCEEDED', 'INACTIVE']);

/**
 * Tranzakció típus enum
 */
export const CreditTransactionTypeSchema = z.enum(['CHARGE', 'PAYMENT', 'ADJUSTMENT', 'LIMIT_CHANGE']);

/**
 * Hitelkeret beállítás DTO
 */
export const SetCreditLimitDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  creditLimit: z.number().min(0, 'Hitelkeret nem lehet negatív').max(100000000, 'Hitelkeret max 100M Ft'),
  warningThreshold: z.number().int().min(50).max(100).default(80),
  approvedBy: z.string().uuid('Érvénytelen jóváhagyó ID'),
  notes: z.string().max(500, 'Megjegyzés maximum 500 karakter').optional(),
});

export type SetCreditLimitDto = z.infer<typeof SetCreditLimitDtoSchema>;

/**
 * Terhelés DTO
 */
export const ChargeDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  amount: z.number().positive('Összeg pozitív kell legyen'),
  description: z.string().min(3, 'Leírás minimum 3 karakter').max(200, 'Leírás maximum 200 karakter'),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
});

export type ChargeDto = z.infer<typeof ChargeDtoSchema>;

/**
 * Befizetés DTO
 */
export const PaymentDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  amount: z.number().positive('Összeg pozitív kell legyen'),
  description: z.string().min(3, 'Leírás minimum 3 karakter').max(200, 'Leírás maximum 200 karakter'),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  createdBy: z.string().uuid('Érvénytelen createdBy ID'),
});

export type PaymentDto = z.infer<typeof PaymentDtoSchema>;

/**
 * Hitelkeret ellenőrzés DTO
 */
export const CreditCheckDtoSchema = z.object({
  partnerId: z.string().uuid('Érvénytelen partner ID'),
  tenantId: z.string().uuid('Érvénytelen tenant ID'),
  amount: z.number().positive('Összeg pozitív kell legyen'),
});

export type CreditCheckDto = z.infer<typeof CreditCheckDtoSchema>;
