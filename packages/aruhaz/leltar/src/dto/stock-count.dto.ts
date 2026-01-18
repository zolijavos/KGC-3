/**
 * Stock Count DTOs with Zod validation
 */

import { z } from 'zod';
import { StockCountStatus, StockCountType } from '../interfaces/stock-count.interface';

/**
 * Leltár létrehozás séma
 */
export const CreateStockCountSchema = z.object({
  tenantId: z.string().uuid({ message: 'Érvénytelen tenant azonosító' }),
  locationId: z.string().uuid({ message: 'Érvénytelen telephely azonosító' }),
  warehouseId: z.string().uuid({ message: 'Érvénytelen raktár azonosító' }),
  type: z.nativeEnum(StockCountType, { message: 'Érvénytelen leltár típus' }),
  name: z.string().min(3, { message: 'Név minimum 3 karakter' }).max(100),
  scheduledStartDate: z.coerce.date(),
  scheduledEndDate: z.coerce.date(),
  freezeStock: z.boolean().optional().default(false),
  responsibleUserId: z.string().uuid({ message: 'Érvénytelen felelős azonosító' }),
  categoryIds: z.array(z.string().uuid()).optional(),
  zoneIds: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.scheduledStartDate <= data.scheduledEndDate,
  { message: 'Kezdő dátum nem lehet nagyobb a végdátumnál' }
);

export type CreateStockCountInput = z.infer<typeof CreateStockCountSchema>;

/**
 * Leltár szűrő séma
 */
export const StockCountFilterSchema = z.object({
  tenantId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.nativeEnum(StockCountStatus).optional(),
  type: z.nativeEnum(StockCountType).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type StockCountFilterInput = z.infer<typeof StockCountFilterSchema>;

/**
 * Leltár felfüggesztés séma
 */
export const SuspendStockCountSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  reason: z.string().min(5, { message: 'Ok minimum 5 karakter' }).max(500),
});

export type SuspendStockCountInput = z.infer<typeof SuspendStockCountSchema>;

/**
 * Leltár visszavonás séma
 */
export const CancelStockCountSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  reason: z.string().min(5, { message: 'Ok minimum 5 karakter' }).max(500),
});

export type CancelStockCountInput = z.infer<typeof CancelStockCountSchema>;

/**
 * Készlet fagyasztás séma
 */
export const ToggleStockFreezeSchema = z.object({
  stockCountId: z.string().uuid({ message: 'Érvénytelen leltár azonosító' }),
  freeze: z.boolean(),
});

export type ToggleStockFreezeInput = z.infer<typeof ToggleStockFreezeSchema>;
