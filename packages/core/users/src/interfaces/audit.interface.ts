/**
 * Audit Service Interface
 * Story 2.1: User CRUD Operations - AC6 Requirement
 *
 * Stub interface for audit logging. Will be implemented in Epic 6.
 * Allows tracking of denied actions per AC6: "audit log: DENIED action"
 */

/**
 * Audit action types for user operations
 */
export enum AuditAction {
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_CREATE_DENIED = 'USER_CREATE_DENIED',
  USER_UPDATE_DENIED = 'USER_UPDATE_DENIED',
  ROLE_ASSIGNMENT_DENIED = 'ROLE_ASSIGNMENT_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  // Story 2.3: Permission Check Middleware
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  // Story 2.4: Elevated Access Requirement
  ELEVATED_ACCESS_GRANTED = 'ELEVATED_ACCESS_GRANTED',
  ELEVATED_ACCESS_DENIED = 'ELEVATED_ACCESS_DENIED',
  // Story 2.5: Tenant és Location Scoped Permissions
  SCOPE_GRANTED = 'SCOPE_GRANTED',
  SCOPE_DENIED = 'SCOPE_DENIED',
  // Story 2.6: User Profile Management
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_PIN_CHANGED = 'USER_PIN_CHANGED',
  USER_PIN_FAILED = 'USER_PIN_FAILED', // Failed PIN/password verification attempt
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  action: AuditAction;
  userId: string; // User performing the action
  targetId?: string; // Target user ID (if applicable) - deprecated, use resourceId
  resourceType?: string; // Resource type (e.g., 'USER', 'ROLE')
  resourceId?: string; // Resource ID
  tenantId: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Audit Service Interface
 * To be implemented in Epic 6: Audit Trail (@kgc/audit)
 */
export interface IAuditService {
  /**
   * Log an audit event
   * @param entry - Audit log entry
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void>;
}

/**
 * Injection token for AuditService
 */
export const AUDIT_SERVICE = 'AUDIT_SERVICE';
