/**
 * BergepController Unit Tests
 * Epic 13: Bérgép Management - Rental Equipment
 *
 * TEA (Test-Each-Action) testing approach with mock services.
 */

import type {
  EquipmentCategory,
  EquipmentCondition,
  EquipmentStatus,
  MaintenanceType,
  RentalEquipmentService,
} from '@kgc/bergep';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { BergepController } from './bergep.controller';

type MockedEquipmentService = {
  [K in keyof RentalEquipmentService]: Mock;
};

describe('BergepController', () => {
  let controller: BergepController;
  let mockEquipmentService: MockedEquipmentService;

  const mockEquipment = {
    id: 'eq-1',
    tenantId: 'tenant-123',
    locationId: 'loc-1',
    serialNumber: 'SN-001',
    name: 'Makita Fúrógép',
    category: 'POWER_TOOL' as EquipmentCategory,
    status: 'AVAILABLE' as EquipmentStatus,
    condition: 'GOOD' as EquipmentCondition,
    dailyRate: 5000,
    weeklyRate: 25000,
    monthlyRate: 80000,
    depositAmount: 50000,
    accessories: [],
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccessory = {
    id: 'acc-1',
    equipmentId: 'eq-1',
    name: 'Fúrószár készlet',
    quantity: 1,
    isMandatory: true,
    replacementCost: 15000,
    condition: 'GOOD' as EquipmentCondition,
  };

  const mockMaintenanceRecord = {
    id: 'maint-1',
    equipmentId: 'eq-1',
    maintenanceType: 'ROUTINE' as MaintenanceType,
    description: 'Éves karbantartás',
    cost: 10000,
    performedBy: 'user-1',
    performedAt: new Date(),
  };

  beforeEach(() => {
    mockEquipmentService = {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      changeStatus: vi.fn(),
      scan: vi.fn(),
      getAccessories: vi.fn(),
      addAccessory: vi.fn(),
      updateAccessory: vi.fn(),
      removeAccessory: vi.fn(),
      verifyAccessoryChecklist: vi.fn(),
      getHistory: vi.fn(),
      getMaintenanceRecords: vi.fn(),
      addMaintenanceRecord: vi.fn(),
      getMaintenanceAlerts: vi.fn(),
      getStatistics: vi.fn(),
    } as unknown as MockedEquipmentService;

    controller = new BergepController(mockEquipmentService as unknown as RentalEquipmentService);
  });

  // ============================================
  // CONTEXT BUILDING
  // ============================================

  describe('buildContext (private)', () => {
    it('should throw BadRequestException when tenantId is missing', async () => {
      mockEquipmentService.findMany.mockResolvedValue({ data: [], total: 0 });

      await expect(controller.list('', 'loc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when locationId is missing', async () => {
      await expect(controller.list('tenant-123', '', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when userId is missing', async () => {
      await expect(controller.list('tenant-123', 'loc-1', '')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  describe('list', () => {
    it('should return list of equipment', async () => {
      const queryResult = {
        data: [mockEquipment],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      mockEquipmentService.findMany.mockResolvedValue(queryResult);

      const result = await controller.list('tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual(queryResult);
      expect(mockEquipmentService.findMany).toHaveBeenCalled();
    });

    it('should pass filter parameters', async () => {
      const queryResult = { data: [], total: 0, page: 1, pageSize: 10 };
      mockEquipmentService.findMany.mockResolvedValue(queryResult);

      await controller.list(
        'tenant-123',
        'loc-1',
        'user-1',
        'AVAILABLE' as EquipmentStatus,
        'POWER_TOOL' as EquipmentCategory,
        'GOOD' as EquipmentCondition,
        'Makita',
        'fúró',
        'true',
        'false',
        '2',
        '10'
      );

      expect(mockEquipmentService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'AVAILABLE',
          category: 'POWER_TOOL',
          condition: 'GOOD',
          brand: 'Makita',
          search: 'fúró',
          availableOnly: true,
          page: 2,
          pageSize: 10,
        }),
        expect.any(Object)
      );
    });
  });

  describe('getById', () => {
    it('should return equipment by ID', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);

      const result = await controller.getById('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual(mockEquipment);
      expect(mockEquipmentService.findById).toHaveBeenCalledWith('eq-1', expect.any(Object));
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockEquipmentService.findById.mockResolvedValue(null);

      await expect(
        controller.getById('invalid-id', 'tenant-123', 'loc-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new equipment', async () => {
      mockEquipmentService.create.mockResolvedValue(mockEquipment);

      const dto = {
        serialNumber: 'SN-001',
        name: 'Makita Fúrógép',
        category: 'POWER_TOOL' as EquipmentCategory,
        dailyRate: 5000,
        weeklyRate: 25000,
        monthlyRate: 80000,
        depositAmount: 50000,
      };

      const result = await controller.create('tenant-123', 'loc-1', 'user-1', dto);

      expect(result).toEqual(mockEquipment);
      expect(mockEquipmentService.create).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      mockEquipmentService.create.mockResolvedValue(mockEquipment);

      const dto = {
        serialNumber: 'SN-001',
        name: 'Makita Fúrógép',
        category: 'POWER_TOOL' as EquipmentCategory,
        dailyRate: 5000,
        weeklyRate: 25000,
        monthlyRate: 80000,
        depositAmount: 50000,
        productId: 'prod-1',
        inventoryCode: 'INV-001',
        description: 'Kiváló fúrógép',
        brand: 'Makita',
        model: 'DF001G',
        purchaseDate: '2025-01-01',
        purchasePrice: 150000,
        warrantyExpiry: '2028-01-01',
        maintenanceIntervalDays: 90,
        notes: 'Figyelni a szénkefékre',
      };

      await controller.create('tenant-123', 'loc-1', 'user-1', dto);

      expect(mockEquipmentService.create).toHaveBeenCalled();
      const callArg = mockEquipmentService.create.mock.calls[0]?.[0];
      expect(callArg.productId).toBe('prod-1');
      expect(callArg.brand).toBe('Makita');
      expect(callArg.purchaseDate).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update equipment', async () => {
      const updated = { ...mockEquipment, name: 'Updated Name' };
      mockEquipmentService.update.mockResolvedValue(updated);

      const result = await controller.update('eq-1', 'tenant-123', 'loc-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(result).toEqual(updated);
      expect(mockEquipmentService.update).toHaveBeenCalledWith(
        'eq-1',
        expect.objectContaining({ name: 'Updated Name' }),
        expect.any(Object)
      );
    });
  });

  describe('delete', () => {
    it('should soft delete equipment', async () => {
      mockEquipmentService.delete.mockResolvedValue(undefined);

      await controller.delete('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(mockEquipmentService.delete).toHaveBeenCalledWith('eq-1', expect.any(Object));
    });
  });

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  describe('changeStatus', () => {
    it('should change equipment status', async () => {
      const rented = { ...mockEquipment, status: 'RENTED' as EquipmentStatus };
      mockEquipmentService.changeStatus.mockResolvedValue(rented);

      const result = await controller.changeStatus('eq-1', 'tenant-123', 'loc-1', 'user-1', {
        newStatus: 'RENTED' as EquipmentStatus,
        relatedId: 'rental-1',
      });

      expect(result).toEqual(rented);
      expect(mockEquipmentService.changeStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'eq-1',
          newStatus: 'RENTED',
          relatedId: 'rental-1',
        }),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // SCAN OPERATIONS
  // ============================================

  describe('scan', () => {
    it('should scan equipment by QR code', async () => {
      mockEquipmentService.scan.mockResolvedValue(mockEquipment);

      const result = await controller.scan('tenant-123', 'loc-1', 'user-1', {
        code: 'QR-12345',
        codeType: 'QR',
      });

      expect(result).toEqual(mockEquipment);
      expect(mockEquipmentService.scan).toHaveBeenCalledWith(
        { code: 'QR-12345', codeType: 'QR' },
        expect.any(Object)
      );
    });

    it('should scan equipment by serial number', async () => {
      mockEquipmentService.scan.mockResolvedValue(mockEquipment);

      await controller.scan('tenant-123', 'loc-1', 'user-1', {
        code: 'SN-001',
        codeType: 'SERIAL',
      });

      expect(mockEquipmentService.scan).toHaveBeenCalledWith(
        { code: 'SN-001', codeType: 'SERIAL' },
        expect.any(Object)
      );
    });
  });

  // ============================================
  // ACCESSORY OPERATIONS
  // ============================================

  describe('getAccessories', () => {
    it('should return equipment accessories', async () => {
      mockEquipmentService.getAccessories.mockResolvedValue([mockAccessory]);

      const result = await controller.getAccessories('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual([mockAccessory]);
      expect(mockEquipmentService.getAccessories).toHaveBeenCalledWith('eq-1', expect.any(Object));
    });
  });

  describe('addAccessory', () => {
    it('should add accessory to equipment', async () => {
      mockEquipmentService.addAccessory.mockResolvedValue(mockAccessory);

      const dto = {
        name: 'Fúrószár készlet',
        quantity: 1,
        isMandatory: true,
        replacementCost: 15000,
        condition: 'GOOD' as EquipmentCondition,
      };

      const result = await controller.addAccessory('eq-1', 'tenant-123', 'loc-1', 'user-1', dto);

      expect(result).toEqual(mockAccessory);
      expect(mockEquipmentService.addAccessory).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'eq-1',
          name: 'Fúrószár készlet',
        }),
        expect.any(Object)
      );
    });
  });

  describe('updateAccessory', () => {
    it('should update accessory', async () => {
      const updated = { ...mockAccessory, quantity: 2 };
      mockEquipmentService.updateAccessory.mockResolvedValue(updated);

      const result = await controller.updateAccessory('acc-1', 'tenant-123', 'loc-1', 'user-1', {
        quantity: 2,
      });

      expect(result).toEqual(updated);
      expect(mockEquipmentService.updateAccessory).toHaveBeenCalledWith(
        'acc-1',
        { quantity: 2 },
        expect.any(Object)
      );
    });
  });

  describe('removeAccessory', () => {
    it('should remove accessory', async () => {
      mockEquipmentService.removeAccessory.mockResolvedValue(undefined);

      await controller.removeAccessory('acc-1', 'tenant-123', 'loc-1', 'user-1');

      expect(mockEquipmentService.removeAccessory).toHaveBeenCalledWith(
        'acc-1',
        expect.any(Object)
      );
    });
  });

  describe('verifyChecklist', () => {
    it('should verify accessory checklist', async () => {
      const checkResult = {
        isComplete: true,
        missingItems: [],
        damagedItems: [],
      };
      mockEquipmentService.verifyAccessoryChecklist.mockResolvedValue(checkResult);

      const dto = {
        items: [
          {
            accessoryId: 'acc-1',
            isPresent: true,
            condition: 'GOOD' as EquipmentCondition,
          },
        ],
      };

      const result = await controller.verifyChecklist('eq-1', 'tenant-123', 'loc-1', 'user-1', dto);

      expect(result).toEqual(checkResult);
      expect(mockEquipmentService.verifyAccessoryChecklist).toHaveBeenCalledWith(
        { equipmentId: 'eq-1', items: dto.items },
        expect.any(Object)
      );
    });
  });

  // ============================================
  // HISTORY & MAINTENANCE
  // ============================================

  describe('getHistory', () => {
    it('should return equipment history', async () => {
      const history = [
        { event: 'CREATED', timestamp: new Date(), userId: 'user-1' },
        { event: 'RENTED', timestamp: new Date(), userId: 'user-2' },
      ];
      mockEquipmentService.getHistory.mockResolvedValue(history);

      const result = await controller.getHistory('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual(history);
      expect(mockEquipmentService.getHistory).toHaveBeenCalledWith('eq-1', expect.any(Object));
    });
  });

  describe('getMaintenanceRecords', () => {
    it('should return maintenance records', async () => {
      mockEquipmentService.getMaintenanceRecords.mockResolvedValue([mockMaintenanceRecord]);

      const result = await controller.getMaintenanceRecords(
        'eq-1',
        'tenant-123',
        'loc-1',
        'user-1'
      );

      expect(result).toEqual([mockMaintenanceRecord]);
      expect(mockEquipmentService.getMaintenanceRecords).toHaveBeenCalledWith(
        'eq-1',
        expect.any(Object)
      );
    });
  });

  describe('addMaintenanceRecord', () => {
    it('should add maintenance record', async () => {
      mockEquipmentService.addMaintenanceRecord.mockResolvedValue(mockMaintenanceRecord);

      const dto = {
        maintenanceType: 'ROUTINE' as MaintenanceType,
        description: 'Éves karbantartás',
        cost: 10000,
        performedBy: 'user-1',
      };

      const result = await controller.addMaintenanceRecord(
        'eq-1',
        'tenant-123',
        'loc-1',
        'user-1',
        dto
      );

      expect(result).toEqual(mockMaintenanceRecord);
      expect(mockEquipmentService.addMaintenanceRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'eq-1',
          maintenanceType: 'ROUTINE',
          description: 'Éves karbantartás',
        }),
        expect.any(Object)
      );
    });

    it('should handle optional date fields', async () => {
      mockEquipmentService.addMaintenanceRecord.mockResolvedValue(mockMaintenanceRecord);

      const dto = {
        maintenanceType: 'REPAIR' as MaintenanceType,
        description: 'Motor csere',
        cost: 25000,
        performedBy: 'user-1',
        performedAt: '2026-01-15',
        partsReplaced: ['Motor', 'Szénkefe'],
        nextDueDate: '2026-07-15',
        notes: 'Rendben van',
      };

      await controller.addMaintenanceRecord('eq-1', 'tenant-123', 'loc-1', 'user-1', dto);

      const callArg = mockEquipmentService.addMaintenanceRecord.mock.calls[0]?.[0];
      expect(callArg.performedAt).toBeInstanceOf(Date);
      expect(callArg.partsReplaced).toEqual(['Motor', 'Szénkefe']);
      expect(callArg.nextDueDate).toBeInstanceOf(Date);
    });
  });

  // ============================================
  // ALERTS & STATISTICS
  // ============================================

  describe('getMaintenanceAlerts', () => {
    it('should return maintenance alerts', async () => {
      const alerts = [{ equipmentId: 'eq-1', type: 'MAINTENANCE_DUE', daysUntilDue: 5 }];
      mockEquipmentService.getMaintenanceAlerts.mockResolvedValue(alerts);

      const result = await controller.getMaintenanceAlerts('tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual(alerts);
      expect(mockEquipmentService.getMaintenanceAlerts).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getStatistics', () => {
    it('should return equipment statistics', async () => {
      const stats = {
        totalEquipment: 50,
        available: 30,
        rented: 15,
        maintenance: 5,
        utilizationRate: 0.7,
      };
      mockEquipmentService.getStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics('tenant-123', 'loc-1', 'user-1');

      expect(result).toEqual(stats);
      expect(mockEquipmentService.getStatistics).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
