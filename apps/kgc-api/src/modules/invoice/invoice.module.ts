/**
 * Invoice Module
 * Epic 10: Invoice Core
 *
 * Provides invoice CRUD operations with Prisma persistence.
 */

import { Module } from '@nestjs/common';
import { PrismaInvoiceRepository } from './repositories/prisma-invoice.repository';

@Module({
  providers: [
    {
      provide: 'INVOICE_REPOSITORY',
      useClass: PrismaInvoiceRepository,
    },
    PrismaInvoiceRepository,
  ],
  exports: ['INVOICE_REPOSITORY', PrismaInvoiceRepository],
})
export class InvoiceModule {}
