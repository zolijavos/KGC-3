import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import type { IAuditRepository } from '../interfaces/audit.interface';
import type {
  AuditEntry,
  CreateAuditEntryInput,
  AuditQueryOptions,
  AuditQueryResult,
  AuditEntityType,
} from '../interfaces/audit.interface';

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');

/**
 * Audit-specific error codes for programmatic handling
 */
export const AUDIT_ERROR_CODES = {
  OVERRIDE_REASON_REQUIRED: 'AUDIT_OVERRIDE_REASON_REQUIRED',
  INVALID_ENTITY_TYPE: 'AUDIT_INVALID_ENTITY_TYPE',
  ENTRY_NOT_FOUND: 'AUDIT_ENTRY_NOT_FOUND',
} as const;

/**
 * Input for logRead helper (GDPR Article 15 - access logging)
 */
interface LogReadInput {
  tenantId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  /** Fields that were accessed */
  accessedFields?: string[];
  /** Reason for data access */
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for logCreate helper
 */
interface LogCreateInput {
  tenantId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  after: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for logUpdate helper
 */
interface LogUpdateInput {
  tenantId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for logDelete helper
 */
interface LogDeleteInput {
  tenantId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for logOverride helper (FR70)
 */
interface LogOverrideInput {
  tenantId: string;
  userId: string;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit Service - Core audit logging functionality
 * FR65: Audit napló létrehozás
 * FR66: Audit rekord struktúra
 * FR70: Bérleti díj felülírás validáció audit naplóval
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly repository: IAuditRepository
  ) {}

  /**
   * Create a single audit log entry
   */
  async log(input: CreateAuditEntryInput): Promise<AuditEntry> {
    return this.repository.create(input);
  }

  /**
   * Create multiple audit log entries in batch
   */
  async logBatch(inputs: CreateAuditEntryInput[]): Promise<AuditEntry[]> {
    return this.repository.createMany(inputs);
  }

  /**
   * Find audit entry by ID
   */
  async findById(id: string, tenantId: string): Promise<AuditEntry | null> {
    return this.repository.findById(id, tenantId);
  }

  /**
   * Query audit entries with filters and pagination
   */
  async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    return this.repository.query(options);
  }

  /**
   * Get complete audit history for an entity
   */
  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    tenantId: string
  ): Promise<AuditEntry[]> {
    return this.repository.findByEntity(entityType, entityId, tenantId);
  }

  /**
   * Count audit entries matching query
   */
  async count(options: Omit<AuditQueryOptions, 'limit' | 'offset'>): Promise<number> {
    return this.repository.count(options);
  }

  /**
   * Helper method for READ actions (GDPR Article 15 - access logging)
   * Required for tracking who accessed PII data and when
   */
  async logRead(input: LogReadInput): Promise<AuditEntry> {
    const entry: CreateAuditEntryInput = {
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'READ',
      entityType: input.entityType,
      entityId: input.entityId,
    };
    if (input.reason !== undefined) {
      entry.reason = input.reason;
    }
    if (input.ipAddress !== undefined) {
      entry.ipAddress = input.ipAddress;
    }
    if (input.userAgent !== undefined) {
      entry.userAgent = input.userAgent;
    }
    entry.metadata = {
      ...input.metadata,
      accessedFields: input.accessedFields,
    };
    return this.repository.create(entry);
  }

  /**
   * Helper method for CREATE actions
   */
  async logCreate(input: LogCreateInput): Promise<AuditEntry> {
    const entry: CreateAuditEntryInput = {
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'CREATE',
      entityType: input.entityType,
      entityId: input.entityId,
      changes: {
        after: input.after,
      },
    };
    if (input.ipAddress !== undefined) {
      entry.ipAddress = input.ipAddress;
    }
    if (input.userAgent !== undefined) {
      entry.userAgent = input.userAgent;
    }
    if (input.metadata !== undefined) {
      entry.metadata = input.metadata;
    }
    return this.repository.create(entry);
  }

  /**
   * Helper method for UPDATE actions
   */
  async logUpdate(input: LogUpdateInput): Promise<AuditEntry> {
    const changedFields = this.computeChangedFields(input.before, input.after);

    const entry: CreateAuditEntryInput = {
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'UPDATE',
      entityType: input.entityType,
      entityId: input.entityId,
      changes: {
        before: input.before,
        after: input.after,
        fields: changedFields,
      },
    };
    if (input.reason !== undefined) {
      entry.reason = input.reason;
    }
    if (input.ipAddress !== undefined) {
      entry.ipAddress = input.ipAddress;
    }
    if (input.userAgent !== undefined) {
      entry.userAgent = input.userAgent;
    }
    if (input.metadata !== undefined) {
      entry.metadata = input.metadata;
    }
    return this.repository.create(entry);
  }

  /**
   * Helper method for DELETE actions
   */
  async logDelete(input: LogDeleteInput): Promise<AuditEntry> {
    const entry: CreateAuditEntryInput = {
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'DELETE',
      entityType: input.entityType,
      entityId: input.entityId,
      changes: {
        before: input.before,
      },
    };
    if (input.reason !== undefined) {
      entry.reason = input.reason;
    }
    if (input.ipAddress !== undefined) {
      entry.ipAddress = input.ipAddress;
    }
    if (input.userAgent !== undefined) {
      entry.userAgent = input.userAgent;
    }
    if (input.metadata !== undefined) {
      entry.metadata = input.metadata;
    }
    return this.repository.create(entry);
  }

  /**
   * Helper method for OVERRIDE actions (FR70)
   * Requires mandatory reason for audit trail
   */
  async logOverride(input: LogOverrideInput): Promise<AuditEntry> {
    if (!input.reason || input.reason.trim() === '') {
      throw new BadRequestException({
        message: 'Reason is required for OVERRIDE action',
        errorCode: AUDIT_ERROR_CODES.OVERRIDE_REASON_REQUIRED,
      });
    }

    const changedFields = this.computeChangedFields(input.before, input.after);

    const entry: CreateAuditEntryInput = {
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'OVERRIDE',
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      changes: {
        before: input.before,
        after: input.after,
        fields: changedFields,
      },
    };
    if (input.ipAddress !== undefined) {
      entry.ipAddress = input.ipAddress;
    }
    if (input.userAgent !== undefined) {
      entry.userAgent = input.userAgent;
    }
    if (input.metadata !== undefined) {
      entry.metadata = input.metadata;
    }
    return this.repository.create(entry);
  }

  /**
   * Get user activity within date range
   */
  async getUserActivity(
    userId: string,
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditQueryResult> {
    const options: AuditQueryOptions = {
      tenantId,
      userId,
      limit: 100,
      offset: 0,
      orderBy: 'timestamp',
      orderDirection: 'desc',
    };
    if (startDate !== undefined) {
      options.startDate = startDate;
    }
    if (endDate !== undefined) {
      options.endDate = endDate;
    }
    return this.repository.query(options);
  }

  /**
   * Compute which fields changed between before and after states
   */
  private computeChangedFields(
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): string[] {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}
