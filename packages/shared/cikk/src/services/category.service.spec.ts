import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from './category.service';
import { HierarchyValidationService } from './hierarchy-validation.service';
import { CategoryStatus } from '../interfaces/category.interface';

/**
 * TDD Tests for CategoryService
 * Story 8-2: Cikkcsoport Hierarchia - AC1, AC2, AC3
 * RED phase - minimum 15 tesztek
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const CATEGORY_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const PARENT_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';
const USER_ID = 'd4e5f6a7-b8c9-4123-aef0-234567890123';

// Mock PrismaService
const mockPrismaService = {
  category: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  item: {
    updateMany: vi.fn(),
  },
};

// Mock HierarchyValidationService
const mockHierarchyService = {
  validateMaxDepth: vi.fn(),
  detectCircularReference: vi.fn(),
  calculatePath: vi.fn(),
  getAncestors: vi.fn(),
};

// Mock AuditService
const mockAuditService = {
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
};

describe('CategoryService', () => {
  let categoryService: CategoryService;

  beforeEach(() => {
    vi.resetAllMocks();
    categoryService = new CategoryService(
      mockPrismaService as any,
      mockHierarchyService as unknown as HierarchyValidationService,
      mockAuditService as any
    );
  });

  // =========================================
  // CREATE CATEGORY TESTS (5 tesztek)
  // =========================================
  describe('createCategory()', () => {
    it('should create root category successfully', async () => {
      const input = {
        code: 'ELECTRONICS',
        name: 'Elektronika',
      };

      mockHierarchyService.validateMaxDepth.mockResolvedValue({
        valid: true,
        depth: 0,
      });
      mockHierarchyService.calculatePath.mockResolvedValue({
        path: '/',
        depth: 0,
      });
      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockPrismaService.category.create.mockResolvedValue({
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        ...input,
        path: '/',
        depth: 0,
        status: CategoryStatus.ACTIVE,
      });

      const result = await categoryService.createCategory(TENANT_ID, input, USER_ID);

      expect(result.code).toBe('ELECTRONICS');
      expect(result.depth).toBe(0);
      expect(mockAuditService.logCreate).toHaveBeenCalled();
    });

    it('should create child category with correct depth', async () => {
      const input = {
        code: 'DRILLS',
        name: 'Fúrógépek',
        parentId: PARENT_ID,
      };

      mockHierarchyService.validateMaxDepth.mockResolvedValue({
        valid: true,
        depth: 2,
      });
      mockHierarchyService.calculatePath.mockResolvedValue({
        path: '/electronics/power-tools',
        depth: 2,
      });
      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockPrismaService.category.create.mockResolvedValue({
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        ...input,
        path: '/electronics/power-tools',
        depth: 2,
        status: CategoryStatus.ACTIVE,
      });

      const result = await categoryService.createCategory(TENANT_ID, input, USER_ID);

      expect(result.depth).toBe(2);
      expect(result.path).toBe('/electronics/power-tools');
    });

    it('should throw error if code already exists', async () => {
      const input = {
        code: 'ELECTRONICS',
        name: 'Elektronika',
      };

      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'existing-id', code: 'ELECTRONICS' },
      ]);

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('A kategória kód már létezik');
    });

    it('should throw error if max depth exceeded', async () => {
      const input = {
        code: 'TOO-DEEP',
        name: 'Túl mély',
        parentId: PARENT_ID,
      };

      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockHierarchyService.validateMaxDepth.mockResolvedValue({
        valid: false,
        depth: 5,
        error: 'Maximális mélység túllépve',
      });

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('Maximális mélység túllépve');
    });

    it('should throw error if name is empty', async () => {
      const input = {
        code: 'VALID-CODE',
        name: '',
      };

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('A kategória neve kötelező');
    });

    it('should throw error if code is empty', async () => {
      const input = {
        code: '',
        name: 'Valid Name',
      };

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('A kategória kód kötelező');
    });

    it('should throw error if code exceeds 50 characters', async () => {
      const input = {
        code: 'A'.repeat(51),
        name: 'Valid Name',
      };

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('A kategória kód maximum 50 karakter lehet');
    });

    it('should throw error if name exceeds 255 characters', async () => {
      const input = {
        code: 'VALID-CODE',
        name: 'A'.repeat(256),
      };

      await expect(
        categoryService.createCategory(TENANT_ID, input, USER_ID)
      ).rejects.toThrow('A kategória neve maximum 255 karakter lehet');
    });
  });

  // =========================================
  // GET CATEGORY TESTS (3 tesztek)
  // =========================================
  describe('getCategoryById()', () => {
    it('should return category by ID', async () => {
      const category = {
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.ACTIVE,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(category);

      const result = await categoryService.getCategoryById(CATEGORY_ID, TENANT_ID);

      expect(result?.code).toBe('ELECTRONICS');
    });

    it('should return null for non-existent category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      const result = await categoryService.getCategoryById(CATEGORY_ID, TENANT_ID);

      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(
        categoryService.getCategoryById('invalid-uuid', TENANT_ID)
      ).rejects.toThrow('Érvénytelen kategória ID formátum');
    });
  });

  // =========================================
  // UPDATE CATEGORY TESTS (3 tesztek)
  // =========================================
  describe('updateCategory()', () => {
    it('should update category name', async () => {
      const existingCategory = {
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        parentId: null,
        status: CategoryStatus.ACTIVE,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);
      mockPrismaService.category.update.mockResolvedValue({
        ...existingCategory,
        name: 'Elektromos eszközök',
      });

      const result = await categoryService.updateCategory(
        CATEGORY_ID,
        TENANT_ID,
        { name: 'Elektromos eszközök' },
        USER_ID
      );

      expect(result.name).toBe('Elektromos eszközök');
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should throw error when changing parent creates circular reference', async () => {
      const existingCategory = {
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        parentId: null,
        status: CategoryStatus.ACTIVE,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);
      mockHierarchyService.detectCircularReference.mockResolvedValue(true);

      await expect(
        categoryService.updateCategory(
          CATEGORY_ID,
          TENANT_ID,
          { parentId: PARENT_ID },
          USER_ID
        )
      ).rejects.toThrow('Körkörös referencia');
    });

    it('should throw error for non-existent category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        categoryService.updateCategory(
          CATEGORY_ID,
          TENANT_ID,
          { name: 'Updated' },
          USER_ID
        )
      ).rejects.toThrow('Kategória nem található');
    });
  });

  // =========================================
  // DELETE CATEGORY TESTS (2 tesztek)
  // =========================================
  describe('deleteCategory()', () => {
    it('should soft delete category (set INACTIVE)', async () => {
      const existingCategory = {
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.ACTIVE,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);
      mockPrismaService.category.findMany.mockResolvedValue([]); // No children
      mockPrismaService.category.update.mockResolvedValue({
        ...existingCategory,
        status: CategoryStatus.INACTIVE,
      });
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 0 });

      const result = await categoryService.deleteCategory(CATEGORY_ID, TENANT_ID, USER_ID);

      expect(result.status).toBe(CategoryStatus.INACTIVE);
      expect(mockAuditService.logDelete).toHaveBeenCalled();
    });

    it('should clear categoryId for items when category deleted', async () => {
      const existingCategory = {
        id: CATEGORY_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.ACTIVE,
      };

      mockPrismaService.category.findUnique.mockResolvedValue(existingCategory);
      mockPrismaService.category.findMany.mockResolvedValue([]);
      mockPrismaService.category.update.mockResolvedValue({
        ...existingCategory,
        status: CategoryStatus.INACTIVE,
      });
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 5 });

      await categoryService.deleteCategory(CATEGORY_ID, TENANT_ID, USER_ID);

      expect(mockPrismaService.item.updateMany).toHaveBeenCalledWith({
        where: { categoryId: CATEGORY_ID, tenantId: TENANT_ID },
        data: { categoryId: null },
      });
    });
  });

  // =========================================
  // CATEGORY TREE TESTS (2 tesztek)
  // =========================================
  describe('getCategoryTree()', () => {
    it('should return full category tree', async () => {
      const rootCategories = [
        {
          id: CATEGORY_ID,
          tenantId: TENANT_ID,
          code: 'ELECTRONICS',
          name: 'Elektronika',
          parentId: null,
          depth: 0,
          children: [],
        },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(rootCategories);

      const result = await categoryService.getCategoryTree(TENANT_ID, {});

      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe('ELECTRONICS');
    });

    it('should filter by rootOnly', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await categoryService.getCategoryTree(TENANT_ID, { rootOnly: true });

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        })
      );
    });
  });

  // =========================================
  // CHILDREN & ANCESTORS TESTS (3 tesztek)
  // =========================================
  describe('getChildren()', () => {
    it('should return direct children of category', async () => {
      const children = [
        { id: 'child-1', code: 'CHILD-1', name: 'Gyermek 1' },
        { id: 'child-2', code: 'CHILD-2', name: 'Gyermek 2' },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(children);

      const result = await categoryService.getChildren(CATEGORY_ID, TENANT_ID);

      expect(result).toHaveLength(2);
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(
        categoryService.getChildren('invalid-uuid', TENANT_ID)
      ).rejects.toThrow('Érvénytelen kategória ID formátum');
    });
  });

  describe('getAncestors()', () => {
    it('should delegate to HierarchyValidationService', async () => {
      const ancestors = [
        { id: PARENT_ID, name: 'Parent', parentId: null },
      ];

      mockHierarchyService.getAncestors.mockResolvedValue(ancestors);

      const result = await categoryService.getAncestors(CATEGORY_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(mockHierarchyService.getAncestors).toHaveBeenCalledWith(
        CATEGORY_ID,
        TENANT_ID
      );
    });
  });
});
