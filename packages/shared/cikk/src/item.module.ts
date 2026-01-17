import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ItemController } from './item.controller';
import { ItemService } from './services/item.service';
import { ItemCodeGeneratorService } from './services/item-code-generator.service';
import { BarcodeService } from './services/barcode.service';

/**
 * Prisma client injection token
 */
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

/**
 * Audit service injection token
 */
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');

/**
 * ItemModule options
 */
export interface ItemModuleOptions {
  /**
   * Prisma client instance
   */
  prismaClient: unknown;

  /**
   * Audit service instance (from @kgc/audit)
   */
  auditService?: unknown;
}

/**
 * ItemModule - Product Catalog module for KGC ERP
 * Story 8-1: Cikk CRUD
 *
 * Provides:
 * - ItemService - CRUD operations for items
 * - ItemCodeGeneratorService - Auto code generation
 * - BarcodeService - EAN-13 validation
 * - ItemController - REST API endpoints
 *
 * Dependencies:
 * - @kgc/tenant - TenantContextMiddleware, @CurrentTenant
 * - @kgc/audit - AuditService
 *
 * @kgc/cikk
 */
@Module({})
export class ItemModule {
  /**
   * Register ItemModule with dependencies
   *
   * @param options - Module options with prisma and audit service
   * @returns Dynamic module
   *
   * @example
   * ```typescript
   * import { ItemModule } from '@kgc/cikk';
   * import { PrismaService } from './prisma.service';
   * import { AuditService } from '@kgc/audit';
   *
   * @Module({
   *   imports: [
   *     ItemModule.register({
   *       prismaClient: PrismaService,
   *       auditService: AuditService,
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static register(options: ItemModuleOptions): DynamicModule {
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
        provide: ItemCodeGeneratorService,
        useFactory: (prisma: unknown) => new ItemCodeGeneratorService(prisma),
        inject: [PRISMA_CLIENT],
      },
      {
        provide: BarcodeService,
        useFactory: (prisma: unknown) => new BarcodeService(prisma),
        inject: [PRISMA_CLIENT],
      },
      {
        provide: ItemService,
        useFactory: (
          prisma: unknown,
          codeGenerator: ItemCodeGeneratorService,
          barcode: BarcodeService,
          audit: unknown
        ) => new ItemService(prisma, codeGenerator, barcode, audit),
        inject: [PRISMA_CLIENT, ItemCodeGeneratorService, BarcodeService, AUDIT_SERVICE],
      },
    ];

    return {
      module: ItemModule,
      controllers: [ItemController],
      providers,
      exports: [ItemService, BarcodeService, ItemCodeGeneratorService],
    };
  }

  /**
   * Register ItemModule for testing without dependencies
   *
   * @returns Dynamic module for testing
   */
  static forTesting(): DynamicModule {
    return {
      module: ItemModule,
      providers: [ItemService, ItemCodeGeneratorService, BarcodeService],
      exports: [ItemService, BarcodeService, ItemCodeGeneratorService],
    };
  }
}
