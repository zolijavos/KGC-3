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
export { PinService } from './services/pin.service';
export { PinLockoutService, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS } from './services/pin-lockout.service';
export type { FailedAttemptResult } from './services/pin-lockout.service';
export { TrustedDeviceService } from './services/trusted-device.service';
export type { RegisterDeviceInput, TrustedDevice } from './services/trusted-device.service';
// Story 1.5: Password Reset Services
export {
  PasswordResetService,
  RESET_TOKEN_TTL_MS,
  FORGOT_PASSWORD_MAX_REQUESTS,
  FORGOT_PASSWORD_WINDOW_MS,
} from './services/password-reset.service';
export type { GenerateTokenResult, PasswordResetTokenRecord } from './services/password-reset.service';
export { MockEmailService, EMAIL_SERVICE } from './services/email.service';
export type { IEmailService, PasswordResetEmailData } from './services/email.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { LoginThrottlerGuard } from './guards/login-throttle.guard';

// Strategy
export { JwtStrategy } from './strategies/jwt.strategy';

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
export { refreshTokenSchema, validateRefreshInput } from './dto/refresh-token.dto';
export type { RefreshTokenDto } from './dto/refresh-token.dto';
export { refreshResponseSchema } from './dto/refresh-response.dto';
export type { RefreshResponse, RefreshResponseDto } from './dto/refresh-response.dto';
export { logoutSchema, validateLogoutInput } from './dto/logout.dto';
export type { LogoutDto } from './dto/logout.dto';
export { logoutResponseSchema, logoutAllResponseSchema } from './dto/logout-response.dto';
export type {
  LogoutResponse,
  LogoutResponseDto,
  LogoutAllResponse,
  LogoutAllResponseDto,
} from './dto/logout-response.dto';
// Story 1.4: PIN Login DTOs
export { pinLoginSchema, validatePinLoginInput } from './dto/pin-login.dto';
export type { PinLoginDto, PinValidationError } from './dto/pin-login.dto';
export { pinLoginResponseSchema, PinLoginErrorCode } from './dto/pin-login-response.dto';
export type { PinLoginResponse, PinLoginResponseDto } from './dto/pin-login-response.dto';
// Story 1.5: Password Reset DTOs
export { forgotPasswordSchema, validateForgotPasswordInput } from './dto/forgot-password.dto';
export type { ForgotPasswordDto, ForgotPasswordValidationError } from './dto/forgot-password.dto';
export {
  resetPasswordSchema,
  passwordPolicySchema,
  validateResetPasswordInput,
} from './dto/reset-password.dto';
export type { ResetPasswordDto, ResetPasswordValidationError } from './dto/reset-password.dto';
export {
  forgotPasswordResponseSchema,
  FORGOT_PASSWORD_MESSAGE,
} from './dto/forgot-password-response.dto';
export type {
  ForgotPasswordResponse,
  ForgotPasswordResponseDto,
} from './dto/forgot-password-response.dto';
export {
  resetPasswordResponseSchema,
  PasswordResetErrorCode,
  RESET_PASSWORD_MESSAGES,
} from './dto/reset-password-response.dto';
export type {
  ResetPasswordResponse,
  ResetPasswordResponseDto,
  PasswordResetErrorResponse,
} from './dto/reset-password-response.dto';

// Interfaces
export type {
  ErrorResponse,
  JwtPayload,
  LoginResponse,
  TokenServiceOptions,
  UserForToken,
} from './interfaces/jwt-payload.interface';

// Story 2.4: Elevated Access Interface and DTOs
export { ELEVATED_ACCESS_SERVICE } from './interfaces/elevated-access.interface';
export type { IElevatedAccessService } from './interfaces/elevated-access.interface';

// Story 2.4: Audit Interface (local copy for auth module)
export { AUDIT_SERVICE, AuditAction } from './interfaces/audit.interface';
export type { IAuditService, AuditLogEntry } from './interfaces/audit.interface';

// DTOs - Verify Password (Story 2.4)
export {
  verifyPasswordSchema,
  validateVerifyPasswordInput,
} from './dto/verify-password.dto';
export type { VerifyPasswordDto } from './dto/verify-password.dto';
export {
  verifyPasswordResponseSchema,
  VERIFY_PASSWORD_MESSAGES,
  VerifyPasswordErrorCode,
} from './dto/verify-password-response.dto';
export type {
  VerifyPasswordResponse,
  VerifyPasswordResponseDto,
} from './dto/verify-password-response.dto';
