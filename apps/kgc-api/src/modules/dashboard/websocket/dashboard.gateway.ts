import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  DashboardAuthenticatedSocket,
  DashboardClientEvent,
  DashboardServerEvent,
  DashboardUserConnection,
  DashboardUserRole,
  GetMissedEventsRequest,
  getRoomForRole,
  getTenantRoom,
} from './dashboard-events.interface';
import { DashboardEventsService } from './dashboard-events.service';

/**
 * Maximum concurrent connections per tenant
 */
const MAX_CONNECTIONS_PER_TENANT = 50;

/**
 * Dashboard WebSocket Gateway
 * Story 35-7: WebSocket Real-Time Events
 *
 * Handles real-time event delivery to dashboard clients.
 * Implements:
 * - AC1: WebSocket Connection Management
 * - AC5: Role-Based Event Filtering
 * - AC6: Offline Queue & Reconnect
 * - AC7: Tenant Isolation
 */
@WebSocketGateway({
  namespace: '/ws/dashboard',
  cors: {
    origin: process.env['CORS_ALLOWED_ORIGINS']?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  },
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  /** Track connected users: Map<userId, DashboardUserConnection> */
  private connectedUsers = new Map<string, DashboardUserConnection>();

  /** Track socket to user mapping: Map<socketId, userId> */
  private socketToUser = new Map<string, string>();

  /** Track connections per tenant for rate limiting */
  private tenantConnectionCounts = new Map<string, number>();

  constructor(private readonly eventsService: DashboardEventsService) {}

  /**
   * Initialize gateway and pass server reference to events service
   */
  afterInit(server: Server): void {
    this.eventsService.setServer(server);
    this.logger.log('Dashboard WebSocket Gateway initialized at /ws/dashboard');
  }

  /**
   * Handle new WebSocket connection (AC1)
   *
   * Authentication flow:
   * 1. Extract userId, tenantId, role from handshake auth/query
   * 2. Validate required fields
   * 3. Check tenant connection limits
   * 4. Join appropriate rooms based on role
   * 5. Send connection status and any missed events
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Extract auth data from handshake
      // In production, this would come from JWT middleware
      const { userId, tenantId, role } = this.extractAuthData(client);

      if (!userId || !tenantId || !role) {
        this.logger.warn(`Unauthorized connection attempt: ${client.id} - missing credentials`);
        client.emit(DashboardServerEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Missing authentication credentials',
        });
        client.disconnect();
        return;
      }

      // Validate role
      if (!Object.values(DashboardUserRole).includes(role as DashboardUserRole)) {
        this.logger.warn(`Invalid role: ${role} for socket ${client.id}`);
        client.emit(DashboardServerEvent.ERROR, {
          code: 'INVALID_ROLE',
          message: 'Invalid user role',
        });
        client.disconnect();
        return;
      }

      // Check tenant connection limit (AC7)
      const currentCount = this.tenantConnectionCounts.get(tenantId) ?? 0;
      if (currentCount >= MAX_CONNECTIONS_PER_TENANT) {
        this.logger.warn(
          `Tenant ${tenantId} connection limit reached (${MAX_CONNECTIONS_PER_TENANT})`
        );
        client.emit(DashboardServerEvent.ERROR, {
          code: 'CONNECTION_LIMIT',
          message: 'Maximum connections reached for this tenant',
        });
        client.disconnect();
        return;
      }

      // Track connection
      const connection: DashboardUserConnection = {
        socketId: client.id,
        userId,
        tenantId,
        role: role as DashboardUserRole,
        connectedAt: new Date(),
        lastActivityAt: new Date(),
      };

      this.connectedUsers.set(userId, connection);
      this.socketToUser.set(client.id, userId);
      this.tenantConnectionCounts.set(tenantId, currentCount + 1);

      // Store auth data on socket for later use
      (client as unknown as DashboardAuthenticatedSocket).data = {
        userId,
        tenantId,
        role: role as DashboardUserRole,
      };

      // Join rooms based on role (AC5)
      const rooms = getRoomForRole(tenantId, role as DashboardUserRole);
      for (const room of rooms) {
        await client.join(room);
      }

      // Send connection status
      client.emit(DashboardServerEvent.CONNECTION_STATUS, {
        status: 'connected',
        userId,
        tenantId,
        role,
        connectedAt: connection.connectedAt.toISOString(),
      });

      this.logger.log(
        `User connected: ${userId} (socket: ${client.id}, role: ${role}, tenant: ${tenantId})`
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.emit(DashboardServerEvent.ERROR, {
        code: 'CONNECTION_ERROR',
        message: 'Failed to establish connection',
      });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection (AC1)
   *
   * Cleanup:
   * 1. Remove from tracking maps
   * 2. Decrement tenant connection count
   * 3. Leave all rooms
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      const connection = this.connectedUsers.get(userId);

      if (connection) {
        // Decrement tenant connection count
        const currentCount = this.tenantConnectionCounts.get(connection.tenantId) ?? 1;
        if (currentCount <= 1) {
          this.tenantConnectionCounts.delete(connection.tenantId);
        } else {
          this.tenantConnectionCounts.set(connection.tenantId, currentCount - 1);
        }
      }

      // Clean up tracking
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(client.id);

      this.logger.log(`User disconnected: ${userId}`);
    }
  }

  /**
   * Handle subscription request
   * Client can subscribe to specific event types
   */
  @SubscribeMessage(DashboardClientEvent.SUBSCRIBE)
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventTypes?: string[] }
  ): Promise<{ success: boolean; subscribedTo: string[] }> {
    const authClient = client as unknown as DashboardAuthenticatedSocket;
    const { tenantId, role } = authClient.data;

    if (!tenantId || !role) {
      return { success: false, subscribedTo: [] };
    }

    // TODO: Use data.eventTypes for filtering when implementing fine-grained subscriptions
    void data;

    // Update last activity
    const connection = this.connectedUsers.get(authClient.data.userId);
    if (connection) {
      connection.lastActivityAt = new Date();
    }

    // Get rooms for role
    const rooms = getRoomForRole(tenantId, role);

    this.logger.debug(`User ${authClient.data.userId} subscribed to rooms: ${rooms.join(', ')}`);

    return { success: true, subscribedTo: rooms };
  }

  /**
   * Handle missed events request (AC6)
   * When client reconnects, it can request events since last connection
   */
  @SubscribeMessage(DashboardClientEvent.GET_MISSED_EVENTS)
  async handleGetMissedEvents(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetMissedEventsRequest
  ): Promise<{ success: boolean; events: unknown[]; hasMore: boolean }> {
    const authClient = client as unknown as DashboardAuthenticatedSocket;
    const { tenantId, role, userId } = authClient.data;

    if (!tenantId || !role) {
      return { success: false, events: [], hasMore: false };
    }

    try {
      const since = new Date(data.since);

      // Validate timestamp
      if (isNaN(since.getTime())) {
        this.logger.warn(`Invalid since timestamp from user ${userId}: ${data.since}`);
        return { success: false, events: [], hasMore: false };
      }

      // Get queued events filtered by role
      const events = this.eventsService.getQueuedEvents(tenantId, role, since);

      this.logger.debug(
        `Returning ${events.length} missed events to user ${userId} since ${data.since}`
      );

      return {
        success: true,
        events,
        hasMore: events.length >= 50, // Max queue size
      };
    } catch (error) {
      this.logger.error(`Get missed events error: ${error}`);
      return { success: false, events: [], hasMore: false };
    }
  }

  /**
   * Extract authentication data from socket handshake
   * In production, this would validate JWT and extract claims
   */
  private extractAuthData(client: Socket): {
    userId: string | undefined;
    tenantId: string | undefined;
    role: string | undefined;
  } {
    // Try auth object first (preferred)
    const auth = client.handshake.auth as Record<string, unknown>;
    if (auth?.userId && auth?.tenantId && auth?.role) {
      return {
        userId: String(auth.userId),
        tenantId: String(auth.tenantId),
        role: String(auth.role),
      };
    }

    // Fallback to query params (for testing)
    const query = client.handshake.query;
    return {
      userId: query['userId'] as string | undefined,
      tenantId: query['tenantId'] as string | undefined,
      role: query['role'] as string | undefined,
    };
  }

  /**
   * Get online users count for a tenant
   */
  getOnlineUsersCount(tenantId: string): number {
    return this.tenantConnectionCounts.get(tenantId) ?? 0;
  }

  /**
   * Get all connected users for a tenant
   */
  getConnectedUsers(tenantId: string): DashboardUserConnection[] {
    const users: DashboardUserConnection[] = [];

    for (const connection of this.connectedUsers.values()) {
      if (connection.tenantId === tenantId) {
        users.push(connection);
      }
    }

    return users;
  }

  /**
   * Check if a specific user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get connection info for a user
   */
  getConnectionInfo(userId: string): DashboardUserConnection | undefined {
    return this.connectedUsers.get(userId);
  }

  /**
   * Broadcast a custom event to a specific user
   * Used by other services for targeted notifications
   */
  sendToUser(userId: string, event: string, data: unknown): boolean {
    const connection = this.connectedUsers.get(userId);
    if (!connection) {
      return false;
    }

    this.server.to(connection.socketId).emit(event, data);
    return true;
  }

  /**
   * Broadcast to all users in a tenant
   */
  broadcastToTenant(tenantId: string, event: string, data: unknown): void {
    const room = getTenantRoom(tenantId);
    this.server.to(room).emit(event, data);
  }

  /**
   * Graceful shutdown - notify clients and close connections
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Dashboard Gateway shutting down, notifying connected clients...');

    // Notify all connected clients about shutdown
    for (const [userId, connection] of this.connectedUsers) {
      try {
        this.server.to(connection.socketId).emit(DashboardServerEvent.CONNECTION_STATUS, {
          status: 'server_shutdown',
          message: 'Server is shutting down, please reconnect shortly',
        });
      } catch (error) {
        this.logger.debug(`Failed to notify user ${userId} about shutdown: ${error}`);
      }
    }

    // Clear tracking maps
    this.connectedUsers.clear();
    this.socketToUser.clear();
    this.tenantConnectionCounts.clear();

    this.logger.log('Dashboard Gateway shutdown complete');
  }
}
