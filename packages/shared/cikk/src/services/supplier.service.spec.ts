/**
 * SupplierService unit tests
 * Story 8-3: Beszállító Kapcsolat és Import
 *
 * TDD: Red-Green-Refactor approach
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierStatus } from '../interfaces/supplier.interface';
import { SupplierService } from './supplier.service';

// Mock Prisma client
const mockPrismaSupplier = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
};

const mockPrisma = {
  supplier: mockPrismaSupplier,
  $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrisma)),
};

// Mock audit logger
const mockAuditLogger = {
  log: vi.fn(),
};

describe('SupplierService', () => {
  let service: SupplierService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const _validUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupplierService(mockPrisma as never, mockAuditLogger as never);
  });

  describe('createSupplier', () => {
    it('should create a supplier with valid input', async () => {
      const input = {
        code: 'MAKITA',
        name: 'Makita Hungary Kft.',
        description: 'Professzionális elektromos szerszámok',
        contactName: 'Kiss János',
        email: 'info@makita.hu',
        phone: '+36 1 234 5678',
        website: 'https://www.makita.hu',
      };

      const expectedSupplier = {
        id: 'supplier-uuid',
        tenantId,
        ...input,
        status: SupplierStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(null);
      mockPrismaSupplier.create.mockResolvedValue(expectedSupplier);

      const result = await service.createSupplier(tenantId, input, userId);

      expect(result).toEqual(expectedSupplier);
      expect(mockPrismaSupplier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          code: input.code,
          name: input.name,
          status: SupplierStatus.ACTIVE,
        }),
      });
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPLIER_CREATED',
          tenantId,
          userId,
        })
      );
    });

    it('should reject duplicate supplier code within same tenant', async () => {
      const input = {
        code: 'MAKITA',
        name: 'Makita Hungary',
      };

      mockPrismaSupplier.findFirst.mockResolvedValue({
        id: 'existing-supplier',
        code: 'MAKITA',
      });

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'Beszállító kód már létezik: MAKITA'
      );
    });

    it('should uppercase the supplier code', async () => {
      const input = {
        code: 'makita',
        name: 'Makita Hungary',
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(null);
      mockPrismaSupplier.create.mockResolvedValue({
        id: 'supplier-uuid',
        tenantId,
        code: 'MAKITA',
        name: input.name,
        status: SupplierStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSupplier(tenantId, input, userId);

      expect(result.code).toBe('MAKITA');
    });

    it('should create supplier with minimal input (only code and name)', async () => {
      const input = {
        code: 'STIHL',
        name: 'Stihl',
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(null);
      mockPrismaSupplier.create.mockResolvedValue({
        id: 'supplier-uuid',
        tenantId,
        ...input,
        description: null,
        contactName: null,
        email: null,
        phone: null,
        website: null,
        status: SupplierStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSupplier(tenantId, input, userId);

      expect(result.code).toBe('STIHL');
      expect(result.status).toBe(SupplierStatus.ACTIVE);
    });

    it('should reject empty supplier code', async () => {
      const input = { code: '  ', name: 'Test Supplier' };

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszállító kód kötelező'
      );
    });

    it('should reject empty supplier name', async () => {
      const input = { code: 'TEST', name: '   ' };

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszállító neve kötelező'
      );
    });

    it('should reject supplier code exceeding max length', async () => {
      const input = { code: 'A'.repeat(51), name: 'Test Supplier' };

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszállító kód maximum 50 karakter lehet'
      );
    });

    it('should reject supplier name exceeding max length', async () => {
      const input = { code: 'TEST', name: 'A'.repeat(256) };

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszállító neve maximum 255 karakter lehet'
      );
    });

    it('should reject invalid email format', async () => {
      const input = {
        code: 'TEST',
        name: 'Test Supplier',
        email: 'invalid-email',
      };

      await expect(service.createSupplier(tenantId, input, userId)).rejects.toThrow(
        'Érvénytelen email formátum'
      );
    });

    it('should accept valid email format', async () => {
      const input = {
        code: 'TEST',
        name: 'Test Supplier',
        email: 'test@example.com',
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(null);
      mockPrismaSupplier.create.mockResolvedValue({
        id: 'supplier-uuid',
        tenantId,
        ...input,
        status: SupplierStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSupplier(tenantId, input, userId);
      expect(result.id).toBe('supplier-uuid');
    });
  });

  describe('getSupplierById', () => {
    it('should return supplier by id', async () => {
      const supplier = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        code: 'MAKITA',
        name: 'Makita Hungary',
        status: SupplierStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(supplier);

      const result = await service.getSupplierById(
        '550e8400-e29b-41d4-a716-446655440001',
        tenantId
      );

      expect(result).toEqual(supplier);
      expect(mockPrismaSupplier.findFirst).toHaveBeenCalledWith({
        where: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          tenantId,
        },
      });
    });

    it('should return null for non-existent supplier', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      const result = await service.getSupplierById('non-existent', tenantId);

      expect(result).toBeNull();
    });

    it('should not return supplier from different tenant', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      const result = await service.getSupplierById(
        '550e8400-e29b-41d4-a716-446655440001',
        'different-tenant'
      );

      expect(result).toBeNull();
    });
  });

  describe('getSuppliers', () => {
    it('should return paginated supplier list', async () => {
      const suppliers = [
        { id: 'sup-1', code: 'MAKITA', name: 'Makita', status: SupplierStatus.ACTIVE },
        { id: 'sup-2', code: 'STIHL', name: 'Stihl', status: SupplierStatus.ACTIVE },
      ];

      mockPrismaSupplier.findMany.mockResolvedValue(suppliers);
      mockPrismaSupplier.count.mockResolvedValue(2);

      const result = await service.getSuppliers(tenantId, { page: 1, limit: 20 });

      expect(result.data).toEqual(suppliers);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by search term (name and code)', async () => {
      mockPrismaSupplier.findMany.mockResolvedValue([]);
      mockPrismaSupplier.count.mockResolvedValue(0);

      await service.getSuppliers(tenantId, { search: 'maki' });

      expect(mockPrismaSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'maki', mode: 'insensitive' } },
              { code: { contains: 'maki', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaSupplier.findMany.mockResolvedValue([]);
      mockPrismaSupplier.count.mockResolvedValue(0);

      await service.getSuppliers(tenantId, { status: SupplierStatus.INACTIVE });

      expect(mockPrismaSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SupplierStatus.INACTIVE,
          }),
        })
      );
    });

    it('should exclude inactive suppliers by default', async () => {
      mockPrismaSupplier.findMany.mockResolvedValue([]);
      mockPrismaSupplier.count.mockResolvedValue(0);

      await service.getSuppliers(tenantId, {});

      expect(mockPrismaSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SupplierStatus.ACTIVE,
          }),
        })
      );
    });

    it('should include inactive suppliers when requested', async () => {
      mockPrismaSupplier.findMany.mockResolvedValue([]);
      mockPrismaSupplier.count.mockResolvedValue(0);

      await service.getSuppliers(tenantId, { includeInactive: true });

      expect(mockPrismaSupplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            status: SupplierStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier fields', async () => {
      const existing = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        code: 'MAKITA',
        name: 'Makita Hungary',
        status: SupplierStatus.ACTIVE,
      };

      const updated = {
        ...existing,
        name: 'Makita Hungary Kft.',
        email: 'contact@makita.hu',
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(existing);
      mockPrismaSupplier.update.mockResolvedValue(updated);

      const result = await service.updateSupplier(
        '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        { name: 'Makita Hungary Kft.', email: 'contact@makita.hu' },
        userId
      );

      expect(result.name).toBe('Makita Hungary Kft.');
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPLIER_UPDATED',
        })
      );
    });

    it('should throw error for non-existent supplier', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier('non-existent', tenantId, { name: 'New Name' }, userId)
      ).rejects.toThrow('Beszállító nem található');
    });

    it('should not allow updating supplier code', async () => {
      const existing = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        code: 'MAKITA',
        name: 'Makita',
        status: SupplierStatus.ACTIVE,
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(existing);
      mockPrismaSupplier.update.mockResolvedValue(existing);

      // Code should be ignored in update
      await service.updateSupplier(
        '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        { name: 'Makita Updated' } as never,
        userId
      );

      expect(mockPrismaSupplier.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440001' },
        data: expect.not.objectContaining({ code: expect.anything() }),
      });
    });

    it('should reject invalid UUID format', async () => {
      await expect(
        service.updateSupplier('invalid-id', tenantId, { name: 'New Name' }, userId)
      ).rejects.toThrow('Érvénytelen beszállító ID formátum');
    });

    it('should reject empty name in update', async () => {
      await expect(
        service.updateSupplier(
          '550e8400-e29b-41d4-a716-446655440000',
          tenantId,
          { name: '   ' },
          userId
        )
      ).rejects.toThrow('A beszállító neve nem lehet üres');
    });

    it('should reject invalid email format in update', async () => {
      await expect(
        service.updateSupplier(
          '550e8400-e29b-41d4-a716-446655440000',
          tenantId,
          { email: 'not-an-email' },
          userId
        )
      ).rejects.toThrow('Érvénytelen email formátum');
    });
  });

  describe('deleteSupplier (soft delete)', () => {
    it('should soft delete supplier by setting status to INACTIVE', async () => {
      const existing = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        code: 'MAKITA',
        name: 'Makita',
        status: SupplierStatus.ACTIVE,
      };

      const deleted = {
        ...existing,
        status: SupplierStatus.INACTIVE,
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(existing);
      mockPrismaSupplier.update.mockResolvedValue(deleted);

      const result = await service.deleteSupplier(
        '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        userId
      );

      expect(result.status).toBe(SupplierStatus.INACTIVE);
      expect(mockPrismaSupplier.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440001' },
        data: { status: SupplierStatus.INACTIVE },
      });
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPLIER_DELETED',
        })
      );
    });

    it('should throw error when deleting non-existent supplier', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      await expect(service.deleteSupplier('non-existent', tenantId, userId)).rejects.toThrow(
        'Beszállító nem található'
      );
    });

    it('should throw error when supplier is already inactive', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        status: SupplierStatus.INACTIVE,
      });

      await expect(
        service.deleteSupplier('550e8400-e29b-41d4-a716-446655440001', tenantId, userId)
      ).rejects.toThrow('Beszállító már inaktív');
    });

    it('should reject invalid UUID format in delete', async () => {
      await expect(service.deleteSupplier('invalid-id', tenantId, userId)).rejects.toThrow(
        'Érvénytelen beszállító ID formátum'
      );
    });
  });

  describe('getSupplierByCode', () => {
    it('should return supplier by code within tenant', async () => {
      const supplier = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenantId,
        code: 'MAKITA',
        name: 'Makita',
        status: SupplierStatus.ACTIVE,
      };

      mockPrismaSupplier.findFirst.mockResolvedValue(supplier);

      const result = await service.getSupplierByCode('MAKITA', tenantId);

      expect(result).toEqual(supplier);
      expect(mockPrismaSupplier.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'MAKITA',
          tenantId,
        },
      });
    });

    it('should be case-insensitive for code lookup', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      await service.getSupplierByCode('makita', tenantId);

      expect(mockPrismaSupplier.findFirst).toHaveBeenCalledWith({
        where: {
          code: 'MAKITA',
          tenantId,
        },
      });
    });
  });
});
