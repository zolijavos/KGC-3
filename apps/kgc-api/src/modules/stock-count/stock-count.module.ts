/**
 * StockCount Module - NestJS Module for Stock Count (Leltár) Management
 * Epic 24: Leltár (Stock Count)
 *
 * Provides:
 * - Stock count CRUD operations (24-1)
 * - Count recording with barcode/manual entry (24-2)
 * - Variance analysis and stock adjustments (24-3)
 *
 * forRoot pattern for dependency injection with Prisma
 */

import { CountRecordingService, StockCountService, VarianceService } from '@kgc/leltar';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Controller
import {
  COUNT_RECORDING_SERVICE,
  STOCK_COUNT_SERVICE,
  StockCountController,
  VARIANCE_SERVICE,
} from './stock-count.controller';

// Repositories
import {
  PrismaCounterSessionRepository,
  PrismaInventoryQueryRepository,
  PrismaStockAdjustmentRepository,
  PrismaStockCountItemRepository,
  PrismaStockCountRepository,
} from './repositories';

// Repository tokens
export const STOCK_COUNT_REPOSITORY = Symbol('STOCK_COUNT_REPOSITORY');
export const STOCK_COUNT_ITEM_REPOSITORY = Symbol('STOCK_COUNT_ITEM_REPOSITORY');
export const COUNTER_SESSION_REPOSITORY = Symbol('COUNTER_SESSION_REPOSITORY');
export const STOCK_ADJUSTMENT_REPOSITORY = Symbol('STOCK_ADJUSTMENT_REPOSITORY');
export const INVENTORY_QUERY_REPOSITORY = Symbol('INVENTORY_QUERY_REPOSITORY');

// Service dependency tokens
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const INVENTORY_SERVICE = Symbol('INVENTORY_SERVICE');
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface StockCountModuleOptions {
  prisma: PrismaClient;
  auditService?: {
    log(
      event: string,
      entityType: string,
      entityId: string,
      data: Record<string, unknown>
    ): Promise<void>;
  };
  userRepository?: {
    findById(id: string): Promise<{ id: string; name: string } | null>;
  };
  inventoryService?: {
    adjustStock(
      productId: string,
      warehouseId: string,
      quantity: number,
      reason: string,
      reference: string
    ): Promise<void>;
  };
  productRepository?: {
    findById(id: string): Promise<{ id: string; name: string; unitPrice: number } | null>;
  };
}

/**
 * Default no-op Audit Service for development
 */
const defaultAuditService = {
  log: async () => {
    /* no-op */
  },
};

/**
 * Default User Repository stub for development
 */
const defaultUserRepository = {
  findById: async (id: string) => ({ id, name: 'Unknown User' }),
};

/**
 * Default Inventory Service stub for development
 */
const defaultInventoryService = {
  adjustStock: async () => {
    /* no-op */
  },
};

/**
 * Default Product Repository stub for development
 */
const defaultProductRepository = {
  findById: async () => null,
};

@Module({})
export class StockCountModule {
  static forRoot(options: StockCountModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: 'STOCK_COUNT_REPOSITORY',
        useClass: PrismaStockCountRepository,
      },
      {
        provide: 'STOCK_COUNT_ITEM_REPOSITORY',
        useClass: PrismaStockCountItemRepository,
      },
      {
        provide: 'COUNTER_SESSION_REPOSITORY',
        useClass: PrismaCounterSessionRepository,
      },
      {
        provide: 'STOCK_ADJUSTMENT_REPOSITORY',
        useClass: PrismaStockAdjustmentRepository,
      },
      {
        provide: 'INVENTORY_QUERY_REPOSITORY',
        useClass: PrismaInventoryQueryRepository,
      },

      // External dependencies (with defaults for development)
      {
        provide: 'AUDIT_SERVICE',
        useValue: options.auditService ?? defaultAuditService,
      },
      {
        provide: 'USER_REPOSITORY',
        useValue: options.userRepository ?? defaultUserRepository,
      },
      {
        provide: 'INVENTORY_SERVICE',
        useValue: options.inventoryService ?? defaultInventoryService,
      },
      {
        provide: 'PRODUCT_REPOSITORY',
        useValue: options.productRepository ?? defaultProductRepository,
      },

      // Services
      {
        provide: STOCK_COUNT_SERVICE,
        useClass: StockCountService,
      },
      {
        provide: COUNT_RECORDING_SERVICE,
        useClass: CountRecordingService,
      },
      {
        provide: VARIANCE_SERVICE,
        useClass: VarianceService,
      },
    ];

    return {
      module: StockCountModule,
      controllers: [StockCountController],
      providers,
      exports: [
        STOCK_COUNT_SERVICE,
        COUNT_RECORDING_SERVICE,
        VARIANCE_SERVICE,
        'STOCK_COUNT_REPOSITORY',
        'STOCK_COUNT_ITEM_REPOSITORY',
        'COUNTER_SESSION_REPOSITORY',
        'STOCK_ADJUSTMENT_REPOSITORY',
      ],
    };
  }
}
