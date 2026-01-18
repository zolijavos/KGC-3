/**
 * @kgc/horilla-hr - Horilla HR Integration DTOs
 * Epic 30: Horilla HR Integration
 */

import { z } from 'zod';

export const HorillaConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
  syncInterval: z.number().int().min(5).max(1440).default(60), // 5 min to 24 hours
  defaultRole: z.string().default('EMPLOYEE'),
  defaultLocationId: z.string().uuid().optional(),
});

export const SyncEmployeesSchema = z.object({
  fullSync: z.boolean().default(false),
  departmentFilter: z.string().optional(),
  statusFilter: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
});

export const CreateEmployeeMappingSchema = z.object({
  horillaEmployeeId: z.string().min(1),
  kgcUserId: z.string().uuid(),
  syncDirection: z.enum(['HORILLA_TO_KGC', 'KGC_TO_HORILLA', 'BIDIRECTIONAL']).default('HORILLA_TO_KGC'),
});

export type HorillaConfigDto = z.infer<typeof HorillaConfigSchema>;
export type SyncEmployeesDto = z.infer<typeof SyncEmployeesSchema>;
export type CreateEmployeeMappingDto = z.infer<typeof CreateEmployeeMappingSchema>;
