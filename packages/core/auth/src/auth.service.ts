/**
 * Auth Service - Business logic for authentication
 * Story 1.1: JWT Login Endpoint
 *
 * Responsibilities:
 * - User lookup by email
 * - Password verification with bcrypt
 * - JWT token generation (access + refresh)
 * - Login attempt tracking
 *
 * Security:
 * - Constant-time password comparison (AC2)
 * - Generic error for invalid credentials (AC3)
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { LoginResponse, UserForToken } from './interfaces/jwt-payload.interface';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null
  ) {}

  /**
   * Authenticate user with email and password
   *
   * @param email - User email
   * @param password - Plain text password
   * @returns LoginResponse with tokens and user info
   * @throws Error('Invalid credentials') for invalid email/password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user by email
    const user = await this.findUserByEmail(email);

    // If user not found, throw generic error (AC3: don't reveal which is wrong)
    if (!user) {
      // Perform dummy hash comparison to prevent timing attacks
      await this.passwordService.verifyPassword(
        password,
        '$2b$12$dummyHashForTimingAttackPrevention'
      );
      throw new Error('Invalid credentials');
    }

    // Verify password (constant-time comparison - AC2)
    const isPasswordValid = await this.passwordService.verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new Error('Invalid credentials');
    }

    // Generate tokens (AC1)
    const userForToken: UserForToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.tokenService.generateAccessToken(userForToken);
    const refreshToken = await this.tokenService.generateRefreshToken(userForToken);

    // Store refresh token in database (if prisma is available)
    if (this.prisma) {
      await this.storeRefreshToken(user.id, refreshToken);
    }

    // Return login response (AC1)
    return {
      data: {
        accessToken,
        refreshToken,
        expiresIn: this.tokenService.getExpiresIn('access'),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };
  }

  /**
   * Find user by email
   * Uses Prisma if available, otherwise returns null for testing
   */
  private async findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    tenantId: string;
    status: string;
  } | null> {
    if (!this.prisma) {
      // For testing without database
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        tenantId: true,
        status: true,
      },
    });

    return user;
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Record login attempt for audit and security analysis (P6)
   * @param email - Email used in attempt
   * @param ipAddress - IP address of the client
   * @param success - Whether login was successful
   * @param userAgent - Optional user agent string
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.loginAttempt.create({
        data: {
          email,
          ipAddress,
          success,
          userAgent: userAgent ?? null,
        },
      });
    } catch {
      // Silently fail - don't block login flow for audit logging failure
    }
  }

  /**
   * Get recent failed login attempts count for rate limiting analysis
   * @param email - Email to check
   * @param ipAddress - IP address to check
   * @param windowMinutes - Time window in minutes (default: 1)
   * @returns Number of failed attempts in the window
   */
  async getRecentFailedAttempts(
    email: string,
    ipAddress: string,
    windowMinutes: number = 1
  ): Promise<number> {
    if (!this.prisma) {
      return 0;
    }

    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await this.prisma.loginAttempt.count({
      where: {
        OR: [{ email }, { ipAddress }],
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    return count;
  }
}
