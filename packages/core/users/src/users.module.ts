/**
 * Users Module - NestJS User Management Module
 * Story 2.1: User CRUD Operations
 * Story 2.2: Role Assignment és RBAC
 * Story 2.3: Permission Check Middleware
 *
 * Provides:
 * - User CRUD operations
 * - Role hierarchy enforcement
 * - Permission checking (PermissionGuard)
 * - Constraint validation (ConstraintInterceptor)
 * - Tenant isolation
 *
 * Usage:
 * ```typescript
 * // With PrismaClient and AuthService (production)
 * UsersModule.forRoot({
 *   prisma: myPrismaClient,
 *   authService: myAuthService,
 * })
 *
 * // Without dependencies (testing)
 * UsersModule.forRoot({})
 * ```
 */

import { DynamicModule, InjectionToken, Module, OptionalFactoryDependency, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@kgc/auth';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { PermissionGuard } from './guards/permission.guard';
import { ConstraintInterceptor } from './interceptors/constraint.interceptor';
import { ElevatedAccessService } from './services/elevated-access.service';
import { ElevatedAccessGuard } from './guards/elevated-access.guard';

/**
 * AuthService interface for token revocation
 */
interface IAuthService {
  revokeAllUserTokens(userId: string): Promise<void>;
}

/**
 * Configuration options for UsersModule
 */
export interface UsersModuleOptions {
  /** PrismaClient instance for database access (optional for testing) */
  prisma?: PrismaClient;
  /** AuthService instance for token revocation (optional for testing) */
  authService?: IAuthService;
}

@Module({})
export class UsersModule {
  /**
   * Configure UsersModule with options
   * @param options - Configuration including optional PrismaClient and AuthService
   */
  static forRoot(options: UsersModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      RoleService,
      PermissionService,
      UsersService,
      PermissionGuard,
      ConstraintInterceptor,
      ElevatedAccessService,
      ElevatedAccessGuard,
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma ?? null,
      },
      {
        provide: AuthService,
        useValue: options.authService ?? null,
      },
    ];

    return {
      module: UsersModule,
      controllers: [UsersController],
      providers,
      exports: [
        UsersService,
        RoleService,
        PermissionService,
        PermissionGuard,
        ConstraintInterceptor,
        ElevatedAccessService,
        ElevatedAccessGuard,
      ],
    };
  }

  /**
   * Register UsersModule asynchronously with factory
   * Useful when dependencies are resolved at runtime
   */
  static forRootAsync(options: {
    imports?: DynamicModule['imports'];
    useFactory: (...args: unknown[]) => UsersModuleOptions | Promise<UsersModuleOptions>;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    const providers: Provider[] = [
      RoleService,
      PermissionService,
      UsersService,
      PermissionGuard,
      ConstraintInterceptor,
      ElevatedAccessService,
      ElevatedAccessGuard,
      {
        provide: 'USERS_MODULE_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: 'PRISMA_CLIENT',
        useFactory: (moduleOptions: UsersModuleOptions) => moduleOptions.prisma ?? null,
        inject: ['USERS_MODULE_OPTIONS'],
      },
      {
        provide: AuthService,
        useFactory: (moduleOptions: UsersModuleOptions) => moduleOptions.authService ?? null,
        inject: ['USERS_MODULE_OPTIONS'],
      },
    ];

    return {
      module: UsersModule,
      imports: options.imports ?? [],
      controllers: [UsersController],
      providers,
      exports: [
        UsersService,
        RoleService,
        PermissionService,
        PermissionGuard,
        ConstraintInterceptor,
        ElevatedAccessService,
        ElevatedAccessGuard,
      ],
    };
  }
}
