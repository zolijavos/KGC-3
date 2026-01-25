/**
 * @kgc/rental-core - Rental Repository Unit Tests
 * Epic 14: Bérlés kiadás, visszavétel
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { PricingTier, RentalPricing } from '../interfaces/rental.interface';
import type { CreateRentalInput } from '../repositories/rental.repository';
import { InMemoryRentalRepository } from '../repositories/rental.repository';

describe('InMemoryRentalRepository', () => {
  let repository: InMemoryRentalRepository;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';
  const locationId = 'test-location-id';

  const createPricing = (overrides: Partial<RentalPricing> = {}): RentalPricing => ({
    tier: 'DAILY' as PricingTier,
    dailyRate: 5000,
    weeklyRate: 25000,
    monthlyRate: 80000,
    durationDays: 3,
    grossAmount: 15000,
    discountAmount: 0,
    netAmount: 15000,
    vatRate: 0.27,
    vatAmount: 4050,
    totalAmount: 19050,
    lateFeeAmount: 0,
    grandTotal: 19050,
    ...overrides,
  });

  const createRentalInput = (overrides: Partial<CreateRentalInput> = {}): CreateRentalInput => ({
    rentalNumber: 'BER000001',
    customerId: 'customer-1',
    customerName: 'Teszt Ügyfél',
    equipmentId: 'equipment-1',
    equipmentName: 'Teszt Bérgép',
    locationId,
    startDate: new Date('2024-01-15'),
    expectedReturnDate: new Date('2024-01-18'),
    pricing: createPricing(),
    depositAmount: 30000,
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryRentalRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create a rental successfully', async () => {
      const input = createRentalInput();
      const rental = await repository.create(tenantId, input, userId);

      expect(rental).toBeDefined();
      expect(rental.id).toBeDefined();
      expect(rental.rentalNumber).toBe('BER000001');
      expect(rental.customerName).toBe('Teszt Ügyfél');
      expect(rental.equipmentName).toBe('Teszt Bérgép');
      expect(rental.status).toBe('DRAFT');
      expect(rental.tenantId).toBe(tenantId);
      expect(rental.createdBy).toBe(userId);
      expect(rental.depositAmount).toBe(30000);
      expect(rental.depositStatus).toBe('PENDING');
    });

    it('should throw error when rental number already exists', async () => {
      const input = createRentalInput({ rentalNumber: 'DUP-001' });
      await repository.create(tenantId, input, userId);

      await expect(
        repository.create(tenantId, { ...input, equipmentId: 'equipment-2' }, userId)
      ).rejects.toThrow('A bérlési szám már létezik: DUP-001');
    });

    it('should throw error when equipment already has active rental', async () => {
      const input = createRentalInput();
      await repository.create(tenantId, input, userId);

      await expect(
        repository.create(tenantId, { ...input, rentalNumber: 'BER000002' }, userId)
      ).rejects.toThrow('A bérgép már ki van bérelve: Teszt Bérgép');
    });

    it('should throw error when deposit amount is negative', async () => {
      const input = createRentalInput({ depositAmount: -5000 });

      await expect(repository.create(tenantId, input, userId)).rejects.toThrow(
        'A kaució összege nem lehet negatív'
      );
    });

    it('should allow zero deposit amount', async () => {
      const input = createRentalInput({ depositAmount: 0 });
      const rental = await repository.create(tenantId, input, userId);

      expect(rental.depositAmount).toBe(0);
    });

    it('should add creation history entry', async () => {
      const input = createRentalInput();
      const rental = await repository.create(tenantId, input, userId);

      const history = await repository.getHistory(rental.id, tenantId);
      expect(history).toHaveLength(1);
      expect(history[0]?.eventType).toBe('CREATED');
      expect(history[0]?.newStatus).toBe('DRAFT');
    });
  });

  describe('findById', () => {
    it('should find rental by ID', async () => {
      const created = await repository.create(tenantId, createRentalInput(), userId);
      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.rentalNumber).toBe('BER000001');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find rental from different tenant', async () => {
      const created = await repository.create(tenantId, createRentalInput(), userId);
      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('findByNumber', () => {
    it('should find rental by rental number', async () => {
      await repository.create(tenantId, createRentalInput({ rentalNumber: 'FIND-001' }), userId);
      const found = await repository.findByNumber('FIND-001', tenantId);

      expect(found).toBeDefined();
      expect(found?.rentalNumber).toBe('FIND-001');
    });

    it('should return null for non-existent number', async () => {
      const found = await repository.findByNumber('NON-EXISTENT', tenantId);
      expect(found).toBeNull();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create multiple rentals
      await repository.create(
        tenantId,
        createRentalInput({
          rentalNumber: 'BER-001',
          customerId: 'customer-1',
          equipmentId: 'eq-1',
        }),
        userId
      );

      const rental2 = await repository.create(
        tenantId,
        createRentalInput({
          rentalNumber: 'BER-002',
          customerId: 'customer-2',
          equipmentId: 'eq-2',
        }),
        userId
      );
      await repository.update(rental2.id, tenantId, { status: 'ACTIVE' }, userId);

      await repository.create(
        tenantId,
        createRentalInput({
          rentalNumber: 'BER-003',
          customerId: 'customer-1',
          equipmentId: 'eq-3',
        }),
        userId
      );
    });

    it('should return all rentals for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.rentals).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await repository.query({ tenantId, status: 'ACTIVE' });

      expect(result.total).toBe(1);
      expect(result.rentals[0]?.rentalNumber).toBe('BER-002');
    });

    it('should filter by customer', async () => {
      const result = await repository.query({ tenantId, customerId: 'customer-1' });

      expect(result.total).toBe(2);
    });

    it('should search by customer name', async () => {
      const result = await repository.query({ tenantId, search: 'Teszt' });

      expect(result.total).toBe(3);
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.rentals).toHaveLength(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('update', () => {
    it('should update rental', async () => {
      const created = await repository.create(tenantId, createRentalInput(), userId);
      const updated = await repository.update(created.id, tenantId, { status: 'ACTIVE' }, userId);

      expect(updated.status).toBe('ACTIVE');
    });

    it('should throw error for non-existent rental', async () => {
      await expect(
        repository.update('non-existent', tenantId, { status: 'ACTIVE' }, userId)
      ).rejects.toThrow('Bérlés nem található');
    });

    it('should add history entry on status change', async () => {
      const created = await repository.create(tenantId, createRentalInput(), userId);
      await repository.update(created.id, tenantId, { status: 'ACTIVE' }, userId);

      const history = await repository.getHistory(created.id, tenantId);
      // First entry is CREATED, second is STATUS_CHANGED
      expect(history.length).toBeGreaterThanOrEqual(2);
      const statusChange = history.find(h => h.eventType === 'STATUS_CHANGED');
      expect(statusChange).toBeDefined();
      expect(statusChange?.previousStatus).toBe('DRAFT');
      expect(statusChange?.newStatus).toBe('ACTIVE');
    });
  });

  describe('getActiveRentalsForCustomer', () => {
    it('should return active rentals for customer', async () => {
      const rental = await repository.create(
        tenantId,
        createRentalInput({ customerId: 'customer-active' }),
        userId
      );
      await repository.update(rental.id, tenantId, { status: 'ACTIVE' }, userId);

      const active = await repository.getActiveRentalsForCustomer('customer-active', tenantId);

      expect(active).toHaveLength(1);
      expect(active[0]?.customerId).toBe('customer-active');
    });
  });

  describe('getOverdueRentals', () => {
    it('should return overdue rentals', async () => {
      const rental = await repository.create(
        tenantId,
        createRentalInput({
          rentalNumber: 'OVERDUE-001',
          expectedReturnDate: new Date('2024-01-01'), // Past date
        }),
        userId
      );
      await repository.update(rental.id, tenantId, { status: 'ACTIVE' }, userId);

      const overdue = await repository.getOverdueRentals(tenantId);

      expect(overdue).toHaveLength(1);
      expect(overdue[0]?.rentalNumber).toBe('OVERDUE-001');
    });
  });

  describe('addExtension', () => {
    it('should add extension to rental', async () => {
      const rental = await repository.create(tenantId, createRentalInput(), userId);
      const originalReturnDate = rental.expectedReturnDate;
      const newReturnDate = new Date('2024-01-25');

      const extension = await repository.addExtension(rental.id, tenantId, {
        previousReturnDate: originalReturnDate,
        newReturnDate,
        additionalDays: 7,
        additionalAmount: 35000,
        selfService: false,
        paymentStatus: 'PENDING',
      });

      expect(extension.additionalDays).toBe(7);
      expect(extension.additionalAmount).toBe(35000);

      const updatedRental = await repository.findById(rental.id, tenantId);
      expect(updatedRental?.expectedReturnDate).toEqual(newReturnDate);
      expect(updatedRental?.extensionCount).toBe(1);
    });

    it('should add history entry for extension', async () => {
      const rental = await repository.create(tenantId, createRentalInput(), userId);

      await repository.addExtension(rental.id, tenantId, {
        previousReturnDate: rental.expectedReturnDate,
        newReturnDate: new Date('2024-01-25'),
        additionalDays: 7,
        additionalAmount: 35000,
        selfService: false,
        paymentStatus: 'PENDING',
      });

      const history = await repository.getHistory(rental.id, tenantId);
      const extensionEntry = history.find(h => h.eventType === 'EXTENDED');
      expect(extensionEntry).toBeDefined();
      expect(extensionEntry?.description).toContain('7 nappal');
    });
  });

  describe('getExtensions', () => {
    it('should return extensions for rental', async () => {
      const rental = await repository.create(tenantId, createRentalInput(), userId);

      await repository.addExtension(rental.id, tenantId, {
        previousReturnDate: rental.expectedReturnDate,
        newReturnDate: new Date('2024-01-25'),
        additionalDays: 7,
        additionalAmount: 35000,
        selfService: false,
        paymentStatus: 'PENDING',
      });

      const extensions = await repository.getExtensions(rental.id, tenantId);

      expect(extensions).toHaveLength(1);
      expect(extensions[0]?.additionalDays).toBe(7);
    });

    it('should throw error if rental not found', async () => {
      await expect(repository.getExtensions('non-existent-id', tenantId)).rejects.toThrow(
        'Bérlés nem található'
      );
    });

    it('should throw error if rental belongs to different tenant', async () => {
      const rental = await repository.create(tenantId, createRentalInput(), userId);

      await expect(repository.getExtensions(rental.id, 'other-tenant')).rejects.toThrow(
        'Bérlés nem található'
      );
    });
  });

  describe('getHistory', () => {
    it('should throw error if rental not found', async () => {
      await expect(repository.getHistory('non-existent-id', tenantId)).rejects.toThrow(
        'Bérlés nem található'
      );
    });

    it('should throw error if rental belongs to different tenant', async () => {
      const rental = await repository.create(tenantId, createRentalInput(), userId);

      await expect(repository.getHistory(rental.id, 'other-tenant')).rejects.toThrow(
        'Bérlés nem található'
      );
    });
  });

  describe('addHistoryEntry', () => {
    it('should throw error if rental does not exist', async () => {
      await expect(
        repository.addHistoryEntry({
          rentalId: 'non-existent-rental',
          eventType: 'CREATED',
          performedBy: userId,
          description: 'Test entry',
        })
      ).rejects.toThrow('Bérlés nem található a history bejegyzéshez');
    });
  });

  describe('generateNextNumber', () => {
    it('should generate sequential rental numbers', async () => {
      const num1 = await repository.generateNextNumber(tenantId);
      const num2 = await repository.generateNextNumber(tenantId);
      const num3 = await repository.generateNextNumber(tenantId, 'RENT');

      expect(num1).toBe('BER000001');
      expect(num2).toBe('BER000002');
      // Different prefix has separate sequence
      expect(num3).toBe('RENT000001');
    });
  });

  describe('countByStatus', () => {
    it('should count rentals by status', async () => {
      await repository.create(
        tenantId,
        createRentalInput({ rentalNumber: 'A-001', equipmentId: 'e1' }),
        userId
      );
      await repository.create(
        tenantId,
        createRentalInput({ rentalNumber: 'A-002', equipmentId: 'e2' }),
        userId
      );

      const rental3 = await repository.create(
        tenantId,
        createRentalInput({ rentalNumber: 'A-003', equipmentId: 'e3' }),
        userId
      );
      await repository.update(rental3.id, tenantId, { status: 'ACTIVE' }, userId);

      const counts = await repository.countByStatus(tenantId);

      expect(counts.DRAFT).toBe(2);
      expect(counts.ACTIVE).toBe(1);
      expect(counts.RETURNED).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return rental statistics', async () => {
      const rental1 = await repository.create(
        tenantId,
        createRentalInput({ rentalNumber: 'STAT-001', equipmentId: 'eq-stat-1' }),
        userId
      );
      await repository.update(rental1.id, tenantId, { status: 'ACTIVE' }, userId);

      const rental2 = await repository.create(
        tenantId,
        createRentalInput({ rentalNumber: 'STAT-002', equipmentId: 'eq-stat-2' }),
        userId
      );
      await repository.update(
        rental2.id,
        tenantId,
        {
          status: 'RETURNED',
          actualReturnDate: new Date(),
        },
        userId
      );

      const stats = await repository.getStatistics(tenantId);

      expect(stats.totalRentals).toBe(2);
      expect(stats.activeRentals).toBe(1);
      expect(stats.byStatus.ACTIVE).toBe(1);
      expect(stats.byStatus.RETURNED).toBe(1);
    });
  });
});
