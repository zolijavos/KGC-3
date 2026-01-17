import { Module, DynamicModule, Provider, InjectionToken } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantController } from './tenant.controller';
import { TenantService } from './services/tenant.service';
import { SchemaService } from './services/schema.service';

/**
 * Token for PrismaClient injection
 */
export const PRISMA_CLIENT = 'PRISMA_CLIENT';

/**
 * TenantModule options
 */
export interface TenantModuleOptions {
  /**
   * PrismaClient instance to use
   * If not provided, a new instance will be created
   */
  prisma?: PrismaClient;

  /**
   * Whether this module is global
   */
  isGlobal?: boolean;
}

/**
 * TenantModule - NestJS module for tenant management
 * @kgc/tenant - Multi-tenant infrastructure
 *
 * Provides:
 * - TenantService - Tenant CRUD operations
 * - SchemaService - PostgreSQL schema management
 * - TenantController - REST API endpoints
 *
 * Usage:
 * ```typescript
 * // With existing PrismaClient
 * TenantModule.forRoot({ prisma: prismaInstance })
 *
 * // As global module
 * TenantModule.forRoot({ isGlobal: true })
 * ```
 */
@Module({})
export class TenantModule {
  /**
   * Configure TenantModule with options
   */
  static forRoot(options: TenantModuleOptions = {}): DynamicModule {
    const { prisma, isGlobal = false } = options;

    const prismaProvider: Provider = {
      provide: PRISMA_CLIENT,
      useFactory: () => prisma ?? new PrismaClient(),
    };

    const tenantServiceProvider: Provider = {
      provide: TenantService,
      useFactory: (prismaClient: PrismaClient, schemaService: SchemaService) => {
        return new TenantService(prismaClient, schemaService);
      },
      inject: [PRISMA_CLIENT, SchemaService],
    };

    const schemaServiceProvider: Provider = {
      provide: SchemaService,
      useFactory: (prismaClient: PrismaClient) => {
        return new SchemaService(prismaClient);
      },
      inject: [PRISMA_CLIENT],
    };

    return {
      module: TenantModule,
      global: isGlobal,
      controllers: [TenantController],
      providers: [
        prismaProvider,
        schemaServiceProvider,
        tenantServiceProvider,
      ],
      exports: [TenantService, SchemaService, PRISMA_CLIENT],
    };
  }

  /**
   * Register TenantModule for async configuration
   */
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => TenantModuleOptions | Promise<TenantModuleOptions>;
    inject?: InjectionToken[];
    isGlobal?: boolean;
  }): DynamicModule {
    const { useFactory, inject = [], isGlobal = false } = options;

    const prismaProvider: Provider = {
      provide: PRISMA_CLIENT,
      useFactory: async (...args: unknown[]) => {
        const config = await useFactory(...args);
        return config.prisma ?? new PrismaClient();
      },
      inject,
    };

    const schemaServiceProvider: Provider = {
      provide: SchemaService,
      useFactory: (prismaClient: PrismaClient) => {
        return new SchemaService(prismaClient);
      },
      inject: [PRISMA_CLIENT],
    };

    const tenantServiceProvider: Provider = {
      provide: TenantService,
      useFactory: (prismaClient: PrismaClient, schemaService: SchemaService) => {
        return new TenantService(prismaClient, schemaService);
      },
      inject: [PRISMA_CLIENT, SchemaService],
    };

    return {
      module: TenantModule,
      global: isGlobal,
      controllers: [TenantController],
      providers: [
        prismaProvider,
        schemaServiceProvider,
        tenantServiceProvider,
      ],
      exports: [TenantService, SchemaService, PRISMA_CLIENT],
    };
  }
}
