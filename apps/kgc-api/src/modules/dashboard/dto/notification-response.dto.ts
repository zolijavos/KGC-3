import { z } from 'zod';
import { NotificationType } from '@prisma/client';

/**
 * Notification Response DTO (Epic 35: Story 35-4)
 *
 * Response format for notification API endpoints
 */
export const NotificationResponseSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NotificationType).transform((val) => val.toLowerCase() as 'critical' | 'warning' | 'info'),
  title: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(), // ISO 8601
  isRead: z.boolean(),
  actionUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type NotificationResponseDto = z.infer<typeof NotificationResponseSchema>;

/**
 * Transform Prisma UserNotification to DTO
 */
export function toNotificationResponseDto(notification: any): NotificationResponseDto {
  return {
    id: notification.id,
    type: notification.type.toLowerCase() as 'critical' | 'warning' | 'info',
    title: notification.title,
    message: notification.message,
    timestamp: notification.timestamp.toISOString(),
    isRead: notification.isRead,
    actionUrl: notification.actionUrl || undefined,
    metadata: notification.metadata || undefined,
  };
}
