/**
 * @kgc/rental-checkout - Deposit Repository Unit Tests
 * Epic 16: Kaució kezelés
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DepositPaymentMethod } from '../interfaces/deposit.interface';
import type { CreateDepositInput } from '../repositories/deposit.repository';
import { InMemoryDepositRepository } from '../repositories/deposit.repository';

describe('InMemoryDepositRepository', () => {
  let repository: InMemoryDepositRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  const createDepositInput = (overrides: Partial<CreateDepositInput> = {}): CreateDepositInput => ({
    rentalId: 'rental-1',
    partnerId: 'partner-1',
    amount: 30000,
    paymentMethod: 'cash' as DepositPaymentMethod,
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryDepositRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a deposit successfully', async () => {
      const input = createDepositInput();
      const deposit = await repository.create(tenantId, input, userId);

      expect(deposit).toBeDefined();
      expect(deposit.id).toBeDefined();
      expect(deposit.rentalId).toBe('rental-1');
      expect(deposit.partnerId).toBe('partner-1');
      expect(deposit.amount).toBe(30000);
      expect(deposit.status).toBe('pending');
      expect(deposit.paymentMethod).toBe('cash');
      expect(deposit.tenantId).toBe(tenantId);
      expect(deposit.createdBy).toBe(userId);
    });

    it('should throw error when deposit already exists for rental', async () => {
      const input = createDepositInput();
      await repository.create(tenantId, input, userId);

      await expect(repository.create(tenantId, input, userId)).rejects.toThrow(
        'Kaució már létezik ehhez a bérléshez: rental-1'
      );
    });

    it('should throw error when amount is not positive', async () => {
      const input = createDepositInput({ amount: 0 });

      await expect(repository.create(tenantId, input, userId)).rejects.toThrow(
        'A kaució összegnek pozitívnak kell lennie'
      );
    });

    it('should add audit record on creation', async () => {
      const input = createDepositInput({ notes: 'Teszt kaució' });
      const deposit = await repository.create(tenantId, input, userId);

      const records = await repository.getAuditRecords(deposit.id);
      expect(records).toHaveLength(1);
      expect(records[0]?.action).toBe('created');
      expect(records[0]?.newStatus).toBe('pending');
      expect(records[0]?.notes).toBe('Teszt kaució');
    });
  });

  describe('findById', () => {
    it('should find deposit by ID', async () => {
      const created = await repository.create(tenantId, createDepositInput(), userId);
      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find deposit from different tenant', async () => {
      const created = await repository.create(tenantId, createDepositInput(), userId);
      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('findByRentalId', () => {
    it('should find deposit by rental ID', async () => {
      await repository.create(tenantId, createDepositInput({ rentalId: 'find-rental' }), userId);
      const found = await repository.findByRentalId('find-rental', tenantId);

      expect(found).toBeDefined();
      expect(found?.rentalId).toBe('find-rental');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        createDepositInput({
          rentalId: 'r1',
          partnerId: 'p1',
          amount: 20000,
          paymentMethod: 'cash',
        }),
        userId
      );

      const d2 = await repository.create(
        tenantId,
        createDepositInput({
          rentalId: 'r2',
          partnerId: 'p2',
          amount: 40000,
          paymentMethod: 'card',
        }),
        userId
      );
      await repository.collect(d2.id, tenantId, userId);

      await repository.create(
        tenantId,
        createDepositInput({
          rentalId: 'r3',
          partnerId: 'p1',
          amount: 50000,
          paymentMethod: 'mypos_preauth',
        }),
        userId
      );
    });

    it('should return all deposits for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.deposits).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await repository.query({ tenantId, status: 'collected' });

      expect(result.total).toBe(1);
      expect(result.deposits[0]?.amount).toBe(40000);
    });

    it('should filter by partner', async () => {
      const result = await repository.query({ tenantId, partnerId: 'p1' });

      expect(result.total).toBe(2);
    });

    it('should filter by payment method', async () => {
      const result = await repository.query({ tenantId, paymentMethod: 'card' });

      expect(result.total).toBe(1);
    });

    it('should filter by amount range', async () => {
      const result = await repository.query({ tenantId, minAmount: 30000, maxAmount: 45000 });

      expect(result.total).toBe(1);
      expect(result.deposits[0]?.amount).toBe(40000);
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.deposits).toHaveLength(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('collect', () => {
    it('should collect pending deposit', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      const collected = await repository.collect(deposit.id, tenantId, userId);

      expect(collected.status).toBe('collected');
    });

    it('should throw error for non-pending deposit', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);

      await expect(repository.collect(deposit.id, tenantId, userId)).rejects.toThrow(
        'A kaució nem várakozó állapotban van: collected'
      );
    });

    it('should add audit record on collection', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);

      const records = await repository.getAuditRecords(deposit.id);
      const collectRecord = records.find(r => r.action === 'collected');
      expect(collectRecord).toBeDefined();
      expect(collectRecord?.previousStatus).toBe('pending');
      expect(collectRecord?.newStatus).toBe('collected');
    });
  });

  describe('hold', () => {
    it('should hold deposit with MyPOS transaction', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);
      const held = await repository.hold(deposit.id, tenantId, 'mypos-tx-123');

      expect(held.status).toBe('held');
      expect(held.myposTransactionId).toBe('mypos-tx-123');
    });

    it('should add audit record with transaction ID', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);
      await repository.hold(deposit.id, tenantId, 'mypos-tx-456');

      const records = await repository.getAuditRecords(deposit.id);
      const holdRecord = records.find(r => r.action === 'held');
      expect(holdRecord?.notes).toContain('mypos-tx-456');
    });
  });

  describe('release', () => {
    it('should release collected deposit', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);
      const released = await repository.release(deposit.id, tenantId, userId);

      expect(released.status).toBe('released');
    });

    it('should throw error for pending deposit', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);

      await expect(repository.release(deposit.id, tenantId, userId)).rejects.toThrow(
        'A kaució nem adható vissza ebben az állapotban: pending'
      );
    });
  });

  describe('retain', () => {
    it('should fully retain deposit', async () => {
      const deposit = await repository.create(
        tenantId,
        createDepositInput({ amount: 30000 }),
        userId
      );
      await repository.collect(deposit.id, tenantId, userId);

      const retained = await repository.retain(
        tenantId,
        {
          depositId: deposit.id,
          reason: 'equipment_damage',
          retainedAmount: 30000,
          description: 'Súlyos sérülés a bérgépen',
        },
        userId
      );

      expect(retained.status).toBe('retained');
    });

    it('should partially retain deposit', async () => {
      const deposit = await repository.create(
        tenantId,
        createDepositInput({ amount: 30000 }),
        userId
      );
      await repository.collect(deposit.id, tenantId, userId);

      const retained = await repository.retain(
        tenantId,
        {
          depositId: deposit.id,
          reason: 'cleaning_fee',
          retainedAmount: 5000,
          description: 'Tisztítási díj',
        },
        userId
      );

      expect(retained.status).toBe('partially_retained');
    });

    it('should throw error when retained amount exceeds deposit', async () => {
      const deposit = await repository.create(
        tenantId,
        createDepositInput({ amount: 30000 }),
        userId
      );
      await repository.collect(deposit.id, tenantId, userId);

      await expect(
        repository.retain(
          tenantId,
          {
            depositId: deposit.id,
            reason: 'equipment_damage',
            retainedAmount: 50000,
            description: 'Teszt',
          },
          userId
        )
      ).rejects.toThrow('A visszatartott összeg nem lehet nagyobb a kaució összegénél');
    });
  });

  describe('getByPartnerId', () => {
    it('should return deposits for partner', async () => {
      await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r1', partnerId: 'partner-test' }),
        userId
      );
      await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r2', partnerId: 'partner-test' }),
        userId
      );

      const deposits = await repository.getByPartnerId('partner-test', tenantId);

      expect(deposits).toHaveLength(2);
    });
  });

  describe('getPendingDeposits', () => {
    it('should return pending deposits', async () => {
      await repository.create(tenantId, createDepositInput({ rentalId: 'r1' }), userId);
      const d2 = await repository.create(tenantId, createDepositInput({ rentalId: 'r2' }), userId);
      await repository.collect(d2.id, tenantId, userId);

      const pending = await repository.getPendingDeposits(tenantId);

      expect(pending).toHaveLength(1);
      expect(pending[0]?.rentalId).toBe('r1');
    });
  });

  describe('getHeldDeposits', () => {
    it('should return held deposits', async () => {
      const d1 = await repository.create(tenantId, createDepositInput({ rentalId: 'r1' }), userId);
      await repository.collect(d1.id, tenantId, userId);
      await repository.hold(d1.id, tenantId, 'tx-1');

      await repository.create(tenantId, createDepositInput({ rentalId: 'r2' }), userId);

      const held = await repository.getHeldDeposits(tenantId);

      expect(held).toHaveLength(1);
      expect(held[0]?.myposTransactionId).toBe('tx-1');
    });
  });

  describe('getTotalHeldAmount', () => {
    it('should return total held amount', async () => {
      const d1 = await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r1', amount: 30000 }),
        userId
      );
      await repository.collect(d1.id, tenantId, userId);
      await repository.hold(d1.id, tenantId, 'tx-1');

      const d2 = await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r2', amount: 50000 }),
        userId
      );
      await repository.collect(d2.id, tenantId, userId);
      await repository.hold(d2.id, tenantId, 'tx-2');

      const total = await repository.getTotalHeldAmount(tenantId);

      expect(total).toBe(80000);
    });
  });

  describe('countByStatus', () => {
    it('should count deposits by status', async () => {
      await repository.create(tenantId, createDepositInput({ rentalId: 'r1' }), userId);

      const d2 = await repository.create(tenantId, createDepositInput({ rentalId: 'r2' }), userId);
      await repository.collect(d2.id, tenantId, userId);

      const d3 = await repository.create(tenantId, createDepositInput({ rentalId: 'r3' }), userId);
      await repository.collect(d3.id, tenantId, userId);
      await repository.release(d3.id, tenantId, userId);

      const counts = await repository.countByStatus(tenantId);

      expect(counts.pending).toBe(1);
      expect(counts.collected).toBe(1);
      expect(counts.released).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return deposit statistics', async () => {
      await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r1', amount: 30000, paymentMethod: 'cash' }),
        userId
      );

      const d2 = await repository.create(
        tenantId,
        createDepositInput({ rentalId: 'r2', amount: 50000, paymentMethod: 'card' }),
        userId
      );
      await repository.collect(d2.id, tenantId, userId);
      await repository.hold(d2.id, tenantId, 'tx-1');

      const stats = await repository.getStatistics(tenantId);

      expect(stats.totalDeposits).toBe(2);
      expect(stats.pendingCount).toBe(1);
      expect(stats.heldCount).toBe(1);
      expect(stats.totalAmount).toBe(80000);
      expect(stats.totalHeldAmount).toBe(50000);
      expect(stats.byPaymentMethod.cash.count).toBe(1);
      expect(stats.byPaymentMethod.card.count).toBe(1);
    });
  });

  describe('getRetentionDetails', () => {
    it('should return retention details after retain', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);
      await repository.retain(
        tenantId,
        {
          depositId: deposit.id,
          reason: 'damage',
          retainedAmount: 15000,
          description: 'Sérülés javítási költség',
          attachments: ['photo1.jpg'],
        },
        userId
      );

      const retention = await repository.getRetentionDetails(deposit.id, tenantId);

      expect(retention).not.toBeNull();
      expect(retention?.reason).toBe('damage');
      expect(retention?.retainedAmount).toBe(15000);
      expect(retention?.description).toBe('Sérülés javítási költség');
      expect(retention?.attachments).toContain('photo1.jpg');
    });

    it('should return null if no retention', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);

      const retention = await repository.getRetentionDetails(deposit.id, tenantId);

      expect(retention).toBeNull();
    });

    it('should return null if deposit not found', async () => {
      const retention = await repository.getRetentionDetails('non-existent-id', tenantId);

      expect(retention).toBeNull();
    });

    it('should return null if deposit belongs to different tenant', async () => {
      const deposit = await repository.create(tenantId, createDepositInput(), userId);
      await repository.collect(deposit.id, tenantId, userId);
      await repository.retain(
        tenantId,
        {
          depositId: deposit.id,
          reason: 'damage',
          retainedAmount: 15000,
          description: 'Test',
        },
        userId
      );

      const retention = await repository.getRetentionDetails(deposit.id, 'other-tenant');

      expect(retention).toBeNull();
    });
  });
});
