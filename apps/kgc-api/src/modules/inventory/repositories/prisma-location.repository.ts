/**
 * Prisma Location Repository
 * Implements ILocationRepository for PostgreSQL persistence
 * Story INV-S3: PrismaLocationRepository
 */

import {
  ILocationRepository,
  LocationCode,
  LocationQuery,
  LocationQueryResult,
  LocationStatus,
  LocationStructure,
} from '@kgc/inventory';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  LocationStructure as PrismaLocationStructure,
  StockLocation as PrismaStockLocation,
} from '@prisma/client';

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Convert Prisma LocationStructure to domain interface
   */
  private toStructureDomain(structure: PrismaLocationStructure): LocationStructure {
    return {
      id: structure.id,
      tenantId: structure.tenantId,
      warehouseId: structure.warehouseId,
      kommandoPrefix: structure.kommandoPrefix,
      polcPrefix: structure.polcPrefix,
      dobozPrefix: structure.dobozPrefix,
      separator: structure.separator,
      maxKommando: structure.maxKommando,
      maxPolcPerKommando: structure.maxPolcPerKommando,
      maxDobozPerPolc: structure.maxDobozPerPolc,
      createdAt: structure.createdAt,
      updatedAt: structure.updatedAt,
    };
  }

  /**
   * Convert Prisma StockLocation to domain LocationCode interface
   */
  private toLocationDomain(location: PrismaStockLocation): LocationCode {
    const result: LocationCode = {
      id: location.id,
      tenantId: location.tenantId,
      warehouseId: location.warehouseId,
      code: location.code,
      kommando: location.kommando,
      polc: location.polc,
      doboz: location.doboz,
      status: location.status as LocationStatus,
      currentOccupancy: location.currentOccupancy,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      isDeleted: location.isDeleted,
    };
    if (location.description !== null) result.description = location.description;
    if (location.capacity !== null) result.capacity = location.capacity;
    return result;
  }

  // ============================================
  // STRUCTURE OPERATIONS
  // ============================================

  async createStructure(
    structure: Omit<LocationStructure, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LocationStructure> {
    // Check for duplicate structure for this warehouse
    const existing = await this.prisma.locationStructure.findFirst({
      where: {
        tenantId: structure.tenantId,
        warehouseId: structure.warehouseId,
        isDeleted: false,
      },
    });
    if (existing) {
      throw new Error(`Location structure already exists for warehouse ${structure.warehouseId}`);
    }

    const created = await this.prisma.locationStructure.create({
      data: {
        tenantId: structure.tenantId,
        warehouseId: structure.warehouseId,
        kommandoPrefix: structure.kommandoPrefix,
        polcPrefix: structure.polcPrefix,
        dobozPrefix: structure.dobozPrefix,
        separator: structure.separator,
        maxKommando: structure.maxKommando,
        maxPolcPerKommando: structure.maxPolcPerKommando,
        maxDobozPerPolc: structure.maxDobozPerPolc,
      },
    });

    return this.toStructureDomain(created);
  }

  async getStructure(tenantId: string, warehouseId: string): Promise<LocationStructure | null> {
    const structure = await this.prisma.locationStructure.findFirst({
      where: { tenantId, warehouseId, isDeleted: false },
    });
    return structure ? this.toStructureDomain(structure) : null;
  }

  async updateStructure(
    id: string,
    tenantId: string,
    data: Partial<Omit<LocationStructure, 'id' | 'tenantId' | 'warehouseId' | 'createdAt'>>
  ): Promise<LocationStructure> {
    // Verify structure exists and belongs to tenant
    const existing = await this.prisma.locationStructure.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Location structure not found: ${id}`);
    }

    const updateData: Prisma.LocationStructureUncheckedUpdateInput = {};

    if (data.kommandoPrefix !== undefined) updateData.kommandoPrefix = data.kommandoPrefix;
    if (data.polcPrefix !== undefined) updateData.polcPrefix = data.polcPrefix;
    if (data.dobozPrefix !== undefined) updateData.dobozPrefix = data.dobozPrefix;
    if (data.separator !== undefined) updateData.separator = data.separator;
    if (data.maxKommando !== undefined) updateData.maxKommando = data.maxKommando;
    if (data.maxPolcPerKommando !== undefined)
      updateData.maxPolcPerKommando = data.maxPolcPerKommando;
    if (data.maxDobozPerPolc !== undefined) updateData.maxDobozPerPolc = data.maxDobozPerPolc;

    const updated = await this.prisma.locationStructure.update({
      where: { id },
      data: updateData,
    });

    return this.toStructureDomain(updated);
  }

  // ============================================
  // LOCATION CRUD OPERATIONS
  // ============================================

  async createLocation(
    location: Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LocationCode> {
    // Check for duplicate location in this warehouse
    const existing = await this.prisma.stockLocation.findFirst({
      where: {
        warehouseId: location.warehouseId,
        code: location.code,
        isDeleted: false,
      },
    });
    if (existing) {
      throw new Error(`Location ${location.code} already exists in warehouse`);
    }

    const created = await this.prisma.stockLocation.create({
      data: {
        tenantId: location.tenantId,
        warehouseId: location.warehouseId,
        code: location.code,
        kommando: location.kommando,
        polc: location.polc,
        doboz: location.doboz,
        status: location.status,
        description: location.description ?? null,
        capacity: location.capacity ?? null,
        currentOccupancy: location.currentOccupancy,
        isDeleted: location.isDeleted,
      },
    });

    return this.toLocationDomain(created);
  }

  async createLocations(
    locations: Array<Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<number> {
    if (locations.length === 0) return 0;

    const result = await this.prisma.stockLocation.createMany({
      data: locations.map(loc => ({
        tenantId: loc.tenantId,
        warehouseId: loc.warehouseId,
        code: loc.code,
        kommando: loc.kommando,
        polc: loc.polc,
        doboz: loc.doboz,
        status: loc.status,
        description: loc.description ?? null,
        capacity: loc.capacity ?? null,
        currentOccupancy: loc.currentOccupancy,
        isDeleted: loc.isDeleted,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async findByCode(
    code: string,
    tenantId: string,
    warehouseId: string
  ): Promise<LocationCode | null> {
    const location = await this.prisma.stockLocation.findFirst({
      where: { code, tenantId, warehouseId, isDeleted: false },
    });
    return location ? this.toLocationDomain(location) : null;
  }

  async findById(id: string, tenantId: string): Promise<LocationCode | null> {
    const location = await this.prisma.stockLocation.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    return location ? this.toLocationDomain(location) : null;
  }

  async query(query: LocationQuery): Promise<LocationQueryResult> {
    const where: Prisma.StockLocationWhereInput = {
      tenantId: query.tenantId,
      isDeleted: false,
    };

    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.kommando !== undefined) where.kommando = query.kommando;
    if (query.polc !== undefined) where.polc = query.polc;

    // Status filter and availableOnly (combined logic to avoid overwriting)
    if (query.availableOnly && query.status) {
      // Both filters: combine them (status must match AND not be FULL)
      const statusValues = Array.isArray(query.status) ? query.status : [query.status];
      const filteredStatuses = statusValues.filter(s => s !== 'FULL');
      if (filteredStatuses.length > 0) {
        where.status = { in: filteredStatuses };
      } else {
        // All requested statuses were FULL, but availableOnly excludes FULL
        where.status = { in: [] }; // No results
      }
    } else if (query.availableOnly) {
      where.status = { not: 'FULL' };
    } else if (query.status) {
      if (Array.isArray(query.status)) {
        where.status = { in: query.status };
      } else {
        where.status = query.status;
      }
    }

    // Search filter (code search)
    if (query.search) {
      where.code = { contains: query.search, mode: 'insensitive' };
    }

    // Sorting
    let orderBy: Prisma.StockLocationOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy) {
      const sortOrder = query.sortOrder ?? 'asc';
      switch (query.sortBy) {
        case 'code':
          orderBy = { code: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'currentOccupancy':
          orderBy = { currentOccupancy: sortOrder };
          break;
      }
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;

    const [locations, total] = await Promise.all([
      this.prisma.stockLocation.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.stockLocation.count({ where }),
    ]);

    return {
      locations: locations.map(loc => this.toLocationDomain(loc)),
      total,
      offset,
      limit,
    };
  }

  async updateLocation(
    id: string,
    tenantId: string,
    data: Partial<Omit<LocationCode, 'id' | 'tenantId' | 'warehouseId' | 'code' | 'createdAt'>>
  ): Promise<LocationCode> {
    // Verify location exists and belongs to tenant
    const existing = await this.prisma.stockLocation.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Location not found: ${id}`);
    }

    const updateData: Prisma.StockLocationUncheckedUpdateInput = {};

    if (data.kommando !== undefined) updateData.kommando = data.kommando;
    if (data.polc !== undefined) updateData.polc = data.polc;
    if (data.doboz !== undefined) updateData.doboz = data.doboz;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.capacity !== undefined) updateData.capacity = data.capacity ?? null;
    if (data.currentOccupancy !== undefined) updateData.currentOccupancy = data.currentOccupancy;

    const updated = await this.prisma.stockLocation.update({
      where: { id },
      data: updateData,
    });

    return this.toLocationDomain(updated);
  }

  async updateOccupancy(id: string, tenantId: string, adjustment: number): Promise<LocationCode> {
    // Verify location exists and belongs to tenant
    const existing = await this.prisma.stockLocation.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Location not found: ${id}`);
    }

    const newOccupancy = existing.currentOccupancy + adjustment;
    if (newOccupancy < 0) {
      throw new Error('Occupancy cannot be negative');
    }

    // Determine new status based on occupancy and capacity
    // IMPORTANT: Preserve INACTIVE status (e.g., maintenance mode)
    let newStatus: 'ACTIVE' | 'FULL' | 'INACTIVE' = existing.status as
      | 'ACTIVE'
      | 'FULL'
      | 'INACTIVE';

    // Only auto-update status if not INACTIVE (INACTIVE is manually set)
    if (existing.status !== 'INACTIVE' && existing.capacity !== null) {
      if (newOccupancy >= existing.capacity) {
        newStatus = 'FULL';
      } else if (existing.status === 'FULL') {
        // Was full, now has space
        newStatus = 'ACTIVE';
      }
    }

    const updated = await this.prisma.stockLocation.update({
      where: { id },
      data: {
        currentOccupancy: newOccupancy,
        status: newStatus,
      },
    });

    return this.toLocationDomain(updated);
  }

  async deleteLocation(id: string, tenantId: string): Promise<void> {
    // Verify location exists and belongs to tenant
    const existing = await this.prisma.stockLocation.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) {
      throw new Error(`Location not found: ${id}`);
    }

    await this.prisma.stockLocation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async deleteAllByWarehouse(tenantId: string, warehouseId: string): Promise<number> {
    const result = await this.prisma.stockLocation.updateMany({
      where: {
        tenantId,
        warehouseId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return result.count;
  }
}
