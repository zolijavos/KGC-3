/**
 * @kgc/partners - Partner Repository Unit Tests
 * Epic 7: Story 7-1: Partner CRUD
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CreatePartnerInput } from '../dto/partner.dto';
import { InMemoryPartnerRepository } from '../repositories/partner.repository';

describe('InMemoryPartnerRepository', () => {
  let repository: InMemoryPartnerRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  beforeEach(() => {
    repository = new InMemoryPartnerRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a partner successfully', async () => {
      const input: CreatePartnerInput = {
        partnerCode: 'P-001',
        name: 'Test Partner',
        type: 'INDIVIDUAL',
      };

      const partner = await repository.create(tenantId, input, userId);

      expect(partner).toBeDefined();
      expect(partner.id).toBeDefined();
      expect(partner.partnerCode).toBe('P-001');
      expect(partner.name).toBe('Test Partner');
      expect(partner.type).toBe('INDIVIDUAL');
      expect(partner.status).toBe('ACTIVE');
      expect(partner.tenantId).toBe(tenantId);
      expect(partner.createdBy).toBe(userId);
      expect(partner.isDeleted).toBe(false);
    });

    it('should throw error when partner code already exists', async () => {
      const input: CreatePartnerInput = {
        partnerCode: 'DUP-001',
        name: 'First Partner',
      };

      await repository.create(tenantId, input, userId);

      await expect(repository.create(tenantId, input, userId)).rejects.toThrow(
        'A partner kód már létezik: DUP-001'
      );
    });

    it('should throw error when tax number already exists', async () => {
      const input1: CreatePartnerInput = {
        partnerCode: 'P-001',
        name: 'First Partner',
        taxNumber: '12345678-1-12',
      };

      const input2: CreatePartnerInput = {
        partnerCode: 'P-002',
        name: 'Second Partner',
        taxNumber: '12345678-1-12',
      };

      await repository.create(tenantId, input1, userId);

      await expect(repository.create(tenantId, input2, userId)).rejects.toThrow(
        'Az adószám már létezik: 12345678-1-12'
      );
    });

    it('should create company partner', async () => {
      const input: CreatePartnerInput = {
        partnerCode: 'C-001',
        name: 'Test Company',
        type: 'COMPANY',
        companyName: 'Test Company Kft.',
        taxNumber: '87654321-2-42',
      };

      const partner = await repository.create(tenantId, input, userId);

      expect(partner.type).toBe('COMPANY');
      expect(partner.companyName).toBe('Test Company Kft.');
      expect(partner.taxNumber).toBe('87654321-2-42');
    });
  });

  describe('findById', () => {
    it('should find partner by ID', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'FIND-001', name: 'Find Test' },
        userId
      );

      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.partnerCode).toBe('FIND-001');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find partner from different tenant', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'TENANT-001', name: 'Tenant Test' },
        userId
      );

      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        { partnerCode: 'I-001', name: 'Individual 1', type: 'INDIVIDUAL' },
        userId
      );
      await repository.create(
        tenantId,
        { partnerCode: 'I-002', name: 'Individual 2', type: 'INDIVIDUAL' },
        userId
      );
      await repository.create(
        tenantId,
        { partnerCode: 'C-001', name: 'Company 1', type: 'COMPANY' },
        userId
      );
    });

    it('should return all partners for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.partners).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const result = await repository.query({ tenantId, type: 'COMPANY' });

      expect(result.total).toBe(1);
      expect(result.partners[0]?.name).toBe('Company 1');
    });

    it('should search by name', async () => {
      const result = await repository.query({ tenantId, search: 'Company' });

      expect(result.total).toBe(1);
      expect(result.partners[0]?.type).toBe('COMPANY');
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.partners).toHaveLength(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('blacklist', () => {
    it('should blacklist partner', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'BL-001', name: 'Blacklist Test' },
        userId
      );

      const blacklisted = await repository.blacklist(created.id, tenantId, 'Nem fizet', userId);

      expect(blacklisted.status).toBe('BLACKLISTED');
      expect(blacklisted.blacklistReason).toBe('Nem fizet');
      expect(blacklisted.blacklistedBy).toBe(userId);
      expect(blacklisted.blacklistedAt).toBeDefined();
    });

    it('should remove from blacklist', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'BL-002', name: 'Remove Blacklist Test' },
        userId
      );

      await repository.blacklist(created.id, tenantId, 'Test reason', userId);
      const removed = await repository.removeFromBlacklist(created.id, tenantId);

      expect(removed.status).toBe('ACTIVE');
      expect(removed.blacklistReason).toBeNull();
      expect(removed.blacklistedBy).toBeNull();
      expect(removed.blacklistedAt).toBeNull();
    });
  });

  describe('softDelete and restore', () => {
    it('should soft delete partner', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'DEL-001', name: 'Delete Test' },
        userId
      );

      await repository.softDelete(created.id, tenantId, userId);

      const found = await repository.findById(created.id, tenantId);
      expect(found?.isDeleted).toBe(true);
      expect(found?.deletedAt).toBeDefined();
      expect(found?.deletedBy).toBe(userId);
    });

    it('should restore soft deleted partner', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'RES-001', name: 'Restore Test' },
        userId
      );

      await repository.softDelete(created.id, tenantId, userId);
      const restored = await repository.restore(created.id, tenantId);

      expect(restored.isDeleted).toBe(false);
      expect(restored.deletedAt).toBeNull();
      expect(restored.deletedBy).toBeNull();
    });
  });

  describe('loyalty', () => {
    it('should update loyalty tier', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'LOY-001', name: 'Loyalty Test' },
        userId
      );

      const updated = await repository.updateLoyaltyTier(created.id, tenantId, 'gold-tier-id');

      expect(updated.loyaltyTierId).toBe('gold-tier-id');
      expect(updated.tierCalculatedAt).toBeDefined();
    });

    it('should add loyalty points', async () => {
      const created = await repository.create(
        tenantId,
        { partnerCode: 'PTS-001', name: 'Points Test' },
        userId
      );

      const updated = await repository.addLoyaltyPoints(created.id, tenantId, 100);

      expect(updated.loyaltyPoints).toBe(100);

      const updated2 = await repository.addLoyaltyPoints(created.id, tenantId, 50);

      expect(updated2.loyaltyPoints).toBe(150);
    });
  });

  describe('generateNextCode', () => {
    it('should generate sequential codes', async () => {
      const code1 = await repository.generateNextCode(tenantId);
      const code2 = await repository.generateNextCode(tenantId);
      const code3 = await repository.generateNextCode(tenantId, 'CUS');

      expect(code1).toBe('P000001');
      expect(code2).toBe('P000002');
      expect(code3).toBe('CUS000003');
    });
  });

  describe('countByStatus', () => {
    it('should count partners by status', async () => {
      await repository.create(tenantId, { partnerCode: 'A-001', name: 'Active 1' }, userId);
      await repository.create(tenantId, { partnerCode: 'A-002', name: 'Active 2' }, userId);

      const created = await repository.create(
        tenantId,
        { partnerCode: 'B-001', name: 'Blacklisted' },
        userId
      );
      await repository.blacklist(created.id, tenantId, 'Test', userId);

      const counts = await repository.countByStatus(tenantId);

      expect(counts.ACTIVE).toBe(2);
      expect(counts.BLACKLISTED).toBe(1);
      expect(counts.INACTIVE).toBe(0);
    });
  });
});
