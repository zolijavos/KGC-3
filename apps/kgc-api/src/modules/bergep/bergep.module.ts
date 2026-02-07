/**
 * Bergep Module - Rental Equipment Management
 * Epic 13: Bérgép törzs, státusz lifecycle, tartozék kezelés
 * Epic 40: Bérgép Megtérülés & Előzmények
 *
 * Provides NestJS module with forRoot pattern for Prisma injection.
 */

import { EQUIPMENT_REPOSITORY, RentalEquipmentService } from '@kgc/bergep';
import { EquipmentCostService, EquipmentProfitService } from '@kgc/rental-core';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BergepController } from './controllers/bergep.controller';
import { PrismaEquipmentCostRepository } from './repositories/prisma-equipment-cost.repository';
import { PrismaEquipmentHistoryRepository } from './repositories/prisma-equipment-history.repository';
import { PrismaEquipmentProfitRepository } from './repositories/prisma-equipment-profit.repository';

/**
 * Equipment Cost Repository injection token
 */
export const EQUIPMENT_COST_REPOSITORY = Symbol('EQUIPMENT_COST_REPOSITORY');

/**
 * Equipment Profit Repository injection token (Story 40-2)
 */
export const EQUIPMENT_PROFIT_REPOSITORY = Symbol('EQUIPMENT_PROFIT_REPOSITORY');

/**
 * Module options interface
 */
export interface BergepModuleOptions {
  prisma: PrismaClient;
}

/**
 * Bergep Module
 *
 * Usage:
 * ```typescript
 * BergepModule.forRoot({ prisma })
 * ```
 */
@Module({})
export class BergepModule {
  static forRoot(options: BergepModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },
      // For now, use the InMemory repository from @kgc/bergep
      // TODO: Replace with PrismaEquipmentRepository when available
      {
        provide: EQUIPMENT_REPOSITORY,
        useFactory: () => {
          // Import InMemoryEquipmentRepository dynamically
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { InMemoryEquipmentRepository } = require('@kgc/bergep');
          return new InMemoryEquipmentRepository();
        },
      },
      RentalEquipmentService,
      // Epic 40: Equipment Cost Service and Repository
      PrismaEquipmentCostRepository,
      {
        provide: EQUIPMENT_COST_REPOSITORY,
        useExisting: PrismaEquipmentCostRepository,
      },
      {
        provide: EquipmentCostService,
        useFactory: (repository: PrismaEquipmentCostRepository) => {
          return new EquipmentCostService(repository);
        },
        inject: [PrismaEquipmentCostRepository],
      },
      // Epic 40: Equipment Profit Service and Repository (Story 40-2)
      PrismaEquipmentProfitRepository,
      // Epic 40: Equipment History Repository (Story 40-3)
      PrismaEquipmentHistoryRepository,
      {
        provide: EQUIPMENT_PROFIT_REPOSITORY,
        useExisting: PrismaEquipmentProfitRepository,
      },
      {
        provide: EquipmentProfitService,
        useFactory: (repository: PrismaEquipmentProfitRepository) => {
          return new EquipmentProfitService(repository);
        },
        inject: [PrismaEquipmentProfitRepository],
      },
    ];

    return {
      module: BergepModule,
      controllers: [BergepController],
      providers,
      exports: [
        RentalEquipmentService,
        EQUIPMENT_REPOSITORY,
        EquipmentCostService,
        EquipmentProfitService,
      ],
    };
  }
}
