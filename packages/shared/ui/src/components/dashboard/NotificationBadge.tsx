import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../button';
import { Badge } from '../badge';

interface NotificationBadgeProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBadge({ unreadCount, onClick }: NotificationBadgeProps) {
  // Hide badge if no unread notifications
  if (unreadCount === 0) {
    return null;
  }

  // Format count: show 99+ if exceeds 99
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  // Format aria-label
  const ariaLabel = `${unreadCount} olvasatlan értesítés`;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <Bell
        className="h-5 w-5"
        data-testid="bell-icon"
        aria-hidden="true"
      />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center bg-red-600 text-white text-xs font-semibold"
        data-testid="notification-badge"
      >
        {displayCount}
      </Badge>
    </Button>
  );
}
