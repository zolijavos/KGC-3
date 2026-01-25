/**
 * @kgc/products - Category Repository
 * Epic 8: Story 8-2: Cikkcsoport hierarchia
 *
 * Repository interface and token for ProductCategory entity operations.
 * Implements hierarchical category management with materialized path.
 */

import { Injectable } from '@nestjs/common';
import type {
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../dto/category.dto';
import type { CategoryQuery, CategoryQueryResult, ProductCategory } from '../types/product.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface ICategoryRepository {
  /**
   * Query categories with filters and pagination
   */
  query(params: CategoryQuery): Promise<CategoryQueryResult>;

  /**
   * Find category by ID
   */
  findById(id: string, tenantId: string): Promise<ProductCategory | null>;

  /**
   * Find category by code
   */
  findByCode(code: string, tenantId: string): Promise<ProductCategory | null>;

  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Get root categories (no parent)
   */
  getRootCategories(tenantId: string): Promise<ProductCategory[]>;

  /**
   * Get children of a category
   */
  getChildren(parentId: string, tenantId: string): Promise<ProductCategory[]>;

  /**
   * Get all descendants of a category
   */
  getDescendants(parentId: string, tenantId: string): Promise<ProductCategory[]>;

  /**
   * Get ancestors of a category (path to root)
   */
  getAncestors(id: string, tenantId: string): Promise<ProductCategory[]>;

  /**
   * Get full category tree
   */
  getTree(tenantId: string, rootId?: string): Promise<CategoryTreeNode[]>;

  /**
   * Create new category
   */
  create(tenantId: string, data: CreateCategoryInput): Promise<ProductCategory>;

  /**
   * Update existing category
   */
  update(id: string, tenantId: string, data: UpdateCategoryInput): Promise<ProductCategory>;

  /**
   * Delete category (only if no products/children)
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Move category to new parent
   */
  move(id: string, tenantId: string, newParentId: string | null): Promise<ProductCategory>;

  /**
   * Activate category
   */
  activate(id: string, tenantId: string): Promise<ProductCategory>;

  /**
   * Deactivate category
   */
  deactivate(id: string, tenantId: string): Promise<ProductCategory>;

  /**
   * Check if code exists
   */
  codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Reorder categories within same parent
   */
  reorder(
    tenantId: string,
    categoryOrders: Array<{ id: string; sortOrder: number }>
  ): Promise<void>;

  /**
   * Count products in category (including subcategories)
   */
  countProducts(id: string, tenantId: string, includeSubcategories?: boolean): Promise<number>;

  /**
   * Check if category has products
   */
  hasProducts(id: string, tenantId: string): Promise<boolean>;

  /**
   * Check if category has children
   */
  hasChildren(id: string, tenantId: string): Promise<boolean>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemoryCategoryRepository implements ICategoryRepository {
  private categories: Map<string, ProductCategory> = new Map();
  private productCounts: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.categories.clear();
    this.productCounts.clear();
  }

  async query(params: CategoryQuery): Promise<CategoryQueryResult> {
    let results = Array.from(this.categories.values()).filter(c => c.tenantId === params.tenantId);

    // Apply filters
    if (params.parentId !== undefined) {
      results = results.filter(c => c.parentId === params.parentId);
    }
    if (params.isActive !== undefined) {
      results = results.filter(c => c.isActive === params.isActive);
    }
    if (params.level !== undefined) {
      results = results.filter(c => c.level === params.level);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        c =>
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term)
      );
    }

    // Sort by sortOrder then name
    results.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });

    const total = results.length;

    // M1 Fix: Apply pagination
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    results = results.slice(offset, offset + limit);

    return { categories: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<ProductCategory | null> {
    const category = this.categories.get(id);
    if (!category || category.tenantId !== tenantId) return null;
    return category;
  }

  async findByCode(code: string, tenantId: string): Promise<ProductCategory | null> {
    return (
      Array.from(this.categories.values()).find(c => c.code === code && c.tenantId === tenantId) ??
      null
    );
  }

  async getRootCategories(tenantId: string): Promise<ProductCategory[]> {
    return Array.from(this.categories.values())
      .filter(c => c.tenantId === tenantId && c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getChildren(parentId: string, tenantId: string): Promise<ProductCategory[]> {
    return Array.from(this.categories.values())
      .filter(c => c.tenantId === tenantId && c.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getDescendants(parentId: string, tenantId: string): Promise<ProductCategory[]> {
    const parent = await this.findById(parentId, tenantId);
    if (!parent) return [];

    return Array.from(this.categories.values())
      .filter(c => c.tenantId === tenantId && c.path.startsWith(parent.path) && c.id !== parentId)
      .sort((a, b) => a.level - b.level || a.sortOrder - b.sortOrder);
  }

  async getAncestors(id: string, tenantId: string): Promise<ProductCategory[]> {
    const category = await this.findById(id, tenantId);
    if (!category) return [];

    const ancestorIds = category.path
      .split('/')
      .filter(segment => segment.length > 0 && segment !== category.id);

    const ancestors: ProductCategory[] = [];
    for (const ancestorId of ancestorIds) {
      const ancestor = await this.findById(ancestorId, tenantId);
      if (ancestor) ancestors.push(ancestor);
    }

    return ancestors;
  }

  async getTree(tenantId: string, rootId?: string): Promise<CategoryTreeNode[]> {
    const buildTree = async (parentId: string | null): Promise<CategoryTreeNode[]> => {
      const children = await (parentId === null
        ? this.getRootCategories(tenantId)
        : this.getChildren(parentId, tenantId));

      const nodes: CategoryTreeNode[] = [];
      for (const child of children) {
        nodes.push({
          id: child.id,
          code: child.code,
          name: child.name,
          level: child.level,
          path: child.path,
          productCount: this.productCounts.get(child.id) ?? 0,
          isActive: child.isActive,
          children: await buildTree(child.id),
        });
      }
      return nodes;
    };

    return buildTree(rootId ?? null);
  }

  async create(tenantId: string, data: CreateCategoryInput): Promise<ProductCategory> {
    // H2 Fix: Validate code doesn't exist
    if (await this.codeExists(data.code, tenantId)) {
      throw new Error(`A kategória kód már létezik: ${data.code}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    // Calculate level and path
    let level = 0;
    let path = `/${id}/`;

    if (data.parentId) {
      const parent = await this.findById(data.parentId, tenantId);
      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}${id}/`;
      }
    }

    const category: ProductCategory = {
      id,
      tenantId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      parentId: data.parentId ?? null,
      level,
      path,
      imageUrl: data.imageUrl ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.categories.set(id, category);
    return category;
  }

  async update(id: string, tenantId: string, data: UpdateCategoryInput): Promise<ProductCategory> {
    const category = await this.findById(id, tenantId);
    if (!category) {
      throw new Error('Kategória nem található');
    }

    const updated: ProductCategory = {
      ...category,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    // Handle parent change (move)
    if (data.parentId !== undefined && data.parentId !== category.parentId) {
      await this.move(id, tenantId, data.parentId);
      return (await this.findById(id, tenantId))!;
    }

    this.categories.set(id, updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const category = await this.findById(id, tenantId);
    if (!category) {
      throw new Error('Kategória nem található');
    }

    if (await this.hasChildren(id, tenantId)) {
      throw new Error('Nem törölhető: a kategóriának vannak alkategóriái');
    }

    if (await this.hasProducts(id, tenantId)) {
      throw new Error('Nem törölhető: a kategóriához tartoznak termékek');
    }

    this.categories.delete(id);
  }

  async move(id: string, tenantId: string, newParentId: string | null): Promise<ProductCategory> {
    const category = await this.findById(id, tenantId);
    if (!category) {
      throw new Error('Kategória nem található');
    }

    // Prevent circular reference
    if (newParentId) {
      const newParent = await this.findById(newParentId, tenantId);
      if (newParent && newParent.path.includes(`/${id}/`)) {
        throw new Error('Körkörös hivatkozás: a célkategória a jelenlegi kategória leszármazottja');
      }
    }

    // Calculate new level and path
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

    // Update this category
    const updated: ProductCategory = {
      ...category,
      parentId: newParentId,
      level: newLevel,
      path: newPath,
      updatedAt: new Date(),
    };
    this.categories.set(id, updated);

    // Update descendants
    const descendants = await this.getDescendants(id, tenantId);
    for (const descendant of descendants) {
      const newDescPath = descendant.path.replace(oldPath, newPath);
      this.categories.set(descendant.id, {
        ...descendant,
        level: descendant.level + levelDiff,
        path: newDescPath,
        updatedAt: new Date(),
      });
    }

    return updated;
  }

  async activate(id: string, tenantId: string): Promise<ProductCategory> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<ProductCategory> {
    return this.update(id, tenantId, { isActive: false });
  }

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.categories.values()).some(
      c => c.code === code && c.tenantId === tenantId && c.id !== excludeId
    );
  }

  async reorder(
    tenantId: string,
    categoryOrders: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    for (const { id, sortOrder } of categoryOrders) {
      const category = await this.findById(id, tenantId);
      if (category) {
        this.categories.set(id, { ...category, sortOrder, updatedAt: new Date() });
      }
    }
  }

  async countProducts(id: string, tenantId: string, includeSubcategories = true): Promise<number> {
    let count = this.productCounts.get(id) ?? 0;

    if (includeSubcategories) {
      const descendants = await this.getDescendants(id, tenantId);
      for (const desc of descendants) {
        count += this.productCounts.get(desc.id) ?? 0;
      }
    }

    return count;
  }

  // Helper method for testing - set product count
  setProductCount(categoryId: string, count: number): void {
    this.productCounts.set(categoryId, count);
  }

  async hasProducts(id: string, _tenantId: string): Promise<boolean> {
    return (this.productCounts.get(id) ?? 0) > 0;
  }

  async hasChildren(id: string, tenantId: string): Promise<boolean> {
    const children = await this.getChildren(id, tenantId);
    return children.length > 0;
  }
}
