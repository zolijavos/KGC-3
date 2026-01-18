/**
 * @kgc/bergep-szerviz - Equipment-Service Integration Interfaces
 * Epic 25: Equipment-Service Integration
 */

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  IN_SERVICE = 'IN_SERVICE',
  RESERVED = 'RESERVED',
  RETIRED = 'RETIRED',
}

export enum WorksheetStatus {
  DRAFT = 'DRAFT',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PARTS = 'AWAITING_PARTS',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceDispatchReason {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  WARRANTY = 'WARRANTY',
}

export interface IEquipment {
  id: string;
  tenantId: string;
  equipmentCode: string;
  name: string;
  serialNumber?: string;
  status: EquipmentStatus;
  currentRentalId?: string;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorksheet {
  id: string;
  tenantId: string;
  worksheetNumber: string;
  equipmentId?: string;
  status: WorksheetStatus;
  isWarranty: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface IServiceDispatch {
  id: string;
  tenantId: string;
  equipmentId: string;
  worksheetId: string;
  reason: ServiceDispatchReason;
  previousStatus: EquipmentStatus;
  dispatchedAt: Date;
  dispatchedBy: string;
  notes?: string;
  returnedAt?: Date;
  returnedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceReturn {
  dispatchId: string;
  worksheetId: string;
  equipmentId: string;
  newStatus: EquipmentStatus;
  returnedAt: Date;
  returnedBy: string;
  serviceNotes?: string;
}
