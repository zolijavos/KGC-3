import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HierarchyValidationService } from './hierarchy-validation.service';
import { MAX_CATEGORY_DEPTH } from '../interfaces/category.interface';

/**
 * TDD Tests for HierarchyValidationService
 * Story 8-2: Cikkcsoport Hierarchia - AC2
 * RED phase - minimum 8 tesztek
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const CATEGORY_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const PARENT_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';
const GRANDPARENT_ID = 'd4e5f6a7-b8c9-4123-aef0-234567890123';

// Mock PrismaService
const mockPrismaService = {
  category: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('HierarchyValidationService', () => {
  let hierarchyService: HierarchyValidationService;

  beforeEach(() => {
    vi.resetAllMocks();
    hierarchyService = new HierarchyValidationService(mockPrismaService as any);
  });

  // =========================================
  // VALIDATE MAX DEPTH TESTS (3 tesztek)
  // =========================================
  describe('validateMaxDepth()', () => {
    it('should return valid for root category (no parent)', async () => {
      const result = await hierarchyService.validateMaxDepth(null, TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.depth).toBe(0);
    });

    it('should return valid for depth within limit', async () => {
      // Parent at depth 2
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: PARENT_ID,
        depth: 2,
        path: '/root/parent',
      });

      const result = await hierarchyService.validateMaxDepth(PARENT_ID, TENANT_ID);

      expect(result.valid).toBe(true);
      expect(result.depth).toBe(3); // Parent depth + 1
    });

    it('should return invalid for depth exceeding MAX_CATEGORY_DEPTH', async () => {
      // Parent at max depth
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: PARENT_ID,
        depth: MAX_CATEGORY_DEPTH - 1, // 4
        path: '/a/b/c/d',
      });

      const result = await hierarchyService.validateMaxDepth(PARENT_ID, TENANT_ID);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximális');
    });
  });

  // =========================================
  // DETECT CIRCULAR REFERENCE TESTS (3 tesztek)
  // =========================================
  describe('detectCircularReference()', () => {
    it('should return false for valid parent change (no cycle)', async () => {
      // Category has no ancestors that match newParentId
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({
          id: PARENT_ID,
          parentId: GRANDPARENT_ID,
          path: '/grandparent',
        })
        .mockResolvedValueOnce({
          id: GRANDPARENT_ID,
          parentId: null,
          path: '/',
        });

      const result = await hierarchyService.detectCircularReference(
        CATEGORY_ID,
        PARENT_ID,
        TENANT_ID
      );

      expect(result).toBe(false);
    });

    it('should return true if newParent is the category itself', async () => {
      const result = await hierarchyService.detectCircularReference(
        CATEGORY_ID,
        CATEGORY_ID, // Self-reference
        TENANT_ID
      );

      expect(result).toBe(true);
    });

    it('should return true if newParent is a descendant of the category', async () => {
      // newParentId's ancestors include categoryId → cycle!
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({
          id: PARENT_ID,
          parentId: CATEGORY_ID, // This creates a cycle
          path: '/category',
        })
        .mockResolvedValueOnce({
          id: CATEGORY_ID,
          parentId: GRANDPARENT_ID,
          path: '/grandparent',
        });

      const result = await hierarchyService.detectCircularReference(
        CATEGORY_ID,
        PARENT_ID,
        TENANT_ID
      );

      expect(result).toBe(true);
    });
  });

  // =========================================
  // CALCULATE PATH TESTS (2 tesztek)
  // =========================================
  describe('calculatePath()', () => {
    it('should return "/" for root category', async () => {
      const result = await hierarchyService.calculatePath(null, TENANT_ID);

      expect(result.path).toBe('/');
      expect(result.depth).toBe(0);
    });

    it('should calculate correct path for nested category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: PARENT_ID,
        code: 'POWER-TOOLS',
        path: '/electronics',
        depth: 1,
      });

      const result = await hierarchyService.calculatePath(PARENT_ID, TENANT_ID);

      expect(result.path).toBe('/electronics/POWER-TOOLS');
      expect(result.depth).toBe(2);
    });
  });

  // =========================================
  // GET ANCESTORS TEST (1 teszt)
  // =========================================
  describe('getAncestors()', () => {
    it('should return all ancestors from leaf to root', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({
          id: CATEGORY_ID,
          parentId: PARENT_ID,
          name: 'Drills',
        })
        .mockResolvedValueOnce({
          id: PARENT_ID,
          parentId: GRANDPARENT_ID,
          name: 'Power Tools',
        })
        .mockResolvedValueOnce({
          id: GRANDPARENT_ID,
          parentId: null,
          name: 'Electronics',
        });

      const ancestors = await hierarchyService.getAncestors(CATEGORY_ID, TENANT_ID);

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0]?.name).toBe('Power Tools');
      expect(ancestors[1]?.name).toBe('Electronics');
    });
  });
});
