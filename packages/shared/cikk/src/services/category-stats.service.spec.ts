import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryStatsService } from './category-stats.service';

/**
 * TDD Tests for CategoryStatsService
 * Story 8-2: Cikkcsoport Hierarchia - AC5
 * RED phase - minimum 5 tesztek
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const CATEGORY_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const CHILD_CATEGORY_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';

// Mock PrismaService
const mockPrismaService = {
  item: {
    count: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('CategoryStatsService', () => {
  let statsService: CategoryStatsService;

  beforeEach(() => {
    vi.resetAllMocks();
    statsService = new CategoryStatsService(mockPrismaService as any);
  });

  // =========================================
  // GET STATS TESTS (3 tesztek)
  // =========================================
  describe('getStats()', () => {
    it('should return itemCount for direct items', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
      });
      mockPrismaService.category.findMany.mockResolvedValue([]); // No children
      mockPrismaService.item.count
        .mockResolvedValueOnce(15) // itemCount
        .mockResolvedValueOnce(15) // totalItemCount (same - no children)
        .mockResolvedValueOnce(12); // activeItemCount

      const result = await statsService.getStats(CATEGORY_ID, TENANT_ID);

      expect(result.itemCount).toBe(15);
      expect(result.categoryId).toBe(CATEGORY_ID);
    });

    it('should include child category items in totalItemCount', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
      });
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: CHILD_CATEGORY_ID },
      ]);
      mockPrismaService.item.count
        .mockResolvedValueOnce(10) // direct itemCount
        .mockResolvedValueOnce(25) // totalItemCount (includes children)
        .mockResolvedValueOnce(20); // activeItemCount

      const result = await statsService.getStats(CATEGORY_ID, TENANT_ID);

      expect(result.itemCount).toBe(10);
      expect(result.totalItemCount).toBe(25);
    });

    it('should throw error for non-existent category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        statsService.getStats(CATEGORY_ID, TENANT_ID)
      ).rejects.toThrow('Kategória nem található');
    });
  });

  // =========================================
  // ACTIVE ITEM COUNT TEST (1 teszt)
  // =========================================
  describe('getActiveItemCount()', () => {
    it('should return only active items count', async () => {
      mockPrismaService.item.count.mockResolvedValue(12);

      const result = await statsService.getActiveItemCount(CATEGORY_ID, TENANT_ID);

      expect(result).toBe(12);
      expect(mockPrismaService.item.count).toHaveBeenCalledWith({
        where: {
          categoryId: CATEGORY_ID,
          tenantId: TENANT_ID,
          status: 'ACTIVE',
        },
      });
    });
  });

  // =========================================
  // DESCENDANT IDS TEST (1 teszt)
  // =========================================
  describe('getAllDescendantIds()', () => {
    it('should return all descendant category IDs recursively', async () => {
      const childCategory = { id: CHILD_CATEGORY_ID };
      const grandchildCategory = { id: 'grandchild-id' };

      mockPrismaService.category.findMany
        .mockResolvedValueOnce([childCategory]) // First level children
        .mockResolvedValueOnce([grandchildCategory]) // Second level
        .mockResolvedValueOnce([]); // No more children

      const result = await statsService.getAllDescendantIds(CATEGORY_ID, TENANT_ID);

      expect(result).toContain(CHILD_CATEGORY_ID);
      expect(result).toContain('grandchild-id');
      expect(result).toHaveLength(2);
    });
  });
});
