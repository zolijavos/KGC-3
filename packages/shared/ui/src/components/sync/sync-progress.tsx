import * as React from 'react';
import { cn } from '../../lib/utils';
import { Progress } from '../ui/progress';
import type { SyncProgress as SyncProgressType } from '../../lib/sync';

export interface SyncProgressProps {
  /** Current sync progress */
  progress: SyncProgressType;
  /** Number of pending operations */
  pendingCount: number;
  /** Whether the device is online */
  isOnline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays sync progress and status information.
 *
 * @example
 * ```tsx
 * function SyncStatus() {
 *   const { progress, pendingCount, isOnline } = useBackgroundSync({...});
 *
 *   return (
 *     <SyncProgress
 *       progress={progress}
 *       pendingCount={pendingCount}
 *       isOnline={isOnline}
 *     />
 *   );
 * }
 * ```
 */
export function SyncProgress({
  progress,
  pendingCount,
  isOnline = true,
  className,
}: SyncProgressProps) {
  // Don't render if nothing to show
  if (!progress.isSyncing && pendingCount === 0 && progress.failed === 0 && progress.conflicts === 0) {
    return null;
  }

  const percentage = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div
      data-testid="sync-progress"
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm',
        className
      )}
    >
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
          <span>Offline</span>
        </div>
      )}

      {/* Syncing progress */}
      {progress.isSyncing && (
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm font-medium">Syncing...</span>
          </div>
          <Progress
            value={percentage}
            className="flex-1"
            aria-label="Sync progress"
          />
          <span className="text-sm text-muted-foreground">
            {progress.completed}/{progress.total}
          </span>
        </div>
      )}

      {/* Not syncing, show pending count */}
      {!progress.isSyncing && pendingCount > 0 && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          <span>{pendingCount} pending</span>
        </div>
      )}

      {/* Failed count */}
      {progress.failed > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          <span>{progress.failed} failed</span>
        </div>
      )}

      {/* Conflicts count */}
      {progress.conflicts > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-500">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
          <span>{progress.conflicts} conflict{progress.conflicts > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
