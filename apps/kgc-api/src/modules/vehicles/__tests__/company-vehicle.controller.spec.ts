/**
 * Integration Tests: CompanyVehicleController
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * Controller tesztek RBAC és központi flotta kezeléshez
 * Prioritás: P0-P1 (Critical - admin-only műveletek)
 */

import { AuthenticatedRequest } from '@kgc/common';
import {
  COMPANY_VEHICLE_REPOSITORY,
  CompanyVehicleType,
  ICompanyVehicleRepository,
  VehicleStatus,
} from '@kgc/vehicles';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyVehicleController } from '../controllers/company-vehicle.controller';

// Mock repository - typed as full interface to avoid undefined errors
const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByLicensePlate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findExpiringDocuments: vi.fn(),
  findExpiringDocumentsDetailed: vi.fn(),
  assign: vi.fn(),
} satisfies ICompanyVehicleRepository;

// Mock authenticated request factory
const createMockRequest = (
  overrides: Partial<AuthenticatedRequest['user']> = {}
): AuthenticatedRequest =>
  ({
    user: {
      id: 'admin-user',
      tenantId: 'central-tenant',
      role: 'ADMIN',
      ...overrides,
    },
  }) as AuthenticatedRequest;

describe('CompanyVehicleController', () => {
  let controller: CompanyVehicleController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyVehicleController],
      providers: [
        {
          provide: COMPANY_VEHICLE_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<CompanyVehicleController>(CompanyVehicleController);
  });

  describe('findAll()', () => {
    it('[P1] should return all company vehicles without tenant filter', async () => {
      // GIVEN: Company vehicles exist (central management)
      const mockVehicles = [
        { id: 'cv1', licensePlate: 'COMPANY-001', assignedTenantId: null },
        { id: 'cv2', licensePlate: 'COMPANY-002', assignedTenantId: 'tenant-1' },
      ];
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockVehicles as never);

      // WHEN: Calling findAll (no tenant filter - central view)
      const result = await controller.findAll();

      // THEN: Returns all vehicles
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
      expect(result.data).toHaveLength(2);
    });

    it('[P1] should filter by vehicleType', async () => {
      // GIVEN: Filter for VAN
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Filtering by vehicle type
      await controller.findAll(CompanyVehicleType.VAN);

      // THEN: Filter is applied
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleType: CompanyVehicleType.VAN })
      );
    });

    it('[P1] should filter by assignedTenantId', async () => {
      // GIVEN: Filter for specific tenant
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Filtering by tenant
      await controller.findAll(undefined, undefined, 'tenant-xyz');

      // THEN: Filter is applied
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ assignedTenantId: 'tenant-xyz' })
      );
    });

    it('[P1] should validate expiringWithinDays parameter', async () => {
      // GIVEN: Invalid expiringWithinDays
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling with invalid days
      await controller.findAll(undefined, undefined, undefined, 'not-a-number');

      // THEN: Invalid value is ignored
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.not.objectContaining({ expiringWithinDays: expect.anything() })
      );
    });
  });

  describe('findById()', () => {
    it('[P1] should return company vehicle when found', async () => {
      // GIVEN: Vehicle exists
      const mockVehicle = { id: 'cv1', licensePlate: 'COMPANY-001', brand: 'Toyota' };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockVehicle as never);

      // WHEN: Finding by ID
      const result = await controller.findById('cv1');

      // THEN: Returns vehicle
      expect(result).toEqual({ data: mockVehicle });
    });

    it('[P0] should throw NotFoundException when not found', async () => {
      // GIVEN: Vehicle does not exist
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // WHEN/THEN: Throws NotFoundException
      await expect(controller.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('[P0] should use userId from JWT for createdBy', async () => {
      // GIVEN: Admin request
      const req = createMockRequest({ id: 'admin-creator' });
      const input = {
        licensePlate: 'NEW-COMPANY',
        vehicleType: CompanyVehicleType.CAR,
        brand: 'BMW',
        model: '320d',
      };
      vi.mocked(mockRepository.create).mockResolvedValue({ id: 'new-cv', ...input } as never);

      // WHEN: Creating vehicle
      await controller.create(req, input);

      // THEN: Uses admin user ID as createdBy
      expect(mockRepository.create).toHaveBeenCalledWith(input, 'admin-creator');
    });

    it('[P1] should return created vehicle', async () => {
      // GIVEN: Valid input
      const req = createMockRequest();
      const input = {
        licensePlate: 'FLEET-001',
        vehicleType: CompanyVehicleType.VAN,
        brand: 'Ford',
        model: 'Transit',
        yearOfManufacture: 2024,
      };
      const mockCreated = { id: 'fleet-id', ...input };
      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating vehicle
      const result = await controller.create(req, input);

      // THEN: Returns created vehicle
      expect(result).toEqual({ data: mockCreated });
    });
  });

  describe('update()', () => {
    it('[P1] should update company vehicle', async () => {
      // GIVEN: Valid update input
      const input = { status: VehicleStatus.IN_SERVICE };
      vi.mocked(mockRepository.update).mockResolvedValue({
        id: 'cv1',
        status: 'MAINTENANCE',
      } as never);

      // WHEN: Updating vehicle
      const result = await controller.update('cv1', input);

      // THEN: Vehicle is updated
      expect(mockRepository.update).toHaveBeenCalledWith('cv1', input);
      expect(result.data.status).toBe('MAINTENANCE');
    });
  });

  describe('delete()', () => {
    it('[P0] should delete company vehicle (admin only)', async () => {
      // GIVEN: Vehicle exists
      vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

      // WHEN: Deleting vehicle
      await controller.delete('cv1');

      // THEN: Vehicle is deleted
      expect(mockRepository.delete).toHaveBeenCalledWith('cv1');
    });
  });

  describe('findExpiring()', () => {
    it('[P1] should use default 60 days', async () => {
      // GIVEN: No days parameter
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Finding expiring without days
      await controller.findExpiring();

      // THEN: Uses default
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith(60);
    });

    it('[P1] should use custom days parameter', async () => {
      // GIVEN: Custom days
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Finding with custom days
      await controller.findExpiring('30');

      // THEN: Uses custom value
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith(30);
    });

    it('[P1] should fall back to default for invalid input', async () => {
      // GIVEN: Invalid days
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Finding with invalid days
      await controller.findExpiring('invalid');

      // THEN: Uses default
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith(60);
    });
  });

  describe('findExpiringDetailed()', () => {
    it('[P1] should return all document types', async () => {
      // GIVEN: Multiple document types expiring
      const mockDocuments = [
        { vehicleId: 'cv1', documentType: 'REGISTRATION', daysUntilExpiry: 10 },
        { vehicleId: 'cv1', documentType: 'TECHNICAL_INSPECTION', daysUntilExpiry: 20 },
        { vehicleId: 'cv1', documentType: 'KGFB_INSURANCE', daysUntilExpiry: 30 },
        { vehicleId: 'cv1', documentType: 'CASCO_INSURANCE', daysUntilExpiry: 45 },
        { vehicleId: 'cv1', documentType: 'HIGHWAY_STICKER', daysUntilExpiry: 5 },
      ];
      vi.mocked(mockRepository.findExpiringDocumentsDetailed).mockResolvedValue(
        mockDocuments as never
      );

      // WHEN: Getting detailed expiring documents
      const result = await controller.findExpiringDetailed();

      // THEN: Returns all document types
      expect(result.data).toHaveLength(5);
    });
  });

  describe('assign()', () => {
    it('[P0] should assign vehicle to tenant and user', async () => {
      // GIVEN: Assignment input
      const input = { assignedTenantId: 'target-tenant', assignedUserId: 'target-user' };
      vi.mocked(mockRepository.assign).mockResolvedValue({
        id: 'cv1',
        assignedTenantId: 'target-tenant',
        assignedUserId: 'target-user',
        status: VehicleStatus.ACTIVE,
      } as never);

      // WHEN: Assigning to tenant
      const result = await controller.assign('cv1', input);

      // THEN: Vehicle is assigned
      expect(mockRepository.assign).toHaveBeenCalledWith('cv1', input);
      expect(result.data.assignedTenantId).toBe('target-tenant');
      expect(result.data.assignedUserId).toBe('target-user');
    });
  });
});
