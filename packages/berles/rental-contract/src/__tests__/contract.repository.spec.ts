/**
 * @kgc/rental-contract - Contract Repository Unit Tests
 * Epic 15: Bérlési szerződés kezelés
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { ContractVariables, SignatureType } from '../interfaces/contract.interface';
import type { CreateContractInput, CreateTemplateInput } from '../repositories/contract.repository';
import {
  InMemoryContractRepository,
  InMemoryContractTemplateRepository,
} from '../repositories/contract.repository';

describe('InMemoryContractRepository', () => {
  let repository: InMemoryContractRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  const createContractVariables = (): ContractVariables => ({
    partnerName: 'Teszt Partner Kft.',
    partnerAddress: '1111 Budapest, Teszt utca 1.',
    rentalId: 'rental-1',
    rentalStartDate: '2024-01-15',
    rentalDailyRate: 5000,
    equipmentName: 'Teszt Bérgép',
    companyName: 'KGC Kft.',
    companyAddress: '1234 Budapest, Fő utca 1.',
    companyTaxNumber: '12345678-2-42',
    currentDate: '2024-01-15',
    contractNumber: 'SZ2024-00001',
  });

  const createContractInput = (
    overrides: Partial<CreateContractInput> = {}
  ): CreateContractInput => ({
    rentalId: 'rental-1',
    templateId: 'template-1',
    contractNumber: 'SZ2024-00001',
    variables: createContractVariables(),
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryContractRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a contract successfully', async () => {
      const input = createContractInput();
      const contract = await repository.create(tenantId, input, userId);

      expect(contract).toBeDefined();
      expect(contract.id).toBeDefined();
      expect(contract.contractNumber).toBe('SZ2024-00001');
      expect(contract.rentalId).toBe('rental-1');
      expect(contract.templateId).toBe('template-1');
      expect(contract.status).toBe('DRAFT');
      expect(contract.tenantId).toBe(tenantId);
      expect(contract.createdBy).toBe(userId);
    });

    it('should throw error when contract number already exists', async () => {
      const input = createContractInput();
      await repository.create(tenantId, input, userId);

      await expect(
        repository.create(tenantId, { ...input, rentalId: 'rental-2' }, userId)
      ).rejects.toThrow('A szerződésszám már létezik: SZ2024-00001');
    });

    it('should throw error when contract already exists for rental', async () => {
      const input = createContractInput();
      await repository.create(tenantId, input, userId);

      await expect(
        repository.create(tenantId, { ...input, contractNumber: 'SZ2024-00002' }, userId)
      ).rejects.toThrow('Szerződés már létezik ehhez a bérléshez: rental-1');
    });
  });

  describe('findById', () => {
    it('should find contract by ID', async () => {
      const created = await repository.create(tenantId, createContractInput(), userId);
      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find contract from different tenant', async () => {
      const created = await repository.create(tenantId, createContractInput(), userId);
      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('findByRentalId', () => {
    it('should find contract by rental ID', async () => {
      await repository.create(tenantId, createContractInput({ rentalId: 'find-rental' }), userId);
      const found = await repository.findByRentalId('find-rental', tenantId);

      expect(found).toBeDefined();
      expect(found?.rentalId).toBe('find-rental');
    });
  });

  describe('findByNumber', () => {
    it('should find contract by contract number', async () => {
      await repository.create(
        tenantId,
        createContractInput({ contractNumber: 'FIND-001' }),
        userId
      );
      const found = await repository.findByNumber('FIND-001', tenantId);

      expect(found).toBeDefined();
      expect(found?.contractNumber).toBe('FIND-001');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        createContractInput({
          rentalId: 'r1',
          contractNumber: 'C-001',
        }),
        userId
      );

      const c2 = await repository.create(
        tenantId,
        createContractInput({
          rentalId: 'r2',
          contractNumber: 'C-002',
        }),
        userId
      );
      await repository.update(c2.id, tenantId, { status: 'PENDING_SIGNATURE' });

      await repository.create(
        tenantId,
        createContractInput({
          rentalId: 'r3',
          contractNumber: 'C-003',
        }),
        userId
      );
    });

    it('should return all contracts for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.contracts).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await repository.query({ tenantId, status: 'PENDING_SIGNATURE' });

      expect(result.total).toBe(1);
      expect(result.contracts[0]?.contractNumber).toBe('C-002');
    });

    it('should search by contract number', async () => {
      const result = await repository.query({ tenantId, search: 'C-001' });

      expect(result.total).toBe(1);
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.contracts).toHaveLength(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('update', () => {
    it('should update contract', async () => {
      const created = await repository.create(tenantId, createContractInput(), userId);
      const updated = await repository.update(created.id, tenantId, {
        status: 'PENDING_SIGNATURE',
        pdfPath: '/contracts/test.pdf',
        pdfGeneratedAt: new Date(),
      });

      expect(updated.status).toBe('PENDING_SIGNATURE');
      expect(updated.pdfPath).toBe('/contracts/test.pdf');
    });

    it('should throw error for non-existent contract', async () => {
      await expect(
        repository.update('non-existent', tenantId, { status: 'SIGNED' })
      ).rejects.toThrow('Szerződés nem található');
    });
  });

  describe('sign', () => {
    it('should sign contract', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);
      await repository.update(contract.id, tenantId, { status: 'PENDING_SIGNATURE' });

      const signed = await repository.sign(contract.id, tenantId, {
        type: 'DIGITAL' as SignatureType,
        signatureImage: 'base64-signature-data',
        signerName: 'Teszt Aláíró',
        signerEmail: 'test@example.com',
        signedAt: new Date(),
        ipAddress: '192.168.1.1',
        signatureHash: 'sha256-hash',
      });

      expect(signed.status).toBe('SIGNED');
      expect(signed.signature).toBeDefined();
      expect(signed.signature?.signerName).toBe('Teszt Aláíró');
    });

    it('should throw error when contract is already signed', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);
      await repository.sign(contract.id, tenantId, {
        type: 'DIGITAL' as SignatureType,
        signerName: 'Aláíró 1',
        signedAt: new Date(),
        signatureHash: 'hash-1',
      });

      await expect(
        repository.sign(contract.id, tenantId, {
          type: 'DIGITAL' as SignatureType,
          signerName: 'Aláíró 2',
          signedAt: new Date(),
          signatureHash: 'hash-2',
        })
      ).rejects.toThrow('A szerződés nem írható alá ebben az állapotban: SIGNED');
    });
  });

  describe('archive', () => {
    it('should archive signed contract', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);
      await repository.sign(contract.id, tenantId, {
        type: 'DIGITAL' as SignatureType,
        signerName: 'Aláíró',
        signedAt: new Date(),
        signatureHash: 'hash',
      });

      const archived = await repository.archive(contract.id, tenantId, {
        storageBucket: 'contracts',
        storagePath: '/2024/01/contract.pdf',
        fileSize: 102400,
        contentHash: 'sha256-content-hash',
        retentionYears: 10,
      });

      expect(archived.contractId).toBe(contract.id);
      expect(archived.storageBucket).toBe('contracts');
      expect(archived.retentionYears).toBe(10);

      const updatedContract = await repository.findById(contract.id, tenantId);
      expect(updatedContract?.status).toBe('ARCHIVED');
    });

    it('should throw error for non-signed contract', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);

      await expect(
        repository.archive(contract.id, tenantId, {
          storageBucket: 'contracts',
          storagePath: '/test.pdf',
          fileSize: 1000,
          contentHash: 'hash',
          retentionYears: 10,
        })
      ).rejects.toThrow('A szerződés nem archiválható ebben az állapotban: DRAFT');
    });
  });

  describe('cancel', () => {
    it('should cancel draft contract', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);
      const cancelled = await repository.cancel(contract.id, tenantId);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw error for signed contract', async () => {
      const contract = await repository.create(tenantId, createContractInput(), userId);
      await repository.sign(contract.id, tenantId, {
        type: 'DIGITAL' as SignatureType,
        signerName: 'Aláíró',
        signedAt: new Date(),
        signatureHash: 'hash',
      });

      await expect(repository.cancel(contract.id, tenantId)).rejects.toThrow(
        'Az aláírt vagy archivált szerződés nem vonható vissza'
      );
    });
  });

  describe('getPendingSignature', () => {
    it('should return contracts pending signature', async () => {
      await repository.create(
        tenantId,
        createContractInput({ rentalId: 'r1', contractNumber: 'C-001' }),
        userId
      );

      const c2 = await repository.create(
        tenantId,
        createContractInput({ rentalId: 'r2', contractNumber: 'C-002' }),
        userId
      );
      await repository.update(c2.id, tenantId, { status: 'PENDING_SIGNATURE' });

      const pending = await repository.getPendingSignature(tenantId);

      expect(pending).toHaveLength(1);
      expect(pending[0]?.contractNumber).toBe('C-002');
    });
  });

  describe('generateNextNumber', () => {
    it('should generate sequential contract numbers', async () => {
      const num1 = await repository.generateNextNumber(tenantId);
      const num2 = await repository.generateNextNumber(tenantId);
      const num3 = await repository.generateNextNumber(tenantId, 'SZER');

      const year = new Date().getFullYear();
      expect(num1).toBe(`SZ${year}-00001`);
      expect(num2).toBe(`SZ${year}-00002`);
      // Different prefix has separate sequence
      expect(num3).toBe(`SZER${year}-00001`);
    });
  });

  describe('countByStatus', () => {
    it('should count contracts by status', async () => {
      await repository.create(
        tenantId,
        createContractInput({ rentalId: 'r1', contractNumber: 'C-001' }),
        userId
      );
      await repository.create(
        tenantId,
        createContractInput({ rentalId: 'r2', contractNumber: 'C-002' }),
        userId
      );

      const c3 = await repository.create(
        tenantId,
        createContractInput({ rentalId: 'r3', contractNumber: 'C-003' }),
        userId
      );
      await repository.sign(c3.id, tenantId, {
        type: 'DIGITAL' as SignatureType,
        signerName: 'Aláíró',
        signedAt: new Date(),
        signatureHash: 'hash',
      });

      const counts = await repository.countByStatus(tenantId);

      expect(counts.DRAFT).toBe(2);
      expect(counts.SIGNED).toBe(1);
      expect(counts.PENDING_SIGNATURE).toBe(0);
    });
  });
});

describe('InMemoryContractTemplateRepository', () => {
  let repository: InMemoryContractTemplateRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  const createTemplateInput = (
    overrides: Partial<CreateTemplateInput> = {}
  ): CreateTemplateInput => ({
    name: 'Standard Bérlési Szerződés',
    type: 'RENTAL_STANDARD',
    content: '<h1>Bérlési Szerződés</h1><p>Partner: {{partnerName}}</p>',
    availableVariables: ['partnerName', 'equipmentName', 'rentalStartDate'],
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryContractTemplateRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      const input = createTemplateInput();
      const template = await repository.create(tenantId, input, userId);

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe('Standard Bérlési Szerződés');
      expect(template.type).toBe('RENTAL_STANDARD');
      expect(template.version).toBe(1);
      expect(template.isActive).toBe(true);
      expect(template.createdBy).toBe(userId);
    });
  });

  describe('findById', () => {
    it('should find template by ID', async () => {
      const created = await repository.create(tenantId, createTemplateInput(), userId);
      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });
  });

  describe('findActiveByType', () => {
    it('should find active template by type', async () => {
      await repository.create(tenantId, createTemplateInput({ type: 'RENTAL_STANDARD' }), userId);
      const found = await repository.findActiveByType('RENTAL_STANDARD', tenantId);

      expect(found).toBeDefined();
      expect(found?.type).toBe('RENTAL_STANDARD');
    });

    it('should not find inactive template', async () => {
      const template = await repository.create(
        tenantId,
        createTemplateInput({ type: 'RENTAL_LONG_TERM' }),
        userId
      );
      await repository.deactivate(template.id, tenantId);

      const found = await repository.findActiveByType('RENTAL_LONG_TERM', tenantId);
      expect(found).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        createTemplateInput({
          name: 'Template 1',
          type: 'RENTAL_STANDARD',
        }),
        userId
      );

      const t2 = await repository.create(
        tenantId,
        createTemplateInput({
          name: 'Template 2',
          type: 'RENTAL_LONG_TERM',
        }),
        userId
      );
      await repository.deactivate(t2.id, tenantId);

      await repository.create(
        tenantId,
        createTemplateInput({
          name: 'Template 3',
          type: 'RENTAL_CORPORATE',
        }),
        userId
      );
    });

    it('should return all templates for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.templates).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const result = await repository.query({ tenantId, type: 'RENTAL_STANDARD' });

      expect(result.total).toBe(1);
    });

    it('should filter by active status', async () => {
      const result = await repository.query({ tenantId, isActive: true });

      expect(result.total).toBe(2);
    });

    it('should search by name', async () => {
      const result = await repository.query({ tenantId, search: 'Template 1' });

      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      const created = await repository.create(tenantId, createTemplateInput(), userId);
      const updated = await repository.update(created.id, tenantId, { name: 'Frissített Sablon' });

      expect(updated.name).toBe('Frissített Sablon');
    });

    it('should create new version when template is used', async () => {
      const created = await repository.create(tenantId, createTemplateInput(), userId);
      repository.markAsUsed(created.id);

      const updated = await repository.update(created.id, tenantId, {
        content: '<h1>Új Tartalom</h1>',
      });

      expect(updated.version).toBe(2);
      expect(updated.id).not.toBe(created.id);

      // Old version should be deactivated
      const oldTemplate = await repository.findById(created.id, tenantId);
      expect(oldTemplate?.isActive).toBe(false);
    });
  });

  describe('activate/deactivate', () => {
    it('should activate template', async () => {
      const template = await repository.create(
        tenantId,
        createTemplateInput({ isActive: false }),
        userId
      );
      const activated = await repository.activate(template.id, tenantId);

      expect(activated.isActive).toBe(true);
    });

    it('should deactivate template', async () => {
      const template = await repository.create(tenantId, createTemplateInput(), userId);
      const deactivated = await repository.deactivate(template.id, tenantId);

      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('getVersions', () => {
    it('should return all versions of template', async () => {
      const t1 = await repository.create(
        tenantId,
        createTemplateInput({ name: 'Verzió Teszt' }),
        userId
      );
      repository.markAsUsed(t1.id);
      await repository.update(t1.id, tenantId, { content: 'v2' });

      const versions = await repository.getVersions('Verzió Teszt', tenantId);

      expect(versions).toHaveLength(2);
      expect(versions[0]?.version).toBe(2);
      expect(versions[1]?.version).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete unused template', async () => {
      const template = await repository.create(tenantId, createTemplateInput(), userId);
      await repository.delete(template.id, tenantId);

      const found = await repository.findById(template.id, tenantId);
      expect(found).toBeNull();
    });

    it('should throw error when template is used', async () => {
      const template = await repository.create(tenantId, createTemplateInput(), userId);
      repository.markAsUsed(template.id);

      await expect(repository.delete(template.id, tenantId)).rejects.toThrow(
        'A sablon használatban van, nem törölhető'
      );
    });
  });

  describe('isUsed', () => {
    it('should return true for used template', async () => {
      const template = await repository.create(tenantId, createTemplateInput(), userId);
      repository.markAsUsed(template.id);

      const used = await repository.isUsed(template.id, tenantId);
      expect(used).toBe(true);
    });

    it('should return false for unused template', async () => {
      const template = await repository.create(tenantId, createTemplateInput(), userId);

      const used = await repository.isUsed(template.id, tenantId);
      expect(used).toBe(false);
    });
  });
});
