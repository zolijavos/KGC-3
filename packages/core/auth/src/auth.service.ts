/**
 * Auth Service - Business logic for authentication
 * Story 1.1: JWT Login Endpoint
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * Story 1.5: Password Reset Flow
 *
 * Responsibilities:
 * - User lookup by email
 * - Password verification with bcrypt
 * - JWT token generation (access + refresh)
 * - Token refresh with rotation
 * - Logout (single device and all devices)
 * - Login attempt tracking
 * - PIN-based kiosk login with trusted devices
 * - Password reset flow (forgot password, reset password)
 *
 * Security:
 * - Constant-time password comparison (AC2)
 * - Generic error for invalid credentials (AC3)
 * - Refresh token rotation (AC2 Story 1.2)
 * - Token revocation on logout (Story 1.3)
 * - PIN lockout after 3 failed attempts (Story 1.4 AC3)
 * - Trusted device validation for kiosk mode (Story 1.4 AC2)
 * - Password reset token hashing (Story 1.5 AC1)
 * - No email enumeration (Story 1.5 AC2)
 */

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AUDIT_SERVICE, AuditAction, type IAuditService } from './interfaces/audit.interface';
import { FORGOT_PASSWORD_MESSAGE } from './dto/forgot-password-response.dto';
import type { ForgotPasswordResponse } from './dto/forgot-password-response.dto';
import {
  LOGOUT_ERROR_MESSAGES,
  LOGOUT_MESSAGES,
  type LogoutAllResponse,
  type LogoutResponse,
} from './dto/logout-response.dto';
import type { PinLoginResponse } from './dto/pin-login-response.dto';
import type { RefreshResponse } from './dto/refresh-response.dto';
import { RESET_PASSWORD_MESSAGES } from './dto/reset-password-response.dto';
import type { ResetPasswordResponse } from './dto/reset-password-response.dto';
import { VERIFY_PASSWORD_MESSAGES } from './dto/verify-password-response.dto';
import type { VerifyPasswordResponse } from './dto/verify-password-response.dto';
import type {
  IElevatedAccessService,
} from './interfaces/elevated-access.interface';
import { ELEVATED_ACCESS_SERVICE } from './interfaces/elevated-access.interface';
import type { LoginResponse, UserForToken } from './interfaces/jwt-payload.interface';
import type { IEmailService } from './services/email.service';
import { PasswordService } from './services/password.service';
import { PasswordResetService } from './services/password-reset.service';
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  PinLockoutService,
} from './services/pin-lockout.service';
import { PinService } from './services/pin.service';
import { TokenService } from './services/token.service';
import { TrustedDeviceService } from './services/trusted-device.service';

/** Refresh token TTL in milliseconds (7 days) - P5 fix: extracted constant */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null,
    // Story 1.4: PIN Login services (optional for backward compatibility)
    @Optional() private readonly pinService?: PinService | null,
    @Optional() private readonly pinLockoutService?: PinLockoutService | null,
    @Optional() private readonly trustedDeviceService?: TrustedDeviceService | null,
    // Story 1.5: Password Reset services (optional for backward compatibility)
    @Optional() private readonly passwordResetService?: PasswordResetService | null,
    @Inject('EMAIL_SERVICE') @Optional() private readonly emailService?: IEmailService | null,
    // Story 2.4: Elevated Access service (optional for backward compatibility)
    @Inject(ELEVATED_ACCESS_SERVICE) @Optional() private readonly elevatedAccessService?: IElevatedAccessService | null,
    // Story 2.4: Audit service for logging elevated access events
    @Inject(AUDIT_SERVICE) @Optional() private readonly auditService?: IAuditService | null
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
      // SECURITY: Must be a valid 60-character bcrypt hash for constant-time comparison
      const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.lLNJxfMbFMPmla';
      await this.passwordService.verifyPassword(password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password (constant-time comparison - AC2)
    const isPasswordValid = await this.passwordService.verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
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

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

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
    } catch (error) {
      // Don't block login flow, but log the error for operational visibility
      console.warn('[AuthService] Failed to record login attempt:', error);
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

  // ============================================
  // Story 1.2: Token Refresh Methods
  // ============================================

  /**
   * Refresh access token using a valid refresh token
   * Story 1.2: Token Refresh
   *
   * @param refreshToken - The refresh token to validate and rotate
   * @returns RefreshResponse with new access and refresh tokens
   * @throws UnauthorizedException for invalid/expired/revoked tokens
   */
  async refreshTokens(refreshToken: string): Promise<RefreshResponse> {
    // Step 1: Validate JWT signature and type (AC4)
    const isValidJwt = await this.tokenService.validateRefreshToken(refreshToken);
    if (!isValidJwt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 2: Check token exists in database and is valid (AC3)
    const tokenRecord = await this.findValidRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 3: Check if token is expired (AC3)
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 4: Check if token is revoked (AC3)
    if (tokenRecord.isRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 5: Get user for new token generation
    const user = await this.findUserById(tokenRecord.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Step 6: Create user for token
    const userForToken: UserForToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    // Step 7: Rotate tokens (AC2)
    const newRefreshToken = await this.rotateRefreshToken(tokenRecord.id, userForToken);

    // Step 8: Generate new access token
    const newAccessToken = await this.tokenService.generateAccessToken(userForToken);

    // Return refresh response (AC1)
    return {
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.tokenService.getExpiresIn('access'),
      },
    };
  }

  /**
   * Find a valid (non-revoked, non-expired) refresh token in database
   * @param token - The JWT refresh token string
   * @returns Token record or null if not found/invalid
   */
  async findValidRefreshToken(token: string): Promise<{
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    isRevoked: boolean;
    revokedAt: Date | null;
    deviceInfo: string | null;
    createdAt: Date;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token },
    });

    return tokenRecord;
  }

  /**
   * Rotate refresh token: revoke old and create new
   * Story 1.2 AC2: Refresh Token Rotation
   *
   * P1 fix: Uses Prisma $transaction to prevent race conditions.
   * If revoke succeeds but create fails, the entire operation rolls back.
   *
   * @param oldTokenId - ID of the token to revoke
   * @param user - User for new token generation
   * @returns New refresh token string
   */
  async rotateRefreshToken(oldTokenId: string, user: UserForToken): Promise<string> {
    // Generate new refresh token first (outside transaction - JWT generation is idempotent)
    const newRefreshToken = await this.tokenService.generateRefreshToken(user);

    if (!this.prisma) {
      // For testing without database, just return the generated token
      return newRefreshToken;
    }

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // P1 fix: Wrap revoke + create in transaction to prevent race conditions
    // If either operation fails, the entire transaction rolls back
    await this.prisma.$transaction([
      // Revoke old token
      this.prisma.refreshToken.update({
        where: { id: oldTokenId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }),
      // Store new token
      this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    return newRefreshToken;
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * @param userId - User ID
   * @returns Number of tokens revoked
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    if (!this.prisma) {
      return 0;
    }

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  // ============================================
  // Story 1.3: Logout Methods
  // ============================================

  /**
   * Logout from single device by revoking the refresh token
   * Story 1.3 AC1: Single device logout
   *
   * @param refreshToken - The refresh token to revoke
   * @param userId - The authenticated user's ID (for ownership validation - P1 security fix)
   * @returns LogoutResponse with success status
   * @throws UnauthorizedException for invalid JWT or wrong token type
   * @throws NotFoundException for non-existent token
   * @throws ForbiddenException if token belongs to different user (P1 security fix)
   */
  async logout(refreshToken: string, userId: string): Promise<LogoutResponse> {
    // Step 1: Validate JWT signature and type
    const isValidJwt = await this.tokenService.validateRefreshToken(refreshToken);
    if (!isValidJwt) {
      throw new UnauthorizedException(LOGOUT_ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Step 2: Find token in database
    const tokenRecord = await this.findValidRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw new NotFoundException(LOGOUT_ERROR_MESSAGES.TOKEN_NOT_FOUND);
    }

    // Step 3: P1 Security Fix - Verify token ownership
    // User can only revoke their own tokens
    if (tokenRecord.userId !== userId) {
      throw new ForbiddenException(LOGOUT_ERROR_MESSAGES.TOKEN_NOT_OWNED);
    }

    // Step 4: If already revoked, return success (idempotent)
    if (tokenRecord.isRevoked) {
      return {
        data: {
          success: true,
          message: LOGOUT_MESSAGES.SUCCESS,
        },
      };
    }

    // Step 5: Revoke the token
    if (this.prisma) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    }

    return {
      data: {
        success: true,
        message: LOGOUT_MESSAGES.SUCCESS,
      },
    };
  }

  /**
   * Logout from all devices by revoking all refresh tokens
   * Story 1.3 AC2: Logout all devices
   *
   * @param userId - User ID to logout
   * @returns LogoutAllResponse with success status and revoked count
   */
  async logoutAll(userId: string): Promise<LogoutAllResponse> {
    const revokedCount = await this.revokeAllUserTokens(userId);

    return {
      data: {
        success: true,
        revokedCount,
        // Code Review Fix (C-L2): Consistent message format for all counts
        // Previously: "Nincs aktív session" when count=0 (sounded like failure)
        // Now: "Sikeres kijelentkezés minden eszközről (0 session)" (consistent success)
        message: LOGOUT_MESSAGES.SUCCESS_ALL(revokedCount),
      },
    };
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User record or null
   */
  private async findUserById(id: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    status: string;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        status: true,
      },
    });

    return user;
  }

  // ============================================
  // Story 1.4: PIN Login Methods (Kiosk Mode)
  // ============================================

  /**
   * Authenticate user with PIN code for kiosk mode
   * Story 1.4: PIN Kód Belépés (Kiosk Mód)
   *
   * @param pin - 4-6 digit PIN code
   * @param deviceId - Trusted device UUID
   * @returns PinLoginResponse with kiosk token (no refresh token)
   * @throws ForbiddenException for untrusted device (AC2: 403)
   * @throws UnauthorizedException for invalid PIN (AC6: generic error)
   * @throws ForbiddenException when user is locked out (AC3)
   */
  async pinLogin(pin: string, deviceId: string): Promise<PinLoginResponse> {
    // Step 1: Validate trusted device (AC2)
    const device = await this.findTrustedDevice(deviceId);
    if (!device) {
      throw new ForbiddenException('Eszköz nem regisztrált'); // AC2: 403 Forbidden - device not registered
    }
    if (device.status !== 'ACTIVE') {
      throw new ForbiddenException('Eszköz nem regisztrált'); // AC2: suspended/revoked treated same as not found
    }

    // Step 2: Find user by PIN at device's location
    const user = await this.findUserByPinAtLocation(pin, device.locationId, device.tenantId);
    if (!user) {
      // No matching user found - increment lockout counter for this device
      // Use deviceId as pseudo-userId for device-level lockout
      const lockoutResult = await this.incrementPinAttempt(deviceId, deviceId);

      // H2 FIX: Record failed PIN attempt for audit (use 'unknown' for email since user not found)
      await this.recordPinLoginAttempt('unknown', deviceId, false);

      if (lockoutResult?.isLocked) {
        throw new ForbiddenException('Fiók zárolva');
      }
      throw new UnauthorizedException('Érvénytelen hitelesítési adatok');
    }

    // Step 3: Check lockout status for found user (AC3)
    const isLocked = await this.checkPinLockout(user.id, deviceId);
    if (isLocked) {
      // H2 FIX: Record lockout event for audit
      await this.recordPinLoginAttempt(user.email, deviceId, false);
      throw new ForbiddenException('Fiók zárolva');
    }

    // Step 4: Reset failed attempts on success
    await this.resetPinAttempts(user.id, deviceId);
    await this.resetPinAttempts(deviceId, deviceId); // Also reset device-level lockout

    // Step 5: Update device last used
    await this.updateDeviceLastUsed(deviceId);

    // Step 6: Record successful PIN login for audit (P3 fix)
    await this.recordPinLoginAttempt(user.email, deviceId, true);

    // Step 7: Generate kiosk token (4h, no refresh - AC1)
    const userForToken: UserForToken = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.tokenService.generateKioskToken(userForToken);

    // Return kiosk login response (no refresh token per AC1)
    return {
      data: {
        accessToken,
        expiresIn: this.tokenService.getExpiresIn('kiosk'),
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
   * Find trusted device by deviceId
   * @param deviceId - Device UUID
   * @returns Device record or null
   */
  private async findTrustedDevice(deviceId: string): Promise<{
    id: string;
    tenantId: string;
    locationId: string;
    userId: string;
    deviceName: string;
    status: string;
    lastUsedAt: Date | null;
    createdAt: Date;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    const device = await this.prisma.trustedDevice.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        tenantId: true,
        locationId: true,
        deviceName: true,
        status: true,
        lastUsedAt: true,
        registeredAt: true,
        // Get userId from the device's location users (first PIN-enabled user)
      },
    });

    if (!device) {
      return null;
    }

    // For now, return with registeredAt as createdAt
    // Note: userId lookup will be handled separately via location
    return {
      id: device.id,
      tenantId: device.tenantId,
      locationId: device.locationId,
      userId: '', // Will be set during PIN verification flow
      deviceName: device.deviceName,
      status: device.status,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.registeredAt,
    };
  }

  /**
   * Check if user is locked out from PIN login
   * @param userId - User ID
   * @param deviceId - Device ID
   * @returns true if locked out
   */
  private async checkPinLockout(userId: string, deviceId: string): Promise<boolean> {
    if (!this.pinLockoutService) {
      // Check directly via Prisma if service not injected
      if (!this.prisma) return false;

      const attempt = await this.prisma.pinAttempt.findUnique({
        where: {
          userId_deviceId: { userId, deviceId },
        },
      });

      if (!attempt) return false;

      return attempt.lockedUntil ? attempt.lockedUntil > new Date() : false;
    }

    return this.pinLockoutService.checkLockout(userId, deviceId);
  }

  /**
   * Verify PIN against hash
   * @param pin - Plain text PIN
   * @param pinHash - bcrypt hash
   * @returns true if PIN matches
   */
  private async verifyUserPin(pin: string, pinHash: string): Promise<boolean> {
    if (this.pinService) {
      return this.pinService.verifyPin(pin, pinHash);
    }

    // Fallback to direct bcrypt (should not happen in production)
    const bcrypt = await import('bcrypt');
    try {
      return await bcrypt.compare(pin, pinHash);
    } catch {
      return false;
    }
  }

  /**
   * Increment failed PIN attempt
   * @param userId - User ID
   * @param deviceId - Device ID
   * @returns Lockout result or null
   */
  private async incrementPinAttempt(
    userId: string,
    deviceId: string
  ): Promise<{ attemptCount: number; isLocked: boolean; lockedUntil?: Date } | null> {
    if (!this.pinLockoutService) {
      // Direct Prisma implementation if service not injected
      if (!this.prisma) return null;

      const existing = await this.prisma.pinAttempt.findUnique({
        where: {
          userId_deviceId: { userId, deviceId },
        },
      });

      const newCount = (existing?.attemptCount ?? 0) + 1;
      const shouldLock = newCount >= MAX_FAILED_ATTEMPTS; // P4 fix: use constant
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

      const result = await this.prisma.pinAttempt.upsert({
        where: {
          userId_deviceId: { userId, deviceId },
        },
        update: {
          attemptCount: newCount,
          lastAttemptAt: new Date(),
          lockedUntil,
          updatedAt: new Date(),
        },
        create: {
          userId,
          deviceId,
          attemptCount: newCount,
          lastAttemptAt: new Date(),
          lockedUntil,
        },
      });

      return {
        attemptCount: result.attemptCount,
        isLocked: shouldLock,
        lockedUntil: result.lockedUntil ?? undefined,
      };
    }

    return this.pinLockoutService.incrementFailedAttempt(userId, deviceId);
  }

  /**
   * Reset PIN attempts on successful login
   * @param userId - User ID
   * @param deviceId - Device ID
   */
  private async resetPinAttempts(userId: string, deviceId: string): Promise<void> {
    if (!this.pinLockoutService) {
      // Direct Prisma implementation
      if (!this.prisma) return;

      try {
        await this.prisma.pinAttempt.delete({
          where: {
            userId_deviceId: { userId, deviceId },
          },
        });
      } catch {
        // Record may not exist - that's fine
      }
      return;
    }

    await this.pinLockoutService.resetAttempts(userId, deviceId);
  }

  /**
   * Update device last used timestamp
   * P7 fix: Added error handling to prevent breaking successful login flow
   * @param deviceId - Device ID
   */
  private async updateDeviceLastUsed(deviceId: string): Promise<void> {
    try {
      if (!this.trustedDeviceService) {
        // Direct Prisma implementation
        if (!this.prisma) return;

        await this.prisma.trustedDevice.update({
          where: { id: deviceId },
          data: { lastUsedAt: new Date() },
        });
        return;
      }

      await this.trustedDeviceService.updateLastUsed(deviceId);
    } catch {
      // P7 fix: Silently fail - don't break successful login for lastUsed update failure
      // This is a non-critical operation
    }
  }

  /**
   * Find user by PIN at a specific location
   * Story 1.4: PIN lookup by location for kiosk mode
   * @param pin - Plain text PIN to verify
   * @param locationId - Location ID to search
   * @param tenantId - Tenant ID for additional filtering
   * @returns User if PIN matches, null otherwise
   */
  private async findUserByPinAtLocation(
    pin: string,
    locationId: string,
    tenantId: string
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    status: string;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    // Find all active users with PIN set at this location
    const usersWithPin = await this.prisma.user.findMany({
      where: {
        tenantId,
        locationId,
        status: 'ACTIVE',
        pinHash: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        status: true,
        pinHash: true,
      },
    });

    // H1 FIX: Constant-time PIN verification to prevent timing attacks
    // Check ALL users' PINs regardless of match to ensure consistent execution time
    // This prevents attackers from determining user count or position via timing analysis
    let matchedUser: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      status: string;
    } | null = null;

    for (const user of usersWithPin) {
      if (user.pinHash) {
        const isMatch = await this.verifyUserPin(pin, user.pinHash);
        // Only store first match (in case of collision, though bcrypt makes this extremely unlikely)
        if (isMatch && !matchedUser) {
          matchedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            status: user.status,
          };
        }
      }
    }

    return matchedUser;
  }

  /**
   * Record PIN login attempt for audit trail
   * P3 fix: Added audit logging for PIN login attempts
   * @param email - User email
   * @param deviceId - Device ID used for login
   * @param success - Whether login was successful
   */
  private async recordPinLoginAttempt(
    email: string,
    deviceId: string,
    success: boolean
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.loginAttempt.create({
        data: {
          email,
          ipAddress: `device:${deviceId}`, // Use device ID as identifier
          success,
          userAgent: 'PIN/Kiosk',
        },
      });
    } catch {
      // Silently fail - don't block login flow for audit logging failure
    }
  }

  // ============================================
  // Story 1.5: Password Reset Methods
  // ============================================

  /**
   * Request password reset (forgot password)
   * Story 1.5 AC1: Generate and send reset token
   * Story 1.5 AC2: No email enumeration (same response for existing/non-existing)
   * Story 1.5 AC6: Rate limiting
   *
   * @param email - User email address
   * @param resetUrlBase - Base URL for reset link (e.g., https://app.kgc.hu/reset-password)
   * @returns ForgotPasswordResponse with generic message (AC2)
   * @throws HttpException(429) when rate limited (AC6)
   */
  async forgotPassword(email: string, resetUrlBase: string = ''): Promise<ForgotPasswordResponse> {
    // M4 fix: Normalize email to lowercase for consistent handling
    const normalizedEmail = email.toLowerCase();

    // Step 1: Check rate limit (AC6) - now async for Redis support
    const isRateLimited = await this.passwordResetService?.checkRateLimit(normalizedEmail);
    if (isRateLimited) {
      throw new HttpException('Túl sok kérés', HttpStatus.TOO_MANY_REQUESTS); // Hungarian: Too many requests
    }

    // Step 2: Increment rate limit counter (before any processing) - now async for Redis support
    await this.passwordResetService?.incrementRateLimit(normalizedEmail);

    // Step 3: Find user by email (silently - AC2)
    const user = await this.findUserByEmail(normalizedEmail);

    // If user exists and is active, generate token and send email
    if (user && user.status === 'ACTIVE') {
      try {
        // Step 4: Generate reset token
        const tokenResult = this.passwordResetService?.generateToken();
        if (tokenResult) {
          // Step 5: Store token hash in database
          await this.passwordResetService?.storeToken(
            user.id,
            tokenResult.tokenHash,
            tokenResult.expiresAt
          );

          // Step 6: Send reset email (if email service available)
          if (this.emailService) {
            const resetUrl = resetUrlBase
              ? `${resetUrlBase}?token=${tokenResult.plainToken}`
              : tokenResult.plainToken;

            await this.emailService.sendPasswordResetEmail({
              to: user.email,
              resetToken: tokenResult.plainToken,
              resetUrl,
              expiresInHours: 1,
              userName: user.name,
            });
          } else {
            // M3 fix: Log warning when email service not configured
            console.warn(
              '[AuthService] EMAIL_SERVICE not configured - password reset email not sent for user:',
              user.id
            );
          }
        }
      } catch (error) {
        // L2 fix: Log error for debugging while still not revealing to user (AC2)
        console.error('[AuthService] forgotPassword error (not revealed to user):', error);
      }
    } else {
      // TIMING ATTACK FIX (AC2): Normalize response time when user doesn't exist
      // Without this, attackers can enumerate valid emails by measuring response times:
      // - User exists + active: ~115-515ms (token gen + DB write + email)
      // - User not found: ~1-5ms (early return)
      //
      // Fix: Perform dummy operations to make both paths take similar time
      try {
        // Step 1: CPU work - generate a token we won't use (simulates real work)
        this.passwordResetService?.generateToken();

        // Step 2: Add random delay to match typical email sending time (50-150ms)
        const randomDelay = 50 + Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, randomDelay));
      } catch {
        // Ignore errors in dummy operations - they're just for timing normalization
      }
    }

    // Step 7: Always return same response (AC2 - no email enumeration)
    return {
      data: {
        message: FORGOT_PASSWORD_MESSAGE,
      },
    };
  }

  /**
   * Reset password with token
   * Story 1.5 AC3: Validate token and update password
   * Story 1.5 AC4: Password policy enforced at DTO level
   * Story 1.5 AC5: Invalid/expired token handling
   *
   * @param token - Reset token from email
   * @param newPassword - New password (must meet policy)
   * @returns ResetPasswordResponse with success status
   * @throws BadRequestException for invalid/expired/used token (AC5)
   */
  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    // Step 1: Validate token
    const tokenRecord = await this.passwordResetService?.findValidToken(token);

    if (!tokenRecord) {
      throw new BadRequestException('Érvénytelen token'); // Hungarian: Invalid token
    }

    // Step 2: Get user
    const user = await this.findUserById(tokenRecord.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new BadRequestException('Érvénytelen token'); // Don't reveal user status
    }

    // Step 3: Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Step 4: Update password in database
    if (this.prisma) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    // Step 5: Mark token as used
    await this.passwordResetService?.markTokenAsUsed(tokenRecord.id);

    // Step 6: Invalidate all other reset tokens for this user
    await this.passwordResetService?.invalidateAllUserTokens(user.id);

    // Step 7: Revoke all refresh tokens (force re-login everywhere)
    await this.revokeAllUserTokens(user.id);

    // Step 8: Return success
    return {
      data: {
        success: true,
        message: RESET_PASSWORD_MESSAGES.SUCCESS,
      },
    };
  }

  // ============================================
  // Story 2.4: Elevated Access Methods
  // ============================================

  /**
   * Verify password for elevated access
   * Story 2.4: Elevated Access Requirement
   * AC#6: POST /api/v1/auth/verify-password endpoint
   *
   * @param userId - User ID (from JWT)
   * @param password - Current password to verify
   * @returns VerifyPasswordResponse with validUntil timestamp
   * @throws ServiceUnavailableException when elevated access service not available
   * @throws NotFoundException for non-existent/inactive user
   * @throws ForbiddenException for invalid password
   */
  async verifyPasswordForElevatedAccess(
    userId: string,
    password: string
  ): Promise<VerifyPasswordResponse> {
    // Step 1: Check if elevated access service is configured
    if (!this.elevatedAccessService) {
      throw new ServiceUnavailableException('Elevated access service not configured');
    }

    // Step 2: Find user by ID
    const user = await this.findUserById(userId);

    // Step 3: Check if user exists and is active
    if (!user || user.status !== 'ACTIVE') {
      throw new NotFoundException('Felhasználó nem található'); // Hungarian: User not found
    }

    // Step 4: Get password hash and verify
    const userWithPassword = await this.findUserByIdWithPassword(userId);
    if (!userWithPassword) {
      throw new NotFoundException('Felhasználó nem található');
    }

    // Step 5: Verify password (constant-time comparison)
    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      userWithPassword.passwordHash
    );

    if (!isPasswordValid) {
      throw new ForbiddenException('Érvénytelen jelszó'); // Hungarian: Invalid password
    }

    // Step 6: Record verification in elevated access service
    this.elevatedAccessService.recordVerification(userId);

    // Step 7: Get validUntil timestamp
    const validUntil = this.elevatedAccessService.getValidUntil(userId);

    // Step 8: Return success response
    return {
      data: {
        success: true,
        validUntil: validUntil ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        message: VERIFY_PASSWORD_MESSAGES.SUCCESS,
      },
    };
  }

  /**
   * Find user by ID with password hash (for password verification)
   * @param id - User ID
   * @returns User record with passwordHash or null
   */
  private async findUserByIdWithPassword(id: string): Promise<{
    id: string;
    passwordHash: string;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    return user;
  }
}
