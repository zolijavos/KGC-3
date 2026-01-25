/**
 * Inventory Module - NestJS Module for Inventory Management
 * Story 9-1 to 9-6: Készlet nyilvántartás, helykódok, multi-warehouse, mozgások, alertek
 *
 * Provides:
 * - Inventory CRUD operations
 * - Stock tracking with K-P-D location codes
 * - Multi-warehouse support with transfers
 * - Movement audit trail
 * - Stock level alerts and settings
 */

import {
  ALERT_REPOSITORY,
  AlertService,
  INVENTORY_REPOSITORY,
  InventoryService,
  LOCATION_REPOSITORY,
  LocationService,
  MOVEMENT_REPOSITORY,
  MovementService,
  WAREHOUSE_REPOSITORY,
  WarehouseService,
} from '@kgc/inventory';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Repositories
import { PrismaAlertRepository } from './repositories/prisma-alert.repository';
import { PrismaInventoryRepository } from './repositories/prisma-inventory.repository';
import { PrismaLocationRepository } from './repositories/prisma-location.repository';
import { PrismaMovementRepository } from './repositories/prisma-movement.repository';
import { PrismaWarehouseRepository } from './repositories/prisma-warehouse.repository';

// Controllers
import { AlertController } from './controllers/alert.controller';
import { LocationController } from './controllers/location.controller';
import { MovementController } from './controllers/movement.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { InventoryController } from './inventory.controller';

export interface InventoryModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class InventoryModule {
  static forRoot(options: InventoryModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: INVENTORY_REPOSITORY,
        useClass: PrismaInventoryRepository,
      },
      {
        provide: WAREHOUSE_REPOSITORY,
        useClass: PrismaWarehouseRepository,
      },
      {
        provide: LOCATION_REPOSITORY,
        useClass: PrismaLocationRepository,
      },
      {
        provide: MOVEMENT_REPOSITORY,
        useClass: PrismaMovementRepository,
      },
      {
        provide: ALERT_REPOSITORY,
        useClass: PrismaAlertRepository,
      },

      // Services
      InventoryService,
      WarehouseService,
      LocationService,
      MovementService,
      AlertService,
    ];

    return {
      module: InventoryModule,
      controllers: [
        InventoryController,
        WarehouseController,
        LocationController,
        MovementController,
        AlertController,
      ],
      providers,
      exports: [InventoryService, WarehouseService, LocationService, MovementService, AlertService],
    };
  }
}
