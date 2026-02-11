import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  DashboardEvent,
  DashboardServerEvent,
  DashboardUserRole,
  EVENT_ROLE_VISIBILITY,
  PaymentErrorEvent,
  RentalCreatedEvent,
  StockAlertEvent,
  getManagerRoom,
  getOperatorRoom,
  getTenantRoom,
} from './dashboard-events.interface';

/**
 * Maximum events to queue per tenant for offline users
 */
const MAX_QUEUE_SIZE = 50;

/**
 * Queue TTL in milliseconds (5 minutes)
 */
const QUEUE_TTL_MS = 5 * 60 * 1000;

/**
 * Queued event with expiration
 */
interface QueuedEvent {
  event: DashboardEvent;
  expiresAt: number;
}

/**
 * Dashboard Events Service
 * Story 35-7: WebSocket Real-Time Events
 *
 * Handles broadcasting of real-time events to connected dashboard clients.
 * Implements:
 * - Role-based event filtering (AC5)
 * - Tenant isolation (AC7)
 * - Event queue for offline users (AC6)
 */
@Injectable()
export class DashboardEventsService {
  private readonly logger = new Logger(DashboardEventsService.name);

  /** Socket.io server reference - set by gateway */
  private server: Server | null = null;

  /** In-memory event queue per tenant (Redis in production) */
  private eventQueues = new Map<string, QueuedEvent[]>();

  /**
   * Set the Socket.io server reference
   * Called by DashboardGateway on init
   */
  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Socket.io server reference set');
  }

  /**
   * Broadcast stock alert event (AC2)
   *
   * @param tenantId - Target tenant
   * @param data - Stock alert data
   */
  async broadcastStockAlert(tenantId: string, data: StockAlertEvent['data']): Promise<void> {
    const event: StockAlertEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'stock_alert',
      data,
    };

    this.logger.log(
      `Broadcasting stock alert: ${data.productName} (qty: ${data.currentQuantity}, threshold: ${data.threshold})`
    );

    // Stock alerts go to ALL users (operators, managers, admins)
    await this.broadcastToTenant(tenantId, DashboardServerEvent.STOCK_ALERT, event);

    // Also queue for offline users
    this.queueEvent(tenantId, event);
  }

  /**
   * Broadcast payment error event (AC3)
   *
   * @param tenantId - Target tenant
   * @param data - Payment error data
   */
  async broadcastPaymentError(tenantId: string, data: PaymentErrorEvent['data']): Promise<void> {
    const event: PaymentErrorEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'payment_error',
      data,
    };

    this.logger.warn(
      `Broadcasting payment error: ${data.errorCode} - ${data.errorMessage} (tx: ${data.transactionId})`
    );

    // Payment errors only go to managers/admins
    await this.broadcastToManagers(tenantId, DashboardServerEvent.PAYMENT_ERROR, event);

    // Queue for offline managers
    this.queueEvent(tenantId, event);
  }

  /**
   * Broadcast rental created event (AC4)
   *
   * @param tenantId - Target tenant
   * @param data - Rental created data
   */
  async broadcastRentalCreated(tenantId: string, data: RentalCreatedEvent['data']): Promise<void> {
    const event: RentalCreatedEvent = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'rental_created',
      data,
    };

    this.logger.log(
      `Broadcasting rental created: ${data.partnerName} - ${data.equipmentCount} items`
    );

    // Rental events only go to managers/admins
    await this.broadcastToManagers(tenantId, DashboardServerEvent.RENTAL_CREATED, event);

    // Queue for offline managers
    this.queueEvent(tenantId, event);
  }

  /**
   * Get queued events for reconnecting user (AC6)
   *
   * @param tenantId - User's tenant
   * @param role - User's role (for filtering)
   * @param since - Timestamp to get events after
   * @returns Filtered events since timestamp
   */
  getQueuedEvents(tenantId: string, role: DashboardUserRole, since: Date): DashboardEvent[] {
    const queue = this.eventQueues.get(tenantId) ?? [];
    const sinceMs = since.getTime();
    const now = Date.now();

    // Filter: not expired, after since timestamp, visible to role
    return queue
      .filter(q => {
        // Check expiration
        if (q.expiresAt < now) return false;

        // Check timestamp
        const eventTime = new Date(q.event.timestamp).getTime();
        if (eventTime <= sinceMs) return false;

        // Check role visibility
        const allowedRoles = EVENT_ROLE_VISIBILITY[q.event.type];
        return allowedRoles.includes(role);
      })
      .map(q => q.event);
  }

  /**
   * Check if user role can see event type (AC5)
   */
  canRoleSeeEvent(role: DashboardUserRole, eventType: DashboardEvent['type']): boolean {
    const allowedRoles = EVENT_ROLE_VISIBILITY[eventType];
    return allowedRoles.includes(role);
  }

  /**
   * Broadcast to all users in tenant (stock alerts)
   */
  private async broadcastToTenant(
    tenantId: string,
    eventName: DashboardServerEvent,
    event: DashboardEvent
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Socket.io server not initialized, event not broadcast');
      return;
    }

    // Validate tenant isolation (AC7)
    if (!tenantId) {
      this.logger.error('Tenant ID missing, event not broadcast');
      return;
    }

    // Broadcast to tenant room
    const room = getTenantRoom(tenantId);
    this.server.to(room).emit(eventName, event);

    // Also broadcast to operator room (they're in both rooms)
    const operatorRoom = getOperatorRoom(tenantId);
    this.server.to(operatorRoom).emit(eventName, event);

    // Also broadcast to manager room
    const managerRoom = getManagerRoom(tenantId);
    this.server.to(managerRoom).emit(eventName, event);

    this.logger.debug(`Event ${eventName} broadcast to tenant ${tenantId}`);
  }

  /**
   * Broadcast to managers/admins only (payment errors, rental created)
   */
  private async broadcastToManagers(
    tenantId: string,
    eventName: DashboardServerEvent,
    event: DashboardEvent
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Socket.io server not initialized, event not broadcast');
      return;
    }

    // Validate tenant isolation (AC7)
    if (!tenantId) {
      this.logger.error('Tenant ID missing, event not broadcast');
      return;
    }

    // Only broadcast to manager room
    const room = getManagerRoom(tenantId);
    this.server.to(room).emit(eventName, event);

    this.logger.debug(`Event ${eventName} broadcast to managers in tenant ${tenantId}`);
  }

  /**
   * Queue event for offline users (AC6)
   */
  private queueEvent(tenantId: string, event: DashboardEvent): void {
    let queue = this.eventQueues.get(tenantId);

    if (!queue) {
      queue = [];
      this.eventQueues.set(tenantId, queue);
    }

    // Add event with TTL
    queue.push({
      event,
      expiresAt: Date.now() + QUEUE_TTL_MS,
    });

    // Enforce max queue size
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest
    }

    // Clean up expired events periodically
    this.cleanupExpiredEvents(tenantId);
  }

  /**
   * Remove expired events from queue
   */
  private cleanupExpiredEvents(tenantId: string): void {
    const queue = this.eventQueues.get(tenantId);
    if (!queue) return;

    const now = Date.now();
    const filtered = queue.filter(q => q.expiresAt > now);

    if (filtered.length !== queue.length) {
      this.eventQueues.set(tenantId, filtered);
      this.logger.debug(
        `Cleaned up ${queue.length - filtered.length} expired events for tenant ${tenantId}`
      );
    }
  }

  /**
   * Clear all queued events for a tenant
   * Used for testing or manual cleanup
   */
  clearQueue(tenantId: string): void {
    this.eventQueues.delete(tenantId);
    this.logger.debug(`Cleared event queue for tenant ${tenantId}`);
  }

  /**
   * Get queue stats for monitoring
   */
  getQueueStats(): { tenantId: string; count: number }[] {
    const stats: { tenantId: string; count: number }[] = [];

    for (const [tenantId, queue] of this.eventQueues) {
      stats.push({ tenantId, count: queue.length });
    }

    return stats;
  }
}
