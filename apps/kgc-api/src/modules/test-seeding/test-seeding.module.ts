/**
 * Test Seeding Module
 * Sprint 0 Blocker #1: Test Data Seeding API
 *
 * Provides test data seeding and cleanup functionality for E2E tests.
 * ONLY LOADED IN: development, staging, test environments
 *
 * Usage in tests:
 *
 * ```typescript
 * // Before test
 * const seedResponse = await fetch('/api/test/seed', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     testRunId: 'my-test-run-123',
 *     tenant: { name: 'Test Tenant' },
 *     users: [{ role: 'OPERATOR' }],
 *     partners: [{ name: 'Test Partner' }],
 *   }),
 * });
 *
 * // After test
 * await fetch('/api/test/cleanup', {
 *   method: 'DELETE',
 *   body: JSON.stringify({ testRunId: 'my-test-run-123' }),
 * });
 * ```
 */

import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TestSeedingController } from './test-seeding.controller';

const ALLOWED_ENVIRONMENTS = ['development', 'staging', 'test'];

export interface TestSeedingModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class TestSeedingModule {
  private static readonly logger = new Logger(TestSeedingModule.name);

  /**
   * Register the test seeding module.
   * Only loads the controller in allowed environments.
   */
  static forRoot(options: TestSeedingModuleOptions): DynamicModule {
    const env = process.env['NODE_ENV'] ?? 'production';
    const isAllowed = ALLOWED_ENVIRONMENTS.includes(env);

    if (!isAllowed) {
      this.logger.log(`Test seeding module disabled in environment: ${env}`);
      return {
        module: TestSeedingModule,
        controllers: [],
        providers: [],
      };
    }

    this.logger.log(`Test seeding module enabled in environment: ${env}`);

    const providers: Provider[] = [
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },
    ];

    return {
      module: TestSeedingModule,
      controllers: [TestSeedingController],
      providers,
      exports: ['PRISMA_CLIENT'],
    };
  }
}
