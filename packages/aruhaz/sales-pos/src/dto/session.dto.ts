/**
 * @kgc/sales-pos - Session DTOs
 * Epic 22: Point of Sale - Story 22-1
 */

import { z } from 'zod';

export const OpenSessionSchema = z.object({
  locationId: z.string().uuid(),
  openingBalance: z.number().min(0),
});

export const CloseSessionSchema = z.object({
  closingBalance: z.number().min(0),
  varianceNote: z.string().max(500).optional(),
});

export const SuspendSessionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type OpenSessionDto = z.infer<typeof OpenSessionSchema>;
export type CloseSessionDto = z.infer<typeof CloseSessionSchema>;
export type SuspendSessionDto = z.infer<typeof SuspendSessionSchema>;
