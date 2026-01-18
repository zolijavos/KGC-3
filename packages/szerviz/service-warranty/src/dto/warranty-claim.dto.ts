/**
 * @kgc/service-warranty - Warranty Claim DTOs
 * Epic 19: Warranty Claims
 *
 * Zod validációs sémák
 */

import { z } from 'zod';
import { WarrantyClaimStatus, WarrantySupplier, WarrantyType } from '../interfaces/warranty-claim.interface';

/**
 * Garancia ellenőrzés input DTO
 */
export const WarrantyCheckInputSchema = z.object({
  serialNumber: z.string().min(1, 'Sorozatszám kötelező'),
  faultType: z.string().min(1, 'Hiba típus kötelező'),
  checkDate: z.date().optional(),
});

export type WarrantyCheckInputDto = z.infer<typeof WarrantyCheckInputSchema>;

/**
 * Warranty Claim létrehozás DTO
 */
export const CreateWarrantyClaimSchema = z.object({
  worksheetId: z.string().uuid('Érvénytelen munkalap ID'),
  supplier: z.nativeEnum(WarrantySupplier, {
    errorMap: () => ({ message: 'Érvénytelen beszállító' }),
  }),
  warrantyType: z.nativeEnum(WarrantyType, {
    errorMap: () => ({ message: 'Érvénytelen garancia típus' }),
  }),
  deviceSerialNumber: z.string().min(1, 'Sorozatszám kötelező'),
  deviceName: z.string().min(1, 'Gép megnevezés kötelező'),
  purchaseDate: z.coerce.date({
    errorMap: () => ({ message: 'Érvénytelen vásárlás dátum' }),
  }),
  warrantyExpiresAt: z.coerce.date({
    errorMap: () => ({ message: 'Érvénytelen garancia lejárat dátum' }),
  }),
  normaCode: z.string().optional(),
  normaHours: z.number().min(0).optional(),
  faultDescription: z.string().min(10, 'Hiba leírás minimum 10 karakter'),
  workPerformed: z.string().min(10, 'Elvégzett munka minimum 10 karakter'),
  claimedAmount: z.number().positive('Igényelt összeg pozitív szám kell legyen'),
}).refine(
  (data) => data.warrantyExpiresAt > data.purchaseDate,
  {
    message: 'Garancia lejárat dátum a vásárlás után kell legyen',
    path: ['warrantyExpiresAt'],
  }
);

export type CreateWarrantyClaimDto = z.infer<typeof CreateWarrantyClaimSchema>;

/**
 * Claim státusz frissítés DTO
 */
export const UpdateClaimStatusSchema = z.object({
  claimId: z.string().uuid('Érvénytelen claim ID'),
  status: z.nativeEnum(WarrantyClaimStatus, {
    errorMap: () => ({ message: 'Érvénytelen státusz' }),
  }),
  supplierResponse: z.string().optional(),
  supplierReference: z.string().optional(),
  approvedAmount: z.number().min(0).optional(),
}).refine(
  (data) => {
    // Ha APPROVED, akkor approvedAmount kötelező
    if (data.status === WarrantyClaimStatus.APPROVED && data.approvedAmount === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'Jóváhagyott összeg kötelező APPROVED státusznál',
    path: ['approvedAmount'],
  }
);

export type UpdateClaimStatusDto = z.infer<typeof UpdateClaimStatusSchema>;

/**
 * Claim elszámolás DTO
 */
export const SettleClaimSchema = z.object({
  claimId: z.string().uuid('Érvénytelen claim ID'),
  settledAmount: z.number().min(0, 'Elszámolt összeg nem lehet negatív'),
  settlementNote: z.string().optional(),
});

export type SettleClaimDto = z.infer<typeof SettleClaimSchema>;

/**
 * Claim lista szűrés DTO
 */
export const ClaimFilterSchema = z.object({
  status: z.nativeEnum(WarrantyClaimStatus).optional(),
  supplier: z.nativeEnum(WarrantySupplier).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  worksheetId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type ClaimFilterDto = z.infer<typeof ClaimFilterSchema>;

/**
 * Claim riport szűrés DTO
 */
export const ClaimReportFilterSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  supplier: z.nativeEnum(WarrantySupplier).optional(),
  groupBy: z.enum(['supplier', 'month', 'status']).default('supplier'),
}).refine(
  (data) => data.dateTo >= data.dateFrom,
  {
    message: 'Záró dátum nem lehet korábbi a kezdő dátumnál',
    path: ['dateTo'],
  }
);

export type ClaimReportFilterDto = z.infer<typeof ClaimReportFilterSchema>;
