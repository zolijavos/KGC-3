/**
 * BergepController Unit Tests
 * Epic 13: Bérgép Management - Rental Equipment
 * Epic 40: Bérgép Megtérülés & Előzmények (getCosts endpoint)
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
import type {
  EquipmentCostService,
  EquipmentCostSummary,
  EquipmentProfitService,
} from '@kgc/rental-core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type {
  PrismaEquipmentHistoryRepository,
  RentalHistoryResult,
} from '../repositories/prisma-equipment-history.repository';
import { BergepController } from './bergep.controller';

type MockedEquipmentService = {
  [K in keyof RentalEquipmentService]: Mock;
};

type MockedCostService = {
  getTotalServiceCost: Mock;
  getCostSummary: Mock;
};

type MockedProfitService = {
  calculateProfit: Mock;
};

type MockedHistoryRepository = {
  getRentalHistory: Mock;
};

describe('BergepController', () => {
  let controller: BergepController;
  let mockEquipmentService: MockedEquipmentService;
  let mockCostService: MockedCostService;
  let mockProfitService: MockedProfitService;
  let mockHistoryRepository: MockedHistoryRepository;

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

    mockCostService = {
      getTotalServiceCost: vi.fn(),
      getCostSummary: vi.fn(),
    };

    mockProfitService = {
      calculateProfit: vi.fn(),
    };

    mockHistoryRepository = {
      getRentalHistory: vi.fn(),
    };

    controller = new BergepController(
      mockEquipmentService as unknown as RentalEquipmentService,
      mockCostService as unknown as EquipmentCostService,
      mockProfitService as unknown as EquipmentProfitService,
      mockHistoryRepository as unknown as PrismaEquipmentHistoryRepository
    );
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

  // ============================================
  // COST OPERATIONS (Epic 40)
  // ============================================

  describe('getCosts', () => {
    const mockCostSummary: EquipmentCostSummary = {
      equipmentId: 'eq-1',
      totalServiceCost: 80000,
      worksheetCount: 2,
      warrantyWorksheetCount: 1,
      breakdown: [
        {
          worksheetId: 'ws-1',
          worksheetNumber: 'ML-2026-0001',
          totalCost: 50000,
          completedAt: new Date('2026-01-15'),
        },
        {
          worksheetId: 'ws-2',
          worksheetNumber: 'ML-2026-0002',
          totalCost: 30000,
          completedAt: new Date('2026-02-01'),
        },
      ],
      lastServiceDate: new Date('2026-02-01'),
    };

    it('should return equipment service costs', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockCostService.getCostSummary.mockResolvedValue(mockCostSummary);

      const result = await controller.getCosts('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.equipmentId).toBe('eq-1');
      expect(result.totalServiceCost).toBe(80000);
      expect(result.worksheetCount).toBe(2);
      expect(result.warrantyWorksheetCount).toBe(1);
      expect(result.breakdown).toHaveLength(2);
      expect(result.lastServiceDate).toBe('2026-02-01T00:00:00.000Z');
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockEquipmentService.findById.mockResolvedValue(null);

      await expect(
        controller.getCosts('invalid-id', 'tenant-123', 'loc-1', 'user-1')
      ).rejects.toThrow(NotFoundException);

      expect(mockCostService.getCostSummary).not.toHaveBeenCalled();
    });

    it('should return null lastServiceDate when no worksheets exist', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockCostService.getCostSummary.mockResolvedValue({
        equipmentId: 'eq-1',
        totalServiceCost: 0,
        worksheetCount: 0,
        warrantyWorksheetCount: 0,
        breakdown: [],
        lastServiceDate: null,
      });

      const result = await controller.getCosts('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.totalServiceCost).toBe(0);
      expect(result.worksheetCount).toBe(0);
      expect(result.breakdown).toEqual([]);
      expect(result.lastServiceDate).toBeNull();
    });

    it('should format dates as ISO strings in response', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockCostService.getCostSummary.mockResolvedValue(mockCostSummary);

      const result = await controller.getCosts('eq-1', 'tenant-123', 'loc-1', 'user-1');

      // Verify breakdown dates are ISO strings
      expect(result.breakdown[0]?.completedAt).toBe('2026-01-15T00:00:00.000Z');
      expect(result.breakdown[1]?.completedAt).toBe('2026-02-01T00:00:00.000Z');
    });
  });

  // ============================================
  // PROFIT OPERATIONS (Epic 40 - Story 40-2)
  // ============================================

  describe('getProfit', () => {
    const mockProfitResult = {
      equipmentId: 'eq-1',
      purchasePrice: 500000,
      totalRentalRevenue: 800000,
      totalServiceCost: 150000,
      profit: 150000,
      roi: 30.0,
      status: 'PROFITABLE' as const,
    };

    it('should return equipment profit calculation', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockProfitService.calculateProfit.mockResolvedValue(mockProfitResult);

      const result = await controller.getProfit('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.equipmentId).toBe('eq-1');
      expect(result.profit).toBe(150000);
      expect(result.roi).toBe(30.0);
      expect(result.status).toBe('PROFITABLE');
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockEquipmentService.findById.mockResolvedValue(null);

      await expect(
        controller.getProfit('invalid-id', 'tenant-123', 'loc-1', 'user-1')
      ).rejects.toThrow(NotFoundException);

      expect(mockProfitService.calculateProfit).not.toHaveBeenCalled();
    });

    it('should return INCOMPLETE status when purchase price is missing', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockProfitService.calculateProfit.mockResolvedValue({
        equipmentId: 'eq-1',
        purchasePrice: null,
        totalRentalRevenue: 100000,
        totalServiceCost: 0,
        profit: null,
        roi: null,
        status: 'INCOMPLETE' as const,
        error: 'Vételár szükséges a megtérülés számításhoz',
      });

      const result = await controller.getProfit('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.status).toBe('INCOMPLETE');
      expect(result.profit).toBeNull();
      expect(result.error).toBe('Vételár szükséges a megtérülés számításhoz');
    });

    it('should return LOSING status for negative profit', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockProfitService.calculateProfit.mockResolvedValue({
        equipmentId: 'eq-1',
        purchasePrice: 600000,
        totalRentalRevenue: 300000,
        totalServiceCost: 100000,
        profit: -400000,
        roi: -66.67,
        status: 'LOSING' as const,
      });

      const result = await controller.getProfit('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.status).toBe('LOSING');
      expect(result.profit).toBe(-400000);
      expect(result.roi).toBe(-66.67);
    });

    it('should pass tenantId to profit service for multi-tenancy', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockProfitService.calculateProfit.mockResolvedValue(mockProfitResult);

      await controller.getProfit('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(mockProfitService.calculateProfit).toHaveBeenCalledWith('eq-1', 'tenant-123');
    });
  });

  // ============================================
  // RENTAL HISTORY (Epic 40 - Story 40-3)
  // ============================================

  describe('getRentalHistory', () => {
    const mockHistoryResult: RentalHistoryResult = {
      equipmentId: 'eq-1',
      totalRentals: 5,
      lastRenterName: 'Nagy János',
      worksheetCount: 2,
      rentals: [
        {
          rentalId: 'rental-1',
          rentalCode: 'B-2026-00123',
          partnerId: 'partner-1',
          partnerName: 'Nagy János',
          startDate: new Date('2026-01-10'),
          expectedEnd: new Date('2026-01-15'),
          actualEnd: new Date('2026-01-14'),
          issuedByName: 'Zoli',
          returnedByName: 'Zsuzsi',
          itemTotal: 45000,
          status: 'COMPLETED',
        },
        {
          rentalId: 'rental-2',
          rentalCode: 'B-2026-00100',
          partnerId: 'partner-2',
          partnerName: 'Kis Péter',
          startDate: new Date('2026-01-01'),
          expectedEnd: new Date('2026-01-05'),
          actualEnd: new Date('2026-01-05'),
          issuedByName: 'Zoli',
          returnedByName: null,
          itemTotal: 30000,
          status: 'COMPLETED',
        },
      ],
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    it('should return rental history for equipment', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockHistoryRepository.getRentalHistory.mockResolvedValue(mockHistoryResult);

      const result = await controller.getRentalHistory('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.equipmentId).toBe('eq-1');
      expect(result.totalRentals).toBe(5);
      expect(result.lastRenterName).toBe('Nagy János');
      expect(result.worksheetCount).toBe(2);
      expect(result.rentals).toHaveLength(2);
    });

    it('should throw NotFoundException when equipment not found', async () => {
      mockEquipmentService.findById.mockResolvedValue(null);

      await expect(
        controller.getRentalHistory('invalid-id', 'tenant-123', 'loc-1', 'user-1')
      ).rejects.toThrow(NotFoundException);

      expect(mockHistoryRepository.getRentalHistory).not.toHaveBeenCalled();
    });

    it('should format dates as ISO date strings in response', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockHistoryRepository.getRentalHistory.mockResolvedValue(mockHistoryResult);

      const result = await controller.getRentalHistory('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.rentals[0]?.startDate).toBe('2026-01-10');
      expect(result.rentals[0]?.expectedEnd).toBe('2026-01-15');
      expect(result.rentals[0]?.actualEnd).toBe('2026-01-14');
    });

    it('should handle pagination parameters', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockHistoryRepository.getRentalHistory.mockResolvedValue({
        ...mockHistoryResult,
        page: 2,
        pageSize: 10,
        totalPages: 3,
      });

      const result = await controller.getRentalHistory(
        'eq-1',
        'tenant-123',
        'loc-1',
        'user-1',
        '2',
        '10'
      );

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(mockHistoryRepository.getRentalHistory).toHaveBeenCalledWith(
        'eq-1',
        'tenant-123',
        2,
        10
      );
    });

    it('should handle empty rental history', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockHistoryRepository.getRentalHistory.mockResolvedValue({
        equipmentId: 'eq-1',
        totalRentals: 0,
        lastRenterName: null,
        worksheetCount: 0,
        rentals: [],
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      const result = await controller.getRentalHistory('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.totalRentals).toBe(0);
      expect(result.lastRenterName).toBeNull();
      expect(result.rentals).toEqual([]);
    });

    it('should handle null actualEnd for active rentals', async () => {
      mockEquipmentService.findById.mockResolvedValue(mockEquipment);
      mockHistoryRepository.getRentalHistory.mockResolvedValue({
        ...mockHistoryResult,
        rentals: [
          {
            ...mockHistoryResult.rentals[0]!,
            actualEnd: null,
            status: 'ACTIVE',
          },
        ],
      });

      const result = await controller.getRentalHistory('eq-1', 'tenant-123', 'loc-1', 'user-1');

      expect(result.rentals[0]?.actualEnd).toBeNull();
      expect(result.rentals[0]?.status).toBe('ACTIVE');
    });
  });
});
