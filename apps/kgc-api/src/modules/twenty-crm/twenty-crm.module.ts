/**
 * Twenty CRM Module - NestJS Module for CRM Integration
 * Epic 28: Twenty CRM Integration
 *
 * Provides:
 * - Partner sync between KGC and Twenty CRM - Story 28-1
 * - CRM dashboard embed functionality - Story 28-2
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Package imports
import { DashboardEmbedService, PartnerSyncService } from '@kgc/twenty-crm';

// Controllers
import { TwentyCrmController } from './controllers/twenty-crm.controller';

// Repositories
import { InMemoryDashboardConfigRepository } from './repositories/in-memory-dashboard.repository';
import { InMemoryPartnerMappingRepository } from './repositories/in-memory-mapping.repository';
import {
  InMemoryAuditService,
  InMemoryConfigService,
  InMemoryKgcPartnerService,
  InMemoryTwentyCrmAuthClient,
  InMemoryTwentyCrmClient,
  InMemoryUserService,
} from './repositories/in-memory-services';

export const PARTNER_MAPPING_REPOSITORY = Symbol('PARTNER_MAPPING_REPOSITORY');
export const DASHBOARD_CONFIG_REPOSITORY = Symbol('DASHBOARD_CONFIG_REPOSITORY');
export const KGC_PARTNER_SERVICE = Symbol('KGC_PARTNER_SERVICE');
export const TWENTY_CRM_CLIENT = Symbol('TWENTY_CRM_CLIENT');
export const TWENTY_CRM_AUTH_CLIENT = Symbol('TWENTY_CRM_AUTH_CLIENT');
export const USER_SERVICE = Symbol('USER_SERVICE');
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
export const CONFIG_SERVICE = Symbol('CONFIG_SERVICE');

export interface TwentyCrmModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class TwentyCrmModule {
  static forRoot(options: TwentyCrmModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories (InMemory for now, will be replaced with Prisma)
      {
        provide: PARTNER_MAPPING_REPOSITORY,
        useClass: InMemoryPartnerMappingRepository,
      },
      {
        provide: DASHBOARD_CONFIG_REPOSITORY,
        useClass: InMemoryDashboardConfigRepository,
      },

      // Mock Services (to be replaced with real implementations)
      {
        provide: KGC_PARTNER_SERVICE,
        useClass: InMemoryKgcPartnerService,
      },
      {
        provide: TWENTY_CRM_CLIENT,
        useClass: InMemoryTwentyCrmClient,
      },
      {
        provide: TWENTY_CRM_AUTH_CLIENT,
        useClass: InMemoryTwentyCrmAuthClient,
      },
      {
        provide: USER_SERVICE,
        useClass: InMemoryUserService,
      },
      {
        provide: AUDIT_SERVICE,
        useClass: InMemoryAuditService,
      },
      {
        provide: CONFIG_SERVICE,
        useClass: InMemoryConfigService,
      },

      // Services from @kgc/twenty-crm package
      {
        provide: PartnerSyncService,
        useFactory: (
          mappingRepo: InMemoryPartnerMappingRepository,
          kgcPartnerService: InMemoryKgcPartnerService,
          crmClient: InMemoryTwentyCrmClient,
          auditService: InMemoryAuditService
        ) => new PartnerSyncService(mappingRepo, kgcPartnerService, crmClient, auditService),
        inject: [PARTNER_MAPPING_REPOSITORY, KGC_PARTNER_SERVICE, TWENTY_CRM_CLIENT, AUDIT_SERVICE],
      },
      {
        provide: DashboardEmbedService,
        useFactory: (
          configRepo: InMemoryDashboardConfigRepository,
          crmAuthClient: InMemoryTwentyCrmAuthClient,
          configService: InMemoryConfigService,
          userService: InMemoryUserService,
          auditService: InMemoryAuditService
        ) =>
          new DashboardEmbedService(
            configRepo,
            crmAuthClient,
            configService,
            userService,
            auditService
          ),
        inject: [
          DASHBOARD_CONFIG_REPOSITORY,
          TWENTY_CRM_AUTH_CLIENT,
          CONFIG_SERVICE,
          USER_SERVICE,
          AUDIT_SERVICE,
        ],
      },

      // Export repository classes for direct injection
      InMemoryPartnerMappingRepository,
      InMemoryDashboardConfigRepository,
      InMemoryKgcPartnerService,
      InMemoryTwentyCrmClient,
      InMemoryTwentyCrmAuthClient,
      InMemoryUserService,
      InMemoryAuditService,
      InMemoryConfigService,
    ];

    return {
      module: TwentyCrmModule,
      controllers: [TwentyCrmController],
      providers,
      exports: [
        PartnerSyncService,
        DashboardEmbedService,
        PARTNER_MAPPING_REPOSITORY,
        DASHBOARD_CONFIG_REPOSITORY,
        KGC_PARTNER_SERVICE,
        TWENTY_CRM_CLIENT,
      ],
    };
  }
}
