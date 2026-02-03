import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GetNotificationsQueryDto } from './dto/get-notifications.dto';

/**
 * Dashboard Notifications Service (Epic 35: Story 35-4)
 *
 * Manages user notifications for dashboard alerts
 */
@Injectable()
export class DashboardNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notifications for user
   */
  async getNotifications(userId: string, tenantId: string, query: GetNotificationsQueryDto) {
    const where: any = {
      userId,
      tenantId,
    };

    if (query.unread) {
      where.isRead = false;
    }

    return this.prisma.userNotification.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: query.limit,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string, tenantId: string): Promise<void> {
    try {
      await this.prisma.userNotification.update({
        where: {
          id: notificationId,
          userId,
          tenantId,
        },
        data: {
          isRead: true,
        },
      });
    } catch (error) {
      // Prisma throws P2025 if record not found
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new Error('Notification not found or access denied');
      }
      throw error;
    }
  }

  /**
   * Clear all unread notifications (mark as read)
   */
  async clearAll(userId: string, tenantId: string): Promise<{ count: number }> {
    const result = await this.prisma.userNotification.updateMany({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { count: result.count };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.prisma.userNotification.count({
      where: {
        userId,
        tenantId,
        isRead: false,
      },
    });
  }

  /**
   * Create notification
   */
  async createNotification(data: {
    userId: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.userNotification.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Create critical notification for stock alert
   * Triggered when stock level < 50% of minimum threshold
   */
  async createStockAlertNotification(
    userId: string,
    tenantId: string,
    productName: string,
    productId: string,
    currentStock: number,
    threshold: number
  ) {
    return this.createNotification({
      userId,
      tenantId,
      type: NotificationType.CRITICAL,
      title: 'Készlethiány',
      message: `${productName} készlet kritikus szinten (${currentStock} db, min: ${threshold} db)`,
      actionUrl: '/dashboard/inventory',
      metadata: {
        productId,
        currentStock,
        threshold,
        severity: 'critical',
      },
    });
  }

  /**
   * Create warning notification for payment failure
   * Triggered when payment transaction is rejected
   */
  async createPaymentFailureNotification(
    userId: string,
    tenantId: string,
    transactionId: string,
    amount: number,
    reason?: string
  ) {
    return this.createNotification({
      userId,
      tenantId,
      type: NotificationType.WARNING,
      title: 'Fizetési hiba',
      message: `Tranzakció elutasítva (${new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
      }).format(amount)})${reason ? `: ${reason}` : ''}`,
      actionUrl: '/dashboard/finance',
      metadata: {
        transactionId,
        amount,
        reason,
      },
    });
  }

  /**
   * Create info notification for urgent worksheet
   * Triggered when worksheet is created with priority: urgent
   */
  async createUrgentWorksheetNotification(
    userId: string,
    tenantId: string,
    worksheetNumber: string,
    worksheetId: string,
    customerName: string
  ) {
    return this.createNotification({
      userId,
      tenantId,
      type: NotificationType.INFO,
      title: 'Sürgős munkalap',
      message: `Új sürgős munkalap (${worksheetNumber}) - ${customerName}`,
      actionUrl: `/worksheets/${worksheetId}`,
      metadata: {
        worksheetId,
        worksheetNumber,
        customerName,
        priority: 'urgent',
      },
    });
  }
}
