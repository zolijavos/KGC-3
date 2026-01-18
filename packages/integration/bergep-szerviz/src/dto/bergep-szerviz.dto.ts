/**
 * @kgc/bergep-szerviz - Equipment-Service Integration DTOs
 * Epic 25: Equipment-Service Integration
 */

import { z } from 'zod';

export const DispatchToServiceSchema = z.object({
  equipmentId: z.string().uuid(),
  reason: z.enum(['MAINTENANCE', 'REPAIR', 'INSPECTION', 'WARRANTY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().max(1000).optional(),
  isWarranty: z.boolean().default(false),
});

export const ReturnFromServiceSchema = z.object({
  dispatchId: z.string().uuid(),
  serviceNotes: z.string().max(1000).optional(),
  restoreToStatus: z.enum(['AVAILABLE', 'RESERVED', 'RETIRED']).default('AVAILABLE'),
});

export type DispatchToServiceDto = z.infer<typeof DispatchToServiceSchema>;
export type ReturnFromServiceDto = z.infer<typeof ReturnFromServiceSchema>;
