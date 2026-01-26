/**
 * In-Memory Service Implementations
 * Epic 25: Equipment-Service Integration
 *
 * Mock services for audit logging and notifications
 */

import { IAuditService, INotificationService } from '@kgc/bergep-szerviz';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryAuditService implements IAuditService {
  private logs: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }> = [];

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logs.push({
      ...entry,
      timestamp: new Date(),
    });
    console.log(
      `[AUDIT] ${entry.action} - ${entry.entityType}:${entry.entityId} by ${entry.userId}`
    );
  }

  // Helper for tests
  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

@Injectable()
export class InMemoryNotificationService implements INotificationService {
  private notifications: Array<{
    tenantId: string;
    type: string;
    recipientId?: string;
    message: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }> = [];

  async notify(params: {
    tenantId: string;
    type: string;
    recipientId?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.notifications.push({
      ...params,
      timestamp: new Date(),
    });
    console.log(`[NOTIFICATION] ${params.type}: ${params.message}`);
  }

  // Helper for tests
  getNotifications(): typeof this.notifications {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications = [];
  }
}
