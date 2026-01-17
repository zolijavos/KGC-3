import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RentalEquipmentService, EquipmentPermissionContext } from './rental-equipment.service';
import {
  EquipmentStatus,
  EquipmentCategory,
  EquipmentCondition,
  MaintenanceType,
} from '../interfaces/rental-equipment.interface';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  ChangeEquipmentStatusDto,
  ScanEquipmentDto,
  CreateAccessoryDto,
  AccessoryChecklistDto,
  CreateMaintenanceRecordDto,
  EquipmentFilterDto,
} from '../dto/rental-equipment.dto';

describe('RentalEquipmentService', () => {
  let service: RentalEquipmentService;
  let context: EquipmentPermissionContext;

  const validEquipmentInput: CreateEquipmentDto = {
    serialNumber: 'SN-001',
    name: 'Makita fúrógép',
    category: EquipmentCategory.POWER_TOOL,
    dailyRate: 5000,
    weeklyRate: 25000,
    monthlyRate: 80000,
    depositAmount: 50000,
    brand: 'Makita',
    model: 'HP2071',
  };

  beforeEach(() => {
    service = new RentalEquipmentService();
    context = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      locationId: 'location-1',
      canManageEquipment: true,
      canPerformMaintenance: true,
    };
  });

  // =====================================================
  // Story 13.1: Bérgép CRUD
  // =====================================================
  describe('Story 13.1: Bérgép CRUD', () => {
    describe('create()', () => {
      it('should create equipment with all required fields', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        expect(equipment.id).toBeDefined();
        expect(equipment.serialNumber).toBe('SN-001');
        expect(equipment.name).toBe('Makita fúrógép');
        expect(equipment.category).toBe(EquipmentCategory.POWER_TOOL);
        expect(equipment.dailyRate).toBe(5000);
        expect(equipment.weeklyRate).toBe(25000);
        expect(equipment.monthlyRate).toBe(80000);
        expect(equipment.depositAmount).toBe(50000);
        expect(equipment.status).toBe(EquipmentStatus.AVAILABLE);
        expect(equipment.condition).toBe(EquipmentCondition.EXCELLENT);
        expect(equipment.tenantId).toBe(context.tenantId);
        expect(equipment.locationId).toBe(context.locationId);
        expect(equipment.isActive).toBe(true);
      });

      it('should auto-generate QR code based on serial number', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        expect(equipment.qrCode).toBeDefined();
        expect(equipment.qrCode).toContain('KGC-');
        expect(equipment.qrCode).toContain('SN-001');
      });

      it('should auto-generate inventory code if not provided', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        expect(equipment.inventoryCode).toBeDefined();
        expect(equipment.inventoryCode).toMatch(/^POW-\d{5}$/);
      });

      it('should use provided inventory code if given', async () => {
        const input = { ...validEquipmentInput, inventoryCode: 'CUSTOM-001' };
        const equipment = await service.create(input, context);

        expect(equipment.inventoryCode).toBe('CUSTOM-001');
      });

      it('should reject duplicate serial number within tenant', async () => {
        await service.create(validEquipmentInput, context);

        await expect(service.create(validEquipmentInput, context)).rejects.toThrow(ConflictException);
      });

      it('should allow same serial number for different tenants', async () => {
        await service.create(validEquipmentInput, context);

        const otherContext = { ...context, tenantId: 'tenant-2' };
        const equipment = await service.create(validEquipmentInput, otherContext);

        expect(equipment.tenantId).toBe('tenant-2');
      });

      it('should record creation in history', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const history = await service.getHistory(equipment.id, context);

        expect(history).toHaveLength(1);
        const firstEntry = history[0];
        expect(firstEntry).toBeDefined();
        expect(firstEntry?.eventType).toBe('CREATED');
      });

      it('should throw ForbiddenException when user lacks canManageEquipment permission', async () => {
        const restrictedContext = { ...context, canManageEquipment: false };
        await expect(service.create(validEquipmentInput, restrictedContext)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('update()', () => {
      it('should update equipment fields', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const updateInput: UpdateEquipmentDto = {
          name: 'Makita fúrógép PRO',
          dailyRate: 6000,
        };

        const updated = await service.update(equipment.id, updateInput, context);

        expect(updated.name).toBe('Makita fúrógép PRO');
        expect(updated.dailyRate).toBe(6000);
        expect(updated.weeklyRate).toBe(25000); // unchanged
      });

      it('should record condition change in history', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.update(equipment.id, { condition: EquipmentCondition.GOOD }, context);

        const history = await service.getHistory(equipment.id, context);
        const conditionEvent = history.find((h) => h.eventType === 'CONDITION_UPDATED');

        expect(conditionEvent).toBeDefined();
      });

      it('should throw NotFoundException for non-existent equipment', async () => {
        await expect(
          service.update('non-existent', { name: 'Test' }, context)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('findById()', () => {
      it('should find equipment by ID', async () => {
        const created = await service.create(validEquipmentInput, context);
        const found = await service.findById(created.id, context);

        expect(found.id).toBe(created.id);
        expect(found.name).toBe(created.name);
      });

      it('should enforce tenant isolation', async () => {
        const created = await service.create(validEquipmentInput, context);
        const otherContext = { ...context, tenantId: 'tenant-2' };

        await expect(service.findById(created.id, otherContext)).rejects.toThrow(NotFoundException);
      });
    });

    describe('findMany()', () => {
      beforeEach(async () => {
        // Create multiple equipment items
        await service.create(validEquipmentInput, context);
        await service.create({ ...validEquipmentInput, serialNumber: 'SN-002', name: 'Bosch szúrófűrész', brand: 'Bosch', category: EquipmentCategory.POWER_TOOL }, context);
        await service.create({ ...validEquipmentInput, serialNumber: 'SN-003', name: 'Stihl fűkasza', brand: 'Stihl', category: EquipmentCategory.GARDEN }, context);
      });

      it('should list all equipment for tenant', async () => {
        const result = await service.findMany({}, context);

        expect(result.equipment).toHaveLength(3);
        expect(result.total).toBe(3);
      });

      it('should filter by category', async () => {
        const result = await service.findMany({ category: EquipmentCategory.GARDEN }, context);

        expect(result.equipment).toHaveLength(1);
        const firstEquipment = result.equipment[0];
        expect(firstEquipment).toBeDefined();
        expect(firstEquipment?.category).toBe(EquipmentCategory.GARDEN);
      });

      it('should filter by brand', async () => {
        const result = await service.findMany({ brand: 'Makita' }, context);

        expect(result.equipment).toHaveLength(1);
        const firstEquipment = result.equipment[0];
        expect(firstEquipment).toBeDefined();
        expect(firstEquipment?.brand).toBe('Makita');
      });

      it('should support text search', async () => {
        const result = await service.findMany({ search: 'fűkasza' }, context);

        expect(result.equipment).toHaveLength(1);
        const firstEquipment = result.equipment[0];
        expect(firstEquipment).toBeDefined();
        expect(firstEquipment?.name).toContain('fűkasza');
      });

      it('should paginate results', async () => {
        const result = await service.findMany({ page: 1, pageSize: 2 }, context);

        expect(result.equipment).toHaveLength(2);
        expect(result.hasMore).toBe(true);
      });

      it('should enforce tenant isolation', async () => {
        const otherContext = { ...context, tenantId: 'tenant-2' };
        const result = await service.findMany({}, otherContext);

        expect(result.equipment).toHaveLength(0);
      });
    });

    describe('delete()', () => {
      it('should soft delete equipment', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.delete(equipment.id, context);

        const result = await service.findMany({}, context);
        expect(result.equipment).toHaveLength(0);
      });

      it('should not delete rented equipment', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED },
          context
        );

        await expect(service.delete(equipment.id, context)).rejects.toThrow(ConflictException);
      });
    });
  });

  // =====================================================
  // Story 13.2: Bérgép Státusz Lifecycle
  // =====================================================
  describe('Story 13.2: Bérgép Státusz Lifecycle', () => {
    describe('changeStatus()', () => {
      it('should change status from AVAILABLE to RENTED', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const updated = await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED, reason: 'Rental started' },
          context
        );

        expect(updated.status).toBe(EquipmentStatus.RENTED);
      });

      it('should change status from RENTED to AVAILABLE', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED },
          context
        );
        const updated = await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.AVAILABLE },
          context
        );

        expect(updated.status).toBe(EquipmentStatus.AVAILABLE);
      });

      it('should change status from AVAILABLE to IN_SERVICE', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const updated = await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.IN_SERVICE },
          context
        );

        expect(updated.status).toBe(EquipmentStatus.IN_SERVICE);
      });

      it('should record status change in history with appropriate event type', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const rentalId = 'a1b2c3d4-e5f6-47a8-89b0-c1d2e3f4a5b6';
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED, relatedId: rentalId },
          context
        );

        const history = await service.getHistory(equipment.id, context);
        const rentEvent = history.find((h) => h.eventType === 'RENTED_OUT');

        expect(rentEvent).toBeDefined();
        if (rentEvent) {
          expect(rentEvent.rentalId).toBe(rentalId);
        }
      });

      it('should reject invalid status transitions', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RESERVED },
          context
        );

        // Cannot go from RESERVED directly to IN_SERVICE
        await expect(
          service.changeStatus(
            { equipmentId: equipment.id, newStatus: EquipmentStatus.IN_SERVICE },
            context
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow valid status transition chain', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        // AVAILABLE -> RENTED
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED },
          context
        );

        // RENTED -> MAINTENANCE_REQUIRED
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.MAINTENANCE_REQUIRED },
          context
        );

        // MAINTENANCE_REQUIRED -> IN_SERVICE
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.IN_SERVICE },
          context
        );

        // IN_SERVICE -> AVAILABLE
        const final = await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.AVAILABLE },
          context
        );

        expect(final.status).toBe(EquipmentStatus.AVAILABLE);
      });

      it('should allow transition from RESERVED to DECOMMISSIONED', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        // AVAILABLE -> RESERVED
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RESERVED },
          context
        );

        // RESERVED -> DECOMMISSIONED (for damaged reserved equipment)
        const updated = await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.DECOMMISSIONED, reason: 'Damaged during reservation' },
          context
        );

        expect(updated.status).toBe(EquipmentStatus.DECOMMISSIONED);
      });
    });
  });

  // =====================================================
  // Story 13.3: Serial Number és QR Kód
  // =====================================================
  describe('Story 13.3: Serial Number és QR Kód', () => {
    describe('scan()', () => {
      it('should find equipment by QR code', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.qrCode, codeType: 'QR' },
          context
        );

        expect(result.equipment.id).toBe(equipment.id);
      });

      it('should find equipment by serial number', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.serialNumber, codeType: 'SERIAL' },
          context
        );

        expect(result.equipment.id).toBe(equipment.id);
      });

      it('should find equipment by inventory code', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.inventoryCode, codeType: 'INVENTORY' },
          context
        );

        expect(result.equipment.id).toBe(equipment.id);
      });

      it('should return accessories with scan result', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        const result = await service.scan(
          { code: equipment.qrCode, codeType: 'QR' },
          context
        );

        expect(result.accessories).toHaveLength(1);
        const firstAccessory = result.accessories[0];
        expect(firstAccessory).toBeDefined();
        expect(firstAccessory?.name).toBe('Töltő');
      });

      it('should return recent history with scan result', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.qrCode, codeType: 'QR' },
          context
        );

        expect(result.recentHistory.length).toBeGreaterThan(0);
      });

      it('should return maintenance status with scan result', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.qrCode, codeType: 'QR' },
          context
        );

        expect(result.maintenanceStatus).toBeDefined();
        expect(result.maintenanceStatus.isDue).toBe(false);
      });

      it('should throw NotFoundException for unknown code', async () => {
        await expect(
          service.scan({ code: 'UNKNOWN-CODE', codeType: 'QR' }, context)
        ).rejects.toThrow(NotFoundException);
      });

      it('should be case-insensitive', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const result = await service.scan(
          { code: equipment.qrCode.toLowerCase(), codeType: 'QR' },
          context
        );

        expect(result.equipment.id).toBe(equipment.id);
      });
    });
  });

  // =====================================================
  // Story 13.4: Tartozék Kezelés
  // =====================================================
  describe('Story 13.4: Tartozék Kezelés', () => {
    describe('addAccessory()', () => {
      it('should add accessory to equipment', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          {
            equipmentId: equipment.id,
            name: 'Akkumulátor',
            quantity: 2,
            isMandatory: true,
            replacementCost: 15000,
            condition: EquipmentCondition.GOOD,
          },
          context
        );

        expect(accessory.id).toBeDefined();
        expect(accessory.name).toBe('Akkumulátor');
        expect(accessory.quantity).toBe(2);
        expect(accessory.isMandatory).toBe(true);
        expect(accessory.replacementCost).toBe(15000);
      });

      it('should record accessory addition in history', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        const history = await service.getHistory(equipment.id, context);
        const addEvent = history.find((h) => h.eventType === 'ACCESSORY_ADDED');

        expect(addEvent).toBeDefined();
      });
    });

    describe('updateAccessory()', () => {
      it('should update accessory fields', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Akkumulátor', quantity: 1, isMandatory: true, replacementCost: 15000, condition: EquipmentCondition.GOOD },
          context
        );

        const updated = await service.updateAccessory(
          accessory.id,
          { quantity: 2, condition: EquipmentCondition.FAIR },
          context
        );

        expect(updated.quantity).toBe(2);
        expect(updated.condition).toBe(EquipmentCondition.FAIR);
      });
    });

    describe('removeAccessory()', () => {
      it('should remove accessory', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        await service.removeAccessory(accessory.id, context);
        const accessories = await service.getAccessories(equipment.id, context);

        expect(accessories).toHaveLength(0);
      });

      it('should record accessory removal in history', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        await service.removeAccessory(accessory.id, context);
        const history = await service.getHistory(equipment.id, context);
        const removeEvent = history.find((h) => h.eventType === 'ACCESSORY_REMOVED');

        expect(removeEvent).toBeDefined();
      });
    });

    describe('getAccessories()', () => {
      it('should list all accessories for equipment', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.addAccessory(
          { equipmentId: equipment.id, name: 'Akkumulátor', quantity: 2, isMandatory: true, replacementCost: 15000, condition: EquipmentCondition.GOOD },
          context
        );
        await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        const accessories = await service.getAccessories(equipment.id, context);

        expect(accessories).toHaveLength(2);
      });
    });

    describe('verifyAccessoryChecklist()', () => {
      it('should verify accessory checklist - all present', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: true, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        const result = await service.verifyAccessoryChecklist(
          {
            equipmentId: equipment.id,
            items: [{ accessoryId: accessory.id, isPresent: true, condition: EquipmentCondition.GOOD }],
          },
          context
        );

        expect(result.allPresent).toBe(true);
        expect(result.missingMandatory).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should detect missing mandatory accessory', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Akkumulátor', quantity: 1, isMandatory: true, replacementCost: 15000, condition: EquipmentCondition.GOOD },
          context
        );

        const result = await service.verifyAccessoryChecklist(
          {
            equipmentId: equipment.id,
            items: [{ accessoryId: accessory.id, isPresent: false, condition: EquipmentCondition.GOOD }],
          },
          context
        );

        expect(result.allPresent).toBe(false);
        expect(result.missingMandatory).toHaveLength(1);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it('should warn on poor condition accessory', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const accessory = await service.addAccessory(
          { equipmentId: equipment.id, name: 'Töltő', quantity: 1, isMandatory: false, replacementCost: 5000, condition: EquipmentCondition.GOOD },
          context
        );

        const result = await service.verifyAccessoryChecklist(
          {
            equipmentId: equipment.id,
            items: [{ accessoryId: accessory.id, isPresent: true, condition: EquipmentCondition.POOR }],
          },
          context
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some((w) => w.includes('needs attention'))).toBe(true);
      });
    });
  });

  // =====================================================
  // Story 13.5: Bérgép Előzmények és Karbantartás
  // =====================================================
  describe('Story 13.5: Bérgép Előzmények és Karbantartás', () => {
    describe('getHistory()', () => {
      it('should return equipment history in reverse chronological order', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.RENTED },
          context
        );
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.AVAILABLE },
          context
        );

        const history = await service.getHistory(equipment.id, context);

        expect(history.length).toBeGreaterThanOrEqual(3);
        // Most recent first - safe access with proper undefined checks
        const firstEntry = history[0];
        const secondEntry = history[1];
        expect(firstEntry).toBeDefined();
        expect(secondEntry).toBeDefined();
        if (firstEntry && secondEntry) {
          expect(firstEntry.performedAt.getTime()).toBeGreaterThanOrEqual(
            secondEntry.performedAt.getTime()
          );
        }
      });
    });

    describe('addMaintenanceRecord()', () => {
      it('should add maintenance record', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const record = await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Rutin karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
          },
          context
        );

        expect(record.id).toBeDefined();
        expect(record.maintenanceType).toBe(MaintenanceType.ROUTINE);
        expect(record.description).toBe('Rutin karbantartás');
        expect(record.cost).toBe(5000);
      });

      it('should update equipment last maintenance date', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
          },
          context
        );

        const updated = await service.findById(equipment.id, context);
        expect(updated.lastMaintenanceDate).toBeDefined();
      });

      it('should calculate next maintenance date based on interval', async () => {
        const equipment = await service.create(
          { ...validEquipmentInput, maintenanceIntervalDays: 30 },
          context
        );
        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
          },
          context
        );

        const updated = await service.findById(equipment.id, context);
        expect(updated.nextMaintenanceDate).toBeDefined();
      });

      it('should use explicit next due date if provided', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 60);

        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
            nextDueDate,
          },
          context
        );

        const updated = await service.findById(equipment.id, context);
        expect(updated.nextMaintenanceDate?.getTime()).toBe(nextDueDate.getTime());
      });

      it('should change status from MAINTENANCE_REQUIRED to AVAILABLE after maintenance', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.changeStatus(
          { equipmentId: equipment.id, newStatus: EquipmentStatus.MAINTENANCE_REQUIRED },
          context
        );

        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.REPAIR,
            description: 'Javítás',
            cost: 10000,
            performedBy: 'Tech-1',
          },
          context
        );

        const updated = await service.findById(equipment.id, context);
        expect(updated.status).toBe(EquipmentStatus.AVAILABLE);
      });
    });

    describe('getMaintenanceRecords()', () => {
      it('should list maintenance records for equipment', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Első karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
          },
          context
        );
        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.REPAIR,
            description: 'Javítás',
            cost: 10000,
            performedBy: 'Tech-2',
          },
          context
        );

        const records = await service.getMaintenanceRecords(equipment.id, context);

        expect(records).toHaveLength(2);
      });
    });

    describe('getMaintenanceAlerts()', () => {
      it('should return overdue maintenance alerts', async () => {
        const equipment = await service.create(
          { ...validEquipmentInput, maintenanceIntervalDays: 1 },
          context
        );

        // Add maintenance with past due date
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
            nextDueDate: pastDate,
          },
          context
        );

        const alerts = await service.getMaintenanceAlerts(context);

        expect(alerts.length).toBeGreaterThan(0);
        const firstAlert = alerts[0];
        expect(firstAlert).toBeDefined();
        expect(firstAlert?.alertType).toBe('OVERDUE');
      });

      it('should return due soon alerts', async () => {
        const equipment = await service.create(validEquipmentInput, context);

        // Add maintenance with near future due date
        const soonDate = new Date();
        soonDate.setDate(soonDate.getDate() + 3);

        await service.addMaintenanceRecord(
          {
            equipmentId: equipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
            nextDueDate: soonDate,
          },
          context
        );

        const alerts = await service.getMaintenanceAlerts(context);

        expect(alerts.length).toBeGreaterThan(0);
        const firstAlert = alerts[0];
        expect(firstAlert).toBeDefined();
        expect(firstAlert?.alertType).toBe('DUE_SOON');
      });

      it('should sort alerts by urgency (overdue first)', async () => {
        // Create equipment with overdue maintenance
        const overdueEquipment = await service.create(
          { ...validEquipmentInput, serialNumber: 'OVERDUE-1' },
          context
        );
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);
        await service.addMaintenanceRecord(
          {
            equipmentId: overdueEquipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
            nextDueDate: pastDate,
          },
          context
        );

        // Create equipment with due soon maintenance
        const dueSoonEquipment = await service.create(
          { ...validEquipmentInput, serialNumber: 'SOON-1' },
          context
        );
        const soonDate = new Date();
        soonDate.setDate(soonDate.getDate() + 3);
        await service.addMaintenanceRecord(
          {
            equipmentId: dueSoonEquipment.id,
            maintenanceType: MaintenanceType.ROUTINE,
            description: 'Karbantartás',
            cost: 5000,
            performedBy: 'Tech-1',
            nextDueDate: soonDate,
          },
          context
        );

        const alerts = await service.getMaintenanceAlerts(context);

        const firstAlert = alerts[0];
        expect(firstAlert).toBeDefined();
        expect(firstAlert?.alertType).toBe('OVERDUE');
      });

      it('should throw ForbiddenException when adding maintenance without canPerformMaintenance', async () => {
        const equipment = await service.create(validEquipmentInput, context);
        const restrictedContext = { ...context, canPerformMaintenance: false };

        await expect(
          service.addMaintenanceRecord(
            {
              equipmentId: equipment.id,
              maintenanceType: MaintenanceType.ROUTINE,
              description: 'Karbantartás',
              cost: 5000,
              performedBy: 'Tech-1',
            },
            restrictedContext
          )
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getStatistics()', () => {
      beforeEach(async () => {
        await service.create(validEquipmentInput, context);
        const equipment2 = await service.create(
          { ...validEquipmentInput, serialNumber: 'SN-002', category: EquipmentCategory.GARDEN },
          context
        );
        await service.changeStatus(
          { equipmentId: equipment2.id, newStatus: EquipmentStatus.RENTED },
          context
        );
        await service.create(
          { ...validEquipmentInput, serialNumber: 'SN-003', category: EquipmentCategory.CONSTRUCTION },
          context
        );
      });

      it('should return total equipment count', async () => {
        const stats = await service.getStatistics(context);
        expect(stats.totalEquipment).toBe(3);
      });

      it('should count equipment by status', async () => {
        const stats = await service.getStatistics(context);
        expect(stats.byStatus[EquipmentStatus.AVAILABLE]).toBe(2);
        expect(stats.byStatus[EquipmentStatus.RENTED]).toBe(1);
      });

      it('should count equipment by category', async () => {
        const stats = await service.getStatistics(context);
        expect(stats.byCategory[EquipmentCategory.POWER_TOOL]).toBe(1);
        expect(stats.byCategory[EquipmentCategory.GARDEN]).toBe(1);
        expect(stats.byCategory[EquipmentCategory.CONSTRUCTION]).toBe(1);
      });

      it('should calculate average utilization', async () => {
        const stats = await service.getStatistics(context);
        // 1 rented out of 3 = 33.33%
        expect(stats.averageUtilization).toBeCloseTo(33.33, 1);
      });

      it('should enforce tenant isolation', async () => {
        const otherContext = { ...context, tenantId: 'tenant-2' };
        const stats = await service.getStatistics(otherContext);

        expect(stats.totalEquipment).toBe(0);
      });
    });
  });

  // =====================================================
  // Utility Tests
  // =====================================================
  describe('Utility Methods', () => {
    describe('clearAll()', () => {
      it('should clear all data', async () => {
        await service.create(validEquipmentInput, context);
        service.clearAll();

        const result = await service.findMany({}, context);
        expect(result.equipment).toHaveLength(0);
      });
    });
  });
});
