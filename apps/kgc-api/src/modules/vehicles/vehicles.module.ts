/**
 * Vehicles Module - NestJS Module for Vehicle Management
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * Provides:
 * - Rental Vehicles (bérgép járművek) - utánfutók, aggregátorok
 * - Company Vehicles (céges gépkocsik) - személyautók, furgonok
 * - Document expiry tracking and reminders
 */

import { COMPANY_VEHICLE_REPOSITORY, RENTAL_VEHICLE_REPOSITORY } from '@kgc/vehicles';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Repositories
import { PrismaCompanyVehicleRepository, PrismaRentalVehicleRepository } from './repositories';

// Controllers
import { CompanyVehicleController, RentalVehicleController } from './controllers';

export interface VehiclesModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class VehiclesModule {
  static forRoot(options: VehiclesModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: RENTAL_VEHICLE_REPOSITORY,
        useClass: PrismaRentalVehicleRepository,
      },
      {
        provide: COMPANY_VEHICLE_REPOSITORY,
        useClass: PrismaCompanyVehicleRepository,
      },
    ];

    return {
      module: VehiclesModule,
      controllers: [RentalVehicleController, CompanyVehicleController],
      providers,
      exports: [RENTAL_VEHICLE_REPOSITORY, COMPANY_VEHICLE_REPOSITORY],
    };
  }
}
