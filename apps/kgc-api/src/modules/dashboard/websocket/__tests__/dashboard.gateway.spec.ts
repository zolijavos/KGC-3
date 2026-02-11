import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardServerEvent, DashboardUserRole } from '../dashboard-events.interface';
import { DashboardEventsService } from '../dashboard-events.service';
import { DashboardGateway } from '../dashboard.gateway';

describe('DashboardGateway', () => {
  let gateway: DashboardGateway;
  let eventsService: DashboardEventsService;
  let mockServer: Server;

  beforeEach(() => {
    eventsService = new DashboardEventsService();
    gateway = new DashboardGateway(eventsService);

    // Create mock Socket.io server
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Server;

    // @ts-expect-error - directly setting private property for test
    gateway.server = mockServer;
  });

  describe('afterInit', () => {
    it('should set server reference on events service', () => {
      const setServerSpy = vi.spyOn(eventsService, 'setServer');

      gateway.afterInit(mockServer);

      expect(setServerSpy).toHaveBeenCalledWith(mockServer);
    });
  });

  describe('handleConnection', () => {
    it('should reject connection without credentials', async () => {
      const mockClient = createMockSocket({});
      const emitSpy = vi.fn();
      const disconnectSpy = vi.fn();
      mockClient.emit = emitSpy;
      mockClient.disconnect = disconnectSpy;

      await gateway.handleConnection(mockClient);

      expect(emitSpy).toHaveBeenCalledWith(DashboardServerEvent.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'Missing authentication credentials',
      });
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should reject connection with invalid role', async () => {
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: 'INVALID_ROLE' },
      });
      const emitSpy = vi.fn();
      const disconnectSpy = vi.fn();
      mockClient.emit = emitSpy;
      mockClient.disconnect = disconnectSpy;

      await gateway.handleConnection(mockClient);

      expect(emitSpy).toHaveBeenCalledWith(DashboardServerEvent.ERROR, {
        code: 'INVALID_ROLE',
        message: 'Invalid user role',
      });
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should accept valid connection and join rooms', async () => {
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      const emitSpy = vi.fn();
      const joinSpy = vi.fn();
      mockClient.emit = emitSpy;
      mockClient.join = joinSpy;

      await gateway.handleConnection(mockClient);

      // Should emit connection status
      expect(emitSpy).toHaveBeenCalledWith(
        DashboardServerEvent.CONNECTION_STATUS,
        expect.objectContaining({
          status: 'connected',
          userId: 'user-1',
          tenantId: 'tenant-1',
          role: DashboardUserRole.OPERATOR,
        })
      );

      // Should join rooms
      expect(joinSpy).toHaveBeenCalled();

      // Should track connection
      expect(gateway.isUserConnected('user-1')).toBe(true);
    });

    it('should reject connection when tenant limit reached', async () => {
      const tenantId = 'tenant-limit-test';

      // Connect 50 users to reach limit
      for (let i = 0; i < 50; i++) {
        const mockClient = createMockSocket({
          auth: { userId: `user-${i}`, tenantId, role: DashboardUserRole.OPERATOR },
        });
        mockClient.emit = vi.fn();
        mockClient.join = vi.fn();
        await gateway.handleConnection(mockClient);
      }

      // 51st connection should be rejected
      const mockClient = createMockSocket({
        auth: { userId: 'user-51', tenantId, role: DashboardUserRole.OPERATOR },
      });
      const emitSpy = vi.fn();
      const disconnectSpy = vi.fn();
      mockClient.emit = emitSpy;
      mockClient.disconnect = disconnectSpy;

      await gateway.handleConnection(mockClient);

      expect(emitSpy).toHaveBeenCalledWith(DashboardServerEvent.ERROR, {
        code: 'CONNECTION_LIMIT',
        message: 'Maximum connections reached for this tenant',
      });
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user tracking on disconnect', async () => {
      // First connect
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      mockClient.emit = vi.fn();
      mockClient.join = vi.fn();
      await gateway.handleConnection(mockClient);

      expect(gateway.isUserConnected('user-1')).toBe(true);

      // Then disconnect
      await gateway.handleDisconnect(mockClient);

      expect(gateway.isUserConnected('user-1')).toBe(false);
    });

    it('should decrement tenant connection count', async () => {
      const tenantId = 'tenant-count-test';

      // Connect two users
      const mockClient1 = createMockSocket({
        auth: { userId: 'user-1', tenantId, role: DashboardUserRole.OPERATOR },
      });
      mockClient1.emit = vi.fn();
      mockClient1.join = vi.fn();

      const mockClient2 = createMockSocket({
        auth: { userId: 'user-2', tenantId, role: DashboardUserRole.OPERATOR },
      });
      mockClient2.emit = vi.fn();
      mockClient2.join = vi.fn();

      await gateway.handleConnection(mockClient1);
      await gateway.handleConnection(mockClient2);

      expect(gateway.getOnlineUsersCount(tenantId)).toBe(2);

      // Disconnect one
      await gateway.handleDisconnect(mockClient1);

      expect(gateway.getOnlineUsersCount(tenantId)).toBe(1);
    });
  });

  describe('handleGetMissedEvents', () => {
    it('should return missed events for reconnecting user', async () => {
      // Setup: connect user and add event to queue
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      mockClient.emit = vi.fn();
      mockClient.join = vi.fn();
      await gateway.handleConnection(mockClient);

      // Add event to queue
      eventsService.setServer(mockServer);
      await eventsService.broadcastStockAlert('tenant-1', {
        productId: 'prod-1',
        productName: 'Test Product',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      // Request missed events
      const result = await gateway.handleGetMissedEvents(mockClient, {
        since: new Date(0).toISOString(),
      });

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
    });

    it('should return empty for invalid timestamp', async () => {
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      mockClient.emit = vi.fn();
      mockClient.join = vi.fn();
      await gateway.handleConnection(mockClient);

      const result = await gateway.handleGetMissedEvents(mockClient, {
        since: 'invalid-date',
      });

      expect(result.success).toBe(false);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('getConnectedUsers', () => {
    it('should return all connected users for a tenant', async () => {
      const tenantId = 'tenant-users-test';

      // Connect users from same tenant
      for (let i = 0; i < 3; i++) {
        const mockClient = createMockSocket({
          auth: { userId: `user-${i}`, tenantId, role: DashboardUserRole.OPERATOR },
        });
        mockClient.emit = vi.fn();
        mockClient.join = vi.fn();
        await gateway.handleConnection(mockClient);
      }

      // Connect user from different tenant
      const otherClient = createMockSocket({
        auth: { userId: 'other-user', tenantId: 'other-tenant', role: DashboardUserRole.OPERATOR },
      });
      otherClient.emit = vi.fn();
      otherClient.join = vi.fn();
      await gateway.handleConnection(otherClient);

      const users = gateway.getConnectedUsers(tenantId);

      expect(users).toHaveLength(3);
      expect(users.every(u => u.tenantId === tenantId)).toBe(true);
    });
  });

  describe('sendToUser', () => {
    it('should send event to specific user', async () => {
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      mockClient.emit = vi.fn();
      mockClient.join = vi.fn();
      await gateway.handleConnection(mockClient);

      const result = gateway.sendToUser('user-1', 'test:event', { foo: 'bar' });

      expect(result).toBe(true);
      expect(mockServer.to).toHaveBeenCalledWith(mockClient.id);
      expect(mockServer.emit).toHaveBeenCalledWith('test:event', { foo: 'bar' });
    });

    it('should return false for disconnected user', () => {
      const result = gateway.sendToUser('nonexistent-user', 'test:event', {});

      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should notify all connected clients and clear tracking', async () => {
      // Connect a user
      const mockClient = createMockSocket({
        auth: { userId: 'user-1', tenantId: 'tenant-1', role: DashboardUserRole.OPERATOR },
      });
      mockClient.emit = vi.fn();
      mockClient.join = vi.fn();
      await gateway.handleConnection(mockClient);

      expect(gateway.isUserConnected('user-1')).toBe(true);

      // Destroy module
      await gateway.onModuleDestroy();

      // Should have cleared tracking
      expect(gateway.isUserConnected('user-1')).toBe(false);
      expect(gateway.getOnlineUsersCount('tenant-1')).toBe(0);
    });
  });
});

/**
 * Helper to create mock Socket
 */
function createMockSocket(options: {
  auth?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): Socket {
  const socketId = `socket-${Math.random().toString(36).substring(7)}`;

  return {
    id: socketId,
    handshake: {
      auth: options.auth ?? {},
      query: options.query ?? {},
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
    join: vi.fn(),
    data: {},
  } as unknown as Socket;
}
