import React, { useState } from 'react';
import { NotificationPanel, NotificationBadge } from '@kgc/ui';
import {
  useNotifications,
  useMarkAsRead,
  useClearAllNotifications,
} from '../../../hooks/useNotifications';

/**
 * Notification Panel Widget (Epic 35: Story 35-4)
 *
 * Badge in header + slide-in panel for notifications
 *
 * Features:
 * - Badge with unread count (hidden if 0)
 * - Slide-in panel from right
 * - Mark as read / Clear all actions
 * - 5 minute polling (managed by TanStack Query)
 */
export function NotificationPanelWidget() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch notifications (polling every 5 minutes)
  const { data: notifications = [], isLoading, refetch } = useNotifications(true);

  // Mutations
  const markAsRead = useMarkAsRead();
  const clearAll = useClearAllNotifications();

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handlers
  const handleOpenPanel = () => {
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const handleClearAll = async () => {
    await clearAll.mutateAsync();
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      {/* Badge in header */}
      <NotificationBadge unreadCount={unreadCount} onClick={handleOpenPanel} />

      {/* Slide-in panel */}
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearAll}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </>
  );
}

export default NotificationPanelWidget;
