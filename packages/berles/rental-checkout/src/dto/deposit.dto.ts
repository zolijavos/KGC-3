/**
 * @kgc/rental-checkout - Deposit DTOs
 * Epic 16: Deposit Management
 */

import { z } from 'zod';
import {
  DepositPaymentMethod,
  DepositRetentionReason,
  DepositStatus,
} from '../interfaces/deposit.interface';

/**
 * Kaució felvétel DTO schema
 */
export const CreateDepositSchema = z.object({
  rentalId: z.string().uuid('Érvénytelen bérlés azonosító'),
  partnerId: z.string().uuid('Érvénytelen partner azonosító'),
  amount: z
    .number()
    .int('Kaució összeg egész szám kell legyen')
    .min(0, 'Kaució összeg nem lehet negatív')
    .max(1_000_000, 'Kaució összeg maximum 1.000.000 Ft'),
  paymentMethod: z.nativeEnum(DepositPaymentMethod, {
    errorMap: () => ({ message: 'Érvénytelen fizetési mód' }),
  }),
  notes: z.string().max(500, 'Megjegyzés maximum 500 karakter').optional(),
});

export type CreateDepositDto = z.infer<typeof CreateDepositSchema>;

/**
 * Kaució visszaadás DTO schema
 */
export const ReleaseDepositSchema = z.object({
  depositId: z.string().uuid('Érvénytelen kaució azonosító'),
  refundMethod: z.nativeEnum(DepositPaymentMethod, {
    errorMap: () => ({ message: 'Érvénytelen visszafizetési mód' }),
  }),
  notes: z.string().max(500).optional(),
});

export type ReleaseDepositDto = z.infer<typeof ReleaseDepositSchema>;

/**
 * Kaució visszatartás DTO schema
 */
export const RetainDepositSchema = z.object({
  depositId: z.string().uuid('Érvénytelen kaució azonosító'),
  reason: z.nativeEnum(DepositRetentionReason, {
    errorMap: () => ({ message: 'Érvénytelen visszatartási ok' }),
  }),
  retainedAmount: z
    .number()
    .int('Visszatartott összeg egész szám kell legyen')
    .min(1, 'Visszatartott összeg minimum 1 Ft'),
  description: z
    .string()
    .min(10, 'Indoklás minimum 10 karakter')
    .max(1000, 'Indoklás maximum 1000 karakter'),
  attachments: z.array(z.string().url()).optional(),
});

export type RetainDepositDto = z.infer<typeof RetainDepositSchema>;

/**
 * Kaució lekérdezés DTO
 */
export const DepositQuerySchema = z.object({
  rentalId: z.string().uuid().optional(),
  partnerId: z.string().uuid().optional(),
  status: z.nativeEnum(DepositStatus).optional(),
  paymentMethod: z.nativeEnum(DepositPaymentMethod).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type DepositQueryDto = z.infer<typeof DepositQuerySchema>;

/**
 * Kaució response DTO
 */
export interface DepositResponseDto {
  id: string;
  rentalId: string;
  partnerId: string;
  amount: number;
  status: DepositStatus;
  paymentMethod: DepositPaymentMethod;
  myposTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
