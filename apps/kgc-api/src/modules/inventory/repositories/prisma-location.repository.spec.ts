/**
 * Unit tests for PrismaLocationRepository
 * Story INV-S3: PrismaLocationRepository
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaLocationRepository } from './prisma-location.repository';

// Mock Prisma Client
const mockPrismaClient = {
  locationStructure: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  stockLocation: {
    create: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

describe('PrismaLocationRepository', () => {
  let repository: PrismaLocationRepository;
  const tenantId = 'tenant-123';
  const warehouseId = 'warehouse-456';

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaLocationRepository(mockPrismaClient as never);
  });

  // ============================================
  // STRUCTURE TESTS
  // ============================================

  describe('createStructure()', () => {
    it('should create a location structure with K-P-D config', async () => {
      const structureData = {
        tenantId,
        warehouseId,
        kommandoPrefix: 'K',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: 10,
        maxPolcPerKommando: 5,
        maxDobozPerPolc: 20,
      };

      mockPrismaClient.locationStructure.findFirst.mockResolvedValue(null);
      mockPrismaClient.locationStructure.create.mockResolvedValue({
        id: 'struct-uuid-1',
        ...structureData,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.createStructure(structureData);

      expect(result.id).toBe('struct-uuid-1');
      expect(result.maxKommando).toBe(10);
      expect(result.kommandoPrefix).toBe('K');
    });

    it('should throw error on duplicate warehouse structure', async () => {
      mockPrismaClient.locationStructure.findFirst.mockResolvedValue({
        id: 'existing-struct',
        tenantId,
        warehouseId,
      });

      await expect(
        repository.createStructure({
          tenantId,
          warehouseId,
          kommandoPrefix: 'K',
          polcPrefix: 'P',
          dobozPrefix: 'D',
          separator: '-',
          maxKommando: 10,
          maxPolcPerKommando: 5,
          maxDobozPerPolc: 20,
        })
      ).rejects.toThrow(`Location structure already exists for warehouse ${warehouseId}`);
    });
  });

  describe('getStructure()', () => {
    it('should return structure when found', async () => {
      mockPrismaClient.locationStructure.findFirst.mockResolvedValue({
        id: 'struct-uuid-1',
        tenantId,
        warehouseId,
        kommandoPrefix: 'K',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: 10,
        maxPolcPerKommando: 5,
        maxDobozPerPolc: 20,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.getStructure(tenantId, warehouseId);

      expect(result).not.toBeNull();
      expect(result?.maxKommando).toBe(10);
    });

    it('should return null when not configured', async () => {
      mockPrismaClient.locationStructure.findFirst.mockResolvedValue(null);

      const result = await repository.getStructure(tenantId, warehouseId);

      expect(result).toBeNull();
    });
  });

  describe('updateStructure()', () => {
    it('should update structure fields', async () => {
      mockPrismaClient.locationStructure.findFirst.mockResolvedValue({
        id: 'struct-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.locationStructure.update.mockResolvedValue({
        id: 'struct-uuid-1',
        tenantId,
        warehouseId,
        kommandoPrefix: 'KOM',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: 15,
        maxPolcPerKommando: 5,
        maxDobozPerPolc: 20,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.updateStructure('struct-uuid-1', tenantId, {
        kommandoPrefix: 'KOM',
        maxKommando: 15,
      });

      expect(result.kommandoPrefix).toBe('KOM');
      expect(result.maxKommando).toBe(15);
    });

    it('should throw error when structure not found', async () => {
      mockPrismaClient.locationStructure.findFirst.mockResolvedValue(null);

      await expect(
        repository.updateStructure('non-existent', tenantId, { maxKommando: 20 })
      ).rejects.toThrow('Location structure not found: non-existent');
    });
  });

  // ============================================
  // LOCATION CRUD TESTS
  // ============================================

  describe('createLocation()', () => {
    it('should create a location with K-P-D values', async () => {
      const locationData = {
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'ACTIVE' as const,
        currentOccupancy: 0,
        isDeleted: false,
      };

      mockPrismaClient.stockLocation.findFirst.mockResolvedValue(null);
      mockPrismaClient.stockLocation.create.mockResolvedValue({
        id: 'loc-uuid-1',
        ...locationData,
        description: null,
        capacity: null,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.createLocation(locationData);

      expect(result.id).toBe('loc-uuid-1');
      expect(result.code).toBe('K1-P2-D3');
      expect(result.kommando).toBe(1);
      expect(result.polc).toBe(2);
      expect(result.doboz).toBe(3);
    });

    it('should throw error on duplicate location', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'existing-loc',
        code: 'K1-P2-D3',
      });

      await expect(
        repository.createLocation({
          tenantId,
          warehouseId,
          code: 'K1-P2-D3',
          kommando: 1,
          polc: 2,
          doboz: 3,
          status: 'ACTIVE',
          currentOccupancy: 0,
          isDeleted: false,
        })
      ).rejects.toThrow('Location K1-P2-D3 already exists in warehouse');
    });
  });

  describe('createLocations()', () => {
    it('should bulk create locations efficiently', async () => {
      mockPrismaClient.stockLocation.createMany.mockResolvedValue({ count: 100 });

      const locations = Array.from({ length: 100 }, (_, i) => ({
        tenantId,
        warehouseId,
        code: `K1-P1-D${i + 1}`,
        kommando: 1,
        polc: 1,
        doboz: i + 1,
        status: 'ACTIVE' as const,
        currentOccupancy: 0,
        isDeleted: false,
      }));

      const count = await repository.createLocations(locations);

      expect(count).toBe(100);
      expect(mockPrismaClient.stockLocation.createMany).toHaveBeenCalled();
    });

    it('should return 0 for empty array', async () => {
      const count = await repository.createLocations([]);

      expect(count).toBe(0);
      expect(mockPrismaClient.stockLocation.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findByCode()', () => {
    it('should find location by K-P-D code', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'ACTIVE',
        description: null,
        capacity: null,
        currentOccupancy: 5,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findByCode('K1-P2-D3', tenantId, warehouseId);

      expect(result).not.toBeNull();
      expect(result?.code).toBe('K1-P2-D3');
    });
  });

  describe('findById()', () => {
    it('should return location when found', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'ACTIVE',
        description: null,
        capacity: null,
        currentOccupancy: 0,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findById('loc-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('loc-uuid-1');
    });

    it('should return null when not found', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent', tenantId);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('query()', () => {
    it('should filter by kommando and polc', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      await repository.query({ tenantId, kommando: 1, polc: 2 });

      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ kommando: 1, polc: 2 }),
        })
      );
    });

    it('should filter availableOnly (non-full locations)', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      await repository.query({ tenantId, availableOnly: true });

      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'FULL' } }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(150);

      const result = await repository.query({ tenantId, offset: 50, limit: 25 });

      expect(result.offset).toBe(50);
      expect(result.limit).toBe(25);
      expect(result.total).toBe(150);
    });

    it('should support search by code', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      await repository.query({ tenantId, search: 'K1-P2' });

      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: { contains: 'K1-P2', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      await repository.query({ tenantId, status: 'ACTIVE' });

      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter by multiple statuses', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      await repository.query({ tenantId, status: ['ACTIVE', 'INACTIVE'] });

      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['ACTIVE', 'INACTIVE'] } }),
        })
      );
    });

    it('should combine status and availableOnly filters correctly', async () => {
      mockPrismaClient.stockLocation.findMany.mockResolvedValue([]);
      mockPrismaClient.stockLocation.count.mockResolvedValue(0);

      // Request ACTIVE and FULL, but also availableOnly (excludes FULL)
      await repository.query({ tenantId, status: ['ACTIVE', 'FULL'], availableOnly: true });

      // Should only include ACTIVE (FULL excluded by availableOnly)
      expect(mockPrismaClient.stockLocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['ACTIVE'] } }),
        })
      );
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('updateLocation()', () => {
    it('should update status and description', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'INACTIVE',
        description: 'Under maintenance',
        capacity: null,
        currentOccupancy: 0,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.updateLocation('loc-uuid-1', tenantId, {
        status: 'INACTIVE',
        description: 'Under maintenance',
      });

      expect(result.status).toBe('INACTIVE');
      expect(result.description).toBe('Under maintenance');
    });
  });

  describe('updateOccupancy()', () => {
    it('should increment occupancy', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        currentOccupancy: 5,
        capacity: 20,
        status: 'ACTIVE',
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'ACTIVE',
        description: null,
        capacity: 20,
        currentOccupancy: 8,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.updateOccupancy('loc-uuid-1', tenantId, 3);

      expect(result.currentOccupancy).toBe(8);
    });

    it('should set status to FULL when capacity reached', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        currentOccupancy: 18,
        capacity: 20,
        status: 'ACTIVE',
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'FULL',
        description: null,
        capacity: 20,
        currentOccupancy: 20,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.updateOccupancy('loc-uuid-1', tenantId, 2);

      expect(mockPrismaClient.stockLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FULL', currentOccupancy: 20 }),
        })
      );
    });

    it('should set status to ACTIVE when below capacity', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        currentOccupancy: 20,
        capacity: 20,
        status: 'FULL',
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'ACTIVE',
        description: null,
        capacity: 20,
        currentOccupancy: 18,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.updateOccupancy('loc-uuid-1', tenantId, -2);

      expect(mockPrismaClient.stockLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE', currentOccupancy: 18 }),
        })
      );
    });

    it('should preserve INACTIVE status when occupancy changes', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        currentOccupancy: 10,
        capacity: 20,
        status: 'INACTIVE', // Under maintenance
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        warehouseId,
        code: 'K1-P2-D3',
        kommando: 1,
        polc: 2,
        doboz: 3,
        status: 'INACTIVE',
        description: null,
        capacity: 20,
        currentOccupancy: 5,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.updateOccupancy('loc-uuid-1', tenantId, -5);

      // INACTIVE should be preserved even when occupancy decreases
      expect(mockPrismaClient.stockLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'INACTIVE', currentOccupancy: 5 }),
        })
      );
    });

    it('should throw error for negative occupancy', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        currentOccupancy: 2,
        capacity: 20,
        status: 'ACTIVE',
        isDeleted: false,
      });

      await expect(repository.updateOccupancy('loc-uuid-1', tenantId, -5)).rejects.toThrow(
        'Occupancy cannot be negative'
      );
    });
  });

  // ============================================
  // DELETE TESTS
  // ============================================

  describe('deleteLocation()', () => {
    it('should soft delete location', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue({
        id: 'loc-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.stockLocation.update.mockResolvedValue({});

      await repository.deleteLocation('loc-uuid-1', tenantId);

      expect(mockPrismaClient.stockLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDeleted: true, isActive: false }),
        })
      );
    });

    it('should throw error when location not found', async () => {
      mockPrismaClient.stockLocation.findFirst.mockResolvedValue(null);

      await expect(repository.deleteLocation('non-existent', tenantId)).rejects.toThrow(
        'Location not found: non-existent'
      );
    });
  });

  describe('deleteAllByWarehouse()', () => {
    it('should soft delete all warehouse locations', async () => {
      mockPrismaClient.stockLocation.updateMany.mockResolvedValue({ count: 50 });

      const count = await repository.deleteAllByWarehouse(tenantId, warehouseId);

      expect(count).toBe(50);
      expect(mockPrismaClient.stockLocation.updateMany).toHaveBeenCalledWith({
        where: { tenantId, warehouseId, isDeleted: false },
        data: expect.objectContaining({ isDeleted: true, isActive: false }),
      });
    });
  });
});
