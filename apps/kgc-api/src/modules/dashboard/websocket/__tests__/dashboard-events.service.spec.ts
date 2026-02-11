import type { Server } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardUserRole } from '../dashboard-events.interface';
import { DashboardEventsService } from '../dashboard-events.service';

describe('DashboardEventsService', () => {
  let service: DashboardEventsService;
  let mockServer: Server;

  beforeEach(() => {
    service = new DashboardEventsService();

    // Create mock Socket.io server
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Server;

    service.setServer(mockServer);
  });

  describe('broadcastStockAlert', () => {
    it('should broadcast stock alert to all tenant rooms', async () => {
      const tenantId = 'tenant-123';
      const data = {
        productId: 'prod-1',
        productName: 'Makita fúró',
        currentQuantity: 2,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Raktár A',
        severity: 'CRITICAL' as const,
      };

      await service.broadcastStockAlert(tenantId, data);

      // Should broadcast to tenant room
      expect(mockServer.to).toHaveBeenCalledWith(`tenant:${tenantId}:all`);
      expect(mockServer.to).toHaveBeenCalledWith(`tenant:${tenantId}:operators`);
      expect(mockServer.to).toHaveBeenCalledWith(`tenant:${tenantId}:managers`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'dashboard:stock_alert',
        expect.objectContaining({
          type: 'stock_alert',
          data,
        })
      );
    });

    it('should queue event for offline users', async () => {
      const tenantId = 'tenant-123';
      const data = {
        productId: 'prod-1',
        productName: 'Test Product',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Test Location',
        severity: 'WARNING' as const,
      };

      await service.broadcastStockAlert(tenantId, data);

      // Get queued events
      const events = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, new Date(0));

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('stock_alert');
    });
  });

  describe('broadcastPaymentError', () => {
    it('should broadcast payment error to managers only', async () => {
      const tenantId = 'tenant-123';
      const data = {
        transactionId: 'tx-1',
        errorCode: 'DECLINED',
        errorMessage: 'Card declined',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        amount: 50000,
        currency: 'HUF' as const,
      };

      await service.broadcastPaymentError(tenantId, data);

      // Should only broadcast to manager room
      expect(mockServer.to).toHaveBeenCalledWith(`tenant:${tenantId}:managers`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'dashboard:payment_error',
        expect.objectContaining({
          type: 'payment_error',
          data,
        })
      );
    });
  });

  describe('broadcastRentalCreated', () => {
    it('should broadcast rental created to managers only', async () => {
      const tenantId = 'tenant-123';
      const data = {
        rentalId: 'rental-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        equipmentCount: 3,
        totalValue: 150000,
        currency: 'HUF' as const,
      };

      await service.broadcastRentalCreated(tenantId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`tenant:${tenantId}:managers`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'dashboard:rental_created',
        expect.objectContaining({
          type: 'rental_created',
          data,
        })
      );
    });
  });

  describe('getQueuedEvents (AC6)', () => {
    it('should filter events by role visibility', async () => {
      const tenantId = 'tenant-123';

      // Create stock alert (visible to all)
      await service.broadcastStockAlert(tenantId, {
        productId: 'prod-1',
        productName: 'Product 1',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      // Create payment error (managers only)
      await service.broadcastPaymentError(tenantId, {
        transactionId: 'tx-1',
        errorCode: 'ERROR',
        errorMessage: 'Test error',
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        amount: 10000,
        currency: 'HUF',
      });

      const since = new Date(0);

      // Operator should only see stock alert
      const operatorEvents = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, since);
      expect(operatorEvents).toHaveLength(1);
      expect(operatorEvents[0]?.type).toBe('stock_alert');

      // Manager should see both
      const managerEvents = service.getQueuedEvents(
        tenantId,
        DashboardUserRole.STORE_MANAGER,
        since
      );
      expect(managerEvents).toHaveLength(2);
    });

    it('should filter events by timestamp', async () => {
      const tenantId = 'tenant-123';
      const beforeEvent = new Date();

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.broadcastStockAlert(tenantId, {
        productId: 'prod-1',
        productName: 'Product 1',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      // Events before the broadcast should return the event
      const eventsBefore = service.getQueuedEvents(
        tenantId,
        DashboardUserRole.OPERATOR,
        beforeEvent
      );
      expect(eventsBefore).toHaveLength(1);

      // Events after the broadcast should return nothing
      const eventsAfter = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, new Date());
      expect(eventsAfter).toHaveLength(0);
    });
  });

  describe('canRoleSeeEvent (AC5)', () => {
    it('should allow all roles to see stock_alert', () => {
      expect(service.canRoleSeeEvent(DashboardUserRole.OPERATOR, 'stock_alert')).toBe(true);
      expect(service.canRoleSeeEvent(DashboardUserRole.STORE_MANAGER, 'stock_alert')).toBe(true);
      expect(service.canRoleSeeEvent(DashboardUserRole.ADMIN, 'stock_alert')).toBe(true);
    });

    it('should only allow managers/admins to see payment_error', () => {
      expect(service.canRoleSeeEvent(DashboardUserRole.OPERATOR, 'payment_error')).toBe(false);
      expect(service.canRoleSeeEvent(DashboardUserRole.STORE_MANAGER, 'payment_error')).toBe(true);
      expect(service.canRoleSeeEvent(DashboardUserRole.ADMIN, 'payment_error')).toBe(true);
    });

    it('should only allow managers/admins to see rental_created', () => {
      expect(service.canRoleSeeEvent(DashboardUserRole.OPERATOR, 'rental_created')).toBe(false);
      expect(service.canRoleSeeEvent(DashboardUserRole.STORE_MANAGER, 'rental_created')).toBe(true);
      expect(service.canRoleSeeEvent(DashboardUserRole.ADMIN, 'rental_created')).toBe(true);
    });
  });

  describe('Tenant Isolation (AC7)', () => {
    it('should not broadcast without tenantId', async () => {
      const data = {
        productId: 'prod-1',
        productName: 'Test',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Test',
        severity: 'CRITICAL' as const,
      };

      await service.broadcastStockAlert('', data);

      // Should not emit
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should isolate events by tenant', async () => {
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      await service.broadcastStockAlert(tenant1, {
        productId: 'prod-1',
        productName: 'Product 1',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      // Tenant 1 should have events
      const tenant1Events = service.getQueuedEvents(
        tenant1,
        DashboardUserRole.OPERATOR,
        new Date(0)
      );
      expect(tenant1Events).toHaveLength(1);

      // Tenant 2 should have no events
      const tenant2Events = service.getQueuedEvents(
        tenant2,
        DashboardUserRole.OPERATOR,
        new Date(0)
      );
      expect(tenant2Events).toHaveLength(0);
    });
  });

  describe('Queue Management', () => {
    it('should enforce max queue size', async () => {
      const tenantId = 'tenant-123';

      // Add 60 events (max is 50)
      for (let i = 0; i < 60; i++) {
        await service.broadcastStockAlert(tenantId, {
          productId: `prod-${i}`,
          productName: `Product ${i}`,
          currentQuantity: 1,
          threshold: 5,
          locationId: 'loc-1',
          locationName: 'Location 1',
          severity: 'CRITICAL',
        });
      }

      const events = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, new Date(0));

      // Should have max 50 events
      expect(events.length).toBeLessThanOrEqual(50);
    });

    it('should clear queue for tenant', async () => {
      const tenantId = 'tenant-123';

      await service.broadcastStockAlert(tenantId, {
        productId: 'prod-1',
        productName: 'Product 1',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      // Verify event exists
      let events = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, new Date(0));
      expect(events).toHaveLength(1);

      // Clear queue
      service.clearQueue(tenantId);

      // Verify queue is empty
      events = service.getQueuedEvents(tenantId, DashboardUserRole.OPERATOR, new Date(0));
      expect(events).toHaveLength(0);
    });

    it('should return queue stats for monitoring', async () => {
      // Add events to multiple tenants
      await service.broadcastStockAlert('tenant-1', {
        productId: 'prod-1',
        productName: 'Product 1',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'CRITICAL',
      });

      await service.broadcastStockAlert('tenant-1', {
        productId: 'prod-2',
        productName: 'Product 2',
        currentQuantity: 2,
        threshold: 5,
        locationId: 'loc-1',
        locationName: 'Location 1',
        severity: 'WARNING',
      });

      await service.broadcastStockAlert('tenant-2', {
        productId: 'prod-3',
        productName: 'Product 3',
        currentQuantity: 1,
        threshold: 5,
        locationId: 'loc-2',
        locationName: 'Location 2',
        severity: 'CRITICAL',
      });

      const stats = service.getQueueStats();

      expect(stats).toHaveLength(2);
      expect(stats).toEqual(
        expect.arrayContaining([
          { tenantId: 'tenant-1', count: 2 },
          { tenantId: 'tenant-2', count: 1 },
        ])
      );
    });
  });
});
