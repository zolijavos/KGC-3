import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantService } from './services/tenant.service';
import { SchemaService } from './services/schema.service';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from './interfaces/tenant.interface';

/**
 * Integration Tests for TenantService
 * Teljes service flow tesztelése mock-olt Prisma-val
 */

// Valid UUIDs for testing
// Valid UUID v4 format (third group starts with 4, fourth with 8/9/a/b)
const VALID_UUID_1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';

// Mock PrismaClient
const mockPrisma = {
  tenant: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  tenantAuditLog: {
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  $transaction: vi.fn(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
    return callback(mockPrisma);
  }),
};

// Mock tenant data
const mockTenant = {
  id: VALID_UUID_1,
  name: 'KGC Szeged',
  slug: 'kgc-szeged',
  status: TenantStatus.ACTIVE,
  settings: DEFAULT_TENANT_SETTINGS,
  parentTenantId: null,
  schemaName: 'tenant_kgc_szeged',
  schemaCreatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('TenantService Integration Tests', () => {
  let tenantService: TenantService;
  let schemaService: SchemaService;

  beforeEach(() => {
    vi.clearAllMocks();
    schemaService = new SchemaService(mockPrisma as any);
    tenantService = new TenantService(mockPrisma as any, schemaService);
  });

  // =========================================
  // CREATE TENANT INTEGRATION TESTS
  // =========================================
  describe('createTenant() integration', () => {
    it('should create tenant with valid data and schema', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue(mockTenant);
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
      mockPrisma.tenant.update.mockResolvedValue(mockTenant);
      mockPrisma.tenantAuditLog.create.mockResolvedValue({});

      const createDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
      };

      const result = await tenantService.createTenant(createDto);

      expect(result.name).toBe('KGC Szeged');
      expect(result.slug).toBe('kgc-szeged');
      expect(mockPrisma.tenant.create).toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled(); // Schema created
    });

    it('should return validation error for missing name', async () => {
      const invalidDto = { slug: 'test-slug' };

      await expect(tenantService.createTenant(invalidDto as any))
        .rejects.toThrow();
    });

    it('should return validation error for invalid slug format', async () => {
      const invalidDto = {
        name: 'Test Tenant',
        slug: 'Invalid Slug With Spaces',
      };

      await expect(tenantService.createTenant(invalidDto as any))
        .rejects.toThrow();
    });

    it('should return error for duplicate slug', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'existing' });

      const createDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
      };

      await expect(tenantService.createTenant(createDto))
        .rejects.toThrow('A slug már foglalt');
    });
  });

  // =========================================
  // GET TENANTS INTEGRATION TESTS
  // =========================================
  describe('listTenants() integration', () => {
    it('should return paginated list of tenants', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([mockTenant]);
      mockPrisma.tenant.count.mockResolvedValue(1);

      const result = await tenantService.listTenants({
        page: 1,
        limit: 20,
        includeInactive: false,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter tenants by status', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([mockTenant]);
      mockPrisma.tenant.count.mockResolvedValue(1);

      await tenantService.listTenants({
        page: 1,
        limit: 20,
        status: TenantStatus.ACTIVE,
        includeInactive: false,
      });

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TenantStatus.ACTIVE,
          }),
        })
      );
    });

    it('should search tenants by name', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([mockTenant]);
      mockPrisma.tenant.count.mockResolvedValue(1);

      const result = await tenantService.listTenants({
        page: 1,
        limit: 20,
        search: 'szeged',
        includeInactive: false,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'szeged', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  // =========================================
  // GET TENANT BY ID INTEGRATION TESTS
  // =========================================
  describe('getTenantById() integration', () => {
    it('should return tenant by valid UUID', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await tenantService.getTenantById(VALID_UUID_1);

      expect(result).toEqual(mockTenant);
    });

    it('should return null for non-existent tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await tenantService.getTenantById(VALID_UUID_2);

      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(tenantService.getTenantById('invalid-uuid'))
        .rejects.toThrow('Érvénytelen tenant ID formátum');
    });
  });

  // =========================================
  // UPDATE TENANT INTEGRATION TESTS
  // =========================================
  describe('updateTenant() integration', () => {
    it('should update tenant name', async () => {
      const updatedTenant = { ...mockTenant, name: 'KGC Szeged Updated' };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant);
      mockPrisma.tenantAuditLog.create.mockResolvedValue({});

      const result = await tenantService.updateTenant(VALID_UUID_1, {
        name: 'KGC Szeged Updated',
      });

      expect(result.name).toBe('KGC Szeged Updated');
    });

    it('should update tenant status with audit log', async () => {
      const updatedTenant = { ...mockTenant, status: TenantStatus.SUSPENDED };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant);
      mockPrisma.tenantAuditLog.create.mockResolvedValue({});

      await tenantService.updateTenant(VALID_UUID_1, {
        status: TenantStatus.SUSPENDED,
      });

      expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STATUS_CHANGE',
        }),
      });
    });

    it('should throw error for non-existent tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        tenantService.updateTenant(VALID_UUID_2, { name: 'Test' })
      ).rejects.toThrow('Tenant nem található');
    });
  });

  // =========================================
  // DELETE TENANT INTEGRATION TESTS
  // =========================================
  describe('deleteTenant() integration', () => {
    it('should soft delete tenant', async () => {
      const deletedTenant = {
        ...mockTenant,
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.tenant.update.mockResolvedValue(deletedTenant);
      mockPrisma.tenantAuditLog.create.mockResolvedValue({});

      const result = await tenantService.deleteTenant(VALID_UUID_1);

      expect(result.status).toBe(TenantStatus.INACTIVE);
      expect(result.deletedAt).not.toBeNull();
    });

    it('should throw error if tenant already deleted', async () => {
      const alreadyDeletedTenant = {
        ...mockTenant,
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(alreadyDeletedTenant);

      await expect(tenantService.deleteTenant(VALID_UUID_1))
        .rejects.toThrow('Tenant már törölve');
    });
  });
});
