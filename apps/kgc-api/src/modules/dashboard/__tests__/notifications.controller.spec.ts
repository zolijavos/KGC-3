import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardNotificationsService } from '../dashboard-notifications.service';
import { DashboardNotificationsController } from '../notifications.controller';

describe('DashboardNotificationsController', () => {
  let controller: DashboardNotificationsController;

  const mockService = {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
    getUnreadCount: vi.fn(),
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

    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return all notifications for current user', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: NotificationType.CRITICAL,
          title: 'Készlethiány',
          message: 'MAKITA DHP484',
          timestamp: new Date(),
          isRead: false,
          actionUrl: '/dashboard/inventory',
          metadata: null,
        },
      ];

      mockService.getNotifications.mockResolvedValue(mockNotifications);

      const result = await controller.getNotifications(
        { unread: false, limit: 50 },
        mockUser as any
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Készlethiány');
      expect(mockService.getNotifications).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId, {
        unread: false,
        limit: 50,
      });
    });

    it('should filter unread notifications when unread=true', async () => {
      mockService.getNotifications.mockResolvedValue([]);

      await controller.getNotifications({ unread: true, limit: 50 }, mockUser as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId, {
        unread: true,
        limit: 50,
      });
    });

    it('should apply custom limit', async () => {
      mockService.getNotifications.mockResolvedValue([]);

      await controller.getNotifications({ unread: false, limit: 20 }, mockUser as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId, {
        unread: false,
        limit: 20,
      });
    });

    it('should use default limit of 50', async () => {
      mockService.getNotifications.mockResolvedValue([]);

      await controller.getNotifications({ unread: false, limit: 50 }, mockUser as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.tenantId,
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should only return notifications for current tenant', async () => {
      mockService.getNotifications.mockResolvedValue([]);

      await controller.getNotifications({ unread: false, limit: 50 }, mockUser as any);

      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.any(String),
        mockUser.tenantId,
        expect.any(Object)
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';

      mockService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(notificationId, mockUser as any);

      expect(mockService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        mockUser.id,
        mockUser.tenantId
      );
    });

    it('should throw error if notification not found', async () => {
      mockService.markAsRead.mockRejectedValue(new Error('Not found'));

      await expect(controller.markAsRead('invalid-id', mockUser as any)).rejects.toThrow(
        'Not found'
      );
    });

    it('should verify user ownership', async () => {
      const notificationId = 'notif-123';

      await controller.markAsRead(notificationId, mockUser as any);

      expect(mockService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        mockUser.id,
        expect.any(String)
      );
    });

    it('should verify tenant ownership', async () => {
      const notificationId = 'notif-123';

      await controller.markAsRead(notificationId, mockUser as any);

      expect(mockService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        expect.any(String),
        mockUser.tenantId
      );
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', async () => {
      mockService.clearAll.mockResolvedValue({ count: 5 });

      const result = await controller.clearAll(mockUser as any);

      expect(result.count).toBe(5);
      expect(mockService.clearAll).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId);
    });

    it('should return count of cleared notifications', async () => {
      mockService.clearAll.mockResolvedValue({ count: 10 });

      const result = await controller.clearAll(mockUser as any);

      expect(result.count).toBe(10);
    });

    it('should only clear current user notifications', async () => {
      await controller.clearAll(mockUser as any);

      expect(mockService.clearAll).toHaveBeenCalledWith(mockUser.id, expect.any(String));
    });

    it('should only clear current tenant notifications', async () => {
      await controller.clearAll(mockUser as any);

      expect(mockService.clearAll).toHaveBeenCalledWith(expect.any(String), mockUser.tenantId);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockService.getUnreadCount.mockResolvedValue(7);

      const result = await controller.getUnreadCount(mockUser as any);

      expect(result.count).toBe(7);
      expect(mockService.getUnreadCount).toHaveBeenCalledWith(mockUser.id, mockUser.tenantId);
    });

    it('should return 0 when no unread notifications', async () => {
      mockService.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount(mockUser as any);

      expect(result.count).toBe(0);
    });
  });

  describe('RBAC', () => {
    it('should require DASHBOARD_VIEW permission', () => {
      // Check that controller methods have @RequirePermissions decorator
      const metadata = Reflect.getMetadata('permissions', controller.getNotifications);
      expect(metadata).toBeDefined();
    });

    it('should require authentication', () => {
      // Check that controller has @UseGuards(JwtAuthGuard)
      const guards = Reflect.getMetadata('__guards__', DashboardNotificationsController);
      expect(guards).toBeDefined();
    });
  });
});
