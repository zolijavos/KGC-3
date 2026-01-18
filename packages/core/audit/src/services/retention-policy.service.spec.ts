import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IAuditRepository } from '../interfaces/audit.interface';
import { DEFAULT_RETENTION_POLICY, IArchiveStorage } from '../interfaces/retention.interface';
import { AuditService } from './audit.service';
import { RetentionPolicyService } from './retention-policy.service';

describe('RetentionPolicyService', () => {
  let retentionService: RetentionPolicyService;
  let mockAuditService: Partial<AuditService>;
  let mockAuditRepository: Partial<IAuditRepository>;
  let mockArchiveStorage: Partial<IArchiveStorage>;

  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    mockAuditRepository = {
      query: vi.fn(),
      deleteOlderThan: vi.fn(),
      archive: vi.fn(),
    };

    mockAuditService = {
      query: vi.fn(),
      count: vi.fn(),
    };

    mockArchiveStorage = {
      store: vi.fn(),
      retrieve: vi.fn(),
      delete: vi.fn(),
      getSize: vi.fn(),
    };

    retentionService = new RetentionPolicyService(
      mockAuditService as AuditService,
      mockAuditRepository as IAuditRepository,
      mockArchiveStorage as IArchiveStorage
    );
  });

  describe('getPolicy()', () => {
    it('should return default retention policy', () => {
      const policy = retentionService.getPolicy();

      expect(policy.activeRetentionDays).toBe(DEFAULT_RETENTION_POLICY.activeRetentionDays);
      expect(policy.archiveRetentionDays).toBe(DEFAULT_RETENTION_POLICY.archiveRetentionDays);
    });
  });

  describe('updatePolicy()', () => {
    it('should update retention policy partially', () => {
      retentionService.updatePolicy({ activeRetentionDays: 365 });

      const policy = retentionService.getPolicy();
      expect(policy.activeRetentionDays).toBe(365);
      expect(policy.archiveRetentionDays).toBe(DEFAULT_RETENTION_POLICY.archiveRetentionDays);
    });

    it('should update multiple policy values', () => {
      retentionService.updatePolicy({
        activeRetentionDays: 365,
        archiveRetentionDays: 3650,
        compressArchive: false,
      });

      const policy = retentionService.getPolicy();
      expect(policy.activeRetentionDays).toBe(365);
      expect(policy.archiveRetentionDays).toBe(3650);
      expect(policy.compressArchive).toBe(false);
    });

    it('should reject invalid retention values', () => {
      expect(() => retentionService.updatePolicy({ activeRetentionDays: -1 })).toThrow(
        'Active retention days must be positive'
      );
    });
  });

  describe('archiveOldEntries()', () => {
    it('should create an archive job', async () => {
      vi.mocked(mockAuditService.count).mockResolvedValue(1000);
      vi.mocked(mockAuditRepository.archive).mockResolvedValue({
        archivedCount: 1000,
        archiveId: 'archive-001',
      });
      vi.mocked(mockArchiveStorage.store).mockResolvedValue('/archives/batch-001.json');

      const job = await retentionService.archiveOldEntries(mockTenantId);

      expect(job.id).toBeDefined();
      expect(job.status).toBe('COMPLETED');
      expect(job.tenantId).toBe(mockTenantId);
    });

    it('should handle empty archive (no old entries)', async () => {
      vi.mocked(mockAuditService.count).mockResolvedValue(0);

      const job = await retentionService.archiveOldEntries(mockTenantId);

      expect(job.status).toBe('COMPLETED');
      expect(job.entriesProcessed).toBe(0);
    });

    it('should archive globally when no tenant specified', async () => {
      vi.mocked(mockAuditService.count).mockResolvedValue(500);
      vi.mocked(mockAuditRepository.archive).mockResolvedValue({
        archivedCount: 500,
        archiveId: 'archive-global',
      });
      vi.mocked(mockArchiveStorage.store).mockResolvedValue('/archives/global-batch.json');

      const job = await retentionService.archiveOldEntries();

      expect(job.tenantId).toBeUndefined();
      expect(job.entriesProcessed).toBe(500);
    });
  });

  describe('getArchiveJob()', () => {
    it('should return archive job by ID', async () => {
      // First create a job
      vi.mocked(mockAuditService.count).mockResolvedValue(100);
      vi.mocked(mockAuditRepository.archive).mockResolvedValue({
        archivedCount: 100,
        archiveId: 'archive-001',
      });
      vi.mocked(mockArchiveStorage.store).mockResolvedValue('/archives/batch.json');

      const createdJob = await retentionService.archiveOldEntries(mockTenantId);

      const job = await retentionService.getArchiveJob(createdJob.id);

      expect(job).toBeDefined();
      expect(job?.id).toBe(createdJob.id);
    });

    it('should return null for non-existent job', async () => {
      const job = await retentionService.getArchiveJob('non-existent');

      expect(job).toBeNull();
    });
  });

  describe('listArchiveBatches()', () => {
    it('should list archive batches for tenant', async () => {
      // Create some archive jobs first
      vi.mocked(mockAuditService.count).mockResolvedValue(100);
      vi.mocked(mockAuditRepository.archive).mockResolvedValue({
        archivedCount: 100,
        archiveId: 'archive-001',
      });
      vi.mocked(mockArchiveStorage.store).mockResolvedValue('/archives/batch.json');
      vi.mocked(mockArchiveStorage.getSize).mockResolvedValue(1024);

      await retentionService.archiveOldEntries(mockTenantId);

      const batches = await retentionService.listArchiveBatches(mockTenantId);

      expect(Array.isArray(batches)).toBe(true);
    });

    it('should return empty array when no batches', async () => {
      const batches = await retentionService.listArchiveBatches('no-archives-tenant');

      expect(batches).toHaveLength(0);
    });
  });

  describe('restoreArchive()', () => {
    it('should create restore request', async () => {
      // First create an archive
      vi.mocked(mockAuditService.count).mockResolvedValue(100);
      vi.mocked(mockAuditRepository.archive).mockResolvedValue({
        archivedCount: 100,
        archiveId: 'archive-001',
      });
      vi.mocked(mockArchiveStorage.store).mockResolvedValue('/archives/batch.json');
      vi.mocked(mockArchiveStorage.retrieve).mockResolvedValue('{"entries":[]}');

      await retentionService.archiveOldEntries(mockTenantId);
      const batches = await retentionService.listArchiveBatches(mockTenantId);

      if (batches.length > 0 && batches[0]) {
        const request = await retentionService.restoreArchive(batches[0].id, mockTenantId);

        expect(request.id).toBeDefined();
        expect(request.status).toBe('RESTORED');
      }
    });

    it('should throw error for non-existent batch', async () => {
      await expect(retentionService.restoreArchive('non-existent', mockTenantId)).rejects.toThrow(
        'Archive batch not found'
      );
    });
  });

  describe('cleanupExpired()', () => {
    it('should cleanup expired entries', async () => {
      vi.mocked(mockAuditRepository.deleteOlderThan).mockResolvedValue(500);

      const result = await retentionService.cleanupExpired(mockTenantId);

      expect(result.deletedFromActive).toBeGreaterThanOrEqual(0);
      expect(result.deletedFromArchive).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup globally when no tenant specified', async () => {
      vi.mocked(mockAuditRepository.deleteOlderThan).mockResolvedValue(1000);

      const result = await retentionService.cleanupExpired();

      expect(result).toBeDefined();
    });
  });

  describe('getStatistics()', () => {
    it('should return retention statistics', async () => {
      vi.mocked(mockAuditService.count).mockResolvedValue(5000);

      const stats = await retentionService.getStatistics(mockTenantId);

      expect(stats.activeEntries).toBeDefined();
      expect(stats.archivedEntries).toBeDefined();
      expect(stats.archiveBatches).toBeDefined();
    });
  });
});
