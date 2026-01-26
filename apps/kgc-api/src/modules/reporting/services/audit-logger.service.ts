/**
 * Audit Logger Service
 * Epic 27: Reporting Engine
 *
 * Logs reporting actions for audit trail.
 */

import { IWidgetAuditService } from '@kgc/reporting';
import { Injectable, Logger } from '@nestjs/common';

interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class AuditLoggerService implements IWidgetAuditService {
  private readonly logger = new Logger(AuditLoggerService.name);
  private readonly auditLog: AuditEntry[] = [];

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const auditEntry: AuditEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.auditLog.push(auditEntry);

    this.logger.log(
      `[AUDIT] ${entry.action} | ${entry.entityType}:${entry.entityId} | user:${entry.userId} | tenant:${entry.tenantId}`
    );

    if (entry.metadata) {
      this.logger.debug(`[AUDIT] Metadata: ${JSON.stringify(entry.metadata)}`);
    }
  }

  // Query methods for admin/debugging
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  getAuditLogByTenant(tenantId: string): AuditEntry[] {
    return this.auditLog.filter(e => e.tenantId === tenantId);
  }

  getAuditLogByUser(userId: string): AuditEntry[] {
    return this.auditLog.filter(e => e.userId === userId);
  }

  getAuditLogByAction(action: string): AuditEntry[] {
    return this.auditLog.filter(e => e.action === action);
  }

  clearAuditLog(): void {
    this.auditLog.length = 0;
  }
}
