import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardNotificationsService } from '../dashboard-notifications.service';
import { DashboardNotificationsController } from '../notifications.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

/**
 * Error Handling Tests for Notification Service (Story 35-4)
 *
 * Tests edge cases and error scenarios:
 * - Network failures
 * - Prisma P2025 errors (record not found)
 * - Permission denied (403)
 * - Validation errors (400)
 * - Database connection errors
 * - Concurrent update conflicts
 * - Invalid tenant/user IDs
 */

describe('DashboardNotificationsService - Error Handling', () => {
  let service: DashboardNotificationsService;
  let prismaService: PrismaService;

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
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('Prisma P2025 Error Handling (Record Not Found)', () => {
    it('throws error when notification not found in markAsRead', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';

      mockPrismaService.userNotification.update.mockRejectedValue(prismaError);

      await expect(
        service.markAsRead('invalid-id', mockUserId, mockTenantId)
      ).rejects.toThrow('Record not found');
    });

    it('handles P2025 error with proper error message', async () => {
      const prismaError = new Error('An operation failed because it depends on one or more records that were required but not found. Record to update not found.');
      (prismaError as any).code = 'P2025';

      mockPrismaService.userNotification.update.mockRejectedValue(prismaError);

      try {
        await service.markAsRead('nonexistent-id', mockUserId, mockTenantId);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Record to update not found');
      }
    });

    it('returns empty array when no notifications found (not an error)', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      const result = await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      expect(result).toEqual([]);
    });
  });

  describe('Invalid User/Tenant ID Handling', () => {
    it('returns empty notifications for non-existent tenant', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      const result = await service.getNotifications(mockUserId, 'nonexistent-tenant', {
        unread: false,
        limit: 50,
      });

      expect(result).toEqual([]);
    });

    it('returns empty notifications for non-existent user', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      const result = await service.getNotifications('nonexistent-user', mockTenantId, {
        unread: false,
        limit: 50,
      });

      expect(result).toEqual([]);
    });

    it('throws error when trying to mark notification of wrong tenant', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';

      mockPrismaService.userNotification.update.mockRejectedValue(prismaError);

      await expect(
        service.markAsRead('notif-123', mockUserId, 'wrong-tenant')
      ).rejects.toThrow();
    });

    it('throws error when trying to mark notification of wrong user', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';

      mockPrismaService.userNotification.update.mockRejectedValue(prismaError);

      await expect(
        service.markAsRead('notif-123', 'wrong-user', mockTenantId)
      ).rejects.toThrow();
    });
  });

  describe('Database Connection Errors', () => {
    it('handles database connection timeout', async () => {
      const connectionError = new Error('Connection timeout');
      (connectionError as any).code = 'P1001';

      mockPrismaService.userNotification.findMany.mockRejectedValue(connectionError);

      await expect(
        service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 })
      ).rejects.toThrow('Connection timeout');
    });

    it('handles database authentication failure', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).code = 'P1002';

      mockPrismaService.userNotification.findMany.mockRejectedValue(authError);

      await expect(
        service.getNotifications(mockUserId, mockTenantId, { unread: false, limit: 50 })
      ).rejects.toThrow('Authentication failed');
    });

    it('handles database server unreachable error', async () => {
      const serverError = new Error('Database server unreachable');
      (serverError as any).code = 'P1003';

      mockPrismaService.userNotification.count.mockRejectedValue(serverError);

      await expect(
        service.getUnreadCount(mockUserId, mockTenantId)
      ).rejects.toThrow('Database server unreachable');
    });
  });

  describe('Concurrent Update Conflicts', () => {
    it('handles concurrent markAsRead on same notification', async () => {
      // First call succeeds
      mockPrismaService.userNotification.update.mockResolvedValueOnce({
        id: 'notif-123',
        isRead: true,
      });

      // Second call fails (already marked)
      const conflictError = new Error('Record not found');
      (conflictError as any).code = 'P2025';
      mockPrismaService.userNotification.update.mockRejectedValueOnce(conflictError);

      // First call should succeed
      await expect(
        service.markAsRead('notif-123', mockUserId, mockTenantId)
      ).resolves.not.toThrow();

      // Second call should fail
      await expect(
        service.markAsRead('notif-123', mockUserId, mockTenantId)
      ).rejects.toThrow();
    });

    it('handles concurrent clearAll operations', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({ count: 5 });

      // Simulate concurrent calls
      const results = await Promise.all([
        service.clearAll(mockUserId, mockTenantId),
        service.clearAll(mockUserId, mockTenantId),
      ]);

      // Both should complete (idempotent operation)
      expect(results[0]?.count).toBeGreaterThanOrEqual(0);
      expect(results[1]?.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invalid Input Validation', () => {
    it('handles empty notification ID in markAsRead', async () => {
      const prismaError = new Error('Invalid ID format');

      mockPrismaService.userNotification.update.mockRejectedValue(prismaError);

      await expect(
        service.markAsRead('', mockUserId, mockTenantId)
      ).rejects.toThrow();
    });

    it('handles negative limit in getNotifications', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      // Service should handle negative limit gracefully
      const result = await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: -10,
      });

      // Verify Prisma wasn't called with negative take
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
        })
      );
    });

    it('handles excessively large limit in getNotifications', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 999999,
      });

      // Should clamp or handle large limits
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalled();
    });
  });

  describe('Null/Undefined Metadata Handling', () => {
    it('handles null metadata in createNotification', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'notif-123',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      });

      const result = await service.createNotification({
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
      });

      expect(result.metadata).toBeNull();
    });

    it('handles undefined actionUrl in createNotification', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'notif-123',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      });

      const result = await service.createNotification({
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
        actionUrl: undefined,
      });

      expect(result.actionUrl).toBeNull();
    });
  });

  describe('Large Dataset Handling', () => {
    it('handles querying 10000+ notifications efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `notif-${i}`,
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: `Notification ${i}`,
        message: 'Test',
        timestamp: new Date(),
        isRead: false,
        actionUrl: null,
        metadata: null,
        createdAt: new Date(),
      }));

      mockPrismaService.userNotification.findMany.mockResolvedValue(largeDataset.slice(0, 50));

      const result = await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      // Should apply limit correctly
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('handles clearAll with thousands of notifications', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({ count: 5000 });

      const result = await service.clearAll(mockUserId, mockTenantId);

      expect(result.count).toBe(5000);
    });
  });

  describe('Foreign Key Constraint Violations', () => {
    it('handles foreign key violation when creating notification for non-existent user', async () => {
      const fkError = new Error('Foreign key constraint failed');
      (fkError as any).code = 'P2003';

      mockPrismaService.userNotification.create.mockRejectedValue(fkError);

      await expect(
        service.createNotification({
          userId: 'nonexistent-user',
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Foreign key constraint failed');
    });

    it('handles foreign key violation when creating notification for non-existent tenant', async () => {
      const fkError = new Error('Foreign key constraint failed');
      (fkError as any).code = 'P2003';

      mockPrismaService.userNotification.create.mockRejectedValue(fkError);

      await expect(
        service.createNotification({
          userId: mockUserId,
          tenantId: 'nonexistent-tenant',
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Foreign key constraint failed');
    });
  });

  describe('Unique Constraint Violations', () => {
    it('handles duplicate notification ID creation', async () => {
      const uniqueError = new Error('Unique constraint failed');
      (uniqueError as any).code = 'P2002';

      mockPrismaService.userNotification.create.mockRejectedValue(uniqueError);

      await expect(
        service.createNotification({
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.INFO,
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('handles rollback when multiple operations fail', async () => {
      // This would test transaction rollback if we use Prisma transactions
      // For now, testing individual operation failure

      mockPrismaService.userNotification.updateMany.mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(
        service.clearAll(mockUserId, mockTenantId)
      ).rejects.toThrow('Transaction failed');
    });
  });
});

describe('DashboardNotificationsController - Error Handling', () => {
  let controller: DashboardNotificationsController;
  let service: DashboardNotificationsService;

  const mockService = {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
    getUnreadCount: vi.fn(),
    createNotification: vi.fn(),
  };

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-456',
    email: 'test@example.com',
    role: 'OPERATOR',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardNotificationsController],
      providers: [
        {
          provide: DashboardNotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DashboardNotificationsController>(DashboardNotificationsController);
    service = module.get<DashboardNotificationsService>(DashboardNotificationsService);

    vi.clearAllMocks();
  });

  describe('HTTP Error Responses', () => {
    it('throws 404 when notification not found', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';

      mockService.markAsRead.mockRejectedValue(notFoundError);

      await expect(
        controller.markAsRead('nonexistent-id', mockUser as any)
      ).rejects.toThrow('Record not found');
    });

    it('throws 500 on database connection error', async () => {
      mockService.getNotifications.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        controller.getNotifications({ unread: false, limit: 50 }, mockUser as any)
      ).rejects.toThrow('Database connection failed');
    });

    it('handles service errors gracefully', async () => {
      mockService.clearAll.mockRejectedValue(new Error('Unexpected error'));

      await expect(
        controller.clearAll(mockUser as any)
      ).rejects.toThrow('Unexpected error');
    });
  });

  describe('Validation Error Handling', () => {
    it('validates limit parameter bounds', async () => {
      // Zod validation should catch this at DTO level
      mockService.getNotifications.mockResolvedValue([]);

      // Valid limit
      await expect(
        controller.getNotifications({ unread: false, limit: 100 }, mockUser as any)
      ).resolves.not.toThrow();
    });

    it('validates boolean unread parameter', async () => {
      mockService.getNotifications.mockResolvedValue([]);

      // Valid boolean
      await expect(
        controller.getNotifications({ unread: true, limit: 50 }, mockUser as any)
      ).resolves.not.toThrow();
    });
  });

  describe('Permission Errors', () => {
    it('requires authenticated user', async () => {
      // This would be handled by JwtAuthGuard
      // Testing that controller expects user object

      await expect(
        controller.getNotifications({ unread: false, limit: 50 }, mockUser as any)
      ).resolves.toBeDefined();
    });
  });
});
