/**
 * Rental Module - NestJS Module for Rental Management
 * Epic 14-16: Bérlés, Kaució, Szerződés
 *
 * Provides:
 * - Rental CRUD with pricing and late fee calculation
 * - Deposit/kaució management (MyPOS integration ready)
 * - Contract generation with PDF and digital signature
 * - Template management for rental contracts
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Rental Core (Epic 14)
import { RENTAL_REPOSITORY, RentalService } from '@kgc/rental-core';

// Rental Checkout (Epic 16)
import { DEPOSIT_REPOSITORY, DepositService } from '@kgc/rental-checkout';

// Rental Contract (Epic 15)
import {
  ArchiveService,
  CONTRACT_REPOSITORY,
  CONTRACT_TEMPLATE_REPOSITORY,
  ContractService,
  PdfService,
  SignatureService,
  TemplateService,
} from '@kgc/rental-contract';

// Prisma Repositories
import {
  PrismaContractRepository,
  PrismaContractTemplateRepository,
  PrismaDepositRepository,
  PrismaRentalRepository,
} from './repositories';

// Controllers
import { RentalController } from './controllers';

export interface RentalModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class RentalModule {
  static forRoot(options: RentalModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: RENTAL_REPOSITORY,
        useClass: PrismaRentalRepository,
      },
      {
        provide: DEPOSIT_REPOSITORY,
        useClass: PrismaDepositRepository,
      },
      {
        provide: CONTRACT_REPOSITORY,
        useClass: PrismaContractRepository,
      },
      {
        provide: CONTRACT_TEMPLATE_REPOSITORY,
        useClass: PrismaContractTemplateRepository,
      },

      // Services
      RentalService,
      DepositService,
      ContractService,
      TemplateService,
      PdfService,
      SignatureService,
      ArchiveService,
    ];

    return {
      module: RentalModule,
      controllers: [RentalController],
      providers,
      exports: [
        RentalService,
        DepositService,
        ContractService,
        TemplateService,
        PdfService,
        SignatureService,
        ArchiveService,
      ],
    };
  }
}
