/**
 * @kgc/service-norma - Norma Interfaces
 * Epic 20: Service Standards for Makita warranty pricing
 */

export enum NormaVersionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface INormaVersion {
  id: string;
  tenantId: string;
  versionNumber: string;
  supplier: string;
  status: NormaVersionStatus;
  effectiveFrom: Date;
  effectiveTo?: Date;
  itemCount: number;
  importedBy: string;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INormaItem {
  id: string;
  tenantId: string;
  versionId: string;
  normaCode: string;
  description: string;
  normaHours: number;
  hourlyRate: number;
  laborCost: number;
  category?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INormaImportRow {
  normaCode: string;
  description: string;
  normaHours: number;
  hourlyRate?: number;
  category?: string;
}

export interface INormaImportResult {
  versionId: string;
  versionNumber: string;
  importedCount: number;
  skippedCount: number;
  errors: INormaImportError[];
}

export interface INormaImportError {
  row: number;
  code: string;
  message: string;
}

export interface INormaLaborCalculation {
  normaItemId: string;
  normaCode: string;
  description: string;
  normaHours: number;
  hourlyRate: number;
  calculatedCost: number;
  deviationPercent?: number;
  deviationReason?: string;
  finalCost: number;
}
