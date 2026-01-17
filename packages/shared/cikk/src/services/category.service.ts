import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Category,
  CategoryStatus,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilterOptions,
  CategoryTreeNode,
} from '../interfaces/category.interface';
import { HierarchyValidationService, CategoryAncestor } from './hierarchy-validation.service';

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Category entity type for audit logging
 */
const AUDIT_ENTITY_TYPE = 'CATEGORY';

/**
 * CategoryService - Cikkcsoport CRUD operations
 * Story 8-2: Cikkcsoport Hierarchia - AC1, AC2, AC3
 *
 * Provides:
 * - Create category with hierarchy validation
 * - Get category by ID
 * - Update category with circular reference check
 * - Soft delete (status: INACTIVE)
 * - Category tree retrieval
 * - Children and ancestors queries
 *
 * @kgc/cikk
 */
@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: any, // PrismaService
    private readonly hierarchyService: HierarchyValidationService,
    private readonly auditService: any // AuditService
  ) {}

  /**
   * Create a new category
   *
   * @param tenantId - Tenant context
   * @param input - Category creation data
   * @param userId - User performing the action (for audit)
   * @returns Created category
   */
  async createCategory(
    tenantId: string,
    input: CreateCategoryInput,
    userId: string
  ): Promise<Category> {
    // Validate code
    if (!input.code || input.code.trim() === '') {
      throw new BadRequestException('A kategória kód kötelező');
    }
    if (input.code.trim().length > 50) {
      throw new BadRequestException('A kategória kód maximum 50 karakter lehet');
    }

    // Validate name
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('A kategória neve kötelező');
    }
    if (input.name.trim().length > 255) {
      throw new BadRequestException('A kategória neve maximum 255 karakter lehet');
    }

    // Check if code already exists
    const existingByCode = await this.prisma.category.findMany({
      where: { tenantId, code: input.code.trim() },
    });
    if (existingByCode.length > 0) {
      throw new BadRequestException('A kategória kód már létezik');
    }

    // Validate max depth if parent specified
    const depthResult = await this.hierarchyService.validateMaxDepth(
      input.parentId ?? null,
      tenantId
    );
    if (!depthResult.valid) {
      throw new BadRequestException(depthResult.error ?? 'Maximális mélység túllépve');
    }

    // Calculate path
    const pathResult = await this.hierarchyService.calculatePath(
      input.parentId ?? null,
      tenantId
    );

    // Create category
    const category = await this.prisma.category.create({
      data: {
        tenantId,
        code: input.code.trim(),
        name: input.name.trim(),
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        path: pathResult.path,
        depth: pathResult.depth,
        status: CategoryStatus.ACTIVE,
      },
    });

    // Audit log
    await this.auditService.logCreate({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: category.id,
      after: category,
    });

    return category;
  }

  /**
   * Get category by ID
   *
   * @param id - Category ID
   * @param tenantId - Tenant context
   * @returns Category or null
   */
  async getCategoryById(id: string, tenantId: string): Promise<Category | null> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen kategória ID formátum');
    }

    return this.prisma.category.findUnique({
      where: { id, tenantId },
    });
  }

  /**
   * Update category
   *
   * @param id - Category ID
   * @param tenantId - Tenant context
   * @param input - Update data
   * @param userId - User performing the action (for audit)
   * @returns Updated category
   */
  async updateCategory(
    id: string,
    tenantId: string,
    input: UpdateCategoryInput,
    userId: string
  ): Promise<Category> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen kategória ID formátum');
    }

    // Find existing category
    const existingCategory = await this.prisma.category.findUnique({
      where: { id, tenantId },
    });

    if (!existingCategory) {
      throw new NotFoundException('Kategória nem található');
    }

    // Check for circular reference if parent is being changed
    if (input.parentId !== undefined && input.parentId !== existingCategory.parentId) {
      if (input.parentId !== null) {
        const isCircular = await this.hierarchyService.detectCircularReference(
          id,
          input.parentId,
          tenantId
        );
        if (isCircular) {
          throw new BadRequestException('Körkörös referencia detektálva');
        }

        // Validate new depth
        const depthResult = await this.hierarchyService.validateMaxDepth(
          input.parentId,
          tenantId
        );
        if (!depthResult.valid) {
          throw new BadRequestException(depthResult.error ?? 'Maximális mélység túllépve');
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.parentId !== undefined) {
      updateData.parentId = input.parentId;
      // Recalculate path if parent changed
      const pathResult = await this.hierarchyService.calculatePath(
        input.parentId,
        tenantId
      );
      updateData.path = pathResult.path;
      updateData.depth = pathResult.depth;
    }
    if (input.status !== undefined) updateData.status = input.status;

    // Update category
    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await this.auditService.logUpdate({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: id,
      before: existingCategory,
      after: updatedCategory,
    });

    return updatedCategory;
  }

  /**
   * Soft delete category (set status to INACTIVE)
   *
   * @param id - Category ID
   * @param tenantId - Tenant context
   * @param userId - User performing the action (for audit)
   * @returns Deleted category
   */
  async deleteCategory(id: string, tenantId: string, userId: string): Promise<Category> {
    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Érvénytelen kategória ID formátum');
    }

    // Find existing category
    const existingCategory = await this.prisma.category.findUnique({
      where: { id, tenantId },
    });

    if (!existingCategory) {
      throw new NotFoundException('Kategória nem található');
    }

    if (existingCategory.status === CategoryStatus.INACTIVE) {
      throw new BadRequestException('Kategória már törölve');
    }

    // Clear categoryId for items in this category
    await this.prisma.item.updateMany({
      where: { categoryId: id, tenantId },
      data: { categoryId: null },
    });

    // Soft delete
    const deletedCategory = await this.prisma.category.update({
      where: { id },
      data: { status: CategoryStatus.INACTIVE },
    });

    // Audit log
    await this.auditService.logDelete({
      tenantId,
      userId,
      entityType: AUDIT_ENTITY_TYPE,
      entityId: id,
      before: existingCategory,
    });

    return deletedCategory;
  }

  /**
   * Get category tree structure
   *
   * @param tenantId - Tenant context
   * @param filter - Filter options
   * @returns Category tree
   */
  async getCategoryTree(
    tenantId: string,
    filter: CategoryFilterOptions
  ): Promise<CategoryTreeNode[]> {
    const where: Record<string, unknown> = {
      tenantId,
    };

    // Filter by root only
    if (filter.rootOnly) {
      where.parentId = null;
    }

    // Exclude inactive by default
    if (!filter.includeInactive) {
      where.status = { not: CategoryStatus.INACTIVE };
    }

    // Search by name or code
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        children: filter.maxDepth && filter.maxDepth > 0 ? {
          include: {
            children: filter.maxDepth && filter.maxDepth > 1 ? true : false,
          },
        } : false,
      },
    });

    return categories as CategoryTreeNode[];
  }

  /**
   * Get direct children of a category
   *
   * @param categoryId - Parent category ID
   * @param tenantId - Tenant context
   * @returns Child categories
   */
  async getChildren(categoryId: string, tenantId: string): Promise<Category[]> {
    // Validate UUID format
    if (!UUID_REGEX.test(categoryId)) {
      throw new BadRequestException('Érvénytelen kategória ID formátum');
    }

    return this.prisma.category.findMany({
      where: {
        tenantId,
        parentId: categoryId,
        status: { not: CategoryStatus.INACTIVE },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all ancestors of a category
   *
   * @param categoryId - Category ID
   * @param tenantId - Tenant context
   * @returns Ancestor categories (closest first)
   */
  async getAncestors(categoryId: string, tenantId: string): Promise<CategoryAncestor[]> {
    return this.hierarchyService.getAncestors(categoryId, tenantId);
  }
}
