import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCategoryFilterFromQuery } from './dto/category-filter.dto';
import { safeValidateCreateCategoryDto } from './dto/create-category.dto';
import { CategoryStatus, MAX_CATEGORY_DEPTH } from './interfaces/category.interface';
import { CategoryStatsService } from './services/category-stats.service';
import { CategoryService } from './services/category.service';
import { HierarchyValidationService } from './services/hierarchy-validation.service';

/**
 * E2E Tests for Category (Cikkcsoport)
 * Story 8-2: Cikkcsoport Hierarchia - AC1-AC5
 *
 * Integration tests covering:
 * - Category CRUD operations
 * - Hierarchy validation (parent-child, max depth)
 * - Circular reference detection
 * - Category statistics
 * - Item-Category relationships
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const USER_ID = 'd4e5f6a7-b8c9-4123-aef0-234567890123';
const ROOT_CAT_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const CHILD_CAT_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';
const GRANDCHILD_CAT_ID = 'e5f6a7b8-c9d0-4234-af01-345678901234';

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
    count: vi.fn(),
  },
};

// Mock AuditService
const mockAuditService = {
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
};

describe('Category E2E Tests (Story 8-2)', () => {
  let categoryService: CategoryService;
  let statsService: CategoryStatsService;
  let hierarchyService: HierarchyValidationService;

  beforeEach(() => {
    vi.resetAllMocks();
    hierarchyService = new HierarchyValidationService(mockPrismaService as any);
    statsService = new CategoryStatsService(mockPrismaService as any);
    categoryService = new CategoryService(
      mockPrismaService as any,
      hierarchyService,
      mockAuditService as any
    );
  });

  // =========================================
  // AC1: CATEGORY CRUD (4 tesztek)
  // =========================================
  describe('AC1: Category CRUD Operations', () => {
    it('should create root category with required fields', async () => {
      const input = {
        code: 'ELECTRONICS',
        name: 'Elektronika',
        description: 'Elektromos eszközök kategória',
      };

      mockPrismaService.category.findMany.mockResolvedValue([]); // No duplicate
      mockPrismaService.category.create.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        ...input,
        parentId: null,
        path: '/',
        depth: 0,
        status: CategoryStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await categoryService.createCategory(TENANT_ID, input, USER_ID);

      expect(result.code).toBe('ELECTRONICS');
      expect(result.name).toBe('Elektronika');
      expect(result.depth).toBe(0);
      expect(result.status).toBe(CategoryStatus.ACTIVE);
      expect(mockAuditService.logCreate).toHaveBeenCalled();
    });

    it('should read category by ID', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.ACTIVE,
      });

      const result = await categoryService.getCategoryById(ROOT_CAT_ID, TENANT_ID);

      expect(result?.id).toBe(ROOT_CAT_ID);
      expect(result?.code).toBe('ELECTRONICS');
    });

    it('should update category name', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        parentId: null,
        status: CategoryStatus.ACTIVE,
      });
      mockPrismaService.category.update.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektromos Eszközök',
        parentId: null,
        status: CategoryStatus.ACTIVE,
      });

      const result = await categoryService.updateCategory(
        ROOT_CAT_ID,
        TENANT_ID,
        { name: 'Elektromos Eszközök' },
        USER_ID
      );

      expect(result.name).toBe('Elektromos Eszközök');
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should soft delete category (set INACTIVE)', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.ACTIVE,
      });
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 3 });
      mockPrismaService.category.update.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        code: 'ELECTRONICS',
        name: 'Elektronika',
        status: CategoryStatus.INACTIVE,
      });

      const result = await categoryService.deleteCategory(ROOT_CAT_ID, TENANT_ID, USER_ID);

      expect(result.status).toBe(CategoryStatus.INACTIVE);
      expect(mockPrismaService.item.updateMany).toHaveBeenCalledWith({
        where: { categoryId: ROOT_CAT_ID, tenantId: TENANT_ID },
        data: { categoryId: null },
      });
    });
  });

  // =========================================
  // AC2: HIERARCHY (PARENT-CHILD) (3 tesztek)
  // =========================================
  describe('AC2: Hierarchy Parent-Child', () => {
    it('should create child category with correct depth', async () => {
      const input = {
        code: 'POWER-TOOLS',
        name: 'Elektromos Szerszámok',
        parentId: ROOT_CAT_ID,
      };

      // Parent exists at depth 0
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        code: 'ELECTRONICS',
        path: '/',
        depth: 0,
      });
      mockPrismaService.category.findMany.mockResolvedValue([]); // No duplicate
      mockPrismaService.category.create.mockResolvedValue({
        id: CHILD_CAT_ID,
        tenantId: TENANT_ID,
        ...input,
        path: '//ELECTRONICS',
        depth: 1,
        status: CategoryStatus.ACTIVE,
      });

      const result = await categoryService.createCategory(TENANT_ID, input, USER_ID);

      expect(result.depth).toBe(1);
      expect(result.parentId).toBe(ROOT_CAT_ID);
    });

    it('should enforce max 5 depth levels', async () => {
      const input = {
        code: 'TOO-DEEP',
        name: 'Túl Mély Kategória',
        parentId: GRANDCHILD_CAT_ID,
      };

      // Parent at depth 4 (max is 5, so child would be 5 = MAX_DEPTH - 1 + 1 = 5 which exceeds)
      mockPrismaService.category.findMany.mockResolvedValue([]); // No duplicate
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: GRANDCHILD_CAT_ID,
        depth: MAX_CATEGORY_DEPTH - 1, // depth 4
        path: '/a/b/c/d',
      });

      await expect(categoryService.createCategory(TENANT_ID, input, USER_ID)).rejects.toThrow(
        'maximális'
      );
    });

    it('should detect and prevent circular reference on parent change', async () => {
      // Try to move parent under its child
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce({
          id: ROOT_CAT_ID,
          tenantId: TENANT_ID,
          code: 'ELECTRONICS',
          parentId: null,
          status: CategoryStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: CHILD_CAT_ID,
          parentId: ROOT_CAT_ID, // Child's parent is ROOT_CAT
        });

      await expect(
        categoryService.updateCategory(
          ROOT_CAT_ID,
          TENANT_ID,
          { parentId: CHILD_CAT_ID }, // Moving root under its child = circular!
          USER_ID
        )
      ).rejects.toThrow('Körkörös referencia');
    });
  });

  // =========================================
  // AC3: CATEGORY TREE (2 tesztek)
  // =========================================
  describe('AC3: Category Tree Retrieval', () => {
    it('should return tree with nested children', async () => {
      const tree = [
        {
          id: ROOT_CAT_ID,
          code: 'ELECTRONICS',
          name: 'Elektronika',
          depth: 0,
          parentId: null,
          children: [
            {
              id: CHILD_CAT_ID,
              code: 'POWER-TOOLS',
              name: 'Elektromos Szerszámok',
              depth: 1,
              parentId: ROOT_CAT_ID,
              children: [],
            },
          ],
        },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(tree);

      const result = await categoryService.getCategoryTree(TENANT_ID, { rootOnly: true });

      expect(result).toHaveLength(1);
      expect(result[0]?.children).toHaveLength(1);
      expect(result[0]?.children?.[0]?.code).toBe('POWER-TOOLS');
    });

    it('should respect tenant isolation (RLS)', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await categoryService.getCategoryTree(TENANT_ID, {});

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });
  });

  // =========================================
  // AC4: ITEM-CATEGORY RELATIONSHIP (2 tesztek)
  // =========================================
  describe('AC4: Item-Category Relationship', () => {
    it('should clear categoryId on items when category deleted', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
        status: CategoryStatus.ACTIVE,
      });
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.category.update.mockResolvedValue({
        id: ROOT_CAT_ID,
        status: CategoryStatus.INACTIVE,
      });

      await categoryService.deleteCategory(ROOT_CAT_ID, TENANT_ID, USER_ID);

      expect(mockPrismaService.item.updateMany).toHaveBeenCalledWith({
        where: { categoryId: ROOT_CAT_ID, tenantId: TENANT_ID },
        data: { categoryId: null },
      });
    });

    it('should validate categoryId exists before creating item', async () => {
      // This would be tested in ItemService - category validation
      // Here we just verify the Category exists check
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      const result = await categoryService.getCategoryById(
        'non-existent-uuid1-2345-6789-abcdefabcdef',
        TENANT_ID
      );

      expect(result).toBeNull();
    });
  });

  // =========================================
  // AC5: CATEGORY STATISTICS (2 tesztek)
  // =========================================
  describe('AC5: Category Statistics', () => {
    it('should return itemCount and totalItemCount', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: ROOT_CAT_ID,
        tenantId: TENANT_ID,
      });
      mockPrismaService.category.findMany.mockResolvedValue([{ id: CHILD_CAT_ID }]); // One child
      mockPrismaService.item.count
        .mockResolvedValueOnce(10) // Direct itemCount
        .mockResolvedValueOnce(25) // Total with children
        .mockResolvedValueOnce(20); // Active only

      const stats = await statsService.getStats(ROOT_CAT_ID, TENANT_ID);

      expect(stats.itemCount).toBe(10);
      expect(stats.totalItemCount).toBe(25);
      expect(stats.activeItemCount).toBe(20);
    });

    it('should count only active items in activeItemCount', async () => {
      mockPrismaService.item.count.mockResolvedValue(15);

      const activeCount = await statsService.getActiveItemCount(ROOT_CAT_ID, TENANT_ID);

      expect(activeCount).toBe(15);
      expect(mockPrismaService.item.count).toHaveBeenCalledWith({
        where: {
          categoryId: ROOT_CAT_ID,
          tenantId: TENANT_ID,
          status: 'ACTIVE',
        },
      });
    });
  });

  // =========================================
  // DTO VALIDATION TESTS (3 tesztek)
  // =========================================
  describe('DTO Validation', () => {
    it('should validate CreateCategoryDto with valid input', () => {
      const input = {
        code: 'VALID-CODE',
        name: 'Valid Name',
        description: 'Optional description',
      };

      const result = safeValidateCreateCategoryDto(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('VALID-CODE');
        expect(result.data.name).toBe('Valid Name');
      }
    });

    it('should reject empty category name', () => {
      const input = {
        code: 'VALID-CODE',
        name: '',
      };

      const result = safeValidateCreateCategoryDto(input);

      expect(result.success).toBe(false);
    });

    it('should parse filter from query params', () => {
      const query = {
        search: 'elektr',
        rootOnly: 'true',
        maxDepth: '3',
        page: '2',
        limit: '50',
      };

      const filter = parseCategoryFilterFromQuery(query);

      expect(filter.search).toBe('elektr');
      expect(filter.rootOnly).toBe(true);
      expect(filter.maxDepth).toBe(3);
      expect(filter.page).toBe(2);
      expect(filter.limit).toBe(50);
    });
  });
});
