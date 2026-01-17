/**
 * User Interfaces
 * Story 2.1: User CRUD Operations
 *
 * Defines core user-related types used throughout the users module.
 * Based on ADR-032 RBAC Architecture.
 */

/**
 * User roles per ADR-032 RBAC Architecture (8 roles)
 * Level determines role hierarchy for permission checks
 */
export enum Role {
  OPERATOR = 'OPERATOR', // Level 1 - Pultos / Értékesítő
  TECHNIKUS = 'TECHNIKUS', // Level 2 - Szerviz technikus
  BOLTVEZETO = 'BOLTVEZETO', // Level 3 - Boltvezető
  ACCOUNTANT = 'ACCOUNTANT', // Level 3 - Könyvelő
  PARTNER_OWNER = 'PARTNER_OWNER', // Level 4 - Franchise Partner Tulajdonos
  CENTRAL_ADMIN = 'CENTRAL_ADMIN', // Level 5 - Központi Admin
  DEVOPS_ADMIN = 'DEVOPS_ADMIN', // Level 6 - DevOps / IT Admin
  SUPER_ADMIN = 'SUPER_ADMIN', // Level 8 - Rendszergazda (KGC HQ)
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', // Soft deleted users
  LOCKED = 'LOCKED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

/**
 * User entity interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  locationId?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedEmail?: string | null;
}

/**
 * User response DTO (without sensitive fields)
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  locationId?: string | null;
  status: UserStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * User list response with pagination
 */
export interface UserListResponse {
  data: UserResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Single user response wrapper
 */
export interface SingleUserResponse {
  data: UserResponse;
}

/**
 * Delete user response
 */
export interface DeleteUserResponse {
  data: {
    success: boolean;
    message: string;
  };
}

/**
 * Error response structure (consistent with Epic 1)
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/**
 * User error codes
 */
export enum UserErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 400
  USER_NOT_FOUND = 'USER_NOT_FOUND', // 404
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS', // 409
  ROLE_HIERARCHY_VIOLATION = 'ROLE_HIERARCHY_VIOLATION', // 403
  UNAUTHORIZED = 'UNAUTHORIZED', // 401
  FORBIDDEN = 'FORBIDDEN', // 403
}
