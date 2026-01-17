/**
 * @kgc/service-worksheet - Diagnosis Interfaces
 * Story 17-3: Diagnosztika es hibaok
 */

/**
 * Hiba kategoria
 */
export enum FaultCategory {
  /** Mechanikai hiba */
  MECHANICAL = 'MECHANICAL',
  /** Elektromos hiba */
  ELECTRICAL = 'ELECTRICAL',
  /** Szenkefe/motor hiba */
  MOTOR = 'MOTOR',
  /** Elektronika */
  ELECTRONICS = 'ELECTRONICS',
  /** Akkumulator */
  BATTERY = 'BATTERY',
  /** Szivarog/tomorites */
  SEALING = 'SEALING',
  /** Egyeb */
  OTHER = 'OTHER',
}

/**
 * Diagnosztika rekord
 */
export interface IDiagnosis {
  /** Egyedi azonosito */
  id: string;
  /** Munkalap ID */
  worksheetId: string;
  /** Tenant ID */
  tenantId: string;
  /** Hiba kategoria */
  faultCategory: FaultCategory;
  /** Hiba kod (gyarto-specifikus) */
  faultCode?: string;
  /** Reszletes leiras */
  description: string;
  /** Megjelenitendo uzenet (ugyfelnev) */
  customerMessage?: string;
  /** Javitas javaslat */
  repairRecommendation?: string;
  /** Becsult javitasi ido (perc) */
  estimatedRepairTime?: number;
  /** Letrehozo user */
  createdBy: string;
  /** Letrehozas datum */
  createdAt: Date;
}

/**
 * Diagnosztika letrehozas result
 */
export interface IDiagnosisResult {
  diagnosis: IDiagnosis;
  worksheetUpdated: boolean;
}
