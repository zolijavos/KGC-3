/**
 * Auth Controller - REST API endpoints for authentication
 * Story 1.1: JWT Login Endpoint
 *
 * Endpoints:
 * - POST /api/v1/auth/login - User login with email/password
 *
 * Security:
 * - Rate limiting: 5 requests per minute per IP (AC4)
 * - Input validation with Zod (AC5)
 * - Generic error messages to prevent user enumeration (AC3)
 */

import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { validateLoginInput } from './dto/login.dto';
import { LoginThrottlerGuard } from './guards/login-throttle.guard';
import type { ErrorResponse, LoginResponse } from './interfaces/jwt-payload.interface';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
