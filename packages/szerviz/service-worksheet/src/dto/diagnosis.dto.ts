/**
 * @kgc/service-worksheet - Diagnosis DTOs
 * Story 17-3: Diagnosztika es hibaok
 */

import { z } from 'zod';
import { FaultCategory } from '../interfaces/diagnosis.interface';

/**
 * Diagnosztika letrehozas DTO
 */
export const CreateDiagnosisSchema = z.object({
  /** Hiba kategoria */
  faultCategory: z.nativeEnum(FaultCategory, {
    errorMap: () => ({ message: 'Ervenytelen hiba kategoria' }),
  }),
  /** Hiba kod (opcionalis) */
  faultCode: z.string().max(50).optional(),
  /** Reszletes leiras */
  description: z
    .string()
    .min(5, 'Leiras minimum 5 karakter')
    .max(2000, 'Leiras maximum 2000 karakter'),
  /** Ugyfelnev uzenet (opcionalis) */
  customerMessage: z.string().max(500).optional(),
  /** Javitas javaslat (opcionalis) */
  repairRecommendation: z.string().max(1000).optional(),
  /** Becsult javitasi ido percben (opcionalis) */
  estimatedRepairTime: z.number().min(0).max(10000).optional(),
});

export type CreateDiagnosisDto = z.infer<typeof CreateDiagnosisSchema>;

/**
 * Diagnosztika frissites DTO
 */
export const UpdateDiagnosisSchema = CreateDiagnosisSchema.partial();

export type UpdateDiagnosisDto = z.infer<typeof UpdateDiagnosisSchema>;
