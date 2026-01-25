/**
 * Auth Interfaces - Shared interfaces to break circular dependency
 *
 * These interfaces allow @kgc/auth and @kgc/users to communicate
 * without directly importing each other.
 */

/**
 * Interface for authentication service token operations
 * Implemented by @kgc/auth AuthService
 * Used by @kgc/users for token revocation on user changes
 */
export interface IAuthService {
  /**
   * Revoke all tokens for a user (on password change, role change, etc.)
   * @param userId - User ID whose tokens should be revoked
   */
  revokeAllUserTokens(userId: string): Promise<void>;

  /**
   * Validate a JWT token
   * @param token - JWT token to validate
   * @returns true if valid, false otherwise
   */
  validateToken?(token: string): Promise<boolean>;
}

/**
 * Injection token for IAuthService
 */
export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

/**
 * Interface for user lookup operations
 * Implemented by @kgc/users UsersService
 * Used by @kgc/auth for login user lookup
 */
export interface IUserLookup {
  /**
   * Find user by email for authentication
   * @param email - User email address
   * @returns User with password hash or null if not found
   */
  findByEmail(email: string): Promise<UserForAuth | null>;

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User or null if not found
   */
  findById(id: string): Promise<UserForAuth | null>;
}

/**
 * Injection token for IUserLookup
 */
export const USER_LOOKUP_SERVICE = Symbol('USER_LOOKUP_SERVICE');

/**
 * User data required for authentication
 * Minimal interface used by auth service
 */
export interface UserForAuth {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  tenantId: string;
  status: string;
  pinHash?: string | null;
  locationId?: string | null;
}

/**
 * Interface for elevated access operations
 * Implemented by @kgc/users ElevatedAccessService
 * Used by @kgc/auth for PIN login scenarios
 */
export interface IElevatedAccessService {
  /**
   * Check if device is trusted for a user
   * @param userId - User ID
   * @param deviceId - Device identifier
   * @returns true if device is trusted
   */
  isDeviceTrusted(userId: string, deviceId: string): Promise<boolean>;

  /**
   * Register a trusted device for a user
   * @param userId - User ID
   * @param deviceId - Device identifier
   * @param deviceName - Human-readable device name
   */
  registerTrustedDevice(userId: string, deviceId: string, deviceName: string): Promise<void>;
}

/**
 * Injection token for IElevatedAccessService
 */
export const ELEVATED_ACCESS_SERVICE = Symbol('ELEVATED_ACCESS_SERVICE');
