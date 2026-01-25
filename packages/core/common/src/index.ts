/**
 * @kgc/common - Shared utilities, guards, and interfaces
 *
 * This package provides shared code that breaks circular dependencies
 * between @kgc/auth and @kgc/users.
 */

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';

// Interfaces - Constants (values)
export {
  AUTH_SERVICE,
  ELEVATED_ACCESS_SERVICE,
  USER_LOOKUP_SERVICE,
} from './interfaces/auth.interface';

// Interfaces - Types
export type {
  IAuthService,
  IElevatedAccessService,
  IUserLookup,
  UserForAuth,
} from './interfaces/auth.interface';

// Request interfaces - Types
export type { AuthenticatedRequest, JwtUser } from './interfaces/request.interface';

// Utilities
export { parseBooleanParam, parseDateParam, parseIntParam } from './utils/query-params';
