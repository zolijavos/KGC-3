/**
 * @kgc/bergep - Equipment Repository Unit Tests
 * Epic 13: Bérgép törzs, státusz lifecycle
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateEquipmentInput } from '../interfaces/rental-equipment.interface';
import {
  EquipmentCategory,
  EquipmentCondition,
  EquipmentStatus,
  MaintenanceType,
} from '../interfaces/rental-equipment.interface';
import { InMemoryEquipmentRepository } from '../repositories/equipment.repository';

describe('InMemoryEquipmentRepository', () => {
  let repository: InMemoryEquipmentRepository;
  const tenantId = 'test-tenant-id';
  const locationId = 'test-location-id';
  const userId = 'test-user-id';

  const createEquipmentInput = (
    overrides: Partial<CreateEquipmentInput> = {}
  ): CreateEquipmentInput => ({
    serialNumber: 'SN001',
    name: 'Teszt Bérgép',
    category: EquipmentCategory.POWER_TOOL,
    brand: 'Makita',
    model: 'HR2470',
    dailyRate: 5000,
    weeklyRate: 25000,
    monthlyRate: 80000,
    depositAmount: 30000,
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryEquipmentRepository();
    repository.clear();
  });

  describe('create', () => {
    it('should create equipment successfully', async () => {
      const input = createEquipmentInput();
      const equipment = await repository.create(tenantId, locationId, input, userId);

      expect(equipment).toBeDefined();
      expect(equipment.id).toBeDefined();
      expect(equipment.serialNumber).toBe('SN001');
      expect(equipment.name).toBe('Teszt Bérgép');
      expect(equipment.category).toBe(EquipmentCategory.POWER_TOOL);
      expect(equipment.status).toBe(EquipmentStatus.AVAILABLE);
      expect(equipment.condition).toBe(EquipmentCondition.GOOD);
      expect(equipment.tenantId).toBe(tenantId);
      expect(equipment.locationId).toBe(locationId);
      expect(equipment.qrCode).toBeDefined();
      expect(equipment.inventoryCode).toBeDefined();
      expect(equipment.totalRentals).toBe(0);
      expect(equipment.totalRevenue).toBe(0);
      expect(equipment.isActive).toBe(true);
    });

    it('should throw error when serial number already exists', async () => {
      const input = createEquipmentInput({ serialNumber: 'DUP-SN' });
      await repository.create(tenantId, locationId, input, userId);

      await expect(
        repository.create(tenantId, locationId, { ...input, name: 'Another' }, userId)
      ).rejects.toThrow('A sorozatszám már létezik: DUP-SN');
    });

    it('should throw error when daily rate is negative', async () => {
      const input = createEquipmentInput({ dailyRate: -100 });

      await expect(repository.create(tenantId, locationId, input, userId)).rejects.toThrow(
        'A bérlési díjak nem lehetnek negatívak'
      );
    });

    it('should throw error when deposit amount is negative', async () => {
      const input = createEquipmentInput({ depositAmount: -5000 });

      await expect(repository.create(tenantId, locationId, input, userId)).rejects.toThrow(
        'A kaució összege nem lehet negatív'
      );
    });

    it('should add creation history entry', async () => {
      const input = createEquipmentInput();
      const equipment = await repository.create(tenantId, locationId, input, userId);

      const history = await repository.getHistory(equipment.id, tenantId);
      expect(history).toHaveLength(1);
      expect(history[0]?.eventType).toBe('CREATED');
      expect(history[0]?.newStatus).toBe(EquipmentStatus.AVAILABLE);
    });

    it('should generate unique inventory codes', async () => {
      const eq1 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'SN001' }),
        userId
      );
      const eq2 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'SN002' }),
        userId
      );

      expect(eq1.inventoryCode).not.toBe(eq2.inventoryCode);
    });
  });

  describe('findById', () => {
    it('should find equipment by ID', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      const found = await repository.findById(created.id, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.serialNumber).toBe('SN001');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id', tenantId);
      expect(found).toBeNull();
    });

    it('should not find equipment from different tenant', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      const found = await repository.findById(created.id, 'other-tenant');
      expect(found).toBeNull();
    });
  });

  describe('findBySerialNumber', () => {
    it('should find equipment by serial number', async () => {
      await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'FIND-SN' }),
        userId
      );
      const found = await repository.findBySerialNumber('FIND-SN', tenantId);

      expect(found).toBeDefined();
      expect(found?.serialNumber).toBe('FIND-SN');
    });

    it('should return null for non-existent serial number', async () => {
      const found = await repository.findBySerialNumber('NON-EXISTENT', tenantId);
      expect(found).toBeNull();
    });
  });

  describe('findByQrCode', () => {
    it('should find equipment by QR code', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      const found = await repository.findByQrCode(created.qrCode, tenantId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({
          serialNumber: 'SN-001',
          name: 'Fúrógép',
          category: EquipmentCategory.POWER_TOOL,
          dailyRate: 5000,
        }),
        userId
      );

      await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({
          serialNumber: 'SN-002',
          name: 'Fűnyíró',
          category: EquipmentCategory.GARDEN,
          dailyRate: 8000,
        }),
        userId
      );

      const eq3 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({
          serialNumber: 'SN-003',
          name: 'Betonkeverő',
          category: EquipmentCategory.CONSTRUCTION,
          dailyRate: 15000,
        }),
        userId
      );
      await repository.changeStatus(
        eq3.id,
        tenantId,
        EquipmentStatus.RENTED,
        userId,
        undefined,
        'rental-1'
      );
    });

    it('should return all equipment for tenant', async () => {
      const result = await repository.query({ tenantId });

      expect(result.total).toBe(3);
      expect(result.equipment).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await repository.query({ tenantId, status: EquipmentStatus.RENTED });

      expect(result.total).toBe(1);
      expect(result.equipment[0]?.name).toBe('Betonkeverő');
    });

    it('should filter by category', async () => {
      const result = await repository.query({ tenantId, category: EquipmentCategory.GARDEN });

      expect(result.total).toBe(1);
      expect(result.equipment[0]?.name).toBe('Fűnyíró');
    });

    it('should filter by available only', async () => {
      const result = await repository.query({ tenantId, availableOnly: true });

      expect(result.total).toBe(2);
    });

    it('should filter by price range', async () => {
      const result = await repository.query({ tenantId, minDailyRate: 6000, maxDailyRate: 10000 });

      expect(result.total).toBe(1);
      expect(result.equipment[0]?.name).toBe('Fűnyíró');
    });

    it('should search by name', async () => {
      const result = await repository.query({ tenantId, search: 'Fúró' });

      expect(result.total).toBe(1);
      expect(result.equipment[0]?.name).toBe('Fúrógép');
    });

    it('should paginate results', async () => {
      const result = await repository.query({ tenantId, offset: 1, limit: 1 });

      expect(result.equipment).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('update', () => {
    it('should update equipment', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      const updated = await repository.update(
        created.id,
        tenantId,
        { name: 'Frissített Név' },
        userId
      );

      expect(updated.name).toBe('Frissített Név');
    });

    it('should throw error for non-existent equipment', async () => {
      await expect(
        repository.update('non-existent', tenantId, { name: 'Test' }, userId)
      ).rejects.toThrow('Bérgép nem található');
    });

    it('should throw error when daily rate is negative', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);

      await expect(
        repository.update(created.id, tenantId, { dailyRate: -100 }, userId)
      ).rejects.toThrow('A napi bérlési díj nem lehet negatív');
    });

    it('should log condition changes', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      await repository.update(created.id, tenantId, { condition: EquipmentCondition.FAIR }, userId);

      const history = await repository.getHistory(created.id, tenantId);
      const conditionChange = history.find(h => h.eventType === 'CONDITION_UPDATED');
      expect(conditionChange).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should soft delete equipment', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      await repository.delete(created.id, tenantId);

      // Should still be findable but inactive
      const result = await repository.query({ tenantId });
      expect(result.total).toBe(0); // Query filters out inactive
    });
  });

  describe('changeStatus', () => {
    it('should change status from AVAILABLE to RENTED', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      const updated = await repository.changeStatus(
        created.id,
        tenantId,
        EquipmentStatus.RENTED,
        userId,
        'Bérlés',
        'rental-123'
      );

      expect(updated.status).toBe(EquipmentStatus.RENTED);
      expect(updated.totalRentals).toBe(1);
    });

    it('should throw error for invalid status transition', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);

      await expect(
        repository.changeStatus(created.id, tenantId, EquipmentStatus.DECOMMISSIONED, userId)
      ).resolves.toBeDefined(); // AVAILABLE -> DECOMMISSIONED is valid

      // Try invalid transition
      const rented = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'SN-NEW' }),
        userId
      );
      await repository.changeStatus(rented.id, tenantId, EquipmentStatus.RENTED, userId);

      await expect(
        repository.changeStatus(rented.id, tenantId, EquipmentStatus.RESERVED, userId)
      ).rejects.toThrow('Érvénytelen státusz átmenet');
    });

    it('should add history entry on status change', async () => {
      const created = await repository.create(tenantId, locationId, createEquipmentInput(), userId);
      await repository.changeStatus(created.id, tenantId, EquipmentStatus.RENTED, userId);

      const history = await repository.getHistory(created.id, tenantId);
      const rentedEvent = history.find(h => h.eventType === 'RENTED_OUT');
      expect(rentedEvent).toBeDefined();
      expect(rentedEvent?.previousStatus).toBe(EquipmentStatus.AVAILABLE);
      expect(rentedEvent?.newStatus).toBe(EquipmentStatus.RENTED);
    });
  });

  describe('accessories', () => {
    it('should add accessory to equipment', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );

      const accessory = await repository.addAccessory(equipment.id, tenantId, {
        name: 'Fúrószár készlet',
        quantity: 10,
        isMandatory: true,
        replacementCost: 5000,
        condition: EquipmentCondition.GOOD,
      });

      expect(accessory.id).toBeDefined();
      expect(accessory.name).toBe('Fúrószár készlet');
      expect(accessory.quantity).toBe(10);
    });

    it('should get accessories for equipment', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      await repository.addAccessory(equipment.id, tenantId, {
        name: 'Tartozék 1',
        quantity: 1,
        isMandatory: true,
        replacementCost: 1000,
        condition: EquipmentCondition.GOOD,
      });
      await repository.addAccessory(equipment.id, tenantId, {
        name: 'Tartozék 2',
        quantity: 2,
        isMandatory: false,
        replacementCost: 2000,
        condition: EquipmentCondition.GOOD,
      });

      const accessories = await repository.getAccessories(equipment.id, tenantId);

      expect(accessories).toHaveLength(2);
    });

    it('should throw error when getting accessories for non-existent equipment', async () => {
      await expect(repository.getAccessories('non-existent', tenantId)).rejects.toThrow(
        'Bérgép nem található'
      );
    });

    it('should update accessory', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      const accessory = await repository.addAccessory(equipment.id, tenantId, {
        name: 'Eredeti név',
        quantity: 1,
        isMandatory: false,
        replacementCost: 1000,
        condition: EquipmentCondition.GOOD,
      });

      const updated = await repository.updateAccessory(accessory.id, equipment.id, tenantId, {
        name: 'Frissített név',
        quantity: 5,
      });

      expect(updated.name).toBe('Frissített név');
      expect(updated.quantity).toBe(5);
    });

    it('should remove accessory', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      const accessory = await repository.addAccessory(equipment.id, tenantId, {
        name: 'Törlendő',
        quantity: 1,
        isMandatory: false,
        replacementCost: 1000,
        condition: EquipmentCondition.GOOD,
      });

      await repository.removeAccessory(accessory.id, equipment.id, tenantId);

      const accessories = await repository.getAccessories(equipment.id, tenantId);
      expect(accessories).toHaveLength(0);
    });
  });

  describe('history', () => {
    it('should get history for equipment', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      await repository.changeStatus(equipment.id, tenantId, EquipmentStatus.RENTED, userId);
      await repository.changeStatus(equipment.id, tenantId, EquipmentStatus.AVAILABLE, userId);

      const history = await repository.getHistory(equipment.id, tenantId);

      expect(history.length).toBeGreaterThanOrEqual(3); // CREATED + 2 status changes
    });

    it('should throw error when getting history for non-existent equipment', async () => {
      await expect(repository.getHistory('non-existent', tenantId)).rejects.toThrow(
        'Bérgép nem található'
      );
    });

    it('should limit history results', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      await repository.changeStatus(equipment.id, tenantId, EquipmentStatus.RENTED, userId);
      await repository.changeStatus(equipment.id, tenantId, EquipmentStatus.AVAILABLE, userId);

      const history = await repository.getHistory(equipment.id, tenantId, 2);

      expect(history).toHaveLength(2);
    });
  });

  describe('maintenance', () => {
    it('should add maintenance record', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );

      const record = await repository.addMaintenanceRecord(equipment.id, tenantId, {
        maintenanceType: MaintenanceType.ROUTINE,
        description: 'Éves karbantartás',
        cost: 15000,
        performedBy: 'technician-1',
        performedAt: new Date(),
        nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      expect(record.id).toBeDefined();
      expect(record.maintenanceType).toBe(MaintenanceType.ROUTINE);
    });

    it('should update equipment maintenance dates after maintenance', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );
      const performedAt = new Date();
      const nextDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      await repository.addMaintenanceRecord(equipment.id, tenantId, {
        maintenanceType: MaintenanceType.ROUTINE,
        description: 'Karbantartás',
        cost: 10000,
        performedBy: 'tech-1',
        performedAt,
        nextDueDate: nextDue,
      });

      const updated = await repository.findById(equipment.id, tenantId);
      expect(updated?.lastMaintenanceDate?.getTime()).toBe(performedAt.getTime());
      expect(updated?.nextMaintenanceDate?.getTime()).toBe(nextDue.getTime());
    });

    it('should get maintenance records', async () => {
      const equipment = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput(),
        userId
      );

      await repository.addMaintenanceRecord(equipment.id, tenantId, {
        maintenanceType: MaintenanceType.ROUTINE,
        description: 'Karbantartás 1',
        cost: 10000,
        performedBy: 'tech-1',
        performedAt: new Date(),
      });

      await repository.addMaintenanceRecord(equipment.id, tenantId, {
        maintenanceType: MaintenanceType.REPAIR,
        description: 'Javítás',
        cost: 25000,
        performedBy: 'tech-1',
        performedAt: new Date(),
      });

      const records = await repository.getMaintenanceRecords({
        equipmentId: equipment.id,
        tenantId,
      });

      expect(records).toHaveLength(2);
    });

    it('should get equipment needing maintenance', async () => {
      const eq1 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'MNT-001' }),
        userId
      );

      // Set status to MAINTENANCE_REQUIRED
      await repository.changeStatus(eq1.id, tenantId, EquipmentStatus.MAINTENANCE_REQUIRED, userId);

      const needingMaintenance = await repository.getEquipmentNeedingMaintenance(tenantId);

      expect(needingMaintenance.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('statistics', () => {
    it('should return equipment statistics', async () => {
      await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'STAT-001', category: EquipmentCategory.POWER_TOOL }),
        userId
      );

      const eq2 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'STAT-002', category: EquipmentCategory.GARDEN }),
        userId
      );
      await repository.changeStatus(eq2.id, tenantId, EquipmentStatus.RENTED, userId);

      const stats = await repository.getStatistics(tenantId);

      expect(stats.totalEquipment).toBe(2);
      expect(stats.availableCount).toBe(1);
      expect(stats.rentedCount).toBe(1);
      expect(stats.byCategory[EquipmentCategory.POWER_TOOL]).toBe(1);
      expect(stats.byCategory[EquipmentCategory.GARDEN]).toBe(1);
    });
  });

  describe('getAvailableEquipment', () => {
    it('should return only available equipment', async () => {
      await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'AV-001' }),
        userId
      );

      const eq2 = await repository.create(
        tenantId,
        locationId,
        createEquipmentInput({ serialNumber: 'AV-002' }),
        userId
      );
      await repository.changeStatus(eq2.id, tenantId, EquipmentStatus.RENTED, userId);

      const available = await repository.getAvailableEquipment(tenantId);

      expect(available).toHaveLength(1);
      expect(available[0]?.serialNumber).toBe('AV-001');
    });
  });

  describe('generateNextInventoryCode', () => {
    it('should generate sequential codes', async () => {
      const code1 = await repository.generateNextInventoryCode(tenantId);
      const code2 = await repository.generateNextInventoryCode(tenantId);
      const code3 = await repository.generateNextInventoryCode(tenantId, 'BG');

      expect(code1).toBe('EQ000001');
      expect(code2).toBe('EQ000002');
      expect(code3).toBe('BG000001'); // Different prefix = separate sequence
    });
  });
});
