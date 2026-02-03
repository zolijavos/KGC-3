import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardNotificationsService } from '../dashboard-notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('DashboardNotificationsService', () => {
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
    _prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return all notifications for user and tenant', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.CRITICAL,
          title: 'Készlethiány',
          message: 'MAKITA DHP484 készlet kritikus',
          timestamp: new Date('2025-01-20T10:30:00Z'),
          isRead: false,
          actionUrl: '/dashboard/inventory',
          metadata: { productId: 'prod-123' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Készlethiány');
      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          tenantId: mockTenantId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      });
    });

    it('should return only unread notifications when unread=true', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: mockUserId,
          tenantId: mockTenantId,
          type: NotificationType.CRITICAL,
          title: 'Készlethiány',
          message: 'Test',
          timestamp: new Date(),
          isRead: false,
          actionUrl: null,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.userNotification.findMany.mockResolvedValue(mockNotifications);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: true,
        limit: 50,
      });

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

    it('should apply limit to results', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 20,
      });

      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('should order by timestamp descending (newest first)', async () => {
      mockPrismaService.userNotification.findMany.mockResolvedValue([]);

      await service.getNotifications(mockUserId, mockTenantId, {
        unread: false,
        limit: 50,
      });

      expect(mockPrismaService.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            timestamp: 'desc',
          },
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';

      mockPrismaService.userNotification.update.mockResolvedValue({
        id: notificationId,
        isRead: true,
      });

      await service.markAsRead(notificationId, mockUserId, mockTenantId);

      expect(mockPrismaService.userNotification.update).toHaveBeenCalledWith({
        where: {
          id: notificationId,
          userId: mockUserId,
          tenantId: mockTenantId,
        },
        data: {
          isRead: true,
        },
      });
    });

    it('should throw error if notification not found', async () => {
      mockPrismaService.userNotification.update.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(
        service.markAsRead('invalid-id', mockUserId, mockTenantId)
      ).rejects.toThrow();
    });

    it('should verify user and tenant ownership', async () => {
      const notificationId = 'notif-123';

      await service.markAsRead(notificationId, mockUserId, mockTenantId);

      expect(mockPrismaService.userNotification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            tenantId: mockTenantId,
          }),
        })
      );
    });
  });

  describe('clearAll', () => {
    it('should update all notifications to read', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.clearAll(mockUserId, mockTenantId);

      expect(result.count).toBe(5);
      expect(mockPrismaService.userNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          tenantId: mockTenantId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    });

    it('should return count of cleared notifications', async () => {
      mockPrismaService.userNotification.updateMany.mockResolvedValue({
        count: 3,
      });

      const result = await service.clearAll(mockUserId, mockTenantId);

      expect(result.count).toBe(3);
    });

    it('should only clear unread notifications', async () => {
      await service.clearAll(mockUserId, mockTenantId);

      expect(mockPrismaService.userNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        })
      );
    });
  });

  describe('createNotification', () => {
    it('should create critical notification for stock alert', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.CRITICAL,
        title: 'Készlethiány',
        message: 'MAKITA DHP484 készlet kritikus szinten',
        timestamp: new Date(),
        isRead: false,
        actionUrl: '/dashboard/inventory',
        metadata: { productId: 'prod-123' },
        createdAt: new Date(),
      };

      mockPrismaService.userNotification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.CRITICAL,
        title: 'Készlethiány',
        message: 'MAKITA DHP484 készlet kritikus szinten',
        actionUrl: '/dashboard/inventory',
        metadata: { productId: 'prod-123' },
      });

      expect(result.id).toBe('notif-123');
      expect(result.type).toBe(NotificationType.CRITICAL);
      expect(mockPrismaService.userNotification.create).toHaveBeenCalled();
    });

    it('should create warning notification for payment failure', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'notif-456',
        type: NotificationType.WARNING,
        title: 'Fizetési hiba',
        message: 'Tranzakció elutasítva',
      });

      const result = await service.createNotification({
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.WARNING,
        title: 'Fizetési hiba',
        message: 'Tranzakció elutasítva',
      });

      expect(result.type).toBe(NotificationType.WARNING);
    });

    it('should create info notification for urgent worksheet', async () => {
      mockPrismaService.userNotification.create.mockResolvedValue({
        id: 'notif-789',
        type: NotificationType.INFO,
        title: 'Sürgős munkalap',
        message: 'Új sürgős munkalap (#ML-2025-001)',
      });

      const result = await service.createNotification({
        userId: mockUserId,
        tenantId: mockTenantId,
        type: NotificationType.INFO,
        title: 'Sürgős munkalap',
        message: 'Új sürgős munkalap (#ML-2025-001)',
      });

      expect(result.type).toBe(NotificationType.INFO);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.userNotification.count.mockResolvedValue(7);

      const count = await service.getUnreadCount(mockUserId, mockTenantId);

      expect(count).toBe(7);
      expect(mockPrismaService.userNotification.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          tenantId: mockTenantId,
          isRead: false,
        },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      mockPrismaService.userNotification.count.mockResolvedValue(0);

      const count = await service.getUnreadCount(mockUserId, mockTenantId);

      expect(count).toBe(0);
    });
  });
});
