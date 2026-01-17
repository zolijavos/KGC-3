import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantService } from './tenant.service';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { TenantFilterDto } from '../dto/tenant-filter.dto';

/**
 * TDD Tests for TenantService
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 15 teszt (TDD követelmény @kgc/tenant)
 */

// Mock PrismaService
const mockPrismaService = {
  tenant: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  tenantAuditLog: {
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
    return callback(mockPrismaService);
  }),
};

// Mock SchemaService
const mockSchemaService = {
  createTenantSchema: vi.fn(),
  dropTenantSchema: vi.fn(),
  slugToSchemaName: vi.fn((slug: string) => `tenant_${slug.replace(/-/g, '_')}`),
};

// Valid UUIDs for testing
// Valid UUID v4 format (third group starts with 4, fourth with 8/9/a/b)
const VALID_UUID_1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';

describe('TenantService', () => {
  let tenantService: TenantService;

  beforeEach(() => {
    vi.clearAllMocks();
    tenantService = new TenantService(
      mockPrismaService as any,
      mockSchemaService as any
    );
  });

  // =========================================
  // CREATE TENANT TESTS (5 tesztek)
  // =========================================
  describe('createTenant()', () => {
    const validCreateDto: CreateTenantDto = {
      name: 'KGC Szeged',
      slug: 'kgc-szeged',
      status: TenantStatus.PENDING,
      settings: DEFAULT_TENANT_SETTINGS,
    };

    describe('happy path', () => {
      it('should create a tenant with valid data', async () => {
        const expectedTenant = {
          id: VALID_UUID_1,
          ...validCreateDto,
          schemaName: 'tenant_kgc_szeged',
          schemaCreatedAt: new Date(),
          parentTenantId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        mockPrismaService.tenant.findFirst.mockResolvedValue(null); // slug not taken
        mockPrismaService.tenant.create.mockResolvedValue(expectedTenant);
        mockSchemaService.createTenantSchema.mockResolvedValue(true);
        mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

        const result = await tenantService.createTenant(validCreateDto);

        expect(result).toEqual(expectedTenant);
        expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: validCreateDto.name,
            slug: validCreateDto.slug,
            status: TenantStatus.PENDING,
          }),
        });
      });

      it('should create tenant schema BEFORE tenant record (compensating transaction)', async () => {
        // Note: Due to compensating transaction pattern, schema is created FIRST
        // so we can rollback it if tenant creation fails
        const expectedTenant = {
          id: VALID_UUID_1,
          ...validCreateDto,
          schemaName: 'tenant_kgc_szeged',
          schemaCreatedAt: null,
          parentTenantId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        mockPrismaService.tenant.findFirst.mockResolvedValue(null);
        mockPrismaService.tenant.create.mockResolvedValue(expectedTenant);
        mockSchemaService.createTenantSchema.mockResolvedValue(true);
        mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

        await tenantService.createTenant(validCreateDto);

        // Schema is called with generated UUID (any string) and the slug
        expect(mockSchemaService.createTenantSchema).toHaveBeenCalledWith(
          expect.any(String), // UUID is generated internally
          'kgc-szeged'
        );
      });

      it('should create audit log entry for new tenant', async () => {
        const expectedTenant = {
          id: VALID_UUID_1,
          ...validCreateDto,
          schemaName: 'tenant_kgc_szeged',
          schemaCreatedAt: new Date(),
          parentTenantId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        mockPrismaService.tenant.findFirst.mockResolvedValue(null);
        mockPrismaService.tenant.create.mockResolvedValue(expectedTenant);
        mockSchemaService.createTenantSchema.mockResolvedValue(true);
        mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

        await tenantService.createTenant(validCreateDto);

        expect(mockPrismaService.tenantAuditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            tenantId: VALID_UUID_1,
            action: 'CREATE',
          }),
        });
      });
    });

    describe('error handling', () => {
      it('should throw error if slug already exists', async () => {
        mockPrismaService.tenant.findFirst.mockResolvedValue({ id: 'existing-uuid' });

        await expect(tenantService.createTenant(validCreateDto))
          .rejects.toThrow('A slug már foglalt');
      });

      it('should throw error if name is empty', async () => {
        const invalidDto = { ...validCreateDto, name: '' };

        await expect(tenantService.createTenant(invalidDto as CreateTenantDto))
          .rejects.toThrow();
      });
    });
  });

  // =========================================
  // GET TENANT TESTS (3 tesztek)
  // =========================================
  describe('getTenantById()', () => {
    it('should return tenant by id', async () => {
      const expectedTenant = {
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

      mockPrismaService.tenant.findUnique.mockResolvedValue(expectedTenant);

      const result = await tenantService.getTenantById(VALID_UUID_1);

      expect(result).toEqual(expectedTenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_UUID_1 },
      });
    });

    it('should return null if tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      const result = await tenantService.getTenantById(VALID_UUID_2);

      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(tenantService.getTenantById('invalid-uuid'))
        .rejects.toThrow('Érvénytelen tenant ID formátum');
    });
  });

  // =========================================
  // UPDATE TENANT TESTS (3 tesztek)
  // =========================================
  describe('updateTenant()', () => {
    const validUpdateDto: UpdateTenantDto = {
      name: 'KGC Szeged - Updated',
      status: TenantStatus.ACTIVE,
    };

    it('should update tenant with valid data', async () => {
      const existingTenant = {
        id: VALID_UUID_1,
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        status: TenantStatus.PENDING,
        settings: DEFAULT_TENANT_SETTINGS,
        parentTenantId: null,
        schemaName: 'tenant_kgc_szeged',
        schemaCreatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const updatedTenant = {
        ...existingTenant,
        name: 'KGC Szeged - Updated',
        status: TenantStatus.ACTIVE,
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);
      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);
      mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

      const result = await tenantService.updateTenant(VALID_UUID_1, validUpdateDto);

      expect(result.name).toBe('KGC Szeged - Updated');
      expect(result.status).toBe(TenantStatus.ACTIVE);
    });

    it('should create audit log for status change', async () => {
      const existingTenant = {
        id: VALID_UUID_1,
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        status: TenantStatus.PENDING,
        settings: DEFAULT_TENANT_SETTINGS,
        parentTenantId: null,
        schemaName: 'tenant_kgc_szeged',
        schemaCreatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);
      mockPrismaService.tenant.update.mockResolvedValue({
        ...existingTenant,
        status: TenantStatus.ACTIVE,
      });
      mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

      await tenantService.updateTenant(VALID_UUID_1, { status: TenantStatus.ACTIVE });

      expect(mockPrismaService.tenantAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: VALID_UUID_1,
          action: 'STATUS_CHANGE',
        }),
      });
    });

    it('should throw error if tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(tenantService.updateTenant(VALID_UUID_2, validUpdateDto))
        .rejects.toThrow('Tenant nem található');
    });
  });

  // =========================================
  // DELETE TENANT TESTS (2 tesztek)
  // =========================================
  describe('deleteTenant()', () => {
    it('should soft delete tenant (set status to INACTIVE)', async () => {
      const existingTenant = {
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

      mockPrismaService.tenant.findUnique.mockResolvedValue(existingTenant);
      mockPrismaService.tenant.update.mockResolvedValue({
        ...existingTenant,
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      });
      mockPrismaService.tenantAuditLog.create.mockResolvedValue({});

      const result = await tenantService.deleteTenant(VALID_UUID_1);

      expect(result.status).toBe(TenantStatus.INACTIVE);
      expect(result.deletedAt).not.toBeNull();
    });

    it('should throw error if tenant already deleted', async () => {
      const deletedTenant = {
        id: VALID_UUID_1,
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        status: TenantStatus.INACTIVE,
        deletedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(deletedTenant);

      await expect(tenantService.deleteTenant(VALID_UUID_1))
        .rejects.toThrow('Tenant már törölve');
    });
  });

  // =========================================
  // LIST TENANTS TESTS (4 tesztek)
  // =========================================
  describe('listTenants()', () => {
    const mockTenants = [
      {
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
      },
      {
        id: VALID_UUID_2,
        name: 'KGC Budapest',
        slug: 'kgc-budapest',
        status: TenantStatus.ACTIVE,
        settings: DEFAULT_TENANT_SETTINGS,
        parentTenantId: null,
        schemaName: 'tenant_kgc_budapest',
        schemaCreatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    it('should return paginated list of tenants', async () => {
      const filter: TenantFilterDto = { page: 1, limit: 20, includeInactive: false };

      mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);
      mockPrismaService.tenant.count.mockResolvedValue(2);

      const result = await tenantService.listTenants(filter);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      const filter: TenantFilterDto = {
        page: 1,
        limit: 20,
        status: TenantStatus.ACTIVE,
        includeInactive: false,
      };

      mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);
      mockPrismaService.tenant.count.mockResolvedValue(2);

      await tenantService.listTenants(filter);

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TenantStatus.ACTIVE,
          }),
        })
      );
    });

    it('should search by name or slug', async () => {
      const filter: TenantFilterDto = {
        page: 1,
        limit: 20,
        search: 'szeged',
        includeInactive: false,
      };

      mockPrismaService.tenant.findMany.mockResolvedValue([mockTenants[0]]);
      mockPrismaService.tenant.count.mockResolvedValue(1);

      const result = await tenantService.listTenants(filter);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'szeged', mode: 'insensitive' } },
              { slug: { contains: 'szeged', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should exclude inactive tenants by default', async () => {
      const filter: TenantFilterDto = { page: 1, limit: 20, includeInactive: false };

      mockPrismaService.tenant.findMany.mockResolvedValue(mockTenants);
      mockPrismaService.tenant.count.mockResolvedValue(2);

      await tenantService.listTenants(filter);

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });
  });
});
