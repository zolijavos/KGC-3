/**
 * Partners Module - NestJS Module for Partner Management
 * Epic 7: Partner Management
 *
 * Provides:
 * - Partner CRUD (customers and suppliers)
 * - Representative management
 * - Loyalty tier configuration
 */

import {
  LOYALTY_TIER_REPOSITORY,
  PARTNER_REPOSITORY,
  REPRESENTATIVE_REPOSITORY,
} from '@kgc/partners';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  PrismaLoyaltyTierRepository,
  PrismaPartnerRepository,
  PrismaRepresentativeRepository,
} from './repositories';

export interface PartnersModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class PartnersModule {
  static forRoot(options: PartnersModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: PARTNER_REPOSITORY,
        useClass: PrismaPartnerRepository,
      },
      {
        provide: REPRESENTATIVE_REPOSITORY,
        useClass: PrismaRepresentativeRepository,
      },
      {
        provide: LOYALTY_TIER_REPOSITORY,
        useClass: PrismaLoyaltyTierRepository,
      },
    ];

    return {
      module: PartnersModule,
      controllers: [],
      providers,
      exports: [PARTNER_REPOSITORY, REPRESENTATIVE_REPOSITORY, LOYALTY_TIER_REPOSITORY],
    };
  }
}
