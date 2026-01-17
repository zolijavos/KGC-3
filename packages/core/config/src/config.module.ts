import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigService, CONFIG_REPOSITORY } from './services/config.service';
import { FeatureFlagService, FEATURE_FLAG_REPOSITORY } from './services/feature-flag.service';
import { IConfigRepository, IFeatureFlagRepository } from './interfaces/config.interface';

export interface ConfigModuleOptions {
  /**
   * Config repository provider
   */
  configRepository: Provider<IConfigRepository>;
  /**
   * Feature flag repository provider
   */
  featureFlagRepository: Provider<IFeatureFlagRepository>;
  /**
   * Whether to make the module global
   */
  isGlobal?: boolean;
}

/**
 * NestJS module for configuration management
 * Provides ConfigService and FeatureFlagService
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       configRepository: {
 *         provide: CONFIG_REPOSITORY,
 *         useClass: PrismaConfigRepository,
 *       },
 *       featureFlagRepository: {
 *         provide: FEATURE_FLAG_REPOSITORY,
 *         useClass: PrismaFeatureFlagRepository,
 *       },
 *       isGlobal: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions): DynamicModule {
    const providers: Provider[] = [
      options.configRepository,
      options.featureFlagRepository,
      ConfigService,
      FeatureFlagService,
    ];

    return {
      module: ConfigModule,
      global: options.isGlobal ?? false,
      providers,
      exports: [ConfigService, FeatureFlagService],
    };
  }

  /**
   * For testing - allows direct injection of mock repositories
   */
  static forTesting(
    configRepository: IConfigRepository,
    featureFlagRepository: IFeatureFlagRepository
  ): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_REPOSITORY,
          useValue: configRepository,
        },
        {
          provide: FEATURE_FLAG_REPOSITORY,
          useValue: featureFlagRepository,
        },
        ConfigService,
        FeatureFlagService,
      ],
      exports: [ConfigService, FeatureFlagService],
    };
  }
}
