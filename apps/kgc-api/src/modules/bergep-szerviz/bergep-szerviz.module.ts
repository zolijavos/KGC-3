/**
 * Bergep-Szerviz Module - NestJS Module for Equipment-Service Integration
 * Epic 25: Equipment-Service Integration
 *
 * Provides:
 * - Equipment dispatch to service - Story 25-1
 * - Equipment return from service - Story 25-2
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Package imports
import { EquipmentDispatchService, ServiceReturnService } from '@kgc/bergep-szerviz';

// Controllers
import { BergepSzervizController } from './controllers/bergep-szerviz.controller';

// Repositories
import { InMemoryDispatchRepository } from './repositories/in-memory-dispatch.repository';
import { InMemoryEquipmentRepository } from './repositories/in-memory-equipment.repository';
import {
  InMemoryAuditService,
  InMemoryNotificationService,
} from './repositories/in-memory-services';
import { InMemoryWorksheetRepository } from './repositories/in-memory-worksheet.repository';

export const EQUIPMENT_REPOSITORY = Symbol('EQUIPMENT_REPOSITORY');
export const WORKSHEET_REPOSITORY = Symbol('WORKSHEET_REPOSITORY');
export const DISPATCH_REPOSITORY = Symbol('DISPATCH_REPOSITORY');
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

export interface BergepSzervizModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class BergepSzervizModule {
  static forRoot(options: BergepSzervizModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories (InMemory for now, will be replaced with Prisma)
      {
        provide: EQUIPMENT_REPOSITORY,
        useClass: InMemoryEquipmentRepository,
      },
      {
        provide: WORKSHEET_REPOSITORY,
        useClass: InMemoryWorksheetRepository,
      },
      {
        provide: DISPATCH_REPOSITORY,
        useClass: InMemoryDispatchRepository,
      },
      {
        provide: AUDIT_SERVICE,
        useClass: InMemoryAuditService,
      },
      {
        provide: NOTIFICATION_SERVICE,
        useClass: InMemoryNotificationService,
      },

      // Services from @kgc/bergep-szerviz package
      {
        provide: EquipmentDispatchService,
        useFactory: (
          equipmentRepo: InMemoryEquipmentRepository,
          worksheetRepo: InMemoryWorksheetRepository,
          dispatchRepo: InMemoryDispatchRepository,
          auditService: InMemoryAuditService
        ) => new EquipmentDispatchService(equipmentRepo, worksheetRepo, dispatchRepo, auditService),
        inject: [EQUIPMENT_REPOSITORY, WORKSHEET_REPOSITORY, DISPATCH_REPOSITORY, AUDIT_SERVICE],
      },
      {
        provide: ServiceReturnService,
        useFactory: (
          equipmentRepo: InMemoryEquipmentRepository,
          worksheetRepo: InMemoryWorksheetRepository,
          dispatchRepo: InMemoryDispatchRepository,
          notificationService: InMemoryNotificationService,
          auditService: InMemoryAuditService
        ) =>
          new ServiceReturnService(
            equipmentRepo,
            worksheetRepo,
            dispatchRepo,
            notificationService,
            auditService
          ),
        inject: [
          EQUIPMENT_REPOSITORY,
          WORKSHEET_REPOSITORY,
          DISPATCH_REPOSITORY,
          NOTIFICATION_SERVICE,
          AUDIT_SERVICE,
        ],
      },

      // Export repository classes for direct injection
      InMemoryEquipmentRepository,
      InMemoryWorksheetRepository,
      InMemoryDispatchRepository,
      InMemoryAuditService,
      InMemoryNotificationService,
    ];

    return {
      module: BergepSzervizModule,
      controllers: [BergepSzervizController],
      providers,
      exports: [
        EquipmentDispatchService,
        ServiceReturnService,
        EQUIPMENT_REPOSITORY,
        WORKSHEET_REPOSITORY,
        DISPATCH_REPOSITORY,
      ],
    };
  }
}
