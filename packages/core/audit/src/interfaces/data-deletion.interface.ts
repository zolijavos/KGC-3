/**
 * Data Deletion Interfaces
 * FR68: GDPR Cascade Delete - Elfeledtetési jog
 */

import { AuditEntityType } from './audit.interface';

/**
 * Deletion strategy types
 */
export type DeletionStrategy = 'CASCADE' | 'ANONYMIZE' | 'SOFT_DELETE' | 'RETAIN';

/**
 * Deletion request status
 */
export type DeletionRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIALLY_COMPLETED';

/**
 * Entity deletion configuration
 */
export interface EntityDeletionConfig {
  entityType: AuditEntityType;
  strategy: DeletionStrategy;
  /** Fields to anonymize (if strategy is ANONYMIZE) */
  anonymizeFields?: string[];
  /** Child entities that depend on this entity */
  dependentEntities?: EntityDependency[];
  /** Minimum retention period in days (for legal compliance) */
  retentionDays?: number;
  /** Callback before deletion (for custom cleanup) */
  beforeDeleteHook?: string;
}

/**
 * Entity dependency definition
 */
export interface EntityDependency {
  entityType: AuditEntityType;
  foreignKey: string;
  strategy: DeletionStrategy;
  /** If true, blocks parent deletion when children exist */
  blocking?: boolean;
}

/**
 * Deletion request input
 */
export interface CreateDeletionRequestInput {
  tenantId: string;
  requesterId: string;
  requesterEmail?: string;
  /** Subject whose data is being deleted */
  subjectId: string;
  subjectEmail?: string;
  /** Entity to delete */
  entityType: AuditEntityType;
  entityId: string;
  /** Reason for deletion request */
  reason: string;
  /** Strategy override (optional) */
  strategy?: DeletionStrategy;
}

/**
 * Deletion request record
 */
export interface DeletionRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterEmail?: string;
  subjectId: string;
  subjectEmail?: string;
  entityType: AuditEntityType;
  entityId: string;
  reason: string;
  strategy: DeletionStrategy;
  status: DeletionRequestStatus;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  deletionLog: DeletionLogEntry[];
}

/**
 * Individual deletion log entry
 */
export interface DeletionLogEntry {
  entityType: AuditEntityType;
  entityId: string;
  action: 'DELETED' | 'ANONYMIZED' | 'SOFT_DELETED' | 'RETAINED' | 'FAILED';
  timestamp: Date;
  error?: string;
  affectedRows?: number;
}

/**
 * Result of a deletion operation
 */
export interface DeletionResult {
  success: boolean;
  requestId: string;
  status: DeletionRequestStatus;
  deletedEntities: number;
  anonymizedEntities: number;
  retainedEntities: number;
  failedEntities: number;
  errors: string[];
  deletionLog: DeletionLogEntry[];
}

/**
 * Query options for deletion requests
 */
export interface DeletionRequestQueryOptions {
  tenantId: string;
  status?: DeletionRequestStatus;
  subjectId?: string;
  requesterId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Data Deletion Service interface
 */
export interface IDataDeletionService {
  /**
   * Register entity deletion configuration
   */
  registerEntity(config: EntityDeletionConfig): void;

  /**
   * Create a deletion request
   */
  createRequest(input: CreateDeletionRequestInput): Promise<DeletionRequest>;

  /**
   * Process a pending deletion request
   */
  processRequest(requestId: string, tenantId: string): Promise<DeletionResult>;

  /**
   * Get deletion request by ID
   */
  getRequest(requestId: string, tenantId: string): Promise<DeletionRequest | null>;

  /**
   * Query deletion requests
   */
  queryRequests(options: DeletionRequestQueryOptions): Promise<DeletionRequest[]>;

  /**
   * Cancel a pending deletion request
   */
  cancelRequest(requestId: string, tenantId: string, reason: string): Promise<void>;

  /**
   * Get dependent entities that would be affected
   */
  getDependentEntities(
    entityType: AuditEntityType,
    entityId: string,
    tenantId: string
  ): Promise<{ entityType: AuditEntityType; count: number }[]>;

  /**
   * Anonymize a specific entity without deletion
   */
  anonymizeEntity(
    entityType: AuditEntityType,
    entityId: string,
    tenantId: string,
    fields?: string[]
  ): Promise<DeletionLogEntry>;
}

/**
 * Repository interface for deletion requests
 */
export interface IDeletionRequestRepository {
  create(input: CreateDeletionRequestInput & { strategy: DeletionStrategy }): Promise<DeletionRequest>;
  findById(id: string, tenantId: string): Promise<DeletionRequest | null>;
  updateStatus(
    id: string,
    tenantId: string,
    status: DeletionRequestStatus,
    log?: DeletionLogEntry,
    error?: string
  ): Promise<void>;
  query(options: DeletionRequestQueryOptions): Promise<DeletionRequest[]>;
}
