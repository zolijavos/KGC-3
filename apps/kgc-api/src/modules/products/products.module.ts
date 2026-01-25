/**
 * Products Module - NestJS Module for Product Management
 * Epic 8: Product Management
 *
 * Provides:
 * - Product catalog CRUD
 * - Category hierarchy management
 * - Supplier information
 * - Price rule configuration
 */

import {
  CATEGORY_REPOSITORY,
  PRICE_RULE_REPOSITORY,
  PRODUCT_REPOSITORY,
  SUPPLIER_REPOSITORY,
} from '@kgc/products';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  PrismaCategoryRepository,
  PrismaPriceRuleRepository,
  PrismaProductRepository,
  PrismaSupplierRepository,
} from './repositories';

export interface ProductsModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class ProductsModule {
  static forRoot(options: ProductsModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: PRODUCT_REPOSITORY,
        useClass: PrismaProductRepository,
      },
      {
        provide: CATEGORY_REPOSITORY,
        useClass: PrismaCategoryRepository,
      },
      {
        provide: SUPPLIER_REPOSITORY,
        useClass: PrismaSupplierRepository,
      },
      {
        provide: PRICE_RULE_REPOSITORY,
        useClass: PrismaPriceRuleRepository,
      },
    ];

    return {
      module: ProductsModule,
      controllers: [],
      providers,
      exports: [
        PRODUCT_REPOSITORY,
        CATEGORY_REPOSITORY,
        SUPPLIER_REPOSITORY,
        PRICE_RULE_REPOSITORY,
      ],
    };
  }
}
