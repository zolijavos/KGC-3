/**
 * User Settings Module
 * Epic 29: User Favorites (ADR-044)
 *
 * Provides user preferences management including favorites.
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaUserSettingsRepository, USER_SETTINGS_REPOSITORY } from './repositories';

import {
  TenantDefaultFavoritesController,
  UserSettingsController,
} from './user-settings.controller';

export interface UserSettingsModuleOptions {
  prisma: PrismaClient;
  /** Enable tenant admin endpoints */
  enableTenantAdmin?: boolean;
}

@Module({})
export class UserSettingsModule {
  static forRoot(options: UserSettingsModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },
      {
        provide: USER_SETTINGS_REPOSITORY,
        useClass: PrismaUserSettingsRepository,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controllers: any[] = [UserSettingsController];

    if (options.enableTenantAdmin !== false) {
      controllers.push(TenantDefaultFavoritesController);
    }

    return {
      module: UserSettingsModule,
      controllers,
      providers,
      exports: [USER_SETTINGS_REPOSITORY],
    };
  }
}
