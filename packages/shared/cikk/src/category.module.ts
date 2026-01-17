import { Module, DynamicModule, Provider } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './services/category.service';
import { HierarchyValidationService } from './services/hierarchy-validation.service';
import { CategoryStatsService } from './services/category-stats.service';
import { PRISMA_CLIENT, AUDIT_SERVICE } from './item.module';

/**
 * CategoryModule - Category management module for KGC ERP
 * Story 8-2: Cikkcsoport Hierarchia
 *
 * Provides:
 * - CategoryService - CRUD operations for categories
 * - HierarchyValidationService - Max depth, circular reference detection
 * - CategoryStatsService - Item counts, statistics
 * - CategoryController - REST API endpoints
 *
 * Dependencies:
 * - @kgc/tenant - TenantContextMiddleware, @CurrentTenant
 * - @kgc/audit - AuditService
 *
 * @kgc/cikk
 */
@Module({})
export class CategoryModule {
  /**
   * Register CategoryModule with dependencies
   *
   * @param options - Module options with prisma and audit service
   * @returns Dynamic module
   */
  static register(options: { prismaClient: unknown; auditService?: unknown }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PRISMA_CLIENT,
        useValue: options.prismaClient,
      },
      {
        provide: AUDIT_SERVICE,
        useValue: options.auditService,
      },
      {
        provide: HierarchyValidationService,
        useFactory: (prisma: unknown) => new HierarchyValidationService(prisma),
        inject: [PRISMA_CLIENT],
      },
      {
        provide: CategoryStatsService,
        useFactory: (prisma: unknown) => new CategoryStatsService(prisma),
        inject: [PRISMA_CLIENT],
      },
      {
        provide: CategoryService,
        useFactory: (
          prisma: unknown,
          hierarchy: HierarchyValidationService,
          audit: unknown
        ) => new CategoryService(prisma, hierarchy, audit),
        inject: [PRISMA_CLIENT, HierarchyValidationService, AUDIT_SERVICE],
      },
    ];

    return {
      module: CategoryModule,
      controllers: [CategoryController],
      providers,
      exports: [CategoryService, HierarchyValidationService, CategoryStatsService],
    };
  }

  /**
   * Register CategoryModule for testing without dependencies
   *
   * @returns Dynamic module for testing
   */
  static forTesting(): DynamicModule {
    return {
      module: CategoryModule,
      providers: [CategoryService, HierarchyValidationService, CategoryStatsService],
      exports: [CategoryService, HierarchyValidationService, CategoryStatsService],
    };
  }
}
