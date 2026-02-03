import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { DashboardNotificationsService } from './dashboard-notifications.service';
import { GetNotificationsQuerySchema } from './dto/get-notifications.dto';
import { toNotificationResponseDto } from './dto/notification-response.dto';

/**
 * Dashboard Notifications Controller (Epic 35: Story 35-4)
 *
 * Endpoints:
 * - GET /api/v1/dashboard/notifications - Get notifications
 * - POST /api/v1/dashboard/notifications/:id/mark-read - Mark as read
 * - POST /api/v1/dashboard/notifications/clear-all - Clear all
 * - GET /api/v1/dashboard/notifications/unread-count - Get unread count
 */
@Controller('api/v1/dashboard/notifications')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardNotificationsController {
  constructor(private readonly notificationsService: DashboardNotificationsService) {}

  /**
   * GET /api/v1/dashboard/notifications
   * Get notifications for current user
   *
   * Query params:
   * - unread: boolean (optional) - filter unread notifications
   * - limit: number (optional, default 50, max 100)
   */
  @Get()
  @RequirePermissions('DASHBOARD_VIEW')
  async getNotifications(@Query() query: Record<string, any>, @CurrentUser() user: any) {
    // Validate and transform query params
    const validatedQuery = GetNotificationsQuerySchema.parse(query);

    const notifications = await this.notificationsService.getNotifications(
      user.id,
      user.tenantId,
      validatedQuery
    );

    return { data: notifications.map(toNotificationResponseDto) };
  }

  /**
   * GET /api/v1/dashboard/notifications/unread-count
   * Get unread notification count
   */
  @Get('unread-count')
  @RequirePermissions('DASHBOARD_VIEW')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id, user.tenantId);

    return { count };
  }

  /**
   * POST /api/v1/dashboard/notifications/:id/mark-read
   * Mark notification as read
   */
  @Post(':id/mark-read')
  @RequirePermissions('DASHBOARD_VIEW')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    await this.notificationsService.markAsRead(id, user.id, user.tenantId);

    return { success: true };
  }

  /**
   * POST /api/v1/dashboard/notifications/clear-all
   * Clear all notifications (mark as read)
   */
  @Post('clear-all')
  @RequirePermissions('DASHBOARD_VIEW')
  async clearAll(@CurrentUser() user: any) {
    return this.notificationsService.clearAll(user.id, user.tenantId);
  }
}
