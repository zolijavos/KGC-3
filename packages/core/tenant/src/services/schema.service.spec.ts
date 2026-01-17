import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchemaService } from './schema.service';

/**
 * TDD Tests for SchemaService
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 8 teszt (TDD követelmény)
 */

// Mock PrismaService
const mockPrismaService = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  tenant: {
    update: vi.fn(),
  },
};

describe('SchemaService', () => {
  let schemaService: SchemaService;

  beforeEach(() => {
    vi.clearAllMocks();
    schemaService = new SchemaService(mockPrismaService as any);
  });

  // =========================================
  // CREATE SCHEMA TESTS (4 tesztek)
  // =========================================
  describe('createTenantSchema()', () => {
    // Valid UUID v4 format
    const VALID_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

    it('should create PostgreSQL schema for tenant', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);
      mockPrismaService.tenant.update.mockResolvedValue({});

      const result = await schemaService.createTenantSchema(VALID_UUID, 'kgc-szeged');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should generate correct schema name from slug', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);
      mockPrismaService.tenant.update.mockResolvedValue({});

      await schemaService.createTenantSchema(VALID_UUID, 'kgc-szeged');

      // Schema name should be tenant_kgc_szeged (slug with hyphens replaced)
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('tenant_kgc_szeged')
      );
    });

    it('should update tenant record with schema info', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);
      mockPrismaService.tenant.update.mockResolvedValue({});

      await schemaService.createTenantSchema(VALID_UUID, 'kgc-szeged');

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: expect.objectContaining({
          schemaName: 'tenant_kgc_szeged',
          schemaCreatedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if schema already exists', async () => {
      mockPrismaService.$executeRawUnsafe.mockRejectedValue(
        new Error('schema "tenant_kgc_szeged" already exists')
      );

      await expect(schemaService.createTenantSchema(VALID_UUID, 'kgc-szeged'))
        .rejects.toThrow('Séma már létezik');
    });
  });

  // =========================================
  // RUN MIGRATIONS TESTS (2 tesztek)
  // =========================================
  describe('runSchemaMigrations()', () => {
    // Valid UUID v4 format
    const VALID_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

    it('should create base tables in tenant schema', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await schemaService.runSchemaMigrations(VALID_UUID, 'tenant_kgc_szeged');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should throw error if schema does not exist', async () => {
      mockPrismaService.$executeRawUnsafe.mockRejectedValue(
        new Error('schema "tenant_nonexistent" does not exist')
      );

      await expect(schemaService.runSchemaMigrations(VALID_UUID, 'tenant_nonexistent'))
        .rejects.toThrow('Séma nem létezik');
    });
  });

  // =========================================
  // DROP SCHEMA TESTS (2 tesztek)
  // =========================================
  describe('dropTenantSchema()', () => {
    // Valid UUID v4 format
    const VALID_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

    it('should drop tenant schema with CASCADE', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);
      mockPrismaService.tenant.update.mockResolvedValue({});

      const result = await schemaService.dropTenantSchema(VALID_UUID, 'tenant_kgc_szeged');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP SCHEMA')
      );
    });

    it('should clear schema info from tenant record', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);
      mockPrismaService.tenant.update.mockResolvedValue({});

      await schemaService.dropTenantSchema(VALID_UUID, 'tenant_kgc_szeged');

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: {
          schemaName: null,
          schemaCreatedAt: null,
        },
      });
    });
  });

  // =========================================
  // UTILITY TESTS
  // =========================================
  describe('slugToSchemaName()', () => {
    it('should convert slug to valid PostgreSQL schema name', () => {
      expect(schemaService.slugToSchemaName('kgc-szeged')).toBe('tenant_kgc_szeged');
      expect(schemaService.slugToSchemaName('my-company-name')).toBe('tenant_my_company_name');
      expect(schemaService.slugToSchemaName('abc123')).toBe('tenant_abc123');
    });
  });
});
