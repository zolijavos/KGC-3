/**
 * Integration Tests: RentalVehicleController
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * Controller tesztek RBAC és endpoint viselkedés validálásra
 * Prioritás: P0-P1 (Critical - RBAC biztonsági tesztek)
 */

import { AuthenticatedRequest } from '@kgc/common';
import {
  IRentalVehicleRepository,
  RENTAL_VEHICLE_REPOSITORY,
  RentalVehicleType,
  VehicleStatus,
} from '@kgc/vehicles';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RentalVehicleController } from '../controllers/rental-vehicle.controller';

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
  linkToRentalEquipment: vi.fn(),
} satisfies IRentalVehicleRepository;

// Mock authenticated request factory
const createMockRequest = (
  overrides: Partial<AuthenticatedRequest['user']> = {}
): AuthenticatedRequest =>
  ({
    user: {
      id: 'user-123',
      tenantId: 'tenant-456',
      role: 'STORE_MANAGER',
      ...overrides,
    },
  }) as AuthenticatedRequest;

describe('RentalVehicleController', () => {
  let controller: RentalVehicleController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentalVehicleController],
      providers: [
        {
          provide: RENTAL_VEHICLE_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<RentalVehicleController>(RentalVehicleController);
  });

  describe('findAll()', () => {
    it('[P0] should use tenantId from JWT, not query parameter', async () => {
      // GIVEN: Request with user context
      const req = createMockRequest({ tenantId: 'jwt-tenant-id' });
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling findAll
      await controller.findAll(req);

      // THEN: Uses tenantId from JWT
      expect(mockRepository.findAll).toHaveBeenCalledWith('jwt-tenant-id', expect.any(Object));
    });

    it('[P1] should apply vehicleType filter', async () => {
      // GIVEN: Request with filter
      const req = createMockRequest();
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling with vehicleType filter
      await controller.findAll(req, RentalVehicleType.TRAILER);

      // THEN: Filter is applied
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        'tenant-456',
        expect.objectContaining({ vehicleType: RentalVehicleType.TRAILER })
      );
    });

    it('[P1] should apply status filter', async () => {
      // GIVEN: Request with status filter
      const req = createMockRequest();
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling with status filter
      await controller.findAll(req, undefined, VehicleStatus.IN_SERVICE);

      // THEN: Filter is applied
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        'tenant-456',
        expect.objectContaining({ status: VehicleStatus.IN_SERVICE })
      );
    });

    it('[P1] should validate expiringWithinDays parameter', async () => {
      // GIVEN: Invalid expiringWithinDays
      const req = createMockRequest();
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling with invalid days value
      await controller.findAll(req, undefined, undefined, 'invalid');

      // THEN: Invalid value is ignored (not passed to repository)
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        'tenant-456',
        expect.not.objectContaining({ expiringWithinDays: expect.anything() })
      );
    });

    it('[P1] should parse valid expiringWithinDays', async () => {
      // GIVEN: Valid expiringWithinDays
      const req = createMockRequest();
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // WHEN: Calling with valid days value
      await controller.findAll(req, undefined, undefined, '30');

      // THEN: Parsed value is used
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        'tenant-456',
        expect.objectContaining({ expiringWithinDays: 30 })
      );
    });

    it('[P1] should return data wrapper with vehicles', async () => {
      // GIVEN: Vehicles exist
      const mockVehicles = [
        { id: 'v1', licensePlate: 'ABC-123' },
        { id: 'v2', licensePlate: 'DEF-456' },
      ];
      const req = createMockRequest();
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockVehicles as never);

      // WHEN: Calling findAll
      const result = await controller.findAll(req);

      // THEN: Returns wrapped data
      expect(result).toEqual({ data: mockVehicles });
    });
  });

  describe('findById()', () => {
    it('[P0] should use tenantId from JWT for tenant isolation', async () => {
      // GIVEN: Request with JWT tenant
      const req = createMockRequest({ tenantId: 'secure-tenant' });
      vi.mocked(mockRepository.findById).mockResolvedValue({
        id: 'v1',
        tenantId: 'secure-tenant',
      } as never);

      // WHEN: Calling findById
      await controller.findById('v1', req);

      // THEN: Uses tenant from JWT
      expect(mockRepository.findById).toHaveBeenCalledWith('v1', 'secure-tenant');
    });

    it('[P0] should throw NotFoundException when vehicle not found', async () => {
      // GIVEN: Vehicle does not exist
      const req = createMockRequest();
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // WHEN/THEN: Throws NotFoundException
      await expect(controller.findById('non-existent', req)).rejects.toThrow(NotFoundException);
    });

    it('[P1] should return vehicle data when found', async () => {
      // GIVEN: Vehicle exists
      const mockVehicle = { id: 'v1', licensePlate: 'ABC-123' };
      const req = createMockRequest();
      vi.mocked(mockRepository.findById).mockResolvedValue(mockVehicle as never);

      // WHEN: Calling findById
      const result = await controller.findById('v1', req);

      // THEN: Returns wrapped data
      expect(result).toEqual({ data: mockVehicle });
    });
  });

  describe('create()', () => {
    it('[P0] should use tenantId and userId from JWT', async () => {
      // GIVEN: Request with JWT context
      const req = createMockRequest({
        id: 'creator-user',
        tenantId: 'creator-tenant',
      });
      const input = {
        licensePlate: 'NEW-123',
        vehicleType: RentalVehicleType.TRAILER,
        brand: 'Test',
        model: 'Model',
        year: 2024,
      };
      vi.mocked(mockRepository.create).mockResolvedValue({ id: 'new-id', ...input } as never);

      // WHEN: Creating vehicle
      await controller.create(req, input);

      // THEN: Uses JWT context
      expect(mockRepository.create).toHaveBeenCalledWith('creator-tenant', input, 'creator-user');
    });

    it('[P1] should return created vehicle', async () => {
      // GIVEN: Valid input
      const req = createMockRequest();
      const input = {
        licensePlate: 'NEW-456',
        vehicleType: RentalVehicleType.AGGREGATOR,
        brand: 'Brand',
        model: 'Model',
        year: 2024,
      };
      const mockCreated = { id: 'created-id', ...input };
      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating vehicle
      const result = await controller.create(req, input);

      // THEN: Returns created vehicle
      expect(result).toEqual({ data: mockCreated });
    });
  });

  describe('update()', () => {
    it('[P0] should use tenantId from JWT for tenant isolation', async () => {
      // GIVEN: Request with JWT tenant
      const req = createMockRequest({ tenantId: 'update-tenant' });
      const input = { status: VehicleStatus.IN_SERVICE };
      vi.mocked(mockRepository.update).mockResolvedValue({ id: 'v1', ...input } as never);

      // WHEN: Updating vehicle
      await controller.update('v1', req, input);

      // THEN: Uses tenant from JWT
      expect(mockRepository.update).toHaveBeenCalledWith('v1', 'update-tenant', input);
    });
  });

  describe('delete()', () => {
    it('[P0] should use tenantId from JWT for tenant isolation', async () => {
      // GIVEN: Request with JWT tenant
      const req = createMockRequest({ tenantId: 'delete-tenant' });
      vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

      // WHEN: Deleting vehicle
      await controller.delete('v1', req);

      // THEN: Uses tenant from JWT
      expect(mockRepository.delete).toHaveBeenCalledWith('v1', 'delete-tenant');
    });
  });

  describe('findExpiring()', () => {
    it('[P0] should use tenantId from JWT', async () => {
      // GIVEN: Request with JWT
      const req = createMockRequest({ tenantId: 'expiry-tenant' });
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Finding expiring documents
      await controller.findExpiring(req);

      // THEN: Uses tenant from JWT
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith(
        'expiry-tenant',
        60 // default
      );
    });

    it('[P1] should use default 60 days when no parameter', async () => {
      // GIVEN: No days parameter
      const req = createMockRequest();
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Calling without days
      await controller.findExpiring(req);

      // THEN: Uses default 60 days
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith('tenant-456', 60);
    });

    it('[P1] should use custom days parameter', async () => {
      // GIVEN: Custom days parameter
      const req = createMockRequest();
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Calling with custom days
      await controller.findExpiring(req, '30');

      // THEN: Uses custom value
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith('tenant-456', 30);
    });

    it('[P1] should fall back to default for invalid days', async () => {
      // GIVEN: Invalid days parameter
      const req = createMockRequest();
      vi.mocked(mockRepository.findExpiringDocuments).mockResolvedValue([]);

      // WHEN: Calling with invalid days
      await controller.findExpiring(req, 'invalid');

      // THEN: Uses default
      expect(mockRepository.findExpiringDocuments).toHaveBeenCalledWith('tenant-456', 60);
    });
  });

  describe('findExpiringDetailed()', () => {
    it('[P1] should return structured expiring documents', async () => {
      // GIVEN: Expiring documents exist
      const mockDocuments = [
        {
          vehicleId: 'v1',
          vehicleType: 'rental',
          licensePlate: 'ABC-123',
          documentType: 'KGFB_INSURANCE',
          expiryDate: new Date(),
          daysUntilExpiry: 15,
        },
      ];
      const req = createMockRequest();
      vi.mocked(mockRepository.findExpiringDocumentsDetailed).mockResolvedValue(
        mockDocuments as never
      );

      // WHEN: Calling findExpiringDetailed
      const result = await controller.findExpiringDetailed(req);

      // THEN: Returns structured data
      expect(result).toEqual({ data: mockDocuments });
    });
  });

  describe('linkToRentalEquipment()', () => {
    it('[P0] should use tenantId from JWT', async () => {
      // GIVEN: Request with JWT
      const req = createMockRequest({ tenantId: 'link-tenant' });
      vi.mocked(mockRepository.linkToRentalEquipment).mockResolvedValue({
        id: 'v1',
        rentalEquipmentId: 'equip-123',
      } as never);

      // WHEN: Linking equipment
      await controller.linkToRentalEquipment('v1', req, { rentalEquipmentId: 'equip-123' });

      // THEN: Uses tenant from JWT
      expect(mockRepository.linkToRentalEquipment).toHaveBeenCalledWith(
        'v1',
        'link-tenant',
        'equip-123'
      );
    });
  });
});
