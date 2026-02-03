import { useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface CriticalAlertToastProps {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionText?: string;
  onAction: () => void;
  onDismiss: () => void;
  autoDismiss?: boolean;
  soundEnabled?: boolean;
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
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

export function CriticalAlertToast({
  type,
  title,
  message,
  actionText = 'Részletek',
  onAction,
  onDismiss,
  autoDismiss = true,
  soundEnabled = false,
}: CriticalAlertToastProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  useEffect(() => {
    // Play sound if enabled
    if (soundEnabled) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(error => {
          console.warn('Failed to play notification sound:', error);
        });
      } catch (error) {
        console.warn('Audio not supported:', error);
      }
    }

    // Auto-dismiss after 10 seconds
    if (autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, soundEnabled, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-type={type}
      className={cn(
        'pointer-events-auto w-full max-w-md rounded-lg border-l-4 shadow-lg',
        colors.border,
        colors.bg,
        'p-4'
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Icon
            className={cn('h-6 w-6', colors.icon)}
            data-testid={`icon-${type}`}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-700 mb-3">{message}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" className={cn('text-white', colors.button)} onClick={onAction}>
              {actionText}
            </Button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
            aria-label="Bezárás"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
