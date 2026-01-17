/**
 * @kgc/service-worksheet - Worksheet DTOs
 * Story 17-1: Munkalap CRUD
 *
 * Zod validációs sémák
 */

import { z } from 'zod';
import { WorksheetType, WorksheetPriority } from '../interfaces/worksheet.interface';

/**
 * Munkalap létrehozás DTO
 */
export const CreateWorksheetSchema = z.object({
  /** Partner azonosító */
  partnerId: z.string().uuid('Érvénytelen partner azonosító'),
  /** Munkalap típus */
  type: z.nativeEnum(WorksheetType, {
    errorMap: () => ({ message: 'Érvénytelen munkalap típus' }),
  }),
  /** Prioritás (opcionális, default: NORMAL) */
  priority: z.nativeEnum(WorksheetPriority).default(WorksheetPriority.NORMAL),
  /** Gép megnevezés */
  deviceName: z
    .string()
    .min(2, 'Gép megnevezés minimum 2 karakter')
    .max(200, 'Gép megnevezés maximum 200 karakter'),
  /** Gép sorozatszám (opcionális) */
  deviceSerialNumber: z.string().max(100).optional(),
  /** Hiba leírás */
  faultDescription: z
    .string()
    .min(5, 'Hiba leírás minimum 5 karakter')
    .max(2000, 'Hiba leírás maximum 2000 karakter'),
  /** Belső megjegyzés (opcionális) */
  internalNote: z.string().max(2000).optional(),
  /** Felelős szerelő ID (opcionális) */
  assignedToId: z.string().uuid().optional(),
  /** Javítási költség limit (opcionális, FR107) */
  costLimit: z.number().min(0).max(10_000_000).optional(),
  /** Becsült befejezés (opcionális) */
  estimatedCompletionDate: z.coerce.date().optional(),
  /** Kapcsolódó bérlés ID (opcionális) */
  rentalId: z.string().uuid().optional(),
});

export type CreateWorksheetDto = z.infer<typeof CreateWorksheetSchema>;

/**
 * Munkalap frissítés DTO
 */
export const UpdateWorksheetSchema = z.object({
  /** Prioritás */
  priority: z.nativeEnum(WorksheetPriority).optional(),
  /** Gép megnevezés */
  deviceName: z.string().min(2).max(200).optional(),
  /** Gép sorozatszám */
  deviceSerialNumber: z.string().max(100).optional(),
  /** Hiba leírás */
  faultDescription: z.string().min(5).max(2000).optional(),
  /** Diagnosztika */
  diagnosis: z.string().max(2000).optional(),
  /** Elvégzett munka */
  workPerformed: z.string().max(2000).optional(),
  /** Belső megjegyzés */
  internalNote: z.string().max(2000).optional(),
  /** Felelős szerelő ID */
  assignedToId: z.string().uuid().optional().nullable(),
  /** Javítási költség limit */
  costLimit: z.number().min(0).max(10_000_000).optional().nullable(),
  /** Becsült befejezés */
  estimatedCompletionDate: z.coerce.date().optional().nullable(),
});

export type UpdateWorksheetDto = z.infer<typeof UpdateWorksheetSchema>;

/**
 * Munkalap tétel létrehozás DTO
 */
export const CreateWorksheetItemSchema = z.object({
  /** Cikk ID (alkatrész esetén) */
  productId: z.string().uuid().optional(),
  /** Tétel megnevezés */
  description: z.string().min(2, 'Megnevezés minimum 2 karakter').max(500),
  /** Mennyiség */
  quantity: z.number().positive('Mennyiség pozitív kell legyen'),
  /** Egységár (nettó) */
  unitPrice: z.number().min(0, 'Egységár nem lehet negatív'),
  /** ÁFA kulcs (%) */
  vatRate: z.number().min(0).max(100).default(27),
  /** Tétel típus */
  itemType: z.enum(['ALKATRESZ', 'MUNKADIJ', 'EGYEB']),
});

export type CreateWorksheetItemDto = z.infer<typeof CreateWorksheetItemSchema>;

/**
 * Munkalap lista szűrő DTO
 */
export const WorksheetFilterSchema = z.object({
  /** Státusz szűrő */
  status: z.string().optional(),
  /** Típus szűrő */
  type: z.nativeEnum(WorksheetType).optional(),
  /** Partner ID szűrő */
  partnerId: z.string().uuid().optional(),
  /** Felelős szerelő ID szűrő */
  assignedToId: z.string().uuid().optional(),
  /** Dátum tól */
  dateFrom: z.coerce.date().optional(),
  /** Dátum ig */
  dateTo: z.coerce.date().optional(),
  /** Keresés (munkalap szám, gép, partner) */
  search: z.string().optional(),
  /** Limit */
  limit: z.number().min(1).max(100).default(20),
  /** Offset */
  offset: z.number().min(0).default(0),
});

export type WorksheetFilterDto = z.infer<typeof WorksheetFilterSchema>;
