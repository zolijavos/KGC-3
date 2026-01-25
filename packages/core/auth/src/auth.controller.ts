/**
 * Auth Controller - REST API endpoints for authentication
 * Story 1.1: JWT Login Endpoint
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * Story 1.5: Password Reset Flow
 * Story 2.4: Elevated Access Requirement
 *
 * Endpoints (with global prefix /api/v1):
 * - POST /auth/login - User login with email/password
 * - POST /auth/refresh - Refresh access token using refresh token
 * - POST /auth/logout - Logout from current device (AC1)
 * - POST /auth/logout-all - Logout from all devices (AC2)
 * - POST /auth/pin-login - PIN login for kiosk mode (Story 1.4)
 * - POST /auth/forgot-password - Request password reset (Story 1.5)
 * - POST /auth/reset-password - Reset password with token (Story 1.5)
 * - POST /auth/verify-password - Verify password for elevated access (Story 2.4)
 *
 * Security:
 * - Rate limiting: 5 requests per minute per IP (AC4)
 * - Input validation with Zod (AC5)
 * - Generic error messages to prevent user enumeration (AC3)
 * - Refresh token rotation (Story 1.2 AC2)
 * - Protected logout endpoints (Story 1.3 AC5)
 * - PIN lockout after 3 failed attempts (Story 1.4 AC3)
 * - Trusted device validation for kiosk mode (Story 1.4 AC2)
 * - No email enumeration for password reset (Story 1.5 AC2)
 * - Rate limiting on forgot password (Story 1.5 AC6)
 * - Elevated access verification (Story 2.4 AC6)
 */

import { JwtAuthGuard } from '@kgc/common';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { ForgotPasswordResponse } from './dto/forgot-password-response.dto';
import { forgotPasswordSchema, type ForgotPasswordDto } from './dto/forgot-password.dto';
import { loginSchema, type LoginDto } from './dto/login.dto';
import { type LogoutAllResponse, type LogoutResponse } from './dto/logout-response.dto';
import { logoutSchema, type LogoutDto } from './dto/logout.dto';
import type { PinLoginResponse } from './dto/pin-login-response.dto';
import { pinLoginSchema, type PinLoginDto } from './dto/pin-login.dto';
import type { RefreshResponse } from './dto/refresh-response.dto';
import { refreshTokenSchema, type RefreshTokenDto } from './dto/refresh-token.dto';
import type { ResetPasswordResponse } from './dto/reset-password-response.dto';
import { resetPasswordSchema, type ResetPasswordDto } from './dto/reset-password.dto';
import type { VerifyPasswordResponse } from './dto/verify-password-response.dto';
import { verifyPasswordSchema, type VerifyPasswordDto } from './dto/verify-password.dto';
import { LoginThrottlerGuard } from './guards/login-throttle.guard';
import type { LoginResponse } from './interfaces/jwt-payload.interface';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { getClientIp } from './utils/get-client-ip';

/**
 * Authenticated request with user context from JwtStrategy
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('APP_BASE_URL') private readonly appBaseUrl: string
  ) {}

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates user with email and password, returns JWT tokens
   *
   * AC1: Returns accessToken (24h), refreshToken (7d), expiresIn, user info
   * AC3: Returns 401 with generic message for invalid credentials
   * AC4: Rate limited to 5 requests/minute/IP
   * AC5: Validates input, returns 400 for invalid format
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@kgc.hu' },
        password: { type: 'string', example: 'admin123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful - returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() request: Request
  ): Promise<LoginResponse> {
    const { email, password } = dto;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers['user-agent'];

    try {
      const result = await this.authService.login(email, password);

      // P6: Record successful login attempt (non-blocking - don't fail login if audit fails)
      try {
        await this.authService.recordLoginAttempt(email, ipAddress, true, userAgent);
      } catch (auditError) {
        console.warn('[AuthController] Failed to record successful login attempt:', auditError);
      }

      return result;
    } catch (error) {
      // P6: Record failed login attempt (non-blocking)
      try {
        await this.authService.recordLoginAttempt(email, ipAddress, false, userAgent);
      } catch (auditError) {
        console.warn('[AuthController] Failed to record failed login attempt:', auditError);
      }

      // Re-throw HttpException for NestJS to handle
      throw error;
    }
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Refreshes access token using a valid refresh token
   * Story 1.2: Token Refresh
   *
   * AC1: Returns new accessToken (24h), refreshToken (rotated), expiresIn
   * AC2: Old refresh token is invalidated (rotation)
   * AC3: Returns 401 for invalid/expired/revoked refresh token
   * AC4: Returns 401 if access token is used instead of refresh token
   * AC5: Validates input, returns 400 for missing/malformed token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', description: 'JWT refresh token' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Token refreshed - returns new JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto
  ): Promise<RefreshResponse> {
    // Service throws UnauthorizedException for invalid tokens (AC3, AC4)
    return await this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Logout from current device by invalidating the refresh token
   * Story 1.3: Logout és Session Invalidation
   *
   * AC1: Invalidates the provided refresh token
   * AC4: Validates input, returns 400 for missing/malformed token (ZodValidationPipe)
   * AC5: Requires valid access token (protected endpoint)
   * P1 Security Fix: Token ownership validation
   *
   * Error handling: Service throws HttpExceptions (BadRequestException, ForbiddenException)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current device' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', description: 'JWT refresh token to invalidate' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid access token' })
  @ApiResponse({ status: 403, description: 'Forbidden - token belongs to another user' })
  async logout(
    @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto,
    @Req() request: AuthenticatedRequest
  ): Promise<LogoutResponse> {
    // P1 Security Fix: Get userId from authenticated request for ownership validation
    const userId = request.user.id;
    // Service throws BadRequestException (token not found/invalid) or ForbiddenException (not owned)
    return await this.authService.logout(dto.refreshToken, userId);
  }

  /**
   * POST /api/v1/auth/logout-all
   *
   * Logout from all devices by invalidating all refresh tokens
   * Story 1.3: Logout és Session Invalidation
   *
   * AC2: Invalidates all refresh tokens for the user
   * AC5: Requires valid access token (protected endpoint)
   *
   * Error handling: Service throws HttpExceptions for any errors
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid access token' })
  async logoutAll(@Req() request: AuthenticatedRequest): Promise<LogoutAllResponse> {
    // Extract user ID from JWT (set by JwtStrategy)
    const userId = request.user.id;
    return await this.authService.logoutAll(userId);
  }

  // ============================================
  // Story 1.4: PIN Login (Kiosk Mode)
  // ============================================

  /**
   * POST /api/v1/auth/pin-login
   *
   * Authenticates user with PIN code from trusted device (kiosk mode)
   * Story 1.4: PIN Kód Belépés (Kiosk Mód)
   *
   * AC1: Returns kiosk accessToken (4h TTL), no refresh token
   * AC2: Requires trusted device (deviceId validation)
   * AC3: Returns 429 when locked out (3 failed attempts → 15 min lockout)
   * AC4: Validates PIN format (4-6 numeric digits), returns 400 for invalid (ZodValidationPipe)
   * AC5: Validates deviceId (UUID format), returns 400 for invalid/missing (ZodValidationPipe)
   * AC6: Returns 401 with generic message (security - don't reveal which failed)
   *
   * Error handling: Service throws HttpExceptions (ForbiddenException, HttpException 429, UnauthorizedException)
   */
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'PIN login for kiosk mode' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pin', 'deviceId'],
      properties: {
        pin: {
          type: 'string',
          pattern: '^[0-9]{4,6}$',
          example: '1234',
          description: '4-6 digit PIN',
        },
        deviceId: { type: 'string', format: 'uuid', description: 'Trusted device UUID' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'PIN login successful - returns kiosk token (4h TTL)' })
  @ApiResponse({ status: 401, description: 'Invalid PIN' })
  @ApiResponse({ status: 403, description: 'Device not trusted or account locked' })
  @ApiResponse({ status: 429, description: 'Account locked due to failed attempts' })
  async pinLogin(
    @Body(new ZodValidationPipe(pinLoginSchema)) dto: PinLoginDto
  ): Promise<PinLoginResponse> {
    // Service throws ForbiddenException (device not trusted), HttpException 429 (lockout), or UnauthorizedException
    return await this.authService.pinLogin(dto.pin, dto.deviceId);
  }

  // ============================================
  // Story 1.5: Password Reset Flow
  // ============================================

  /**
   * POST /api/v1/auth/forgot-password
   *
   * Request password reset email
   * Story 1.5: Password Reset Flow
   *
   * AC1: Generates reset token (1h TTL) and sends email
   * AC2: Returns same response for existing/non-existing email (no enumeration)
   * AC6: Rate limited to 3 requests per 15 minutes per email
   * AC7: Validates input with Zod (ZodValidationPipe)
   *
   * Error handling: Service throws HttpException 429 for rate limiting
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@kgc.hu' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (same response for all emails)',
  })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto
  ): Promise<ForgotPasswordResponse> {
    // G-C1 SECURITY FIX: Use configured APP_BASE_URL instead of trusting Host header
    // Host header is client-controlled and can lead to account takeover via password reset phishing
    const resetUrlBase = `${this.appBaseUrl}/reset-password`;
    // Service throws HttpException 429 for rate limiting
    return await this.authService.forgotPassword(dto.email, resetUrlBase);
  }

  /**
   * POST /api/v1/auth/reset-password
   *
   * Reset password using token from email
   * Story 1.5: Password Reset Flow
   *
   * AC3: Validates token and updates password
   * AC4: Validates password policy (min 8 chars, 1 uppercase, 1 number) - ZodValidationPipe
   * AC5: Returns error for invalid/expired/used token
   * AC7: Validates input with Zod (ZodValidationPipe)
   *
   * SECURITY: C-H1/G4 FIX - Rate limiting to prevent token brute-force attacks
   * Error handling: Service throws BadRequestException for invalid token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { type: 'string', description: 'Password reset token from email' },
        newPassword: {
          type: 'string',
          minLength: 8,
          description: 'New password (min 8 chars, 1 uppercase, 1 number)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto
  ): Promise<ResetPasswordResponse> {
    // Service throws BadRequestException for invalid/expired/used token (AC5)
    return await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ============================================
  // Story 2.4: Elevated Access
  // ============================================

  /**
   * POST /api/v1/auth/verify-password
   *
   * Verify current password for elevated access to critical operations
   * Story 2.4: Elevated Access Requirement
   *
   * AC6: Verify password and record elevated access session (5 minute TTL)
   * Returns validUntil timestamp indicating when elevated access expires
   *
   * Requires valid access token (protected endpoint)
   * Error handling: Service throws UnauthorizedException (invalid password),
   *                 NotFoundException (user not found), ServiceUnavailableException (service not configured)
   */
  @Post('verify-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, LoginThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify password for elevated access' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        password: { type: 'string', description: 'Current password to verify' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password verified - elevated access granted for 5 minutes',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid access token' })
  @ApiResponse({ status: 403, description: 'Invalid password' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limited' })
  async verifyPassword(
    @Body(new ZodValidationPipe(verifyPasswordSchema)) dto: VerifyPasswordDto,
    @Req() request: AuthenticatedRequest
  ): Promise<VerifyPasswordResponse> {
    const userId = request.user.id;
    // Service throws appropriate HttpExceptions
    return await this.authService.verifyPasswordForElevatedAccess(userId, dto.password);
  }
}
