'use client';

import * as React from 'react';
import { WifiOff } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useOnlineStatus } from '../../hooks/use-online-status';

export interface OfflineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text to display when offline (default: 'You are offline') */
  message?: string;
  /** Icon to display (default: WifiOff from lucide-react) */
  icon?: React.ReactNode;
  /** Whether to show the indicator even when online (for testing) */
  forceShow?: boolean;
  /** Position of the indicator */
  position?: 'top' | 'bottom';
}

/**
 * Component that displays a banner when the user is offline.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <OfflineIndicator position="top" />
 *       <MainContent />
 *     </>
 *   );
 * }
 * ```
 */
export function OfflineIndicator({
  className,
  message = 'Nincs internetkapcsolat',
  icon,
  forceShow = false,
  position = 'top',
  ...props
}: OfflineIndicatorProps) {
  const { isOffline } = useOnlineStatus();

  if (!isOffline && !forceShow) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
      {...props}
    >
      {icon ?? <WifiOff className="h-4 w-4" />}
      <span>{message}</span>
    </div>
  );
}
