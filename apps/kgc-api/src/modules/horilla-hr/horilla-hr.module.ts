/**
 * Horilla HR Module - NestJS Module for HR Integration
 * Epic 30: Horilla HR Integration
 *
 * Provides:
 * - Bidirectional employee sync between KGC and Horilla HR
 * - Employee mapping management
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Package imports
import { EmployeeSyncService } from '@kgc/horilla-hr';

// Controllers
import { HorillaHrController } from './controllers/horilla-hr.controller';

// Repositories
import {
  InMemoryAuditService,
  InMemoryConfigRepository,
  InMemoryEmployeeMappingRepository,
  InMemoryHorillaApiClient,
  InMemoryUserRepository,
} from './repositories/in-memory-services';

export const HORILLA_API_CLIENT = Symbol('HORILLA_API_CLIENT');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const EMPLOYEE_MAPPING_REPOSITORY = Symbol('EMPLOYEE_MAPPING_REPOSITORY');
export const CONFIG_REPOSITORY = Symbol('CONFIG_REPOSITORY');
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');

export interface HorillaHrModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class HorillaHrModule {
  static forRoot(options: HorillaHrModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories (InMemory for now, will be replaced with Prisma)
      {
        provide: HORILLA_API_CLIENT,
        useClass: InMemoryHorillaApiClient,
      },
      {
        provide: USER_REPOSITORY,
        useClass: InMemoryUserRepository,
      },
      {
        provide: EMPLOYEE_MAPPING_REPOSITORY,
        useClass: InMemoryEmployeeMappingRepository,
      },
      {
        provide: CONFIG_REPOSITORY,
        useClass: InMemoryConfigRepository,
      },
      {
        provide: AUDIT_SERVICE,
        useClass: InMemoryAuditService,
      },

      // Services from @kgc/horilla-hr package
      {
        provide: EmployeeSyncService,
        useFactory: (
          horillaClient: InMemoryHorillaApiClient,
          userRepository: InMemoryUserRepository,
          mappingRepository: InMemoryEmployeeMappingRepository,
          configRepository: InMemoryConfigRepository,
          auditService: InMemoryAuditService
        ) =>
          new EmployeeSyncService(
            horillaClient,
            userRepository,
            mappingRepository,
            configRepository,
            auditService
          ),
        inject: [
          HORILLA_API_CLIENT,
          USER_REPOSITORY,
          EMPLOYEE_MAPPING_REPOSITORY,
          CONFIG_REPOSITORY,
          AUDIT_SERVICE,
        ],
      },

      // Export repository classes for direct injection
      InMemoryHorillaApiClient,
      InMemoryUserRepository,
      InMemoryEmployeeMappingRepository,
      InMemoryConfigRepository,
      InMemoryAuditService,
    ];

    return {
      module: HorillaHrModule,
      controllers: [HorillaHrController],
      providers,
      exports: [
        EmployeeSyncService,
        HORILLA_API_CLIENT,
        USER_REPOSITORY,
        EMPLOYEE_MAPPING_REPOSITORY,
        CONFIG_REPOSITORY,
        AUDIT_SERVICE,
      ],
    };
  }
}
