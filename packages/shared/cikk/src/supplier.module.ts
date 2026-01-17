/**
 * SupplierModule - NestJS modul beszállító kezeléshez
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { Module, DynamicModule, type Provider } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './services/supplier.service';
import { SupplierItemService } from './services/supplier-item.service';
import { PriceHistoryService } from './services/price-history.service';
import { CsvImportService } from './services/csv-import.service';

/**
 * Injection tokens
 */
export const PRISMA_SERVICE = Symbol('PRISMA_SERVICE');
export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

/**
 * Module options interface
 */
export interface SupplierModuleOptions {
  prismaService: unknown; // PrismaService type from your infrastructure
  auditLogger: unknown; // AuditLogger service
}

/**
 * SupplierModule - Beszállító kezelés modul
 * Story 8-3: Beszállító Kapcsolat és Import
 *
 * Provides:
 * - SupplierService - Beszállító CRUD
 * - SupplierItemService - Cikk-beszállító kapcsolat kezelés
 * - PriceHistoryService - Ár history
 * - CsvImportService - CSV import
 * - SupplierController - REST API endpoints
 */
@Module({})
export class SupplierModule {
  /**
   * Register module with dependencies
   */
  static register(options: SupplierModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PRISMA_SERVICE,
        useValue: options.prismaService,
      },
      {
        provide: AUDIT_LOGGER,
        useValue: options.auditLogger,
      },
      {
        provide: SupplierService,
        useFactory: (prisma: unknown, auditLogger: unknown) => {
          return new SupplierService(prisma as never, auditLogger as never);
        },
        inject: [PRISMA_SERVICE, AUDIT_LOGGER],
      },
      {
        provide: SupplierItemService,
        useFactory: (prisma: unknown, auditLogger: unknown) => {
          return new SupplierItemService(prisma as never, auditLogger as never);
        },
        inject: [PRISMA_SERVICE, AUDIT_LOGGER],
      },
      {
        provide: PriceHistoryService,
        useFactory: (prisma: unknown) => {
          return new PriceHistoryService(prisma as never);
        },
        inject: [PRISMA_SERVICE],
      },
      {
        provide: CsvImportService,
        useFactory: (prisma: unknown, auditLogger: unknown) => {
          return new CsvImportService(prisma as never, auditLogger as never);
        },
        inject: [PRISMA_SERVICE, AUDIT_LOGGER],
      },
    ];

    return {
      module: SupplierModule,
      controllers: [SupplierController],
      providers,
      exports: [SupplierService, SupplierItemService, PriceHistoryService, CsvImportService],
    };
  }

  /**
   * Register module for testing without dependencies
   */
  static forTesting(): DynamicModule {
    return {
      module: SupplierModule,
      providers: [SupplierService, SupplierItemService, PriceHistoryService, CsvImportService],
      exports: [SupplierService, SupplierItemService, PriceHistoryService, CsvImportService],
    };
  }
}
