import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

/**
 * Notification hooks (Epic 35: Story 35-4)
 *
 * TanStack Query hooks for notification management
 */

// Notification schema
const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  message: z.string(),
  timestamp: z.string(),
  isRead: z.boolean(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

type Notification = z.infer<typeof NotificationSchema>;

/**
 * Hook to fetch notifications with polling
 *
 * Features:
 * - 5 minute polling (refetchInterval: 5*60*1000)
 * - 4 minute stale time (staleTime: 4*60*1000)
 * - Manual refetch support
 */
export function useNotifications(unreadOnly = true) {
  return useQuery({
    queryKey: ['dashboard', 'notifications', unreadOnly ? 'unread' : 'all'],
    queryFn: async () => {
      const url = `/api/v1/dashboard/notifications?unread=${unreadOnly}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch notifications: ${res.statusText}`);
      }

      const data = await res.json();
      return NotificationSchema.array().parse(data.data);
    },
    refetchInterval: 5 * 60 * 1000, // 5 perc polling
    staleTime: 4 * 60 * 1000, // 4 perc stale time
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['dashboard', 'notifications', 'unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/notifications/unread-count');

      if (!res.ok) {
        throw new Error(`Failed to fetch unread count: ${res.statusText}`);
      }

      const data = await res.json();
      return data.count as number;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });
}

/**
 * Hook to mark notification as read
 *
 * Features:
 * - Optimistic update (instant UI feedback)
 * - Rollback on error
 * - Invalidate queries on success
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/v1/dashboard/notifications/${notificationId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to mark as read: ${res.statusText}`);
      }

      return res.json();
    },
    // Optimistic update
    onMutate: async notificationId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['dashboard', 'notifications'],
      });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ['dashboard', 'notifications', 'unread'],
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map(notification =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          );
        }
      );

      return { previousNotifications };
    },
    // Rollback on error
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['dashboard', 'notifications', 'unread'],
          context.previousNotifications
        );
      }
    },
    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'notifications'],
      });
    },
  });
}

/**
 * Hook to clear all notifications (mark all as read)
 *
 * Features:
 * - Optimistic clear
 * - Rollback on error
 * - Refetch on success
 */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/dashboard/notifications/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to clear notifications: ${res.statusText}`);
      }

      return res.json() as Promise<{ count: number }>;
    },
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['dashboard', 'notifications'],
      });

      const previousNotifications = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]);

      // Clear unread notifications
      queryClient.setQueryData(['dashboard', 'notifications', 'unread'], []);

      return { previousNotifications };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['dashboard', 'notifications', 'unread'],
          context.previousNotifications
        );
      }
    },
    // Refetch on success
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: ['dashboard', 'notifications'],
      });
    },
  });
}
