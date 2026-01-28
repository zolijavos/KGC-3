'use client';

import * as React from 'react';
import { usePushNotifications } from '../../hooks/use-push-notifications';
import type { NotificationData } from '../../lib/notifications';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface NotificationPromptProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Text for enable button */
  enableButtonText?: string;
  /** Text for dismiss button */
  dismissButtonText?: string;
  /** Called when permission is granted */
  onPermissionGranted?: () => void;
  /** Called when permission is denied */
  onPermissionDenied?: () => void;
  /** Called when user dismisses the prompt */
  onDismiss?: () => void;
  /** Called when notification is clicked */
  onNotificationClick?: (data: NotificationData) => void;
  /** Custom class name */
  className?: string;
  /** Whether to show the dismiss button */
  showDismiss?: boolean;
  /** Whether to persist dismissed state */
  persistDismiss?: boolean;
}

const DISMISSED_KEY = 'kgc-notification-prompt-dismissed';

/**
 * Notification permission prompt component
 *
 * Shows a prompt asking the user to enable push notifications.
 *
 * @example
 * ```tsx
 * <NotificationPrompt
 *   onPermissionGranted={() => console.log('Granted!')}
 *   onPermissionDenied={() => console.log('Denied')}
 * />
 * ```
 */
export const NotificationPrompt = React.forwardRef<HTMLDivElement, NotificationPromptProps>(
  (
    {
      title = 'Értesítések engedélyezése',
      description = 'Kapjon értesítéseket a fontos eseményekről, bérlésekről és szerviz állapotokról.',
      enableButtonText = 'Engedélyezés',
      dismissButtonText = 'Most nem',
      onPermissionGranted,
      onPermissionDenied,
      onDismiss,
      onNotificationClick,
      className,
      showDismiss = true,
      persistDismiss = true,
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = React.useState(() => {
      if (typeof window === 'undefined') return false;
      if (!persistDismiss) return false;
      return localStorage.getItem(DISMISSED_KEY) === 'true';
    });

    const { requestPermission, isSupported, permission, isPermissionGranted } =
      usePushNotifications(onNotificationClick ? { onClick: onNotificationClick } : {});

    // Don't show if not supported, already granted, or dismissed
    if (!isSupported || isPermissionGranted || isDismissed) {
      return null;
    }

    // Don't show if permanently denied
    if (permission === 'denied') {
      return null;
    }

    const handleEnable = async () => {
      const result = await requestPermission();
      if (result === 'granted') {
        onPermissionGranted?.();
      } else if (result === 'denied') {
        onPermissionDenied?.();
      }
    };

    const handleDismiss = () => {
      setIsDismissed(true);
      if (persistDismiss) {
        localStorage.setItem(DISMISSED_KEY, 'true');
      }
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-4 p-4 bg-card border rounded-lg shadow-sm',
          className
        )}
        data-testid="notification-prompt"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {showDismiss && (
            <Button variant="ghost" size="sm" onClick={handleDismiss} data-testid="dismiss-btn">
              {dismissButtonText}
            </Button>
          )}
          <Button variant="default" size="sm" onClick={handleEnable} data-testid="enable-btn">
            {enableButtonText}
          </Button>
        </div>
      </div>
    );
  }
);

NotificationPrompt.displayName = 'NotificationPrompt';
