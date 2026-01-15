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

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttle.guard';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Configuration options for AuthModule
 */
export interface AuthModuleOptions {
  /** PrismaClient instance for database access (optional for testing) */
  prisma?: PrismaClient;
  /** JWT Secret - if not provided, reads from JWT_SECRET env var */
  jwtSecret?: string;
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

@Module({})
export class AuthModule {
  /**
   * Configure AuthModule with options
   * @param options - Configuration including optional PrismaClient
   */
  static forRoot(options: AuthModuleOptions = {}): DynamicModule {
    const jwtSecret = getJwtSecret(options);

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
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma ?? null,
      },
    ];

    return {
      module: AuthModule,
      imports: [
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
