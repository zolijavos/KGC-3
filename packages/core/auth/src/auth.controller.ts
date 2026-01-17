/**
 * Auth Controller - REST API endpoints for authentication
 * Story 1.1: JWT Login Endpoint
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * Story 1.5: Password Reset Flow
 * Story 2.4: Elevated Access Requirement
 *
 * Endpoints:
 * - POST /api/v1/auth/login - User login with email/password
 * - POST /api/v1/auth/refresh - Refresh access token using refresh token
 * - POST /api/v1/auth/logout - Logout from current device (AC1)
 * - POST /api/v1/auth/logout-all - Logout from all devices (AC2)
 * - POST /api/v1/auth/pin-login - PIN login for kiosk mode (Story 1.4)
 * - POST /api/v1/auth/forgot-password - Request password reset (Story 1.5)
 * - POST /api/v1/auth/reset-password - Reset password with token (Story 1.5)
 * - POST /api/v1/auth/verify-password - Verify password for elevated access (Story 2.4)
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

import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { ForgotPasswordResponse } from './dto/forgot-password-response.dto';
import { validateForgotPasswordInput } from './dto/forgot-password.dto';
import { validateLoginInput } from './dto/login.dto';
import {
  LOGOUT_ERROR_MESSAGES,
  type LogoutAllResponse,
  type LogoutResponse,
} from './dto/logout-response.dto';
import { validateLogoutInput } from './dto/logout.dto';
import type { PinLoginResponse } from './dto/pin-login-response.dto';
import { validatePinLoginInput } from './dto/pin-login.dto';
import type { RefreshResponse } from './dto/refresh-response.dto';
import { validateRefreshInput } from './dto/refresh-token.dto';
import { PasswordResetErrorCode, RESET_PASSWORD_MESSAGES } from './dto/reset-password-response.dto';
import type { ResetPasswordResponse } from './dto/reset-password-response.dto';
import { validateResetPasswordInput } from './dto/reset-password.dto';
import { VerifyPasswordErrorCode, VERIFY_PASSWORD_MESSAGES } from './dto/verify-password-response.dto';
import type { VerifyPasswordResponse } from './dto/verify-password-response.dto';
import { validateVerifyPasswordInput } from './dto/verify-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttle.guard';
import type { ErrorResponse, LoginResponse } from './interfaces/jwt-payload.interface';

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

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('APP_BASE_URL') private readonly appBaseUrl: string
  ) {}

  /**
   * Extract client IP from request (supports proxies)
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
    }
    return request.ip ?? 'unknown';
  }

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
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<LoginResponse | ErrorResponse> {
    // AC5: Runtime validation with Zod
    const validationResult = validateLoginInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { email, password } = validationResult.data;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    try {
      const result = await this.authService.login(email, password);

      // P6: Record successful login attempt
      await this.authService.recordLoginAttempt(email, ipAddress, true, userAgent);

      return result;
    } catch (error) {
      // P6: Record failed login attempt
      await this.authService.recordLoginAttempt(email, ipAddress, false, userAgent);

      // Set appropriate status code based on error type
      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          response.status(HttpStatus.UNAUTHORIZED);
          return {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Érvénytelen email vagy jelszó', // Hungarian: Invalid email or password
            },
          };
        }
      }

      // Generic server error - log for debugging
      console.error('[AuthController] login failed unexpectedly:', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
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
  async refresh(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response
  ): Promise<RefreshResponse | ErrorResponse> {
    // AC5: Runtime validation with Zod
    const validationResult = validateRefreshInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { refreshToken } = validationResult.data;

    try {
      const result = await this.authService.refreshTokens(refreshToken);
      return result;
    } catch (error) {
      // AC3, AC4: Invalid refresh token (expired, revoked, wrong type, not found)
      if (error instanceof Error && error.message === 'Invalid refresh token') {
        response.status(HttpStatus.UNAUTHORIZED);
        return {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Érvénytelen vagy lejárt refresh token', // Hungarian: Invalid or expired refresh token
          },
        };
      }

      // Generic server error
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Logout from current device by invalidating the refresh token
   * Story 1.3: Logout és Session Invalidation
   *
   * AC1: Invalidates the provided refresh token
   * AC4: Validates input, returns 400 for missing/malformed token
   * AC5: Requires valid access token (protected endpoint)
   * P1 Security Fix: Token ownership validation
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<LogoutResponse | ErrorResponse> {
    // AC4: Runtime validation with Zod
    const validationResult = validateLogoutInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { refreshToken } = validationResult.data;
    // P1 Security Fix: Get userId from authenticated request for ownership validation
    const userId = request.user.id;

    try {
      const result = await this.authService.logout(refreshToken, userId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === LOGOUT_ERROR_MESSAGES.TOKEN_NOT_FOUND) {
          response.status(HttpStatus.BAD_REQUEST);
          return {
            error: {
              code: 'TOKEN_NOT_FOUND',
              message: 'Refresh token nem található', // Hungarian: Refresh token not found
            },
          };
        }
        if (error.message === LOGOUT_ERROR_MESSAGES.INVALID_TOKEN) {
          response.status(HttpStatus.BAD_REQUEST);
          return {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Érvénytelen refresh token', // Hungarian: Invalid refresh token
            },
          };
        }
        // P1 Security Fix: Handle token ownership error
        if (error.message === LOGOUT_ERROR_MESSAGES.TOKEN_NOT_OWNED) {
          response.status(HttpStatus.FORBIDDEN);
          return {
            error: {
              code: 'TOKEN_NOT_OWNED',
              message: 'A token nem ehhez a felhasználóhoz tartozik', // Hungarian: Token does not belong to this user
            },
          };
        }
      }

      // Generic server error
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
  }

  /**
   * POST /api/v1/auth/logout-all
   *
   * Logout from all devices by invalidating all refresh tokens
   * Story 1.3: Logout és Session Invalidation
   *
   * AC2: Invalidates all refresh tokens for the user
   * AC5: Requires valid access token (protected endpoint)
   */
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @Req() request: AuthenticatedRequest
  ): Promise<LogoutAllResponse | ErrorResponse> {
    try {
      // Extract user ID from JWT (set by JwtStrategy)
      const userId = request.user.id;
      const result = await this.authService.logoutAll(userId);
      return result;
    } catch (error) {
      console.error('[AuthController] logoutAll failed unexpectedly:', error);
      // Generic server error
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
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
   * AC4: Validates PIN format (4-6 numeric digits), returns 400 for invalid
   * AC5: Validates deviceId (UUID format), returns 400 for invalid/missing
   * AC6: Returns 401 with generic message (security - don't reveal which failed)
   */
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  async pinLogin(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response
  ): Promise<PinLoginResponse | ErrorResponse> {
    // AC4, AC5: Runtime validation with Zod
    const validationResult = validatePinLoginInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { pin, deviceId } = validationResult.data;

    try {
      const result = await this.authService.pinLogin(pin, deviceId);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        // AC2: Device not trusted - 403 Forbidden (P1, P8 fix)
        if (error.message === 'Eszköz nem regisztrált') {
          response.status(HttpStatus.FORBIDDEN);
          return {
            error: {
              code: 'DEVICE_NOT_TRUSTED',
              message: 'Ez az eszköz nincs regisztrálva kiosk módhoz', // Hungarian: Device not registered for kiosk mode
            },
          };
        }

        // AC3: PIN lockout (3 failed attempts → 15 min lockout)
        if (error.message === 'Fiók zárolva') {
          response.status(HttpStatus.TOO_MANY_REQUESTS);
          return {
            error: {
              code: 'PIN_LOCKOUT',
              message: 'Fiók ideiglenesen zárolva. Próbálja újra 15 perc múlva.', // Hungarian: Account temporarily locked
            },
          };
        }

        // AC6: Generic error for invalid credentials (security)
        if (error.message === 'Érvénytelen hitelesítési adatok') {
          response.status(HttpStatus.UNAUTHORIZED);
          return {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Érvénytelen PIN kód', // Hungarian: Invalid PIN code
            },
          };
        }
      }

      // Generic server error
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
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
   * AC7: Validates input with Zod
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  async forgotPassword(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<ForgotPasswordResponse | ErrorResponse> {
    // AC7: Runtime validation with Zod
    const validationResult = validateForgotPasswordInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { email } = validationResult.data;

    // G-C1 SECURITY FIX: Use configured APP_BASE_URL instead of trusting Host header
    // Host header is client-controlled and can lead to account takeover via password reset phishing
    const resetUrlBase = `${this.appBaseUrl}/reset-password`;

    try {
      const result = await this.authService.forgotPassword(email, resetUrlBase);
      return result;
    } catch (error) {
      // AC6: Rate limit exceeded
      if (error instanceof Error && error.message === 'Túl sok kérés') {
        response.status(HttpStatus.TOO_MANY_REQUESTS);
        return {
          error: {
            code: PasswordResetErrorCode.RATE_LIMITED,
            message: RESET_PASSWORD_MESSAGES.RATE_LIMITED,
          },
        };
      }

      // Generic server error - but still return success-like response for security
      // (don't reveal internal errors that could leak info)
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   *
   * Reset password using token from email
   * Story 1.5: Password Reset Flow
   *
   * AC3: Validates token and updates password
   * AC4: Validates password policy (min 8 chars, 1 uppercase, 1 number)
   * AC5: Returns error for invalid/expired/used token
   * AC7: Validates input with Zod
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response
  ): Promise<ResetPasswordResponse | ErrorResponse> {
    // AC7: Runtime validation with Zod (includes password policy - AC4)
    const validationResult = validateResetPasswordInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { token, newPassword } = validationResult.data;

    try {
      const result = await this.authService.resetPassword(token, newPassword);
      return result;
    } catch (error) {
      // AC5: Invalid/expired/used token
      if (error instanceof Error && error.message === 'Érvénytelen token') {
        response.status(HttpStatus.BAD_REQUEST);
        return {
          error: {
            code: PasswordResetErrorCode.INVALID_TOKEN,
            message: RESET_PASSWORD_MESSAGES.INVALID_TOKEN,
          },
        };
      }

      // Generic server error
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
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
   */
  @Post('verify-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, LoginThrottlerGuard)
  async verifyPassword(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<VerifyPasswordResponse | ErrorResponse> {
    // Runtime validation with Zod
    const validationResult = validateVerifyPasswordInput(body);
    if (!validationResult.success) {
      response.status(HttpStatus.BAD_REQUEST);
      return {
        error: validationResult.error,
      };
    }

    const { password } = validationResult.data;
    const userId = request.user.id;

    try {
      const result = await this.authService.verifyPasswordForElevatedAccess(userId, password);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Invalid password
        if (error.message === 'Érvénytelen jelszó') {
          response.status(HttpStatus.UNAUTHORIZED);
          return {
            error: {
              code: VerifyPasswordErrorCode.INVALID_PASSWORD,
              message: VERIFY_PASSWORD_MESSAGES.INVALID_PASSWORD,
            },
          };
        }

        // User not found (shouldn't happen if JWT is valid, but handle it)
        if (error.message === 'Felhasználó nem található') {
          response.status(HttpStatus.NOT_FOUND);
          return {
            error: {
              code: VerifyPasswordErrorCode.USER_NOT_FOUND,
              message: 'Felhasználó nem található', // Hungarian: User not found
            },
          };
        }

        // Service not configured
        if (error.message === 'Elevated access service not configured') {
          response.status(HttpStatus.INTERNAL_SERVER_ERROR);
          return {
            error: {
              code: 'SERVICE_NOT_CONFIGURED',
              message: 'Szolgáltatás nem elérhető', // Hungarian: Service not available
            },
          };
        }
      }

      // Generic server error
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return {
        error: {
          code: 'SERVER_ERROR',
          message: 'Szerverhiba történt', // Hungarian: Server error occurred
        },
      };
    }
  }
}
