/**
 * Auth Module - NestJS Authentication Module
 * Story 1.1: JWT Login Endpoint
 *
 * Provides:
 * - JWT-based authentication
 * - Password hashing with bcrypt
 * - Rate limiting for login endpoint
 * - Token generation and validation
 *
 * Usage:
 * ```typescript
 * // With PrismaClient (production)
 * AuthModule.forRoot({ prisma: myPrismaClient })
 *
 * // Without database (testing)
 * AuthModule.forRoot({})
 * ```
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { UsersModule, ElevatedAccessService } from '@kgc/users';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttle.guard';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ELEVATED_ACCESS_SERVICE } from './interfaces/elevated-access.interface';

/**
 * Configuration options for AuthModule
 */
export interface AuthModuleOptions {
  /** PrismaClient instance for database access (optional for testing) */
  prisma?: PrismaClient;
  /** JWT Secret - if not provided, reads from JWT_SECRET env var */
  jwtSecret?: string;
  /** Application base URL for password reset links - if not provided, reads from APP_BASE_URL env var */
  appBaseUrl?: string;
}

/**
 * Get JWT secret from options or environment
 * @throws Error if JWT_SECRET is not configured anywhere
 */
function getJwtSecret(options?: AuthModuleOptions): string {
  const secret = options?.jwtSecret ?? process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        'Set a secure random string (min 32 characters) in your .env file.'
    );
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }
  return secret;
}

/**
 * Get application base URL from options or environment
 * Used for password reset links - NEVER trust Host header (G-C1 security fix)
 * @throws Error if APP_BASE_URL is not configured anywhere
 */
function getAppBaseUrl(options?: AuthModuleOptions): string {
  const baseUrl = options?.appBaseUrl ?? process.env['APP_BASE_URL'];
  if (!baseUrl) {
    throw new Error(
      'APP_BASE_URL environment variable is required. ' +
        'Set your application URL (e.g., https://app.kgc.hu) in your .env file.'
    );
  }
  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    throw new Error(`APP_BASE_URL must be a valid URL. Got: "${baseUrl}"`);
  }
  return baseUrl;
}

@Module({})
export class AuthModule {
  /**
   * Configure AuthModule with options
   * @param options - Configuration including optional PrismaClient
   */
  static forRoot(options: AuthModuleOptions = {}): DynamicModule {
    const jwtSecret = getJwtSecret(options);
    const appBaseUrl = getAppBaseUrl(options);

    const providers: Provider[] = [
      AuthService,
      PasswordService,
      TokenService,
      JwtStrategy,
      JwtAuthGuard,
      LoginThrottlerGuard,
      {
        provide: 'JWT_SECRET',
        useValue: jwtSecret,
      },
      {
        provide: 'APP_BASE_URL',
        useValue: appBaseUrl,
      },
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma ?? null,
      },
      {
        provide: ELEVATED_ACCESS_SERVICE,
        useExisting: ElevatedAccessService, // Use same instance from UsersModule
      },
    ];

    return {
      module: AuthModule,
      imports: [
        UsersModule.forRoot(options),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: jwtSecret,
          signOptions: {
            expiresIn: process.env['JWT_ACCESS_EXPIRATION'] ?? '24h',
          },
        }),
        ThrottlerModule.forRoot([
          {
            name: 'login',
            ttl: 60000, // 1 minute in milliseconds
            limit: 5, // 5 requests per minute per IP
          },
        ]),
      ],
      controllers: [AuthController],
      providers,
      exports: [AuthService, JwtAuthGuard, PasswordService, TokenService],
    };
  }
}
