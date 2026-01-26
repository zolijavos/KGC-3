/**
 * @kgc/bevetelezes - BevetelezesModule
 * Epic 21: Goods Receipt Management
 *
 * NestJS module that wires together:
 *   - Services from @kgc/bevetelezes package
 *   - Prisma repositories (local)
 *   - API controllers
 */

import {
  AvizoService,
  DiscrepancyService,
  IAuditService,
  IAvizoItemRepository,
  IAvizoRepository,
  IDiscrepancyRepository,
  IInventoryService,
  IReceiptItemRepository,
  IReceiptRepository,
  ISupplierNotificationService,
  ReceiptService,
} from '@kgc/bevetelezes';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AvizoController,
  DiscrepancyController,
  ReceiptController,
} from './bevetelezes.controller';
import {
  PrismaAvizoItemRepository,
  PrismaAvizoRepository,
  PrismaDiscrepancyRepository,
  PrismaReceiptItemRepository,
  PrismaReceiptRepository,
} from './prisma-bevetelezes.repository';

// ============================================
// Stub Services (to be replaced with real implementations)
// ============================================

class StubAuditService implements IAuditService {
  private readonly logger = new Logger('AuditService');

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logger.log(`AUDIT: ${entry.action} on ${entry.entityType}:${entry.entityId}`);
  }
}

class StubInventoryService implements IInventoryService {
  private readonly logger = new Logger('InventoryService');

  async increaseStock(
    tenantId: string,
    productId: string,
    quantity: number,
    locationCode?: string
  ): Promise<void> {
    this.logger.log(
      `INVENTORY: +${quantity} of ${productId} at ${locationCode ?? 'default'} for tenant ${tenantId}`
    );
    // TODO: Integrate with @kgc/inventory when ready
  }
}

class StubSupplierNotificationService implements ISupplierNotificationService {
  private readonly logger = new Logger('SupplierNotification');

  async notifyDiscrepancy(
    supplierId: string,
    supplierName: string,
    discrepancy: { type: string; difference: number },
    receiptNumber: string
  ): Promise<void> {
    this.logger.log(
      `NOTIFICATION: Discrepancy ${discrepancy.type} (${discrepancy.difference}) for ${receiptNumber} sent to ${supplierName} (${supplierId})`
    );
    // TODO: Integrate with email/notification service
  }
}

// ============================================
// Module Configuration
// ============================================

export interface BevetelezesModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class BevetelezesModule {
  static forRoot(options: BevetelezesModuleOptions): DynamicModule {
    const { prisma } = options;

    return {
      module: BevetelezesModule,
      controllers: [AvizoController, ReceiptController, DiscrepancyController],
      providers: [
        // Prisma Client
        {
          provide: 'PRISMA_CLIENT',
          useValue: prisma,
        },

        // Repositories
        {
          provide: 'AVIZO_REPOSITORY',
          useFactory: () => new PrismaAvizoRepository(prisma),
        },
        {
          provide: 'AVIZO_ITEM_REPOSITORY',
          useFactory: () => new PrismaAvizoItemRepository(prisma),
        },
        {
          provide: 'RECEIPT_REPOSITORY',
          useFactory: () => new PrismaReceiptRepository(prisma),
        },
        {
          provide: 'RECEIPT_ITEM_REPOSITORY',
          useFactory: () => new PrismaReceiptItemRepository(prisma),
        },
        {
          provide: 'DISCREPANCY_REPOSITORY',
          useFactory: () => new PrismaDiscrepancyRepository(prisma),
        },

        // Stub services (to be replaced)
        {
          provide: 'AUDIT_SERVICE',
          useClass: StubAuditService,
        },
        {
          provide: 'INVENTORY_SERVICE',
          useClass: StubInventoryService,
        },
        {
          provide: 'SUPPLIER_NOTIFICATION_SERVICE',
          useClass: StubSupplierNotificationService,
        },

        // AvizoService (Story 21-1)
        {
          provide: AvizoService,
          useFactory: (
            avizoRepo: IAvizoRepository,
            itemRepo: IAvizoItemRepository,
            auditService: IAuditService
          ) => new AvizoService(avizoRepo, itemRepo, auditService),
          inject: ['AVIZO_REPOSITORY', 'AVIZO_ITEM_REPOSITORY', 'AUDIT_SERVICE'],
        },

        // ReceiptService (Story 21-2)
        {
          provide: ReceiptService,
          useFactory: (
            receiptRepo: IReceiptRepository,
            receiptItemRepo: IReceiptItemRepository,
            avizoRepo: IAvizoRepository,
            avizoItemRepo: IAvizoItemRepository,
            inventoryService: IInventoryService,
            auditService: IAuditService
          ) =>
            new ReceiptService(
              receiptRepo,
              receiptItemRepo,
              avizoRepo,
              avizoItemRepo,
              inventoryService,
              auditService
            ),
          inject: [
            'RECEIPT_REPOSITORY',
            'RECEIPT_ITEM_REPOSITORY',
            'AVIZO_REPOSITORY',
            'AVIZO_ITEM_REPOSITORY',
            'INVENTORY_SERVICE',
            'AUDIT_SERVICE',
          ],
        },

        // DiscrepancyService (Story 21-3)
        {
          provide: DiscrepancyService,
          useFactory: (
            discrepancyRepo: IDiscrepancyRepository,
            receiptRepo: IReceiptRepository,
            receiptItemRepo: IReceiptItemRepository,
            supplierNotificationService: ISupplierNotificationService,
            auditService: IAuditService
          ) =>
            new DiscrepancyService(
              discrepancyRepo,
              receiptRepo,
              receiptItemRepo,
              supplierNotificationService,
              auditService
            ),
          inject: [
            'DISCREPANCY_REPOSITORY',
            'RECEIPT_REPOSITORY',
            'RECEIPT_ITEM_REPOSITORY',
            'SUPPLIER_NOTIFICATION_SERVICE',
            'AUDIT_SERVICE',
          ],
        },
      ],
      exports: [AvizoService, ReceiptService, DiscrepancyService],
    };
  }
}
