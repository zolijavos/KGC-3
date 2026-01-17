/**
 * Audit Trail Interfaces
 * FR65: Audit napló létrehozás
 * FR66: Audit rekord struktúra
 */

/**
 * Audit action types
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'OVERRIDE'
  | 'ARCHIVE';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'USER'
  | 'TENANT'
  | 'PARTNER'
  | 'RENTAL'
  | 'RENTAL_EQUIPMENT'
  | 'SERVICE_ORDER'
  | 'INVOICE'
  | 'PAYMENT'
  | 'PRODUCT'
  | 'INVENTORY'
  | 'CONFIG'
  | 'LICENSE'
  | 'FEATURE_FLAG';

/**
 * Audit log entry structure (FR66)
 */
export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Before/after state changes
 */
export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[];
}

/**
 * Input for creating an audit entry
 */
export interface CreateAuditEntryInput {
  tenantId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
}

/**
 * Query options for audit log retrieval
 */
export interface AuditQueryOptions {
  tenantId: string;
  userId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'action' | 'entityType';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated audit result
 */
export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Audit repository interface for dependency injection
 */
export interface IAuditRepository {
  /**
   * Create a single audit entry
   */
  create(entry: CreateAuditEntryInput): Promise<AuditEntry>;

  /**
   * Create multiple audit entries in batch
   */
  createMany(entries: CreateAuditEntryInput[]): Promise<AuditEntry[]>;

  /**
   * Find audit entry by ID
   */
  findById(id: string, tenantId: string): Promise<AuditEntry | null>;

  /**
   * Query audit entries with filters
   */
  query(options: AuditQueryOptions): Promise<AuditQueryResult>;

  /**
   * Get audit entries for a specific entity
   */
  findByEntity(
    entityType: AuditEntityType,
    entityId: string,
    tenantId: string
  ): Promise<AuditEntry[]>;

  /**
   * Count audit entries matching query
   */
  count(options: Omit<AuditQueryOptions, 'limit' | 'offset'>): Promise<number>;

  /**
   * Delete audit entries older than a date (for retention policy)
   */
  deleteOlderThan(date: Date, tenantId?: string): Promise<number>;

  /**
   * Archive audit entries to cold storage
   */
  archive(
    startDate: Date,
    endDate: Date,
    tenantId?: string
  ): Promise<{ archivedCount: number; archiveId: string }>;
}

/**
 * Audit context for decorator usage
 */
export interface AuditContext {
  userId: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

/**
 * Decorator options for @Audited
 */
export interface AuditedOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  getEntityId?: (args: unknown[], result: unknown) => string;
  getChanges?: (args: unknown[], result: unknown) => AuditChanges | undefined;
  getReason?: (args: unknown[]) => string | undefined;
  skipOnError?: boolean;
}
