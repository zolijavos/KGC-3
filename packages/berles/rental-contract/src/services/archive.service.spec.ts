import { describe, it, expect, beforeEach } from 'vitest';
import { ArchiveService, InMemoryStorageAdapter } from './archive.service';
import { Contract, ContractStatus, ContractVariables } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - ArchiveService Unit Tests
 * Story 15-4: Szerződés Archiválás
 *
 * TRADICIONÁLIS - post-implementation tesztek
 */

describe('ArchiveService', () => {
  let service: ArchiveService;
  let storageAdapter: InMemoryStorageAdapter;

  const createMockContract = (status: ContractStatus = ContractStatus.SIGNED): Contract => ({
    id: `contract_${Date.now()}`,
    tenantId: 'tenant_1',
    rentalId: 'rental_1',
    templateId: 'template_1',
    contractNumber: 'KGC-2026-00001',
    status,
    variables: createMockVariables(),
    pdfPath: '/path/to/pdf',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user_1',
  });

  const createMockVariables = (): ContractVariables => ({
    partnerName: 'Test Partner',
    partnerAddress: 'Test Address',
    equipmentName: 'Test Equipment',
    rentalId: 'rental_1',
    rentalStartDate: '2026. január 15.',
    rentalDailyRate: 10000,
    companyName: 'Test Company',
    companyAddress: 'Company Address',
    companyTaxNumber: '12345678-2-42',
    currentDate: '2026. január 15.',
    contractNumber: 'KGC-2026-00001',
  });

  const mockPdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header

  beforeEach(() => {
    storageAdapter = new InMemoryStorageAdapter();
    service = new ArchiveService(storageAdapter);
  });

  // ===========================================================================
  // InMemoryStorageAdapter tests
  // ===========================================================================
  describe('InMemoryStorageAdapter', () => {
    it('should upload and download file', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await storageAdapter.upload('bucket', 'path/file.pdf', data);
      const downloaded = await storageAdapter.download('bucket', 'path/file.pdf');

      expect(downloaded).toEqual(data);
    });

    it('should check file existence', async () => {
      const data = new Uint8Array([1, 2, 3]);

      expect(await storageAdapter.exists('bucket', 'test.pdf')).toBe(false);
      await storageAdapter.upload('bucket', 'test.pdf', data);
      expect(await storageAdapter.exists('bucket', 'test.pdf')).toBe(true);
    });

    it('should delete file', async () => {
      const data = new Uint8Array([1, 2, 3]);
      await storageAdapter.upload('bucket', 'test.pdf', data);

      await storageAdapter.delete('bucket', 'test.pdf');

      expect(await storageAdapter.exists('bucket', 'test.pdf')).toBe(false);
    });

    it('should generate signed URL', async () => {
      const url = await storageAdapter.getSignedUrl('bucket', 'file.pdf', 3600);

      expect(url).toContain('memory://bucket/file.pdf');
    });
  });

  // ===========================================================================
  // archiveContract() tests
  // ===========================================================================
  describe('archiveContract()', () => {
    it('should archive signed contract successfully', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);

      const archive = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
        retentionYears: 10,
      });

      expect(archive.id).toBeDefined();
      expect(archive.contractId).toBe(contract.id);
      expect(archive.tenantId).toBe(contract.tenantId);
      expect(archive.fileSize).toBe(mockPdfData.length);
      expect(archive.contentHash).toBeDefined();
      expect(archive.retentionYears).toBe(10);
      expect(archive.archivedAt).toBeInstanceOf(Date);
      expect(archive.scheduledDeletionAt).toBeInstanceOf(Date);
    });

    it('should reject non-signed contract', async () => {
      const contract = createMockContract(ContractStatus.DRAFT);

      await expect(
        service.archiveContract(contract, mockPdfData, {
          contractId: contract.id,
          retentionYears: 10,
        })
      ).rejects.toThrow('Contract must be SIGNED');
    });

    it('should reject already archived contract', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);

      // First archive
      await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
        retentionYears: 10,
      });

      // Second attempt should fail
      await expect(
        service.archiveContract(contract, mockPdfData, {
          contractId: contract.id,
          retentionYears: 10,
        })
      ).rejects.toThrow('already archived');
    });

    it('should use default retention years when not specified', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);

      const archive = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
      });

      expect(archive.retentionYears).toBe(10); // Default
    });
  });

  // ===========================================================================
  // getArchiveById() tests
  // ===========================================================================
  describe('getArchiveById()', () => {
    it('should retrieve archive by ID', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);
      const created = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
        retentionYears: 5,
      });

      const retrieved = await service.getArchiveById(created.id, 'tenant_1');

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.contractId).toBe(contract.id);
    });

    it('should throw NotFoundException for non-existent archive', async () => {
      await expect(service.getArchiveById('non_existent', 'tenant_1')).rejects.toThrow(
        'Archive not found'
      );
    });

    it('should not return archive from different tenant', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);
      const created = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
      });

      await expect(service.getArchiveById(created.id, 'tenant_2')).rejects.toThrow(
        'Archive not found'
      );
    });
  });

  // ===========================================================================
  // downloadArchive() tests
  // ===========================================================================
  describe('downloadArchive()', () => {
    it('should download archived PDF', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);
      const archive = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
      });

      const downloaded = await service.downloadArchive(archive.id, 'tenant_1');

      expect(downloaded).toEqual(mockPdfData);
    });
  });

  // ===========================================================================
  // verifyArchiveIntegrity() tests
  // ===========================================================================
  describe('verifyArchiveIntegrity()', () => {
    it('should verify valid archive', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);
      const archive = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
      });

      const result = await service.verifyArchiveIntegrity(archive.id, 'tenant_1');

      expect(result.isValid).toBe(true);
      expect(result.expectedHash).toBe(result.actualHash);
    });
  });

  // ===========================================================================
  // listArchives() tests
  // ===========================================================================
  describe('listArchives()', () => {
    it('should list archives with pagination', async () => {
      // Create multiple archives
      for (let i = 0; i < 5; i++) {
        const contract = createMockContract(ContractStatus.SIGNED);
        contract.id = `contract_${i}`;
        await service.archiveContract(contract, mockPdfData, {
          contractId: contract.id,
        });
      }

      const result = await service.listArchives('tenant_1', {
        page: 1,
        limit: 3,
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
    });
  });

  // ===========================================================================
  // updateRetentionPeriod() tests
  // ===========================================================================
  describe('updateRetentionPeriod()', () => {
    it('should update retention period', async () => {
      const contract = createMockContract(ContractStatus.SIGNED);
      const archive = await service.archiveContract(contract, mockPdfData, {
        contractId: contract.id,
        retentionYears: 5,
      });

      const updated = await service.updateRetentionPeriod(archive.id, 'tenant_1', 15);

      expect(updated.retentionYears).toBe(15);
      // Check that scheduled deletion date is updated
      const expectedYear = archive.archivedAt.getFullYear() + 15;
      expect(updated.scheduledDeletionAt?.getFullYear()).toBe(expectedYear);
    });
  });
});
