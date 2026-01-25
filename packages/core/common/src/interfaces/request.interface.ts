/**
 * @kgc/common - Request interfaces
 * Shared interfaces for authenticated requests
 */

/**
 * User payload in JWT token
 */
export interface JwtUser {
  id: string;
  tenantId: string;
  role: string;
  email?: string;
}

/**
 * Authenticated request with user payload
 * Use this interface in all controllers instead of defining it locally
 */
export interface AuthenticatedRequest {
  user: JwtUser;
}
