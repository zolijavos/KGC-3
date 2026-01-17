/**
 * NAV Online Module
 * NestJS module for NAV Online integration
 * @package @kgc/nav-online
 */

import { Module, DynamicModule, Provider, InjectionToken } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NavService, NavServiceConfig } from './services/nav.service';
import { SzamlazzhuService } from './services/szamlazz-hu.service';
import { RetryService } from './services/retry.service';
import { InvoiceQueueService, IQueueRepository, IInvoiceRepository } from './services/invoice-queue.service';
import { NavController } from './nav.controller';

/**
 * NAV Module Options
 */
export interface NavModuleOptions {
  /** Számlázz.hu API key */
  apiKey: string;
  /** Sandbox mode */
  sandbox?: boolean;
  /** Enable queue processing */
  enableQueue?: boolean;
  /** Queue repository provider */
  queueRepository?: Provider<IQueueRepository>;
  /** Invoice repository provider */
  invoiceRepository?: Provider<IInvoiceRepository>;
}

/**
 * NAV Module
 */
@Module({})
export class NavModule {
  /**
   * Register module with configuration
   */
  static register(options: NavModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'NAV_CONFIG',
        useValue: {
          szamlazzhu: {
            apiKey: options.apiKey,
            sandbox: options.sandbox ?? false,
          },
        } as NavServiceConfig,
      },
      {
        provide: SzamlazzhuService,
        useFactory: (config: NavServiceConfig) => {
          return new SzamlazzhuService(config.szamlazzhu);
        },
        inject: ['NAV_CONFIG'],
      },
      {
        provide: RetryService,
        useFactory: (config: NavServiceConfig) => {
          return new RetryService(config.retry);
        },
        inject: ['NAV_CONFIG'],
      },
      {
        provide: NavService,
        useFactory: (config: NavServiceConfig) => {
          return new NavService(config);
        },
        inject: ['NAV_CONFIG'],
      },
    ];

    const imports: DynamicModule['imports'] = [];

    // Add queue service if enabled
    if (options.enableQueue) {
      imports.push(ScheduleModule.forRoot());

      if (options.queueRepository) {
        providers.push(options.queueRepository);
      }

      if (options.invoiceRepository) {
        providers.push(options.invoiceRepository);
      }

      providers.push(InvoiceQueueService);
    }

    return {
      module: NavModule,
      imports,
      controllers: [NavController],
      providers,
      exports: [NavService, SzamlazzhuService, RetryService, InvoiceQueueService].filter(Boolean),
    };
  }

  /**
   * Register module asynchronously
   */
  static registerAsync(options: {
    useFactory: (...args: unknown[]) => Promise<NavModuleOptions> | NavModuleOptions;
    inject?: InjectionToken[];
    imports?: DynamicModule['imports'];
  }): DynamicModule {
    return {
      module: NavModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: 'NAV_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        {
          provide: 'NAV_CONFIG',
          useFactory: (opts: NavModuleOptions): NavServiceConfig => ({
            szamlazzhu: {
              apiKey: opts.apiKey,
              sandbox: opts.sandbox ?? false,
            },
          }),
          inject: ['NAV_OPTIONS'],
        },
        {
          provide: NavService,
          useFactory: (config: NavServiceConfig) => new NavService(config),
          inject: ['NAV_CONFIG'],
        },
        {
          provide: SzamlazzhuService,
          useFactory: (config: NavServiceConfig) => new SzamlazzhuService(config.szamlazzhu),
          inject: ['NAV_CONFIG'],
        },
        {
          provide: RetryService,
          useFactory: () => new RetryService(),
          inject: [],
        },
      ],
      controllers: [NavController],
      exports: [NavService, SzamlazzhuService, RetryService],
    };
  }
}
