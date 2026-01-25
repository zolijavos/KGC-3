/**
 * @kgc/auth - Authentication Module
 * Story 1.1: JWT Login Endpoint
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * Story 1.5: Password Reset Flow
 * Story 2.4: Elevated Access Requirement
 *
 * Exports:
 * - AuthModule: NestJS module for authentication
 * - AuthService: Business logic for login, refresh, logout, PIN login, password reset, verify password
 * - PasswordService: bcrypt password hashing
 * - TokenService: JWT token generation/validation (including kiosk tokens)
 * - PinService: PIN hashing and verification
 * - PinLockoutService: PIN attempt tracking and lockout
 * - TrustedDeviceService: Trusted device management
 * - PasswordResetService: Password reset token management
 * - Guards: JwtAuthGuard, LoginThrottlerGuard
 * - DTOs: LoginDto, RefreshTokenDto, LogoutDto, PinLoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyPasswordDto, Response DTOs
 * - Interfaces: JwtPayload, UserForToken, IElevatedAccessService
 */

// Module
export { AuthModule } from './auth.module';
export type { AuthModuleOptions } from './auth.module';

// Services
export { AuthService } from './auth.service';
export { PasswordService } from './services/password.service';
export { TokenService } from './services/token.service';
// Story 1.4: PIN Login Services
export {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  PinLockoutService,
} from './services/pin-lockout.service';
export type { FailedAttemptResult } from './services/pin-lockout.service';
export { PinService } from './services/pin.service';
export { TrustedDeviceService } from './services/trusted-device.service';
export type { RegisterDeviceInput, TrustedDevice } from './services/trusted-device.service';
// Story 1.5: Password Reset Services
export { EMAIL_SERVICE, MockEmailService } from './services/email.service';
export type { IEmailService, PasswordResetEmailData } from './services/email.service';
export {
  FORGOT_PASSWORD_MAX_REQUESTS,
  FORGOT_PASSWORD_WINDOW_MS,
  PasswordResetService,
  RESET_TOKEN_TTL_MS,
} from './services/password-reset.service';
export type {
  GenerateTokenResult,
  PasswordResetTokenRecord,
} from './services/password-reset.service';

// Rate Limiting - Pluggable (in-memory for MVP, Redis for K8s/cluster)
export { InMemoryRateLimiter } from './services/in-memory-rate-limiter';
export { RATE_LIMITER } from './services/rate-limiter.interface';
export type {
  IRateLimiter,
  RateLimitResult,
  RateLimiterConfig,
} from './services/rate-limiter.interface';
export { RedisRateLimiter, createRedisRateLimiter } from './services/redis-rate-limiter';

// Guards
// Re-export JwtAuthGuard from @kgc/common (moved there to break circular dependency)
export { JwtAuthGuard } from '@kgc/common';
export { LoginThrottlerGuard } from './guards/login-throttle.guard';

// Pipes - Validation
export { ZodValidationPipe, createZodPipe } from './pipes/zod-validation.pipe';
export type { ZodValidationError } from './pipes/zod-validation.pipe';

// Strategy
export { JwtStrategy } from './strategies/jwt.strategy';

// Utils - G-L1 FIX: Unified IP extraction
export { getClientIp, getClientIpFromRecord } from './utils/get-client-ip';

// DTOs
export {
  ErrorResponseDto,
  LoginResponseDto,
  UserResponse,
  errorResponseSchema,
  loginResponseSchema,
} from './dto/login-response.dto';
export { LoginDto, loginSchema, validateLoginInput } from './dto/login.dto';
export type { ValidationError } from './dto/login.dto';
export { logoutAllResponseSchema, logoutResponseSchema } from './dto/logout-response.dto';
export type {
  LogoutAllResponse,
  LogoutAllResponseDto,
  LogoutResponse,
  LogoutResponseDto,
} from './dto/logout-response.dto';
export { logoutSchema, validateLogoutInput } from './dto/logout.dto';
export type { LogoutDto } from './dto/logout.dto';
export { refreshResponseSchema } from './dto/refresh-response.dto';
export type { RefreshResponse, RefreshResponseDto } from './dto/refresh-response.dto';
export { refreshTokenSchema, validateRefreshInput } from './dto/refresh-token.dto';
export type { RefreshTokenDto } from './dto/refresh-token.dto';
// Story 1.4: PIN Login DTOs
export { PinLoginErrorCode, pinLoginResponseSchema } from './dto/pin-login-response.dto';
export type { PinLoginResponse, PinLoginResponseDto } from './dto/pin-login-response.dto';
export { pinLoginSchema, validatePinLoginInput } from './dto/pin-login.dto';
export type { PinLoginDto, PinValidationError } from './dto/pin-login.dto';
// Story 1.5: Password Reset DTOs
export {
  FORGOT_PASSWORD_MESSAGE,
  forgotPasswordResponseSchema,
} from './dto/forgot-password-response.dto';
export type {
  ForgotPasswordResponse,
  ForgotPasswordResponseDto,
} from './dto/forgot-password-response.dto';
export { forgotPasswordSchema, validateForgotPasswordInput } from './dto/forgot-password.dto';
export type { ForgotPasswordDto, ForgotPasswordValidationError } from './dto/forgot-password.dto';
export {
  PasswordResetErrorCode,
  RESET_PASSWORD_MESSAGES,
  resetPasswordResponseSchema,
} from './dto/reset-password-response.dto';
export type {
  PasswordResetErrorResponse,
  ResetPasswordResponse,
  ResetPasswordResponseDto,
} from './dto/reset-password-response.dto';
export {
  passwordPolicySchema,
  resetPasswordSchema,
  validateResetPasswordInput,
} from './dto/reset-password.dto';
export type { ResetPasswordDto, ResetPasswordValidationError } from './dto/reset-password.dto';

// Interfaces
export type {
  ErrorResponse,
  JwtPayload,
  LoginResponse,
  TokenServiceOptions,
  UserForToken,
} from './interfaces/jwt-payload.interface';

// Story 2.4: Elevated Access Interface and DTOs
// Re-export from @kgc/common for backward compatibility
export { ELEVATED_ACCESS_SERVICE, type IElevatedAccessService } from '@kgc/common';

// Story 2.4: Audit Interface (local copy for auth module)
export { AUDIT_SERVICE, AuditAction } from './interfaces/audit.interface';
export type { AuditLogEntry, IAuditService } from './interfaces/audit.interface';

// DTOs - Verify Password (Story 2.4)
export {
  VERIFY_PASSWORD_MESSAGES,
  VerifyPasswordErrorCode,
  verifyPasswordResponseSchema,
} from './dto/verify-password-response.dto';
export type {
  VerifyPasswordResponse,
  VerifyPasswordResponseDto,
} from './dto/verify-password-response.dto';
export { validateVerifyPasswordInput, verifyPasswordSchema } from './dto/verify-password.dto';
export type { VerifyPasswordDto } from './dto/verify-password.dto';
