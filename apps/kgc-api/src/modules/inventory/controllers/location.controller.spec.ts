/**
 * LocationController Unit Tests
 * Story 9-2: K-P-D helykód rendszer
 *
 * Note: Using direct instantiation instead of NestJS TestingModule
 * because the service has repository dependencies that complicate DI mocking.
 */

import type { LocationService } from '@kgc/inventory';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { LocationController } from './location.controller';

type MockedLocationService = {
  [K in keyof LocationService]: Mock;
};

describe('LocationController', () => {
  let controller: LocationController;
  let mockLocationService: MockedLocationService;

  const mockRequest = {
    user: {
      id: 'user-123',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    },
  };

  const mockLocation = {
    id: 'loc-1',
    tenantId: 'tenant-123',
    warehouseId: 'wh-1',
    code: 'K1-P2-D3',
    kommando: 1,
    polc: 2,
    doboz: 3,
    status: 'ACTIVE' as const,
    currentOccupancy: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStructure = {
    id: 'struct-1',
    tenantId: 'tenant-123',
    warehouseId: 'wh-1',
    kommandoPrefix: 'K',
    polcPrefix: 'P',
    dobozPrefix: 'D',
    separator: '-',
    maxKommando: 10,
    maxPolcPerKommando: 5,
    maxDobozPerPolc: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockLocationService = {
      queryLocations: vi.fn(),
      findById: vi.fn(),
      findByCode: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
      getStructure: vi.fn(),
      createStructure: vi.fn(),
      updateStructure: vi.fn(),
      generateLocations: vi.fn(),
      deleteAllByWarehouse: vi.fn(),
      validateCode: vi.fn(),
    } as unknown as MockedLocationService;

    // Direct instantiation with mock service
    controller = new LocationController(mockLocationService as unknown as LocationService);
  });

  describe('list', () => {
    it('should return list of locations', async () => {
      const queryResult = {
        locations: [mockLocation],
        total: 1,
        offset: 0,
        limit: 20,
      };
      mockLocationService.queryLocations.mockResolvedValue(queryResult);

      const result = await controller.list(mockRequest);

      expect(result).toEqual({ data: queryResult });
      expect(mockLocationService.queryLocations).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
      });
    });

    it('should pass filter parameters', async () => {
      const queryResult = { locations: [], total: 0, offset: 0, limit: 20 };
      mockLocationService.queryLocations.mockResolvedValue(queryResult);

      await controller.list(
        mockRequest,
        'wh-1',
        'ACTIVE',
        '1',
        '2',
        'true',
        'K1',
        'code',
        'asc',
        '0',
        '50'
      );

      expect(mockLocationService.queryLocations).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        warehouseId: 'wh-1',
        status: 'ACTIVE',
        kommando: 1,
        polc: 2,
        availableOnly: true,
        search: 'K1',
        sortBy: 'code',
        sortOrder: 'asc',
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('findById', () => {
    it('should return location by ID', async () => {
      mockLocationService.findById.mockResolvedValue(mockLocation);

      const result = await controller.findById(mockRequest, 'loc-1');

      expect(result).toEqual({ data: mockLocation });
    });

    it('should return error if not found', async () => {
      mockLocationService.findById.mockResolvedValue(null);

      const result = await controller.findById(mockRequest, 'invalid');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Helykód nem található' },
      });
    });
  });

  describe('findByCode', () => {
    it('should return location by code', async () => {
      mockLocationService.findByCode.mockResolvedValue(mockLocation);

      const result = await controller.findByCode(mockRequest, 'wh-1', 'K1-P2-D3');

      expect(result).toEqual({ data: mockLocation });
      expect(mockLocationService.findByCode).toHaveBeenCalledWith('K1-P2-D3', 'tenant-123', 'wh-1');
    });

    it('should return error if not found', async () => {
      mockLocationService.findByCode.mockResolvedValue(null);

      const result = await controller.findByCode(mockRequest, 'wh-1', 'K99-P99-D99');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Helykód nem található' },
      });
    });
  });

  describe('update', () => {
    it('should update location', async () => {
      const updated = { ...mockLocation, status: 'FULL' as const };
      mockLocationService.updateLocation.mockResolvedValue(updated);

      const result = await controller.update(mockRequest, 'loc-1', {
        status: 'FULL',
      });

      expect(result).toEqual({ data: updated });
    });

    it('should return NOT_FOUND error', async () => {
      mockLocationService.updateLocation.mockRejectedValue(new Error('Helykód nem található'));

      const result = await controller.update(mockRequest, 'invalid', {
        status: 'INACTIVE',
      });

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Helykód nem található' },
      });
    });
  });

  describe('delete', () => {
    it('should delete location', async () => {
      mockLocationService.deleteLocation.mockResolvedValue(undefined);

      const result = await controller.delete(mockRequest, 'loc-1');

      expect(result).toBeUndefined();
    });

    it('should return error if cannot delete', async () => {
      mockLocationService.deleteLocation.mockRejectedValue(
        new Error('Foglalt helykód nem törölhető')
      );

      const result = await controller.delete(mockRequest, 'loc-1');

      expect(result).toEqual({
        error: { code: 'INVALID_OPERATION', message: 'Foglalt helykód nem törölhető' },
      });
    });
  });

  describe('getStructure', () => {
    it('should return location structure', async () => {
      mockLocationService.getStructure.mockResolvedValue(mockStructure);

      const result = await controller.getStructure(mockRequest, 'wh-1');

      expect(result).toEqual({ data: mockStructure });
    });

    it('should return error if structure not found', async () => {
      mockLocationService.getStructure.mockResolvedValue(null);

      const result = await controller.getStructure(mockRequest, 'wh-1');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Helykód struktúra nem található' },
      });
    });
  });

  describe('createStructure', () => {
    it('should create structure', async () => {
      mockLocationService.createStructure.mockResolvedValue(mockStructure);

      const input = {
        warehouseId: 'wh-1',
        kommandoPrefix: 'K',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: 10,
        maxPolcPerKommando: 5,
        maxDobozPerPolc: 10,
      };
      const result = await controller.createStructure(mockRequest, input);

      expect(result).toEqual({ data: mockStructure });
    });

    it('should return error on duplicate', async () => {
      mockLocationService.createStructure.mockRejectedValue(
        new Error('A raktárhoz már létezik helykód struktúra')
      );

      const input = {
        warehouseId: 'wh-1',
        kommandoPrefix: 'K',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: 10,
        maxPolcPerKommando: 5,
        maxDobozPerPolc: 10,
      };
      const result = await controller.createStructure(mockRequest, input);

      expect(result).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'A raktárhoz már létezik helykód struktúra' },
      });
    });
  });

  describe('updateStructure', () => {
    it('should update structure', async () => {
      const updated = { ...mockStructure, maxKommando: 20 };
      mockLocationService.updateStructure.mockResolvedValue(updated);

      const result = await controller.updateStructure(mockRequest, 'struct-1', {
        maxKommando: 20,
      });

      expect(result).toEqual({ data: updated });
    });
  });

  describe('generateLocations', () => {
    it('should generate locations', async () => {
      const generationResult = {
        totalCreated: 500,
        structureId: 'struct-1',
        sampleCodes: ['K1-P1-D1', 'K1-P1-D2'],
      };
      mockLocationService.generateLocations.mockResolvedValue(generationResult);

      const input = {
        warehouseId: 'wh-1',
        kommandoCount: 10,
        polcCount: 5,
        dobozCount: 10,
      };
      const result = await controller.generateLocations(mockRequest, input);

      expect(result).toEqual({ data: generationResult });
    });

    it('should return error on limit exceeded', async () => {
      mockLocationService.generateLocations.mockRejectedValue(
        new Error('Maximum 50,000 helykód generálható egyszerre')
      );

      const input = {
        warehouseId: 'wh-1',
        kommandoCount: 100,
        polcCount: 100,
        dobozCount: 100,
      };
      const result = await controller.generateLocations(mockRequest, input);

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 50,000 helykód generálható egyszerre',
        },
      });
    });
  });

  describe('deleteAllByWarehouse', () => {
    it('should delete all locations in warehouse', async () => {
      mockLocationService.deleteAllByWarehouse.mockResolvedValue(500);

      const result = await controller.deleteAllByWarehouse(mockRequest, 'wh-1');

      expect(result).toEqual({ data: { deletedCount: 500 } });
    });
  });

  describe('validateCode', () => {
    it('should validate location code', async () => {
      const validationResult = {
        isValid: true,
        parsed: { kommando: 1, polc: 2, doboz: 3, original: 'K1-P2-D3' },
      };
      mockLocationService.validateCode.mockResolvedValue(validationResult);

      const result = await controller.validateCode(mockRequest, {
        code: 'K1-P2-D3',
        warehouseId: 'wh-1',
      });

      expect(result).toEqual({ data: validationResult });
      expect(mockLocationService.validateCode).toHaveBeenCalledWith(
        'tenant-123',
        'wh-1',
        'K1-P2-D3'
      );
    });

    it('should return invalid result for bad code', async () => {
      const validationResult = {
        isValid: false,
        errorCode: 'INVALID_FORMAT' as const,
        errorMessage: 'Érvénytelen helykód formátum',
      };
      mockLocationService.validateCode.mockResolvedValue(validationResult);

      const result = await controller.validateCode(mockRequest, {
        code: 'INVALID',
        warehouseId: 'wh-1',
      });

      expect(result).toEqual({ data: validationResult });
    });
  });
});
