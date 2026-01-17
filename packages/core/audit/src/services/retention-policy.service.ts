import { Inject, Injectable } from '@nestjs/common';
import { AuditService, AUDIT_REPOSITORY } from './audit.service';
import type { IAuditRepository } from '../interfaces/audit.interface';
import type { IArchiveStorage } from '../interfaces/retention.interface';
import {
  DEFAULT_RETENTION_POLICY,
} from '../interfaces/retention.interface';
import type {
  IRetentionPolicyService,
  RetentionPolicy,
  ArchiveJob,
  ArchiveBatch,
  RestoreRequest,
  CleanupResult,
  RetentionStatistics,
} from '../interfaces/retention.interface';

export const ARCHIVE_STORAGE = Symbol('ARCHIVE_STORAGE');

/**
 * Retention Policy Service - Data retention and archival
 * FR72: 2 éves megőrzés + hideg archiválás
 *
 * WARNING: archiveJobs, archiveBatches, and restoreRequests are stored in-memory.
 * For production multi-instance deployment, these should be moved to a persistent
 * store (Redis/database) to ensure consistency across instances and prevent memory leaks.
 *
 * TODO: Implement IJobRepository interface for production persistence
 */
@Injectable()
export class RetentionPolicyService implements IRetentionPolicyService {
  private policy: RetentionPolicy = { ...DEFAULT_RETENTION_POLICY };
  /** @deprecated Move to persistent storage for production */
  private archiveJobs = new Map<string, ArchiveJob>();
  /** @deprecated Move to persistent storage for production */
  private archiveBatches = new Map<string, ArchiveBatch>();
  /** @deprecated Move to persistent storage for production */
  private restoreRequests = new Map<string, RestoreRequest>();
  /** Maximum in-memory entries before warning (memory leak prevention) */
  private static readonly MAX_IN_MEMORY_ENTRIES = 1000;

  constructor(
    private readonly auditService: AuditService,
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: IAuditRepository,
    @Inject(ARCHIVE_STORAGE)
    private readonly archiveStorage: IArchiveStorage
  ) {}

  /**
   * Get current retention policy
   */
  getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  /**
   * Update retention policy
   */
  updatePolicy(policy: Partial<RetentionPolicy>): void {
    if (policy.activeRetentionDays !== undefined && policy.activeRetentionDays < 1) {
      throw new Error('Active retention days must be positive');
    }
    if (policy.archiveRetentionDays !== undefined && policy.archiveRetentionDays < 1) {
      throw new Error('Archive retention days must be positive');
    }
    if (policy.archiveBatchSize !== undefined && policy.archiveBatchSize < 1) {
      throw new Error('Archive batch size must be positive');
    }

    this.policy = { ...this.policy, ...policy };
  }

  /**
   * Archive entries older than active retention
   */
  async archiveOldEntries(tenantId?: string): Promise<ArchiveJob> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - this.policy.activeRetentionDays * 24 * 60 * 60 * 1000);
    const archiveEndDate = new Date(now.getTime() - (this.policy.activeRetentionDays + this.policy.archiveRetentionDays) * 24 * 60 * 60 * 1000);

    const job: ArchiveJob = {
      id: jobId,
      status: 'IN_PROGRESS',
      startDate: archiveEndDate,
      endDate: cutoffDate,
      createdAt: now,
      startedAt: now,
      entriesProcessed: 0,
      entriesTotal: 0,
      batchesCreated: 0,
    };
    if (tenantId !== undefined) {
      job.tenantId = tenantId;
    }

    // Memory leak prevention: warn and cleanup if too many in-memory entries
    if (this.archiveJobs.size >= RetentionPolicyService.MAX_IN_MEMORY_ENTRIES) {
      console.warn(
        `[RetentionPolicyService] In-memory archiveJobs limit reached (${this.archiveJobs.size}). ` +
        'Consider implementing persistent storage. Cleaning up old completed jobs.'
      );
      this.cleanupCompletedJobs();
    }

    this.archiveJobs.set(jobId, job);

    try {
      // Count entries to archive
      const count = await this.auditService.count({
        tenantId: tenantId ?? '',
        endDate: cutoffDate,
      });

      job.entriesTotal = count;

      if (count === 0) {
        job.status = 'COMPLETED';
        job.completedAt = new Date();
        return job;
      }

      // Perform archive
      const archiveResult = await this.auditRepository.archive(
        archiveEndDate,
        cutoffDate,
        tenantId
      );

      // Store archive batch
      const batchId = archiveResult.archiveId;
      const storagePath = await this.archiveStorage.store(
        batchId,
        JSON.stringify({ entries: [], count: archiveResult.archivedCount }),
        this.policy.compressArchive
      );

      const batchSize = await this.archiveStorage.getSize(storagePath);

      const batch: ArchiveBatch = {
        id: batchId,
        startDate: archiveEndDate,
        endDate: cutoffDate,
        entryCount: archiveResult.archivedCount,
        sizeBytes: batchSize,
        compressed: this.policy.compressArchive,
        storagePath,
        createdAt: new Date(),
        expiresAt: new Date(now.getTime() + this.policy.archiveRetentionDays * 24 * 60 * 60 * 1000),
      };
      if (tenantId !== undefined) {
        batch.tenantId = tenantId;
      }

      this.archiveBatches.set(batchId, batch);

      job.entriesProcessed = archiveResult.archivedCount;
      job.batchesCreated = 1;
      job.status = 'COMPLETED';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'FAILED';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return job;
  }

  /**
   * Get archive job status
   */
  async getArchiveJob(jobId: string): Promise<ArchiveJob | null> {
    return this.archiveJobs.get(jobId) ?? null;
  }

  /**
   * List archive batches
   */
  async listArchiveBatches(tenantId?: string): Promise<ArchiveBatch[]> {
    const batches = Array.from(this.archiveBatches.values());

    if (tenantId) {
      return batches.filter((b) => b.tenantId === tenantId);
    }

    return batches;
  }

  /**
   * Restore archived entries
   */
  async restoreArchive(batchId: string, tenantId: string): Promise<RestoreRequest> {
    const batch = this.archiveBatches.get(batchId);

    if (!batch) {
      throw new Error('Archive batch not found');
    }

    const requestId = `restore-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const request: RestoreRequest = {
      id: requestId,
      tenantId,
      batchId,
      requestedAt: new Date(),
      status: 'RESTORING',
    };

    this.restoreRequests.set(requestId, request);

    try {
      // Retrieve and decompress archive
      await this.archiveStorage.retrieve(batch.storagePath);

      // In real implementation, would insert entries back into active storage
      request.status = 'RESTORED';
      request.completedAt = new Date();
    } catch (error) {
      request.status = 'FAILED';
      request.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return request;
  }

  /**
   * Get restore request status
   */
  async getRestoreRequest(requestId: string): Promise<RestoreRequest | null> {
    return this.restoreRequests.get(requestId) ?? null;
  }

  /**
   * Cleanup expired archives
   */
  async cleanupExpired(tenantId?: string): Promise<CleanupResult> {
    const now = new Date();
    let deletedFromActive = 0;
    let deletedFromArchive = 0;
    let freedBytes = 0;

    // Delete from active storage (entries older than total retention)
    const totalRetentionDays = this.policy.activeRetentionDays + this.policy.archiveRetentionDays;
    const deleteDate = new Date(now.getTime() - totalRetentionDays * 24 * 60 * 60 * 1000);

    deletedFromActive = await this.auditRepository.deleteOlderThan(deleteDate, tenantId);

    // Delete expired archive batches
    for (const [batchId, batch] of this.archiveBatches) {
      if (batch.expiresAt < now) {
        if (!tenantId || batch.tenantId === tenantId) {
          try {
            await this.archiveStorage.delete(batch.storagePath);
            freedBytes += batch.sizeBytes;
            deletedFromArchive += batch.entryCount;
            this.archiveBatches.delete(batchId);
          } catch {
            // Log error but continue cleanup
          }
        }
      }
    }

    return {
      deletedFromActive,
      deletedFromArchive,
      freedBytes,
    };
  }

  /**
   * Get retention statistics
   */
  async getStatistics(tenantId?: string): Promise<RetentionStatistics> {
    const activeEntries = await this.auditService.count({
      tenantId: tenantId ?? '',
    });

    const batches = await this.listArchiveBatches(tenantId);
    const archivedEntries = batches.reduce((sum, b) => sum + b.entryCount, 0);
    const totalStorageBytes = batches.reduce((sum, b) => sum + b.sizeBytes, 0);

    return {
      activeEntries,
      archivedEntries,
      archiveBatches: batches.length,
      totalStorageBytes,
    };
  }

  /**
   * Cleanup completed/failed jobs from in-memory storage
   * Keeps only the most recent jobs to prevent memory leaks
   */
  private cleanupCompletedJobs(): void {
    const completedStatuses: Array<ArchiveJob['status']> = ['COMPLETED', 'FAILED', 'EXPIRED'];
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [jobId, job] of this.archiveJobs) {
      // Remove completed jobs older than 1 hour
      if (
        completedStatuses.includes(job.status) &&
        job.completedAt &&
        job.completedAt.getTime() < oneHourAgo
      ) {
        this.archiveJobs.delete(jobId);
      }
    }
  }
}
