/**
 * Retention Policy Interfaces
 * FR72: 2 éves megőrzés + hideg archiválás
 */

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  /** Days to keep in active/hot storage */
  activeRetentionDays: number;
  /** Days to keep in archive/cold storage */
  archiveRetentionDays: number;
  /** Minimum batch size for archiving */
  archiveBatchSize: number;
  /** Whether to compress archives */
  compressArchive: boolean;
}

/**
 * Default retention policy values
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  activeRetentionDays: 730, // 2 years
  archiveRetentionDays: 1825, // 5 years
  archiveBatchSize: 10000,
  compressArchive: true,
};

/**
 * Archive batch metadata
 */
export interface ArchiveBatch {
  id: string;
  tenantId?: string;
  startDate: Date;
  endDate: Date;
  entryCount: number;
  sizeBytes: number;
  compressed: boolean;
  storagePath: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Archive status
 */
export type ArchiveStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

/**
 * Archive job
 */
export interface ArchiveJob {
  id: string;
  tenantId?: string;
  status: ArchiveStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  entriesProcessed: number;
  entriesTotal: number;
  batchesCreated: number;
  error?: string;
}

/**
 * Restore request
 */
export interface RestoreRequest {
  id: string;
  tenantId: string;
  batchId: string;
  requestedAt: Date;
  completedAt?: Date;
  status: 'PENDING' | 'RESTORING' | 'RESTORED' | 'FAILED';
  error?: string;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  deletedFromActive: number;
  deletedFromArchive: number;
  freedBytes: number;
}

/**
 * Retention service interface
 */
export interface IRetentionPolicyService {
  /**
   * Get current retention policy
   */
  getPolicy(): RetentionPolicy;

  /**
   * Update retention policy
   */
  updatePolicy(policy: Partial<RetentionPolicy>): void;

  /**
   * Archive entries older than active retention
   */
  archiveOldEntries(tenantId?: string): Promise<ArchiveJob>;

  /**
   * Get archive job status
   */
  getArchiveJob(jobId: string): Promise<ArchiveJob | null>;

  /**
   * List archive batches
   */
  listArchiveBatches(tenantId?: string): Promise<ArchiveBatch[]>;

  /**
   * Restore archived entries
   */
  restoreArchive(batchId: string, tenantId: string): Promise<RestoreRequest>;

  /**
   * Get restore request status
   */
  getRestoreRequest(requestId: string): Promise<RestoreRequest | null>;

  /**
   * Cleanup expired archives (older than archive retention)
   */
  cleanupExpired(tenantId?: string): Promise<CleanupResult>;

  /**
   * Get retention statistics
   */
  getStatistics(tenantId?: string): Promise<RetentionStatistics>;
}

/**
 * Retention statistics
 */
export interface RetentionStatistics {
  activeEntries: number;
  archivedEntries: number;
  archiveBatches: number;
  oldestActiveDate?: Date;
  newestArchiveDate?: Date;
  totalStorageBytes: number;
}

/**
 * Archive storage interface
 */
export interface IArchiveStorage {
  /**
   * Store archive batch
   */
  store(batchId: string, data: string, compressed: boolean): Promise<string>;

  /**
   * Retrieve archive batch
   */
  retrieve(storagePath: string): Promise<string>;

  /**
   * Delete archive batch
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Get storage size
   */
  getSize(storagePath: string): Promise<number>;
}
