/**
 * Prisma Category Repository
 * Implements ICategoryRepository for PostgreSQL persistence
 * Epic 8: Story 8-2: Cikkcsoport hierarchia
 */

import {
  CategoryQuery,
  CategoryQueryResult,
  CategoryTreeNode,
  CreateCategoryInput,
  ICategoryRepository,
  ProductCategory,
  UpdateCategoryInput,
} from '@kgc/products';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, ProductCategory as PrismaCategory, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toCategoryDomain(category: PrismaCategory): ProductCategory {
    return {
      id: category.id,
      tenantId: category.tenantId,
      code: category.code,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      level: category.level,
      path: category.path,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  clear(): void {
    // No-op
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: CategoryQuery): Promise<CategoryQueryResult> {
    const where: Prisma.ProductCategoryWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.parentId !== undefined) {
      where.parentId = params.parentId;
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.level !== undefined) {
      where.level = params.level;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;

    const [categories, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      categories: categories.map(c => this.toCategoryDomain(c)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<ProductCategory | null> {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, tenantId },
    });
    return category ? this.toCategoryDomain(category) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<ProductCategory | null> {
    const category = await this.prisma.productCategory.findFirst({
      where: { code, tenantId },
    });
    return category ? this.toCategoryDomain(category) : null;
  }

  async getRootCategories(tenantId: string): Promise<ProductCategory[]> {
    const categories = await this.prisma.productCategory.findMany({
      where: { tenantId, parentId: null },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(c => this.toCategoryDomain(c));
  }

  async getChildren(parentId: string, tenantId: string): Promise<ProductCategory[]> {
    const categories = await this.prisma.productCategory.findMany({
      where: { tenantId, parentId },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(c => this.toCategoryDomain(c));
  }

  async getDescendants(parentId: string, tenantId: string): Promise<ProductCategory[]> {
    const parent = await this.findById(parentId, tenantId);
    if (!parent) return [];

    const categories = await this.prisma.productCategory.findMany({
      where: {
        tenantId,
        path: { startsWith: parent.path },
        id: { not: parentId },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    return categories.map(c => this.toCategoryDomain(c));
  }

  async getAncestors(id: string, tenantId: string): Promise<ProductCategory[]> {
    const category = await this.findById(id, tenantId);
    if (!category) return [];

    const ancestorIds = category.path
      .split('/')
      .filter((segment: string) => segment.length > 0 && segment !== category.id);

    if (ancestorIds.length === 0) return [];

    const ancestors = await this.prisma.productCategory.findMany({
      where: {
        id: { in: ancestorIds },
        tenantId,
      },
      orderBy: { level: 'asc' },
    });

    return ancestors.map(c => this.toCategoryDomain(c));
  }

  async getTree(tenantId: string, rootId?: string): Promise<CategoryTreeNode[]> {
    // H4 FIX: Load all categories and product counts in single queries to avoid N+1
    const allCategories = await this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    // Get product counts for all categories in one query
    const productCounts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: { tenantId, isDeleted: false, categoryId: { not: null } },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const { categoryId, _count } of productCounts) {
      if (categoryId) {
        countMap.set(categoryId, _count.id);
      }
    }

    // Build tree in memory - first pass: create all nodes
    const nodeMap = new Map<string, CategoryTreeNode>();
    for (const cat of allCategories) {
      nodeMap.set(cat.id, {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        level: cat.level,
        path: cat.path,
        productCount: countMap.get(cat.id) ?? 0,
        isActive: cat.isActive,
        children: [],
      });
    }

    // Second pass: build parent-child relationships
    const rootNodes: CategoryTreeNode[] = [];
    for (const cat of allCategories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parentId === null || cat.parentId === rootId) {
        if (rootId === undefined || cat.parentId === rootId) {
          rootNodes.push(node);
        }
      } else {
        const parentNode = nodeMap.get(cat.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    }

    // If rootId is specified but not null, find its children
    if (rootId !== undefined && rootId !== null) {
      const rootNode = nodeMap.get(rootId);
      return rootNode?.children ?? [];
    }

    return rootNodes;
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(tenantId: string, data: CreateCategoryInput): Promise<ProductCategory> {
    if (await this.codeExists(data.code, tenantId)) {
      throw new Error(`Kategória kód már létezik: ${data.code}`);
    }

    let level = 0;
    let path = '';

    if (data.parentId) {
      const parent = await this.findById(data.parentId, tenantId);
      if (parent) {
        level = parent.level + 1;
        path = parent.path;
      }
    }

    const category = await this.prisma.productCategory.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        level,
        path: '', // Will be updated after create with ID
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    // Update path with actual ID
    const updatedPath = path ? `${path}${category.id}/` : `/${category.id}/`;
    const updated = await this.prisma.productCategory.update({
      where: { id: category.id },
      data: { path: updatedPath },
    });

    return this.toCategoryDomain(updated);
  }

  async update(id: string, tenantId: string, data: UpdateCategoryInput): Promise<ProductCategory> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Kategória nem található: ${id}`);
    }

    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      return this.move(id, tenantId, data.parentId);
    }

    const updateData: Prisma.ProductCategoryUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.productCategory.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Kategória frissítése sikertelen: ${id}`);
    }

    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Kategória nem található: ${id}`);
    }

    if (await this.hasChildren(id, tenantId)) {
      throw new Error('Nem törölhető alkategóriákkal rendelkező kategória');
    }

    if (await this.hasProducts(id, tenantId)) {
      throw new Error('Nem törölhető termékekkel rendelkező kategória');
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.productCategory.deleteMany({
      where: { id, tenantId },
    });
  }

  async move(id: string, tenantId: string, newParentId: string | null): Promise<ProductCategory> {
    const category = await this.findById(id, tenantId);
    if (!category) {
      throw new Error(`Kategória nem található: ${id}`);
    }

    // H7 FIX: More robust circular reference check using path segments
    if (newParentId) {
      // Check if trying to move to self
      if (newParentId === id) {
        throw new Error('Körkörös hivatkozás: nem lehet saját magának a szülője');
      }

      const newParent = await this.findById(newParentId, tenantId);
      if (!newParent) {
        throw new Error(`Cél szülő kategória nem található: ${newParentId}`);
      }

      // Parse path into segments and check each segment by exact ID match
      const parentPathSegments = newParent.path.split('/').filter(Boolean);
      if (parentPathSegments.includes(id)) {
        throw new Error(
          'Körkörös hivatkozás: a cél kategória a jelenlegi kategória leszármazottja'
        );
      }
    }

    let newLevel = 0;
    let newPath = `/${id}/`;

    if (newParentId) {
      const newParent = await this.findById(newParentId, tenantId);
      if (newParent) {
        newLevel = newParent.level + 1;
        newPath = `${newParent.path}${id}/`;
      }
    }

    const oldPath = category.path;
    const levelDiff = newLevel - category.level;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    await this.prisma.productCategory.updateMany({
      where: { id, tenantId },
      data: {
        parentId: newParentId,
        level: newLevel,
        path: newPath,
        updatedAt: new Date(),
      },
    });

    // Update descendants with tenant safety
    const descendants = await this.prisma.productCategory.findMany({
      where: {
        tenantId,
        path: { startsWith: oldPath },
        id: { not: id },
      },
    });

    for (const desc of descendants) {
      const newDescPath = desc.path.replace(oldPath, newPath);
      await this.prisma.productCategory.updateMany({
        where: { id: desc.id, tenantId },
        data: {
          level: desc.level + levelDiff,
          path: newDescPath,
          updatedAt: new Date(),
        },
      });
    }

    return (await this.findById(id, tenantId))!;
  }

  async activate(id: string, tenantId: string): Promise<ProductCategory> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<ProductCategory> {
    return this.update(id, tenantId, { isActive: false });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const category = await this.prisma.productCategory.findFirst({
      where: {
        code,
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return category !== null;
  }

  async reorder(
    tenantId: string,
    categoryOrders: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    await this.prisma.$transaction(
      categoryOrders.map(({ id, sortOrder }) =>
        this.prisma.productCategory.updateMany({
          where: { id, tenantId },
          data: { sortOrder, updatedAt: new Date() },
        })
      )
    );
  }

  async countProducts(id: string, tenantId: string, includeSubcategories = true): Promise<number> {
    if (!includeSubcategories) {
      return this.prisma.product.count({
        where: { categoryId: id, tenantId, isDeleted: false },
      });
    }

    const category = await this.findById(id, tenantId);
    if (!category) return 0;

    // Count products in this category and all descendants
    const categoryIds = [id];
    const descendants = await this.getDescendants(id, tenantId);
    categoryIds.push(...descendants.map(d => d.id));

    return this.prisma.product.count({
      where: {
        categoryId: { in: categoryIds },
        tenantId,
        isDeleted: false,
      },
    });
  }

  async hasProducts(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId: id, tenantId, isDeleted: false },
    });
    return count > 0;
  }

  async hasChildren(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.productCategory.count({
      where: { parentId: id, tenantId },
    });
    return count > 0;
  }
}
