/**
 * Service Module
 * Epic 17: Munkalap CRUD (Worksheet, DiagnosticCode)
 * Epic 19: Garanciális megkülönböztetés (WarrantyClaim)
 * Epic 20: Szerviz Norma (ServiceNorm)
 *
 * Provides worksheet, diagnostic code, warranty claim, and service norm CRUD operations with Prisma persistence.
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WorksheetController } from './controllers';
import {
  DIAGNOSTIC_CODE_REPOSITORY,
  PrismaDiagnosticCodeRepository,
  PrismaServiceNormRepository,
  PrismaWarrantyClaimRepository,
  PrismaWorksheetItemRepository,
  PrismaWorksheetRepository,
  SERVICE_NORM_REPOSITORY,
  WARRANTY_CLAIM_REPOSITORY,
  WORKSHEET_ITEM_REPOSITORY,
  WORKSHEET_REPOSITORY,
} from './repositories';

export interface ServiceModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class ServiceModule {
  static forRoot(options: ServiceModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Worksheet repositories
      {
        provide: WORKSHEET_REPOSITORY,
        useClass: PrismaWorksheetRepository,
      },
      {
        provide: WORKSHEET_ITEM_REPOSITORY,
        useClass: PrismaWorksheetItemRepository,
      },
      PrismaWorksheetRepository,
      PrismaWorksheetItemRepository,

      // Diagnostic code repository (Epic 17-3)
      {
        provide: DIAGNOSTIC_CODE_REPOSITORY,
        useClass: PrismaDiagnosticCodeRepository,
      },
      PrismaDiagnosticCodeRepository,

      // Warranty claim repository
      {
        provide: WARRANTY_CLAIM_REPOSITORY,
        useClass: PrismaWarrantyClaimRepository,
      },
      PrismaWarrantyClaimRepository,

      // Service norm repository
      {
        provide: SERVICE_NORM_REPOSITORY,
        useClass: PrismaServiceNormRepository,
      },
      PrismaServiceNormRepository,
    ];

    return {
      module: ServiceModule,
      controllers: [WorksheetController],
      providers,
      exports: [
        WORKSHEET_REPOSITORY,
        WORKSHEET_ITEM_REPOSITORY,
        DIAGNOSTIC_CODE_REPOSITORY,
        WARRANTY_CLAIM_REPOSITORY,
        SERVICE_NORM_REPOSITORY,
        PrismaWorksheetRepository,
        PrismaWorksheetItemRepository,
        PrismaDiagnosticCodeRepository,
        PrismaWarrantyClaimRepository,
        PrismaServiceNormRepository,
      ],
    };
  }
}
