'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface UpdatePromptProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text to display (default: 'Új verzió elérhető') */
  message?: string;
  /** Update button text (default: 'Frissítés') */
  updateButtonText?: string;
  /** Dismiss button text (default: 'Később') */
  dismissButtonText?: string;
  /** Called when update button is clicked */
  onUpdate?: () => void;
  /** Called when dismiss button is clicked */
  onDismiss?: () => void;
  /** Whether the prompt is visible */
  isVisible?: boolean;
  /** Position of the prompt */
  position?: 'top' | 'bottom';
}

/**
 * Component that displays a prompt when a new version of the app is available.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { updateAvailable, skipWaiting } = useServiceWorker();
 *   const [showPrompt, setShowPrompt] = useState(true);
 *
 *   return (
 *     <>
 *       <UpdatePrompt
 *         isVisible={updateAvailable && showPrompt}
 *         onUpdate={skipWaiting}
 *         onDismiss={() => setShowPrompt(false)}
 *       />
 *       <MainContent />
 *     </>
 *   );
 * }
 * ```
 */
export function UpdatePrompt({
  className,
  message = 'Új verzió elérhető',
  updateButtonText = 'Frissítés',
  dismissButtonText = 'Később',
  onUpdate,
  onDismiss,
  isVisible = true,
  position = 'bottom',
  ...props
}: UpdatePromptProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed left-4 right-4 z-50 flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-lg',
        position === 'top' ? 'top-4' : 'bottom-4',
        'sm:left-auto sm:right-4 sm:max-w-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {dismissButtonText}
          </Button>
        )}
        {onUpdate && (
          <Button size="sm" onClick={onUpdate}>
            {updateButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}
