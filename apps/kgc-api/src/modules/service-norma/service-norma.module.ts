/**
 * ServiceNorma Module - NestJS Module for Service Norm Management
 * Epic 20: Szerviz Norma Kezelés (ADR-020)
 *
 * Provides:
 * - Service norm CRUD operations
 * - Labor cost calculation based on manufacturer norms (Makita, Stihl, etc.)
 * - Bulk import/export functionality
 * - Manufacturer and category management
 *
 * forRoot pattern for dependency injection with Prisma
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Import repository from service module
import { PrismaServiceNormRepository, SERVICE_NORM_REPOSITORY } from '../service/repositories';

// Controller
import { ServiceNormaController } from './service-norma.controller';

export interface ServiceNormaModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class ServiceNormaModule {
  static forRoot(options: ServiceNormaModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Service Norm Repository
      {
        provide: SERVICE_NORM_REPOSITORY,
        useClass: PrismaServiceNormRepository,
      },
    ];

    return {
      module: ServiceNormaModule,
      controllers: [ServiceNormaController],
      providers,
      exports: [SERVICE_NORM_REPOSITORY],
    };
  }
}
