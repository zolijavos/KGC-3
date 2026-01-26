/**
 * @kgc/sales-pos - PosModule
 * Epic 22: Story 22-1 + 22-2 - POS and Payment
 *
 * NestJS module that wires together:
 *   - Services from @kgc/sales-pos package
 *   - Prisma repositories (local)
 *   - API controllers
 */

import {
  IAuditService,
  IInventoryService,
  IMyPosService,
  IPaymentRepository,
  ISaleItemRepository,
  ISessionRepository,
  ITransactionRepository,
  PaymentService,
  SessionService,
  TransactionService,
} from '@kgc/sales-pos';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PaymentController, SessionController, TransactionController } from './pos.controller';
import { PrismaPaymentRepository } from './prisma-payment.repository';
import { PrismaSessionRepository } from './prisma-session.repository';
import {
  PrismaSaleItemRepository,
  PrismaTransactionRepository,
} from './prisma-transaction.repository';

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

/**
 * MyPos Stub Service
 * Simulates card payment processing (Story 22-2)
 */
class StubMyPosService implements IMyPosService {
  private readonly logger = new Logger('MyPosService');

  async processCardPayment(params: {
    amount: number;
    currency: string;
    reference: string;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
    errorMessage?: string;
  }> {
    this.logger.log(`MyPos payment: ${params.amount} ${params.currency} ref:${params.reference}`);

    // Simulate successful payment
    return {
      success: true,
      transactionId: `MYPOS-${Date.now()}`,
      cardLastFour: '4242',
      cardBrand: 'VISA',
    };
  }

  async refundPayment(transactionId: string): Promise<{ success: boolean; errorMessage?: string }> {
    this.logger.log(`MyPos refund: ${transactionId}`);
    return { success: true };
  }
}

/**
 * Inventory Stub Service
 * Simulates stock deduction (Story 22-2)
 */
class StubInventoryService implements IInventoryService {
  private readonly logger = new Logger('InventoryService');

  async deductStock(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reference: string;
    tenantId: string;
  }): Promise<{ success: boolean; newQuantity?: number; errorMessage?: string }> {
    this.logger.log(
      `Inventory deduct: product=${params.productId} qty=${params.quantity} ref=${params.reference}`
    );

    // Simulate successful deduction
    return {
      success: true,
      newQuantity: 100, // Stub value
    };
  }

  async checkAvailability(
    productId: string,
    warehouseId: string,
    _tenantId: string
  ): Promise<number> {
    this.logger.log(`Inventory check: product=${productId} warehouse=${warehouseId}`);
    return 999; // Stub: always available
  }
}

// ============================================
// Module Configuration
// ============================================

export interface PosModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class PosModule {
  static forRoot(options: PosModuleOptions): DynamicModule {
    const { prisma } = options;

    return {
      module: PosModule,
      controllers: [SessionController, TransactionController, PaymentController],
      providers: [
        // Prisma Client
        {
          provide: 'PRISMA_CLIENT',
          useValue: prisma,
        },

        // Repositories
        {
          provide: 'SESSION_REPOSITORY',
          useFactory: () => new PrismaSessionRepository(prisma),
        },
        {
          provide: 'TRANSACTION_REPOSITORY',
          useFactory: () => new PrismaTransactionRepository(prisma),
        },
        {
          provide: 'SALE_ITEM_REPOSITORY',
          useFactory: () => new PrismaSaleItemRepository(prisma),
        },
        {
          provide: 'PAYMENT_REPOSITORY',
          useFactory: () => new PrismaPaymentRepository(prisma),
        },

        // Stub services (to be replaced with real implementations)
        {
          provide: 'AUDIT_SERVICE',
          useClass: StubAuditService,
        },
        {
          provide: 'MYPOS_SERVICE',
          useClass: StubMyPosService,
        },
        {
          provide: 'INVENTORY_SERVICE',
          useClass: StubInventoryService,
        },

        // SessionService
        {
          provide: SessionService,
          useFactory: (sessionRepo: ISessionRepository, auditService: IAuditService) =>
            new SessionService(sessionRepo, auditService),
          inject: ['SESSION_REPOSITORY', 'AUDIT_SERVICE'],
        },

        // TransactionService
        {
          provide: TransactionService,
          useFactory: (
            transactionRepo: ITransactionRepository,
            saleItemRepo: ISaleItemRepository,
            sessionRepo: ISessionRepository,
            auditService: IAuditService
          ) => new TransactionService(transactionRepo, saleItemRepo, sessionRepo, auditService),
          inject: [
            'TRANSACTION_REPOSITORY',
            'SALE_ITEM_REPOSITORY',
            'SESSION_REPOSITORY',
            'AUDIT_SERVICE',
          ],
        },

        // PaymentService (Story 22-2)
        {
          provide: PaymentService,
          useFactory: (
            paymentRepo: IPaymentRepository,
            transactionRepo: ITransactionRepository,
            saleItemRepo: ISaleItemRepository,
            myPosService: IMyPosService,
            inventoryService: IInventoryService
          ) =>
            new PaymentService(
              paymentRepo,
              transactionRepo,
              saleItemRepo,
              myPosService,
              inventoryService
            ),
          inject: [
            'PAYMENT_REPOSITORY',
            'TRANSACTION_REPOSITORY',
            'SALE_ITEM_REPOSITORY',
            'MYPOS_SERVICE',
            'INVENTORY_SERVICE',
          ],
        },
      ],
      exports: [SessionService, TransactionService, PaymentService],
    };
  }
}
