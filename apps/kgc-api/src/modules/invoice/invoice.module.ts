/**
 * Invoice Module - NestJS Module for Invoice Management
 * Epic 10: Invoice Core
 *
 * Provides:
 * - Invoice CRUD operations - Story 10-1
 * - Invoice item management - Story 10-2
 * - PDF generation - Story 10-3
 * - Status workflow - Story 10-4
 * - Storno invoices - Story 10-5
 * - RBAC visibility - Story 10-6
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Repository
import { PrismaInvoiceRepository } from './repositories/prisma-invoice.repository';

// Controller
import { InvoiceController } from './controllers/invoice.controller';

// Services from package
import { InvoiceRbacService, InvoiceService, StornoService } from '@kgc/sales-invoice';

// PDF Service
import { InvoicePdfService } from './services/invoice-pdf.service';

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');

export interface InvoiceModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class InvoiceModule {
  static forRoot(options: InvoiceModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repository
      {
        provide: INVOICE_REPOSITORY,
        useClass: PrismaInvoiceRepository,
      },
      PrismaInvoiceRepository,

      // Services
      {
        provide: InvoiceService,
        useFactory: (repo: PrismaInvoiceRepository) => new InvoiceService(repo),
        inject: [PrismaInvoiceRepository],
      },
      {
        provide: StornoService,
        useFactory: (repo: PrismaInvoiceRepository) => new StornoService(repo),
        inject: [PrismaInvoiceRepository],
      },
      InvoiceRbacService,
      InvoicePdfService,
    ];

    return {
      module: InvoiceModule,
      controllers: [InvoiceController],
      providers,
      exports: [
        INVOICE_REPOSITORY,
        PrismaInvoiceRepository,
        InvoiceService,
        StornoService,
        InvoiceRbacService,
        InvoicePdfService,
      ],
    };
  }
}
