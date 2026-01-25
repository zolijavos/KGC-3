/**
 * Unit Tests: PrismaCompanyVehicleRepository
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * TDD/Unit tesztek a céges gépkocsi repository-hoz
 * Prioritás: P1 (High - központi flotta kezelés)
 */

import { CompanyVehicleType, VehicleDocumentType } from '@kgc/vehicles';
import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaCompanyVehicleRepository } from '../repositories/prisma-company-vehicle.repository';

// Mock Prisma Client
const mockPrisma = {
  companyVehicle: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaClient;

describe('PrismaCompanyVehicleRepository', () => {
  let repository: PrismaCompanyVehicleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaCompanyVehicleRepository(mockPrisma);
  });

  describe('findAll()', () => {
    it('[P1] should return all company vehicles without filters', async () => {
      // GIVEN: Company vehicles exist
      const mockVehicles = [
        {
          id: 'cv1',
          licensePlate: 'COMPANY-001',
          vehicleType: 'CAR',
          status: 'AVAILABLE',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          vin: 'VIN123456789',
          registrationExpiryDate: new Date('2025-12-31'),
          technicalInspectionExpiryDate: new Date('2025-06-30'),
          kgfbExpiryDate: new Date('2025-03-15'),
          cascoExpiryDate: new Date('2025-09-01'),
          highwayStickerExpiryDate: new Date('2025-01-31'),
          assignedTenantId: null,
          assignedUserId: null,
          notes: null,
          createdAt: new Date(),
          createdBy: 'admin-1',
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.companyVehicle.findMany).mockResolvedValue(mockVehicles as never);

      // WHEN: Finding all vehicles
      const result = await repository.findAll();

      // THEN: Returns mapped domain objects
      expect(mockPrisma.companyVehicle.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { licensePlate: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.licensePlate).toBe('COMPANY-001');
      expect(result[0]?.vehicleType).toBe(CompanyVehicleType.CAR);
    });

    it('[P1] should filter by vehicleType', async () => {
      // GIVEN: Filter for VAN type
      vi.mocked(mockPrisma.companyVehicle.findMany).mockResolvedValue([]);

      // WHEN: Finding with vehicleType filter
      await repository.findAll({ vehicleType: CompanyVehicleType.VAN });

      // THEN: Query includes vehicleType filter
      expect(mockPrisma.companyVehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleType: 'VAN',
          }),
        })
      );
    });

    it('[P1] should filter by assignedTenantId', async () => {
      // GIVEN: Filter for specific tenant
      vi.mocked(mockPrisma.companyVehicle.findMany).mockResolvedValue([]);

      // WHEN: Finding with tenant filter
      await repository.findAll({ assignedTenantId: 'tenant-xyz' });

      // THEN: Query includes tenant filter
      expect(mockPrisma.companyVehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTenantId: 'tenant-xyz',
          }),
        })
      );
    });
  });

  describe('findById()', () => {
    it('[P1] should return company vehicle when found', async () => {
      // GIVEN: Vehicle exists
      const mockVehicle = {
        id: 'cv1',
        licensePlate: 'COMPANY-001',
        vehicleType: 'CAR',
        status: 'AVAILABLE',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        vin: null,
        registrationExpiryDate: null,
        technicalInspectionExpiryDate: null,
        kgfbExpiryDate: null,
        cascoExpiryDate: null,
        highwayStickerExpiryDate: null,
        assignedTenantId: null,
        assignedUserId: null,
        notes: null,
        createdAt: new Date(),
        createdBy: 'admin-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.companyVehicle.findUnique).mockResolvedValue(mockVehicle as never);

      // WHEN: Finding by ID
      const result = await repository.findById('cv1');

      // THEN: Returns the vehicle
      expect(result).not.toBeNull();
      expect(result?.id).toBe('cv1');
      expect(result?.brand).toBe('Toyota');
    });

    it('[P1] should return null when not found', async () => {
      // GIVEN: Vehicle does not exist
      vi.mocked(mockPrisma.companyVehicle.findUnique).mockResolvedValue(null);

      // WHEN: Finding by non-existent ID
      const result = await repository.findById('non-existent');

      // THEN: Returns null
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('[P1] should create company vehicle with all fields', async () => {
      // GIVEN: Valid input data
      const input = {
        licensePlate: 'NEW-COMPANY',
        vehicleType: CompanyVehicleType.VAN,
        brand: 'Ford',
        model: 'Transit',
        year: 2024,
        vin: 'VIN987654321',
      };
      const mockCreated = {
        id: 'new-cv-id',
        ...input,
        vehicleType: 'VAN',
        status: 'AVAILABLE',
        registrationExpiryDate: null,
        technicalInspectionExpiryDate: null,
        kgfbExpiryDate: null,
        cascoExpiryDate: null,
        highwayStickerExpiryDate: null,
        assignedTenantId: null,
        assignedUserId: null,
        notes: null,
        createdAt: new Date(),
        createdBy: 'admin-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.companyVehicle.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating vehicle
      const result = await repository.create(input, 'admin-1');

      // THEN: Vehicle is created
      expect(mockPrisma.companyVehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licensePlate: 'NEW-COMPANY',
          vehicleType: 'VAN',
          vin: 'VIN987654321',
          createdBy: 'admin-1',
        }),
      });
      expect(result.id).toBe('new-cv-id');
    });
  });

  describe('assign()', () => {
    it('[P1] should assign vehicle to tenant and user', async () => {
      // GIVEN: Vehicle exists
      const mockUpdated = {
        id: 'cv1',
        licensePlate: 'COMPANY-001',
        vehicleType: 'CAR',
        status: 'IN_USE',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        vin: null,
        registrationExpiryDate: null,
        technicalInspectionExpiryDate: null,
        kgfbExpiryDate: null,
        cascoExpiryDate: null,
        highwayStickerExpiryDate: null,
        assignedTenantId: 'tenant-123',
        assignedUserId: 'user-456',
        notes: null,
        createdAt: new Date(),
        createdBy: 'admin-1',
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.companyVehicle.update).mockResolvedValue(mockUpdated as never);

      // WHEN: Assigning to tenant
      const result = await repository.assign('cv1', {
        assignedTenantId: 'tenant-123',
        assignedUserId: 'user-456',
      });

      // THEN: Vehicle is assigned
      expect(mockPrisma.companyVehicle.update).toHaveBeenCalled();
      expect(result.assignedTenantId).toBe('tenant-123');
      expect(result.assignedUserId).toBe('user-456');
    });
  });

  describe('findExpiringDocumentsDetailed()', () => {
    it('[P1] should return all document types with expiry info', async () => {
      // GIVEN: Vehicle with multiple expiring documents
      const today = new Date();
      const in10Days = new Date(today);
      in10Days.setDate(in10Days.getDate() + 10);
      const in20Days = new Date(today);
      in20Days.setDate(in20Days.getDate() + 20);
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      const mockVehicles = [
        {
          id: 'cv1',
          licensePlate: 'EXP-MULTI',
          vehicleType: 'CAR',
          status: 'ACTIVE',
          brand: 'BMW',
          model: '320d',
          yearOfManufacture: 2021,
          vin: 'WBAPH5C55BA123456',
          registrationDocNumber: null,
          registrationValidUntil: in10Days,
          technicalInspectionUntil: in20Days,
          kgfbPolicyNumber: null,
          kgfbInsurer: null,
          kgfbValidUntil: in30Days,
          cascoPolicyNumber: null,
          cascoInsurer: null,
          cascoValidUntil: null,
          highwayStickerCategory: null,
          highwayStickerUntil: in10Days,
          assignedTenantId: 'tenant-1',
          assignedUserId: 'user-1',
          notes: null,
          createdAt: new Date(),
          createdBy: 'admin-1',
          updatedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.companyVehicle.findMany).mockResolvedValue(mockVehicles as never);

      // WHEN: Finding detailed expiring documents
      const result = await repository.findExpiringDocumentsDetailed(60);

      // THEN: Returns all document types
      expect(result.length).toBeGreaterThanOrEqual(3); // At least REGISTRATION, TECHNICAL, HIGHWAY

      const registrationDoc = result.find(d => d.documentType === VehicleDocumentType.REGISTRATION);
      expect(registrationDoc).toBeDefined();
      expect(registrationDoc?.licensePlate).toBe('EXP-MULTI');
      expect(registrationDoc?.daysUntilExpiry).toBeLessThanOrEqual(11);

      const technicalDoc = result.find(
        d => d.documentType === VehicleDocumentType.TECHNICAL_INSPECTION
      );
      expect(technicalDoc).toBeDefined();

      const highwayDoc = result.find(d => d.documentType === VehicleDocumentType.HIGHWAY_STICKER);
      expect(highwayDoc).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('[P1] should delete company vehicle', async () => {
      // GIVEN: Vehicle exists
      vi.mocked(mockPrisma.companyVehicle.delete).mockResolvedValue({} as never);

      // WHEN: Deleting vehicle
      await repository.delete('cv1');

      // THEN: Delete is called
      expect(mockPrisma.companyVehicle.delete).toHaveBeenCalledWith({
        where: { id: 'cv1' },
      });
    });
  });
});
