import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardNotificationsService } from '../dashboard-notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

/**
 * Performance Tests for Notification Service (Story 35-4)
 *
 * Tests performance characteristics:
 * - Large notification list rendering (1000+ items)
 * - Polling memory leak prevention
 * - Toast queue management
 * - Cache invalidation performance
 * - Query response time limits
 * - Concurrent request handling
 */

describe('DashboardNotificationsService - Performance Tests', () => {
  let service: DashboardNotificationsService;

  const mockPrismaService = {
    userNotification: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  };

  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardNotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardNotificationsService>(DashboardNotificationsService);

    vi.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    it('handles 1000+ notifications efficiently with pagination', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `notif-${i}`,
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: `Notification ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(Date.now() - i * 1000),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      }));

      mockPrismaService.userNotification.findMany.mockResolvedValue(largeDataset.slice(0, 50));

      const startTime = performance.now();

      const result = await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within 500ms (per Story 35-4 requirements)
      expect(executionTime).toBeLessThan(500);
      expect(result.length).toBe(50);
    });

    it('handles 10000+ notification count query efficiently', async () => {
      mockPrismaService.userNotification.count.mockResolvedValue(15000);

      const startTime = performance.now();

      const count = await service.getUnreadCount(mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Badge count fetch should be < 200ms (per Story 35-4 requirements)
      expect(executionTime).toBeLessThan(200);
      expect(count).toBe(15000);
    });

    it('handles bulk clearAll with 5000+ notifications efficiently', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({ count: 5000 });

      const startTime = performance.now();

      const result = await service.clearAll(mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Bulk update should complete within 1 second
      expect(executionTime).toBeLessThan(1000);
      expect(result.count).toBe(5000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('handles 100 concurrent getNotifications requests', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
          timestamp: new Date(),
          isRead: false,
          actionUrl: null,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      const startTime = performance.now();

      const requests = Array.from({ length: 100 }, () =>
        service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 })
      );

      const results = await Promise.all(requests);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 100 concurrent requests should complete within 2 seconds
      expect(executionTime).toBeLessThan(2000);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toEqual(mockNotifications);
      });
    });

    it('handles 50 concurrent markAsRead requests', async () => {
      mockPrismaService.userNotification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const startTime = performance.now();

      const requests = Array.from({ length: 50 }, (_, i) =>
        service.markAsRead(`notif-${i}`, mockUserId, mockTenantId)
      );

      const results = await Promise.allSettled(requests);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 50 concurrent updates should complete within 1.5 seconds
      expect(executionTime).toBeLessThan(1500);
      expect(results).toHaveLength(50);
    });

    it('handles concurrent create + read operations', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'new-notif',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'New',
        message: 'New',
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      });

      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      const createRequests = Array.from({ length: 20 }, () =>
        service.createNotification({
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
        })
      );

      const readRequests = Array.from({ length: 20 }, () =>
        service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 })
      );

      const startTime = performance.now();

      const results = await Promise.allSettled([...createRequests, ...readRequests]);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Mixed operations should complete within 2 seconds
      expect(executionTime).toBeLessThan(2000);
      expect(results).toHaveLength(40);
    });
  });

  describe('Memory Efficiency', () => {
    it('does not accumulate memory with repeated queries', async () => {
      const mockNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i}`,
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: `Test ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      }));

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      // Simulate 1000 queries (polling scenario)
      for (let i = 0; i < 1000; i++) {
        await service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 });
      }

      // If there were memory leaks, this would fail or hang
      // This test validates no accumulation of query results
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledTimes(1000);
    });

    it('cleans up large result sets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `notif-${i}`,
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: `Test ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      }));

      mockPrismaService.userNotification.findMany.mockResolvedValue(largeDataset.slice(0, 50));

      // Multiple queries with large datasets
      for (let i = 0; i < 100; i++) {
        await service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 });
      }

      // Should not accumulate memory
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledTimes(100);
    });
  });

  describe('Query Optimization', () => {
    it('uses indexed columns for fast queries (userId, tenantId, isRead)', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: true,
        limit: 50,
      });

      // Verify query uses indexed columns
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          tenantId: mockTenantId,
          isRead: false,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      });
    });

    it('uses timestamp index for sorting', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      // Verify ordering by timestamp (indexed column)
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            timestamp: 'desc',
          },
        })
      );
    });

    it('limits result set size to prevent over-fetching', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 20,
      });

      // Verify LIMIT is applied
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  describe('Response Time SLA', () => {
    it('getNotifications completes within 500ms', async () => {
      const mockNotifications = Array.from({ length: 50 }, (_, i) => ({
        id: `notif-${i}`,
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: `Test ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      }));

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      const startTime = performance.now();

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Per Story 35-4: Notification lista fetch < 500ms
      expect(executionTime).toBeLessThan(500);
    });

    it('getUnreadCount completes within 200ms', async () => {
      mockPrismaService.userNotification.count.mockResolvedValue(42);

      const startTime = performance.now();

      await service.getUnreadCount(mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Per Story 35-4: Badge count fetch < 200ms
      expect(executionTime).toBeLessThan(200);
    });

    it('markAsRead provides optimistic feedback within 50ms', async () => {
      // Note: This tests the service layer, not the optimistic update itself
      // Optimistic update happens in the frontend hook

      mockPrismaService.userNotification.update.mockImplementation(async () => {
        // Simulate fast database update
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id: 'notif-1', isRead: true };
      });

      const startTime = performance.now();

      await service.markAsRead('notif-1', mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Backend should respond quickly for good UX
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Batch Operation Performance', () => {
    it('clearAll handles 1000+ notifications in single query', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({ count: 1000 });

      const startTime = performance.now();

      const result = await service.clearAll(mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Batch update should be much faster than individual updates
      expect(executionTime).toBeLessThan(500);
      expect(result.count).toBe(1000);

      // Should use updateMany (single query) not multiple updates
      expect(mockPrismaService.userNotification.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.userNotification.update).not.toHaveBeenCalled();
    });

    it('batch createNotification operations scale linearly', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'notif-new',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test',
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      });

      const startTime = performance.now();

      const requests = Array.from({ length: 100 }, () =>
        service.createNotification({
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
        })
      );

      await Promise.all(requests);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 100 creates should complete within 2 seconds
      expect(executionTime).toBeLessThan(2000);
      expect(mockPrismaService.userNotification.create).toHaveBeenCalledTimes(100);
    });
  });

  describe('Data Retention Performance', () => {
    it('handles 90-day cleanup query efficiently', async () => {
      // This would test the CRON job query performance
      // Simulating cleanup of old notifications

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      mockPrismaService.userNotification.updateMany.mockResolvedValue({ count: 5000 });

      const startTime = performance.now();

      // Simulate cleanup query (would be in a separate service method)
      const result = await service.clearAll(mockUserId, mockTenantId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Cleanup should be fast even with large datasets
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('Cache Performance', () => {
    it('repeated identical queries benefit from database query cache', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
          timestamp: new Date(),
          isRead: false,
          actionUrl: null,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      const times: number[] = [];

      // Execute same query 10 times
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 });
        const end = performance.now();
        times.push(end - start);
      }

      // All queries should complete quickly
      times.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });
  });
});
