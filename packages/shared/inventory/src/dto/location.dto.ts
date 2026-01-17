/**
 * @kgc/inventory - Location DTOs with Zod validation
 * Story 9-2: K-P-D helykód rendszer
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const LocationStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'FULL']);

// ============================================
// CREATE STRUCTURE DTO
// ============================================

export const CreateLocationStructureSchema = z.object({
  /** Raktár ID */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító (UUID)' }),

  /** Kommandó prefix */
  kommandoPrefix: z
    .string()
    .min(1, { message: 'A kommandó prefix kötelező' })
    .max(5, { message: 'A kommandó prefix maximum 5 karakter' })
    .default('K'),

  /** Polc prefix */
  polcPrefix: z
    .string()
    .min(1, { message: 'A polc prefix kötelező' })
    .max(5, { message: 'A polc prefix maximum 5 karakter' })
    .default('P'),

  /** Doboz prefix */
  dobozPrefix: z
    .string()
    .min(1, { message: 'A doboz prefix kötelező' })
    .max(5, { message: 'A doboz prefix maximum 5 karakter' })
    .default('D'),

  /** Elválasztó karakter */
  separator: z
    .string()
    .length(1, { message: 'Az elválasztó pontosan 1 karakter kell legyen' })
    .default('-'),

  /** Max kommandók */
  maxKommando: z
    .number()
    .int({ message: 'A kommandók száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 kommandó szükséges' })
    .max(999, { message: 'Maximum 999 kommandó engedélyezett' }),

  /** Max polc per kommandó */
  maxPolcPerKommando: z
    .number()
    .int({ message: 'A polcok száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 polc szükséges' })
    .max(999, { message: 'Maximum 999 polc engedélyezett' }),

  /** Max doboz per polc */
  maxDobozPerPolc: z
    .number()
    .int({ message: 'A dobozok száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 doboz szükséges' })
    .max(999, { message: 'Maximum 999 doboz engedélyezett' }),
});

export type CreateLocationStructureInput = z.infer<typeof CreateLocationStructureSchema>;

// ============================================
// UPDATE STRUCTURE DTO
// ============================================

export const UpdateLocationStructureSchema = z
  .object({
    kommandoPrefix: z.string().min(1).max(5).optional(),
    polcPrefix: z.string().min(1).max(5).optional(),
    dobozPrefix: z.string().min(1).max(5).optional(),
    separator: z.string().length(1).optional(),
    maxKommando: z.number().int().min(1).max(999).optional(),
    maxPolcPerKommando: z.number().int().min(1).max(999).optional(),
    maxDobozPerPolc: z.number().int().min(1).max(999).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateLocationStructureInput = z.infer<typeof UpdateLocationStructureSchema>;

// ============================================
// GENERATE LOCATIONS DTO (FR32)
// ============================================

export const GenerateLocationsSchema = z.object({
  /** Raktár ID */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító (UUID)' }),

  /** Kommandók száma */
  kommandoCount: z
    .number()
    .int({ message: 'A kommandók száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 kommandó szükséges' })
    .max(100, { message: 'Egyszerre maximum 100 kommandó generálható' }),

  /** Polcok száma */
  polcCount: z
    .number()
    .int({ message: 'A polcok száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 polc szükséges' })
    .max(50, { message: 'Maximum 50 polc per kommandó' }),

  /** Dobozok száma */
  dobozCount: z
    .number()
    .int({ message: 'A dobozok száma egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 doboz szükséges' })
    .max(50, { message: 'Maximum 50 doboz per polc' }),

  /** Kapacitás per doboz */
  capacityPerDoboz: z
    .number()
    .int({ message: 'A kapacitás egész szám kell legyen' })
    .min(1, { message: 'Minimum 1 kapacitás' })
    .optional(),
});

export type GenerateLocationsInput = z.infer<typeof GenerateLocationsSchema>;

// ============================================
// UPDATE LOCATION DTO
// ============================================

export const UpdateLocationSchema = z
  .object({
    status: LocationStatusSchema.optional(),
    description: z
      .string()
      .max(200, { message: 'A leírás maximum 200 karakter lehet' })
      .nullable()
      .optional(),
    capacity: z
      .number()
      .int({ message: 'A kapacitás egész szám kell legyen' })
      .min(0, { message: 'A kapacitás nem lehet negatív' })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Legalább egy mező szükséges a frissítéshez',
  });

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

// ============================================
// VALIDATE LOCATION CODE DTO
// ============================================

export const ValidateLocationCodeSchema = z.object({
  /** Helykód (pl. "K1-P2-D3") */
  code: z
    .string()
    .min(1, { message: 'A helykód kötelező' })
    .max(50, { message: 'A helykód maximum 50 karakter lehet' }),

  /** Raktár ID */
  warehouseId: z
    .string()
    .uuid({ message: 'Érvénytelen raktár azonosító (UUID)' }),
});

export type ValidateLocationCodeInput = z.infer<typeof ValidateLocationCodeSchema>;

// ============================================
// LOCATION QUERY DTO
// ============================================

export const LocationQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  status: z.union([LocationStatusSchema, z.array(LocationStatusSchema)]).optional(),
  kommando: z.number().int().min(1).optional(),
  polc: z.number().int().min(1).optional(),
  availableOnly: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['code', 'createdAt', 'currentOccupancy']).optional().default('code'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type LocationQueryInput = z.infer<typeof LocationQuerySchema>;
