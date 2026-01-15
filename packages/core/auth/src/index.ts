/**
 * @kgc/auth - Authentication Module
 * Story 1.1: JWT Login Endpoint
 *
 * Exports:
 * - AuthModule: NestJS module for authentication
 * - AuthService: Business logic for login
 * - PasswordService: bcrypt password hashing
 * - TokenService: JWT token generation/validation
 * - Guards: JwtAuthGuard, LoginThrottlerGuard
 * - DTOs: LoginDto, LoginResponseDto
 * - Interfaces: JwtPayload, UserForToken
 */

// Module
export { AuthModule } from './auth.module';
export type { AuthModuleOptions } from './auth.module';

// Services
export { AuthService } from './auth.service';
export { PasswordService } from './services/password.service';
export { TokenService } from './services/token.service';

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

// Interfaces
export type {
  ErrorResponse,
  JwtPayload,
  LoginResponse,
  TokenServiceOptions,
  UserForToken,
} from './interfaces/jwt-payload.interface';
