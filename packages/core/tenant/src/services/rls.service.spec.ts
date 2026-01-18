import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RlsService } from './rls.service';

/**
 * TDD Tests for RlsService
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 10 teszt (TDD követelmény)
 */

// Valid UUID v4 format
const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const _VALID_TENANT_ID_2 = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';

// Mock PrismaService
const mockPrismaService = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $executeRawUnsafe: vi.fn(),
};

describe('RlsService', () => {
  let rlsService: RlsService;

  beforeEach(() => {
    vi.clearAllMocks();
    rlsService = new RlsService(mockPrismaService as any);
  });

  // =========================================
  // ENABLE RLS TESTS (3 tesztek)
  // =========================================
  describe('enableRls()', () => {
    it('should enable RLS on a table', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await rlsService.enableRls('tenant_kgc_szeged', 'partner');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ENABLE ROW LEVEL SECURITY')
      );
    });

    it('should validate schema name before enabling RLS', async () => {
      await expect(rlsService.enableRls('invalid schema!', 'partner')).rejects.toThrow(
        'Érvénytelen séma név'
      );
    });

    it('should validate table name before enabling RLS', async () => {
      await expect(rlsService.enableRls('tenant_kgc_szeged', 'invalid table!')).rejects.toThrow(
        'Érvénytelen tábla név'
      );
    });
  });

  // =========================================
  // CREATE POLICY TESTS (4 tesztek)
  // =========================================
  describe('createRlsPolicy()', () => {
    it('should create SELECT policy with USING clause', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await rlsService.createRlsPolicy({
        schemaName: 'tenant_kgc_szeged',
        tableName: 'partner',
        tenantIdColumn: 'tenant_id',
      });

      expect(result.success).toBe(true);
      expect(result.policiesCreated).toContain('tenant_isolation_select');
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FOR SELECT')
      );
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('USING')
      );
    });

    it('should create INSERT policy with WITH CHECK clause', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      await rlsService.createRlsPolicy({
        schemaName: 'tenant_kgc_szeged',
        tableName: 'partner',
      });

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FOR INSERT')
      );
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('WITH CHECK')
      );
    });

    it('should create UPDATE policy with USING and WITH CHECK', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      await rlsService.createRlsPolicy({
        schemaName: 'tenant_kgc_szeged',
        tableName: 'partner',
      });

      // UPDATE needs both USING and WITH CHECK
      const calls = mockPrismaService.$executeRawUnsafe.mock.calls
        .map(call => call[0])
        .filter((sql: string) => sql.includes('FOR UPDATE'));

      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]).toContain('USING');
      expect(calls[0]).toContain('WITH CHECK');
    });

    it('should create DELETE policy with USING clause', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      await rlsService.createRlsPolicy({
        schemaName: 'tenant_kgc_szeged',
        tableName: 'partner',
      });

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FOR DELETE')
      );
    });
  });

  // =========================================
  // DROP POLICY TESTS (2 tesztek)
  // =========================================
  describe('dropRlsPolicy()', () => {
    it('should drop all RLS policies from a table', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await rlsService.dropRlsPolicy('tenant_kgc_szeged', 'partner');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DROP POLICY')
      );
    });

    it('should validate schema and table names before dropping', async () => {
      await expect(rlsService.dropRlsPolicy('invalid!', 'partner')).rejects.toThrow(
        'Érvénytelen séma név'
      );
    });
  });

  // =========================================
  // SESSION CONTEXT TESTS (4 tesztek)
  // =========================================
  describe('setTenantContext()', () => {
    it('should set tenant context session variable using parameterized query', async () => {
      // Implementation uses $executeRaw (parameterized) for security
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await rlsService.setTenantContext(VALID_TENANT_ID);

      // Verify $executeRaw was called (parameterized query)
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should validate tenant ID format (UUID)', async () => {
      await expect(rlsService.setTenantContext('invalid-uuid')).rejects.toThrow(
        'Érvénytelen tenant ID'
      );
    });

    it('should set super admin flag when specified', async () => {
      // Both calls use $executeRaw (parameterized)
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await rlsService.setTenantContext(VALID_TENANT_ID, { isSuperAdmin: true });

      // Should be called twice: once for tenant_id, once for is_super_admin
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearTenantContext()', () => {
    it('should clear tenant context session variable', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      await rlsService.clearTenantContext();

      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('RESET app.current_tenant_id')
      );
    });
  });

  // =========================================
  // BULK OPERATIONS TESTS (2 tesztek)
  // =========================================
  describe('enableRlsOnAllTables()', () => {
    it('should enable RLS on all tables in schema', async () => {
      // Mock getting list of tables
      mockPrismaService.$queryRaw.mockResolvedValue([
        { table_name: 'partner' },
        { table_name: 'cikk' },
        { table_name: 'berles' },
      ]);
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await rlsService.enableRlsOnAllTables('tenant_kgc_szeged');

      expect(result.tablesProcessed).toBe(3);
      expect(result.tablesSuccessful).toBe(3);
    });

    it('should report failed tables in bulk operation', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { table_name: 'partner' },
        { table_name: 'cikk' },
      ]);
      mockPrismaService.$executeRawUnsafe
        .mockResolvedValueOnce(1) // partner success
        .mockRejectedValueOnce(new Error('permission denied')); // cikk fails

      const result = await rlsService.enableRlsOnAllTables('tenant_kgc_szeged');

      expect(result.tablesSuccessful).toBe(1);
      expect(result.tablesFailed).toBe(1);
    });
  });

  // =========================================
  // SECURITY TESTS (2 tesztek)
  // =========================================
  describe('SQL Injection Protection', () => {
    it('should reject SQL injection in schema name', async () => {
      await expect(rlsService.enableRls("tenant'; DROP TABLE users;--", 'partner')).rejects.toThrow(
        'Érvénytelen séma név'
      );
    });

    it('should reject SQL injection in table name', async () => {
      await expect(
        rlsService.enableRls('tenant_kgc_szeged', "partner'; DROP TABLE users;--")
      ).rejects.toThrow('Érvénytelen tábla név');
    });
  });

  // =========================================
  // ADDITIONAL TESTS (5 tesztek)
  // =========================================
  describe('getCurrentTenant()', () => {
    it('should return current tenant from session', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ current_tenant: VALID_TENANT_ID }]);

      const result = await rlsService.getCurrentTenant();

      expect(result).toBe(VALID_TENANT_ID);
    });

    it('should return null when no tenant set', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ current_tenant: null }]);

      const result = await rlsService.getCurrentTenant();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('connection error'));

      const result = await rlsService.getCurrentTenant();

      expect(result).toBeNull();
    });
  });

  describe('createSuperAdminBypassPolicy()', () => {
    it('should create super admin bypass policy', async () => {
      mockPrismaService.$executeRawUnsafe.mockResolvedValue(1);

      const result = await rlsService.createSuperAdminBypassPolicy('tenant_kgc_szeged', 'partner');

      expect(result).toBe(true);
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('super_admin_bypass')
      );
      expect(mockPrismaService.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('app.is_super_admin')
      );
    });
  });

  describe('getRlsStatus()', () => {
    it('should return RLS status for a table', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ relrowsecurity: true }]);

      const result = await rlsService.getRlsStatus('tenant_kgc_szeged', 'partner');

      expect(result).toBe(true);
    });

    it('should return false when RLS not enabled', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ relrowsecurity: false }]);

      const result = await rlsService.getRlsStatus('tenant_kgc_szeged', 'partner');

      expect(result).toBe(false);
    });
  });
});
