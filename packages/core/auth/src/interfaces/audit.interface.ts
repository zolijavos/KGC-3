/**
 * Audit Service Interface (Local Copy for @kgc/auth)
 * Story 2.4: Elevated Access Requirement
 *
 * Local interface to avoid circular dependency issues with @kgc/users.
 * The actual implementation is in @kgc/users (Epic 6: Audit Trail).
 */

/**
 * Audit action types (subset used by auth module)
 */
export enum AuditAction {
  // Story 2.4: Elevated Access
  ELEVATED_ACCESS_GRANTED = 'ELEVATED_ACCESS_GRANTED',
  ELEVATED_ACCESS_DENIED = 'ELEVATED_ACCESS_DENIED',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  tenantId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Audit Service Interface
 */
export interface IAuditService {
  log(entry: AuditLogEntry): Promise<void>;
}

/**
 * Injection token for AuditService
 */
export const AUDIT_SERVICE = 'AUDIT_SERVICE';
