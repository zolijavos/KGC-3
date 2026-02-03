import { AlertCircle, AlertTriangle, Check, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

const iconMap = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  critical: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    icon: 'text-red-600',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
  },
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
  },
};

function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  return (
    <ul className="space-y-3" role="list" aria-label="Értesítések listája">
      {notifications.map(notification => {
        const Icon = iconMap[notification.type];
        const colors = colorMap[notification.type];
        const truncatedMessage = truncateMessage(notification.message);
        const isMessageTruncated = notification.message.length > 100;

        return (
          <li
            key={notification.id}
            data-type={notification.type}
            className={cn(
              'p-4 rounded-lg border-l-4 transition-colors',
              colors.border,
              colors.bg,
              notification.isRead && 'opacity-60'
            )}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <Icon
                  className={cn('h-5 w-5', colors.icon)}
                  data-testid={`icon-${notification.type}`}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                  {notification.isRead && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Olvasva
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 text-sm text-gray-700"
                  title={isMessageTruncated ? notification.message : undefined}
                >
                  {truncatedMessage}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <time className="text-xs text-gray-500" dateTime={notification.timestamp}>
                    {formatTimestamp(notification.timestamp)}
                  </time>
                  <div className="flex items-center gap-2">
                    {notification.actionUrl && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a href={notification.actionUrl}>Részletek</a>
                      </Button>
                    )}
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        onClick={() => onMarkAsRead(notification.id)}
                        aria-label="Olvasottnak jelölés"
                      >
                        Olvasottnak jelölés
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
