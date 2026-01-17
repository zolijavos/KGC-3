import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HoldingService } from './holding.service';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * TDD Tests for HoldingService
 * RED phase - minimum 8 teszt
 */

// Valid UUID v4 format
const ROOT_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const CHILD_TENANT_1_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const CHILD_TENANT_2_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';
const GRANDCHILD_TENANT_ID = 'd4e5f6a7-b8c9-4123-0abc-234567890123';

// Mock TenantService
const mockTenantService = {
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
  listTenants: vi.fn(),
};

// Helper to create mock tenant
const createMockTenant = (
  id: string,
  name: string,
  parentTenantId: string | null = null
) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
  status: TenantStatus.ACTIVE,
  settings: DEFAULT_TENANT_SETTINGS,
  parentTenantId,
  schemaName: `tenant_${name.toLowerCase().replace(/ /g, '_')}`,
  schemaCreatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

// Mock tenants
const rootTenant = createMockTenant(ROOT_TENANT_ID, 'KGC Holding', null);
const childTenant1 = createMockTenant(CHILD_TENANT_1_ID, 'KGC Szeged', ROOT_TENANT_ID);
const childTenant2 = createMockTenant(CHILD_TENANT_2_ID, 'KGC Budapest', ROOT_TENANT_ID);
const grandchildTenant = createMockTenant(GRANDCHILD_TENANT_ID, 'KGC Szeged Outlet', CHILD_TENANT_1_ID);

describe('HoldingService', () => {
  let holdingService: HoldingService;

  beforeEach(() => {
    vi.clearAllMocks();
    holdingService = new HoldingService(mockTenantService as any);
  });

  // =========================================
  // PARENT-CHILD RELATIONSHIP TESTS (3 tesztek)
  // =========================================
  describe('getChildTenants()', () => {
    it('should return child tenants for parent', async () => {
      mockTenantService.listTenants.mockResolvedValue({
        data: [childTenant1, childTenant2],
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      });

      const children = await holdingService.getChildTenants(ROOT_TENANT_ID);

      expect(children).toHaveLength(2);
      expect(children[0]?.id).toBe(CHILD_TENANT_1_ID);
      expect(children[1]?.id).toBe(CHILD_TENANT_2_ID);
    });

    it('should return empty array for tenant without children', async () => {
      mockTenantService.listTenants.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      });

      const children = await holdingService.getChildTenants(CHILD_TENANT_2_ID);

      expect(children).toHaveLength(0);
    });
  });

  describe('getParentTenant()', () => {
    it('should return parent tenant', async () => {
      mockTenantService.getTenantById.mockResolvedValue(childTenant1);
      mockTenantService.getTenantById.mockResolvedValueOnce(childTenant1);
      mockTenantService.getTenantById.mockResolvedValueOnce(rootTenant);

      const parent = await holdingService.getParentTenant(CHILD_TENANT_1_ID);

      expect(parent?.id).toBe(ROOT_TENANT_ID);
    });

    it('should return null for root tenant', async () => {
      mockTenantService.getTenantById.mockResolvedValue(rootTenant);

      const parent = await holdingService.getParentTenant(ROOT_TENANT_ID);

      expect(parent).toBeNull();
    });
  });

  // =========================================
  // SET PARENT TESTS (2 tesztek)
  // =========================================
  describe('setParentTenant()', () => {
    it('should set parent tenant', async () => {
      // setParentTenant calls:
      // 1. getTenantById(parentTenantId) to validate parent exists
      // 2. isDescendantOf(parentTenantId, tenantId) which calls getTenantById(parentTenantId)
      // rootTenant has no parentTenantId so isDescendantOf loop exits immediately
      mockTenantService.getTenantById.mockResolvedValue(rootTenant);
      mockTenantService.updateTenant.mockResolvedValue({
        ...childTenant1,
        parentTenantId: ROOT_TENANT_ID,
      });

      const result = await holdingService.setParentTenant(CHILD_TENANT_1_ID, ROOT_TENANT_ID);

      expect(result).toBe(true);
      expect(mockTenantService.updateTenant).toHaveBeenCalledWith(
        CHILD_TENANT_1_ID,
        expect.objectContaining({ parentTenantId: ROOT_TENANT_ID })
      );
    });

    it('should remove parent tenant when null', async () => {
      // When parentTenantId is null, no getTenantById calls are made
      mockTenantService.updateTenant.mockResolvedValue({
        ...childTenant1,
        parentTenantId: null,
      });

      const result = await holdingService.setParentTenant(CHILD_TENANT_1_ID, null);

      expect(result).toBe(true);
      expect(mockTenantService.updateTenant).toHaveBeenCalledWith(
        CHILD_TENANT_1_ID,
        expect.objectContaining({ parentTenantId: null })
      );
    });
  });

  // =========================================
  // HIERARCHY TESTS (2 tesztek)
  // =========================================
  describe('getHoldingRoot()', () => {
    it('should return root tenant of hierarchy', async () => {
      // First call returns grandchild
      mockTenantService.getTenantById.mockResolvedValueOnce(grandchildTenant);
      // Second call returns child (parent of grandchild)
      mockTenantService.getTenantById.mockResolvedValueOnce(childTenant1);
      // Third call returns root (parent of child)
      mockTenantService.getTenantById.mockResolvedValueOnce(rootTenant);

      const root = await holdingService.getHoldingRoot(GRANDCHILD_TENANT_ID);

      expect(root.id).toBe(ROOT_TENANT_ID);
    });
  });

  describe('isDescendantOf()', () => {
    it('should return true for descendant', async () => {
      // Setup mock to return grandchild, then child, then root
      mockTenantService.getTenantById.mockResolvedValueOnce(grandchildTenant);
      mockTenantService.getTenantById.mockResolvedValueOnce(childTenant1);

      const isDescendant = await holdingService.isDescendantOf(
        GRANDCHILD_TENANT_ID,
        ROOT_TENANT_ID
      );

      expect(isDescendant).toBe(true);
    });

    it('should return false for non-descendant', async () => {
      mockTenantService.getTenantById.mockResolvedValueOnce(childTenant2);
      mockTenantService.getTenantById.mockResolvedValueOnce(rootTenant);

      const isDescendant = await holdingService.isDescendantOf(
        CHILD_TENANT_2_ID,
        CHILD_TENANT_1_ID
      );

      expect(isDescendant).toBe(false);
    });
  });

  // =========================================
  // HOLDING OVERVIEW TEST (1 teszt)
  // =========================================
  describe('getHoldingOverview()', () => {
    it('should return holding overview with stats', async () => {
      mockTenantService.getTenantById.mockResolvedValue(rootTenant);
      // Return empty for all child lookups (simple root-only hierarchy)
      mockTenantService.listTenants.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      });

      const overview = await holdingService.getHoldingOverview(ROOT_TENANT_ID);

      expect(overview.rootTenant.id).toBe(ROOT_TENANT_ID);
      expect(overview.totalTenants).toBe(1); // Only root tenant
      expect(overview.activeTenants).toBe(1);
    });
  });
});
