import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from './services/category.service';
import { CategoryStatsService } from './services/category-stats.service';
import {
  CreateCategoryDto,
  validateCreateCategoryDto,
  formatCategoryValidationErrors,
} from './dto/create-category.dto';
import { UpdateCategoryDto, validateUpdateCategoryDto } from './dto/update-category.dto';
import {
  CategoryFilterDto,
  parseCategoryFilterFromQuery,
} from './dto/category-filter.dto';
import { Category, CategoryTreeNode, CategoryStats } from './interfaces/category.interface';
import { ZodError } from 'zod';

/**
 * Current tenant decorator (placeholder - real implementation in @kgc/tenant)
 */
function CurrentTenant(): ParameterDecorator {
  return () => {};
}

/**
 * Current user decorator (placeholder - real implementation in @kgc/auth)
 */
function CurrentUser(): ParameterDecorator {
  return () => {};
}

/**
 * API response wrapper for single item
 */
interface ApiResponse<T> {
  data: T;
}

/**
 * API response wrapper for list with pagination
 */
interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CategoryController - Category CRUD endpoints
 * Story 8-2: Cikkcsoport Hierarchia - AC1, AC3, AC4, AC5
 *
 * Endpoints:
 * - POST   /api/v1/categories         - Create category
 * - GET    /api/v1/categories         - List categories
 * - GET    /api/v1/categories/tree    - Get category tree
 * - GET    /api/v1/categories/:id     - Get category by ID
 * - GET    /api/v1/categories/:id/children - Get children
 * - GET    /api/v1/categories/:id/stats    - Get statistics
 * - PATCH  /api/v1/categories/:id     - Update category
 * - DELETE /api/v1/categories/:id     - Soft delete category
 *
 * @kgc/cikk
 */
@Controller('api/v1/categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly categoryStatsService: CategoryStatsService
  ) {}

  /**
   * Create a new category
   *
   * POST /api/v1/categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ): Promise<ApiResponse<Category>> {
    // Validate input
    let dto: CreateCategoryDto;
    try {
      dto = validateCreateCategoryDto(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Érvénytelen adatok',
          fields: formatCategoryValidationErrors(error),
        });
      }
      throw error;
    }

    const category = await this.categoryService.createCategory(tenantId, dto, userId);
    return { data: category };
  }

  /**
   * Get category list
   *
   * GET /api/v1/categories
   */
  @Get()
  async list(
    @Query() query: Record<string, unknown>,
    @CurrentTenant() tenantId: string
  ): Promise<ApiListResponse<Category>> {
    let filter: CategoryFilterDto;
    try {
      filter = parseCategoryFilterFromQuery(query);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Érvénytelen szűrési paraméterek',
        });
      }
      throw error;
    }

    const categories = await this.categoryService.getCategoryTree(tenantId, {
      search: filter.search,
      parentId: filter.parentId ?? undefined,
      rootOnly: filter.rootOnly,
      includeInactive: filter.includeInactive,
      maxDepth: filter.maxDepth,
    });

    return {
      data: categories,
      meta: {
        total: categories.length,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(categories.length / filter.limit),
      },
    };
  }

  /**
   * Get category tree structure
   *
   * GET /api/v1/categories/tree
   */
  @Get('tree')
  async getTree(
    @Query() query: Record<string, unknown>,
    @CurrentTenant() tenantId: string
  ): Promise<ApiResponse<CategoryTreeNode[]>> {
    let filter: CategoryFilterDto;
    try {
      filter = parseCategoryFilterFromQuery(query);
    } catch {
      filter = { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc', rootOnly: true, includeInactive: false };
    }

    const tree = await this.categoryService.getCategoryTree(tenantId, {
      rootOnly: true, // Tree always starts from root
      includeInactive: filter.includeInactive,
      maxDepth: filter.maxDepth ?? 5,
    });

    return { data: tree };
  }

  /**
   * Get category by ID
   *
   * GET /api/v1/categories/:id
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string
  ): Promise<ApiResponse<Category>> {
    const category = await this.categoryService.getCategoryById(id, tenantId);

    if (!category) {
      throw new BadRequestException({
        code: 'NOT_FOUND',
        message: 'Kategória nem található',
      });
    }

    return { data: category };
  }

  /**
   * Get children of a category
   *
   * GET /api/v1/categories/:id/children
   */
  @Get(':id/children')
  async getChildren(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string
  ): Promise<ApiResponse<Category[]>> {
    const children = await this.categoryService.getChildren(id, tenantId);
    return { data: children };
  }

  /**
   * Get category statistics
   *
   * GET /api/v1/categories/:id/stats
   */
  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string
  ): Promise<ApiResponse<CategoryStats>> {
    const stats = await this.categoryStatsService.getStats(id, tenantId);
    return { data: stats };
  }

  /**
   * Update category
   *
   * PATCH /api/v1/categories/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ): Promise<ApiResponse<Category>> {
    // Validate input
    let dto: UpdateCategoryDto;
    try {
      dto = validateUpdateCategoryDto(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Érvénytelen adatok',
        });
      }
      throw error;
    }

    const category = await this.categoryService.updateCategory(id, tenantId, dto, userId);
    return { data: category };
  }

  /**
   * Soft delete category
   *
   * DELETE /api/v1/categories/:id
   */
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ): Promise<ApiResponse<Category>> {
    const category = await this.categoryService.deleteCategory(id, tenantId, userId);
    return { data: category };
  }
}
