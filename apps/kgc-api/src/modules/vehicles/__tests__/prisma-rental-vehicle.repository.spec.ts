/**
 * Unit Tests: PrismaRentalVehicleRepository
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * TDD/Unit tesztek a bérgép jármű repository-hoz
 * Prioritás: P1 (High - kritikus üzleti logika)
 */

import { RentalVehicleType, VehicleDocumentType, VehicleStatus } from '@kgc/vehicles';
import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaRentalVehicleRepository } from '../repositories/prisma-rental-vehicle.repository';

// Mock Prisma Client
const mockPrisma = {
  rentalVehicle: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe('PrismaRentalVehicleRepository', () => {
  let repository: PrismaRentalVehicleRepository;
  const testTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaRentalVehicleRepository(mockPrisma);
  });

  describe('findAll()', () => {
    it('[P1] should return all vehicles for tenant without filters', async () => {
      // GIVEN: Vehicles exist for tenant
      const mockVehicles = [
        {
          id: 'v1',
          tenantId: testTenantId,
          licensePlate: 'ABC-123',
          vehicleType: 'TRAILER',
          status: 'AVAILABLE',
          brand: 'Test',
          model: 'Model',
          year: 2020,
          rentalEquipmentId: null,
          kgfbExpiryDate: new Date('2025-12-31'),
          technicalInspectionExpiryDate: new Date('2025-06-30'),
          assignedUserId: null,
          notes: null,
          createdAt: new Date(),
          createdBy: 'user-1',
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.rentalVehicle.findMany).mockResolvedValue(mockVehicles as never);

      // WHEN: Finding all vehicles
      const result = await repository.findAll(testTenantId);

      // THEN: Returns mapped domain objects
      expect(mockPrisma.rentalVehicle.findMany).toHaveBeenCalledWith({
        where: { tenantId: testTenantId },
        orderBy: { licensePlate: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.licensePlate).toBe('ABC-123');
      expect(result[0]?.vehicleType).toBe('TRAILER');
    });

    it('[P1] should filter by vehicleType', async () => {
      // GIVEN: Filter for AGGREGATOR type
      vi.mocked(mockPrisma.rentalVehicle.findMany).mockResolvedValue([]);

      // WHEN: Finding with vehicleType filter
      await repository.findAll(testTenantId, { vehicleType: RentalVehicleType.AGGREGATOR });

      // THEN: Query includes vehicleType filter
      expect(mockPrisma.rentalVehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: testTenantId,
            vehicleType: 'AGGREGATOR',
          }),
        })
      );
    });

    it('[P1] should filter by status', async () => {
      // GIVEN: Filter for IN_SERVICE status
      vi.mocked(mockPrisma.rentalVehicle.findMany).mockResolvedValue([]);

      // WHEN: Finding with status filter
      await repository.findAll(testTenantId, { status: VehicleStatus.IN_SERVICE });

      // THEN: Query includes status filter
      expect(mockPrisma.rentalVehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_SERVICE',
          }),
        })
      );
    });
  });

  describe('findById()', () => {
    it('[P1] should return vehicle when found', async () => {
      // GIVEN: Vehicle exists
      const mockVehicle = {
        id: 'v1',
        tenantId: testTenantId,
        licensePlate: 'ABC-123',
        vehicleType: 'TRAILER',
        status: 'AVAILABLE',
        brand: 'Test',
        model: 'Model',
        year: 2020,
        rentalEquipmentId: null,
        kgfbExpiryDate: null,
        technicalInspectionExpiryDate: null,
        assignedUserId: null,
        notes: null,
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.rentalVehicle.findFirst).mockResolvedValue(mockVehicle as never);

      // WHEN: Finding by ID
      const result = await repository.findById('v1', testTenantId);

      // THEN: Returns the vehicle
      expect(result).not.toBeNull();
      expect(result?.id).toBe('v1');
      expect(result?.licensePlate).toBe('ABC-123');
    });

    it('[P1] should return null when not found', async () => {
      // GIVEN: Vehicle does not exist
      vi.mocked(mockPrisma.rentalVehicle.findFirst).mockResolvedValue(null);

      // WHEN: Finding by non-existent ID
      const result = await repository.findById('non-existent', testTenantId);

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] should enforce tenant isolation', async () => {
      // GIVEN: Vehicle exists for different tenant
      vi.mocked(mockPrisma.rentalVehicle.findFirst).mockResolvedValue(null);

      // WHEN: Finding with wrong tenant
      await repository.findById('v1', 'wrong-tenant');

      // THEN: Query includes tenant filter
      expect(mockPrisma.rentalVehicle.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'v1',
          tenantId: 'wrong-tenant',
        },
      });
    });
  });

  describe('create()', () => {
    it('[P1] should create vehicle with required fields', async () => {
      // GIVEN: Valid input data
      const input = {
        licensePlate: 'NEW-456',
        vehicleType: RentalVehicleType.TRAILER,
        brand: 'TestBrand',
        model: 'TestModel',
        year: 2023,
      };
      const mockCreated = {
        id: 'new-id',
        tenantId: testTenantId,
        ...input,
        vehicleType: 'TRAILER',
        status: 'AVAILABLE',
        rentalEquipmentId: null,
        kgfbExpiryDate: null,
        technicalInspectionExpiryDate: null,
        assignedUserId: null,
        notes: null,
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.rentalVehicle.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating vehicle
      const result = await repository.create(testTenantId, input, 'user-1');

      // THEN: Vehicle is created with correct data
      expect(mockPrisma.rentalVehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: testTenantId,
          licensePlate: 'NEW-456',
          vehicleType: 'TRAILER',
          createdBy: 'user-1',
        }),
      });
      expect(result.id).toBe('new-id');
    });
  });

  describe('findExpiringDocuments()', () => {
    it('[P1] should find vehicles with documents expiring within days', async () => {
      // GIVEN: Vehicles with expiring documents
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      const mockVehicles = [
        {
          id: 'v1',
          tenantId: testTenantId,
          licensePlate: 'EXP-001',
          vehicleType: 'TRAILER',
          status: 'AVAILABLE',
          brand: 'Test',
          model: 'Model',
          year: 2020,
          rentalEquipmentId: null,
          kgfbExpiryDate: in30Days,
          technicalInspectionExpiryDate: null,
          assignedUserId: null,
          notes: null,
          createdAt: new Date(),
          createdBy: 'user-1',
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.rentalVehicle.findMany).mockResolvedValue(mockVehicles as never);

      // WHEN: Finding expiring documents
      const result = await repository.findExpiringDocuments(testTenantId, 60);

      // THEN: Returns vehicles with expiring documents
      expect(result).toHaveLength(1);
      expect(result[0]?.licensePlate).toBe('EXP-001');
    });
  });

  describe('findExpiringDocumentsDetailed()', () => {
    it('[P1] should return structured expiring document info', async () => {
      // GIVEN: Vehicle with multiple expiring documents
      const today = new Date();
      const in15Days = new Date(today);
      in15Days.setDate(in15Days.getDate() + 15);
      const in45Days = new Date(today);
      in45Days.setDate(in45Days.getDate() + 45);

      const mockVehicles = [
        {
          id: 'v1',
          tenantId: testTenantId,
          licensePlate: 'MULTI-001',
          vehicleType: 'TRAILER',
          status: 'ACTIVE',
          brand: 'Test',
          model: 'Model',
          description: null,
          rentalEquipmentId: null,
          registrationDocNumber: null,
          registrationValidUntil: in15Days,
          technicalInspectionUntil: in45Days,
          notes: null,
          createdAt: new Date(),
          createdBy: 'user-1',
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.rentalVehicle.findMany).mockResolvedValue(mockVehicles as never);

      // WHEN: Finding detailed expiring documents
      const result = await repository.findExpiringDocumentsDetailed(testTenantId, 60);

      // THEN: Returns structured document list
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Should have entries for REGISTRATION and TECHNICAL_INSPECTION
      const registrationDoc = result.find(d => d.documentType === VehicleDocumentType.REGISTRATION);
      expect(registrationDoc).toBeDefined();
      expect(registrationDoc?.vehicleId).toBe('v1');
      expect(registrationDoc?.licensePlate).toBe('MULTI-001');
      expect(registrationDoc?.daysUntilExpiry).toBeLessThanOrEqual(60);
    });
  });

  describe('linkToRentalEquipment()', () => {
    it('[P1] should link vehicle to rental equipment', async () => {
      // GIVEN: Vehicle and equipment exist
      const mockUpdated = {
        id: 'v1',
        tenantId: testTenantId,
        licensePlate: 'LINK-001',
        vehicleType: 'TRAILER',
        status: 'AVAILABLE',
        brand: 'Test',
        model: 'Model',
        year: 2020,
        rentalEquipmentId: 'equip-123',
        kgfbExpiryDate: null,
        technicalInspectionExpiryDate: null,
        assignedUserId: null,
        notes: null,
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.rentalVehicle.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(mockPrisma.rentalVehicle.findFirst).mockResolvedValue(mockUpdated as never);

      // WHEN: Linking to equipment
      const result = await repository.linkToRentalEquipment('v1', testTenantId, 'equip-123');

      // THEN: Vehicle is linked
      expect(mockPrisma.rentalVehicle.updateMany).toHaveBeenCalledWith({
        where: { id: 'v1', tenantId: testTenantId },
        data: { rentalEquipmentId: 'equip-123' },
      });
      expect(result.rentalEquipmentId).toBe('equip-123');
    });
  });

  describe('delete()', () => {
    it('[P1] should delete vehicle with tenant isolation', async () => {
      // GIVEN: Vehicle exists
      vi.mocked(mockPrisma.rentalVehicle.deleteMany).mockResolvedValue({ count: 1 });

      // WHEN: Deleting vehicle
      await repository.delete('v1', testTenantId);

      // THEN: Delete is called with tenant filter
      expect(mockPrisma.rentalVehicle.deleteMany).toHaveBeenCalledWith({
        where: { id: 'v1', tenantId: testTenantId },
      });
    });
  });
});
