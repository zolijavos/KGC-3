/**
 * @kgc/horilla-hr - Horilla HR Integration Interfaces
 * Epic 30: Horilla HR Integration
 */

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum SyncDirection {
  HORILLA_TO_KGC = 'HORILLA_TO_KGC',
  KGC_TO_HORILLA = 'KGC_TO_HORILLA',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  HORILLA_WINS = 'HORILLA_WINS',
  KGC_WINS = 'KGC_WINS',
  MANUAL = 'MANUAL',
}

export interface IHorillaEmployee {
  id: string;
  employeeId: string; // Horilla internal ID
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate: Date;
  status: string;
  managerId?: string;
  lastModified: Date;
}

export interface IKgcUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  locationId?: string;
  isActive: boolean;
  horillaEmployeeId?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeMapping {
  id: string;
  tenantId: string;
  horillaEmployeeId: string;
  kgcUserId: string;
  syncDirection: SyncDirection;
  lastSyncAt?: Date;
  lastSyncStatus?: SyncStatus;
  syncErrors?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISyncResult {
  totalRecords: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ employeeId: string; error: string }>;
  syncedAt: Date;
}

export interface IHorillaConfig {
  apiUrl: string;
  apiKey: string;
  tenantId: string;
  syncInterval?: number; // in minutes
  defaultRole?: string;
  defaultLocationId?: string;
}

export interface ISyncError {
  entityId: string;
  entityType: 'EMPLOYEE' | 'USER';
  error: string;
  details?: Record<string, unknown>;
}

export interface ISyncResultExtended {
  direction: SyncDirection;
  entityType: 'EMPLOYEE';
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: ISyncError[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface IConflictRecord {
  kgcUserId: string;
  horillaEmployeeId: string;
  kgcLastModified: Date;
  horillaLastModified: Date;
  conflictFields: string[];
  resolution: ConflictResolutionStrategy;
  resolvedAt?: Date;
}
