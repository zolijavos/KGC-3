/**
 * Receivables Dashboard Module
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Module for receivables aging report dashboard functionality.
 */

import { DynamicModule, Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { ReceivablesDashboardController } from './receivables.controller';
import { ReceivablesDashboardService } from './receivables.service';

@Module({})
export class ReceivablesDashboardModule {
  static forRoot(prisma: PrismaClient): DynamicModule {
    return {
      module: ReceivablesDashboardModule,
      controllers: [ReceivablesDashboardController],
      providers: [
        {
          provide: 'PRISMA_CLIENT',
          useValue: prisma,
        },
        ReceivablesDashboardService,
      ],
      exports: [ReceivablesDashboardService],
    };
  }
}
