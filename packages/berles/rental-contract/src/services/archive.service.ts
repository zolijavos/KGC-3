import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  Contract,
  ContractStatus,
  ArchivedContract,
} from '../interfaces/contract.interface';
import { ArchiveContractDto, GetArchivedContractDto } from '../dto/contract.dto';

/**
 * @kgc/rental-contract - Archive Service
 * Story 15-4: Szerződés Archiválás
 *
 * TRADICIONÁLIS fejlesztés - Storage műveletek
 * S3/MinIO integráció külön adapter-en keresztül
 */

/** Default retention period (years) */
const DEFAULT_RETENTION_YEARS = 10;

/** Storage bucket neve */
const ARCHIVE_BUCKET = process.env['CONTRACT_ARCHIVE_BUCKET'] ?? 'kgc-contracts';

/**
 * Storage adapter interface - implementáció injektálva (S3, MinIO, local)
 */
export interface StorageAdapter {
  upload(bucket: string, path: string, data: Uint8Array): Promise<{ url: string; size: number }>;
  download(bucket: string, path: string): Promise<Uint8Array>;
  delete(bucket: string, path: string): Promise<void>;
  exists(bucket: string, path: string): Promise<boolean>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
}

/**
 * In-memory storage adapter for development/testing
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, Uint8Array> = new Map();

  async upload(bucket: string, path: string, data: Uint8Array): Promise<{ url: string; size: number }> {
    const key = `${bucket}/${path}`;
    this.storage.set(key, data);
    return {
      url: `memory://${key}`,
      size: data.length,
    };
  }

  async download(bucket: string, path: string): Promise<Uint8Array> {
    const key = `${bucket}/${path}`;
    const data = this.storage.get(key);
    if (!data) {
      throw new Error(`File not found: ${key}`);
    }
    return data;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const key = `${bucket}/${path}`;
    this.storage.delete(key);
  }

  async exists(bucket: string, path: string): Promise<boolean> {
    const key = `${bucket}/${path}`;
    return this.storage.has(key);
  }

  async getSignedUrl(bucket: string, path: string, _expiresInSeconds: number): Promise<string> {
    return `memory://${bucket}/${path}?expires=${Date.now()}`;
  }
}

@Injectable()
export class ArchiveService {
  private archives: Map<string, ArchivedContract> = new Map();
  private archiveIdCounter = 0;
  private storageAdapter: StorageAdapter;

  constructor(storageAdapter?: StorageAdapter) {
    // Default to in-memory adapter for development
    this.storageAdapter = storageAdapter ?? new InMemoryStorageAdapter();
  }

  /**
   * Szerződés archiválása
   */
  async archiveContract(
    contract: Contract,
    pdfData: Uint8Array,
    dto: ArchiveContractDto
  ): Promise<ArchivedContract> {
    // Státusz validáció - csak SIGNED szerződés archiválható
    if (contract.status !== ContractStatus.SIGNED) {
      throw new BadRequestException(
        `Cannot archive contract with status ${contract.status}. Contract must be SIGNED.`
      );
    }

    // Ellenőrizzük, hogy nincs-e már archiválva
    const existing = await this.getArchiveByContractId(contract.id);
    if (existing) {
      throw new BadRequestException(
        `Contract ${contract.id} is already archived (archive ID: ${existing.id})`
      );
    }

    // Content hash számítás
    const contentHash = this.calculateContentHash(pdfData);

    // Storage path generálás
    const storagePath = this.generateStoragePath(contract);

    // Upload to storage
    const uploadResult = await this.storageAdapter.upload(
      ARCHIVE_BUCKET,
      storagePath,
      pdfData
    );

    // Retention számítás
    const retentionYears = dto.retentionYears ?? DEFAULT_RETENTION_YEARS;
    const archivedAt = new Date();
    const scheduledDeletionAt = new Date(archivedAt);
    scheduledDeletionAt.setFullYear(scheduledDeletionAt.getFullYear() + retentionYears);

    const id = `arch_${++this.archiveIdCounter}_${Date.now()}`;

    const archive: ArchivedContract = {
      id,
      contractId: contract.id,
      tenantId: contract.tenantId,
      storageBucket: ARCHIVE_BUCKET,
      storagePath,
      fileSize: uploadResult.size,
      contentHash,
      archivedAt,
      retentionYears,
      scheduledDeletionAt,
    };

    this.archives.set(id, archive);

    return archive;
  }

  /**
   * Archivált szerződés lekérdezése ID alapján
   */
  async getArchiveById(id: string, tenantId: string): Promise<ArchivedContract> {
    const archive = this.archives.get(id);

    if (!archive || archive.tenantId !== tenantId) {
      throw new NotFoundException(`Archive not found: ${id}`);
    }

    return archive;
  }

  /**
   * Archivált szerződés lekérdezése contract ID alapján
   */
  async getArchiveByContractId(contractId: string): Promise<ArchivedContract | null> {
    for (const archive of this.archives.values()) {
      if (archive.contractId === contractId) {
        return archive;
      }
    }
    return null;
  }

  /**
   * Archivált szerződések listázása
   */
  async listArchives(
    tenantId: string,
    filters: GetArchivedContractDto
  ): Promise<{ items: ArchivedContract[]; total: number }> {
    let archives = Array.from(this.archives.values()).filter((a) => a.tenantId === tenantId);

    // Szűrés contract ID alapján
    if (filters.contractId) {
      archives = archives.filter((a) => a.contractId === filters.contractId);
    }

    // Szűrés dátum alapján - capture to avoid non-null assertions
    const { fromDate, toDate } = filters;
    if (fromDate) {
      archives = archives.filter((a) => a.archivedAt >= fromDate);
    }

    if (toDate) {
      archives = archives.filter((a) => a.archivedAt <= toDate);
    }

    const total = archives.length;

    // Pagination with null safety - defaults if not provided
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const start = (page - 1) * limit;
    const paginatedArchives = archives.slice(start, start + limit);

    return { items: paginatedArchives, total };
  }

  /**
   * Archivált PDF letöltési URL generálása
   */
  async getDownloadUrl(
    archiveId: string,
    tenantId: string,
    expiresInSeconds: number = 3600
  ): Promise<{
    url: string;
    expiresAt: Date;
    filename: string;
  }> {
    const archive = await this.getArchiveById(archiveId, tenantId);

    const url = await this.storageAdapter.getSignedUrl(
      archive.storageBucket,
      archive.storagePath,
      expiresInSeconds
    );

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const filename = `contract_${archive.contractId}.pdf`;

    return { url, expiresAt, filename };
  }

  /**
   * Archivált PDF letöltése
   */
  async downloadArchive(archiveId: string, tenantId: string): Promise<Uint8Array> {
    const archive = await this.getArchiveById(archiveId, tenantId);

    const data = await this.storageAdapter.download(
      archive.storageBucket,
      archive.storagePath
    );

    // Integritás ellenőrzés
    const currentHash = this.calculateContentHash(data);
    if (currentHash !== archive.contentHash) {
      throw new Error(
        `Archive integrity check failed for ${archiveId}. File may be corrupted.`
      );
    }

    return data;
  }

  /**
   * Archívum integritás ellenőrzése
   */
  async verifyArchiveIntegrity(archiveId: string, tenantId: string): Promise<{
    isValid: boolean;
    expectedHash: string;
    actualHash?: string;
    error?: string;
  }> {
    const archive = await this.getArchiveById(archiveId, tenantId);

    try {
      const data = await this.storageAdapter.download(
        archive.storageBucket,
        archive.storagePath
      );

      const actualHash = this.calculateContentHash(data);
      const isValid = actualHash === archive.contentHash;

      if (isValid) {
        return {
          isValid,
          expectedHash: archive.contentHash,
          actualHash,
        };
      }
      return {
        isValid,
        expectedHash: archive.contentHash,
        actualHash,
        error: 'Content hash mismatch',
      };
    } catch (error) {
      return {
        isValid: false,
        expectedHash: archive.contentHash,
        error: `Failed to read archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Lejárt archívumok törlése (scheduled job)
   */
  async cleanupExpiredArchives(tenantId: string): Promise<{
    deletedCount: number;
    deletedIds: string[];
    errors: Array<{ id: string; error: string }>;
  }> {
    const now = new Date();
    const deletedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const archive of this.archives.values()) {
      if (
        archive.tenantId === tenantId &&
        archive.scheduledDeletionAt &&
        archive.scheduledDeletionAt <= now
      ) {
        try {
          await this.storageAdapter.delete(archive.storageBucket, archive.storagePath);
          this.archives.delete(archive.id);
          deletedIds.push(archive.id);
        } catch (error) {
          errors.push({
            id: archive.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
      errors,
    };
  }

  /**
   * Retention period módosítása
   */
  async updateRetentionPeriod(
    archiveId: string,
    tenantId: string,
    newRetentionYears: number
  ): Promise<ArchivedContract> {
    const archive = await this.getArchiveById(archiveId, tenantId);

    const scheduledDeletionAt = new Date(archive.archivedAt);
    scheduledDeletionAt.setFullYear(scheduledDeletionAt.getFullYear() + newRetentionYears);

    const updated: ArchivedContract = {
      ...archive,
      retentionYears: newRetentionYears,
      scheduledDeletionAt,
    };

    this.archives.set(archiveId, updated);
    return updated;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Content hash számítás (SHA-256)
   */
  private calculateContentHash(data: Uint8Array): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Storage path generálás
   * Format: tenant_id/year/month/contract_id.pdf
   */
  private generateStoragePath(contract: Contract): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${contract.tenantId}/${year}/${month}/${contract.id}.pdf`;
  }

  /**
   * Storage adapter beállítása (production-ben S3/MinIO)
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storageAdapter = adapter;
  }
}
