/**
 * Bergep Module - Rental Equipment Management
 * Epic 13: Bérgép törzs, státusz lifecycle, tartozék kezelés
 *
 * Provides NestJS module with forRoot pattern for Prisma injection.
 */

import { EQUIPMENT_REPOSITORY, RentalEquipmentService } from '@kgc/bergep';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BergepController } from './controllers/bergep.controller';

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
    ];

    return {
      module: BergepModule,
      controllers: [BergepController],
      providers,
      exports: [RentalEquipmentService, EQUIPMENT_REPOSITORY],
    };
  }
}
