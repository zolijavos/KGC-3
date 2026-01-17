import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncQueue } from '../lib/sync';
import { resolveConflict, createConflictInfo } from '../lib/sync/conflict-resolution';
import type {
  SyncOperation,
  SyncQueueConfig,
  SyncResult,
  SyncProgress,
  SyncExecutor,
  ConflictInfo,
  ConflictResolver,
} from '../lib/sync';

export interface UseBackgroundSyncOptions extends SyncQueueConfig {
  /** Function to execute sync operations */
  executor: SyncExecutor;
  /** Custom conflict resolver */
  conflictResolver?: ConflictResolver;
  /** Sync interval in milliseconds (default: 30000) */
  syncInterval?: number;
  /** Whether to automatically sync when online (default: true) */
  autoSync?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: SyncResult) => void;
  /** Callback when sync fails */
  onSyncError?: (operation: SyncOperation, error: Error) => void;
  /** Callback when conflict occurs */
  onConflict?: (conflict: ConflictInfo) => void;
}

export interface UseBackgroundSyncReturn {
  /** Whether the queue is loading */
  isLoading: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Whether sync is paused */
  isPaused: boolean;
  /** Number of pending operations */
  pendingCount: number;
  /** Current sync progress */
  progress: SyncProgress;
  /** Error state */
  error: Error | null;
  /** Queue an operation for background sync */
  queueOperation: (
    operation: Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>
  ) => Promise<string>;
  /** Trigger immediate sync */
  syncNow: () => Promise<void>;
  /** Pause sync */
  pause: () => void;
  /** Resume sync */
  resume: () => void;
  /** Clear the sync queue */
  clearQueue: () => Promise<void>;
}

const DEFAULT_SYNC_INTERVAL = 30000; // 30 seconds

/**
 * Hook for background sync with automatic online detection.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const {
 *     isOnline,
 *     isSyncing,
 *     pendingCount,
 *     queueOperation,
 *     syncNow,
 *   } = useBackgroundSync({
 *     dbName: 'myapp-sync',
 *     executor: async (operation) => {
 *       const response = await fetch(operation.url, {
 *         method: operation.method,
 *         body: JSON.stringify(operation.payload),
 *       });
 *       return { success: response.ok, operation };
 *     },
 *     onSyncComplete: (result) => {
 *       toast.success('Synced successfully');
 *     },
 *   });
 *
 *   const handleSave = async (data) => {
 *     await queueOperation({
 *       type: 'rental',
 *       method: 'POST',
 *       url: '/api/rentals',
 *       payload: data,
 *       priority: 'high',
 *       maxRetries: 3,
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <StatusIndicator online={isOnline} syncing={isSyncing} />
 *       {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBackgroundSync(
  options: UseBackgroundSyncOptions
): UseBackgroundSyncReturn {
  const {
    executor,
    conflictResolver,
    syncInterval = DEFAULT_SYNC_INTERVAL,
    autoSync = true,
    onSyncComplete,
    onSyncError,
    onConflict,
    ...queueConfig
  } = options;

  const queueRef = useRef<SyncQueue | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    conflicts: 0,
    isSyncing: false,
  });

  // Store options in refs
  const executorRef = useRef(executor);
  executorRef.current = executor;
  const conflictResolverRef = useRef(conflictResolver);
  conflictResolverRef.current = conflictResolver;
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;
  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;
  const onConflictRef = useRef(onConflict);
  onConflictRef.current = onConflict;

  // Initialize queue
  useEffect(() => {
    queueRef.current = new SyncQueue(queueConfig);

    const loadInitial = async () => {
      try {
        const pending = await queueRef.current!.countPending();
        setPendingCount(pending);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize sync queue'));
        setIsLoading(false);
      }
    };

    loadInitial();

    return () => {
      queueRef.current?.close();
      queueRef.current = null;
    };
  }, [queueConfig.dbName, queueConfig.dbVersion]);

  // Online status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!queueRef.current) return;
    const count = await queueRef.current.countPending();
    setPendingCount(count);
  }, []);

  // Sync single operation
  const syncOperation = useCallback(
    async (operation: SyncOperation): Promise<SyncResult> => {
      if (!queueRef.current) {
        return {
          success: false,
          operation,
          error: new Error('Queue not initialized'),
        };
      }

      // Mark as syncing
      await queueRef.current.updateStatus(operation.id, 'syncing');

      try {
        const result = await executorRef.current(operation);

        if (result.success) {
          await queueRef.current.updateStatus(operation.id, 'completed');
          onSyncCompleteRef.current?.(result);
        } else if (result.conflict) {
          // Handle conflict
          await queueRef.current.setConflict(operation.id, result.conflict.serverData);
          onConflictRef.current?.(result.conflict);

          // Auto-resolve using Last-Write-Wins
          const resolution = await resolveConflict(
            result.conflict,
            conflictResolverRef.current
          );

          if (resolution.shouldSync && resolution.data !== undefined) {
            // Retry with resolved data
            const retryOp = {
              ...operation,
              payload: resolution.data,
              status: 'pending' as const,
            };
            return syncOperation(retryOp);
          }

          return result;
        } else {
          // Check if can retry
          const canRetry = await queueRef.current.canRetry(operation.id);
          if (canRetry) {
            await queueRef.current.incrementRetry(operation.id);
            await queueRef.current.updateStatus(operation.id, 'pending');
          } else {
            await queueRef.current.setFailed(
              operation.id,
              result.error?.message ?? 'Max retries exceeded'
            );
            onSyncErrorRef.current?.(operation, result.error ?? new Error('Sync failed'));
          }
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');

        // Check if can retry
        const canRetry = await queueRef.current.canRetry(operation.id);
        if (canRetry) {
          await queueRef.current.incrementRetry(operation.id);
          await queueRef.current.updateStatus(operation.id, 'pending');
        } else {
          await queueRef.current.setFailed(operation.id, error.message);
          onSyncErrorRef.current?.(operation, error);
        }

        return {
          success: false,
          operation,
          error,
        };
      }
    },
    []
  );

  // Sync all pending
  const syncNow = useCallback(async (): Promise<void> => {
    if (!queueRef.current || !isOnline || isSyncing || isPaused) {
      return;
    }

    setIsSyncing(true);

    try {
      const pending = await queueRef.current.getPending();

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      setProgress({
        total: pending.length,
        completed: 0,
        failed: 0,
        conflicts: 0,
        isSyncing: true,
      });

      let completed = 0;
      let failed = 0;
      let conflicts = 0;

      for (const operation of pending) {
        const result = await syncOperation(operation);

        if (result.success) {
          completed++;
        } else if (result.conflict) {
          conflicts++;
        } else {
          failed++;
        }

        setProgress({
          total: pending.length,
          completed,
          failed,
          conflicts,
          isSyncing: true,
          currentOperation: operation,
        });
      }

      // Remove completed operations
      await queueRef.current.removeCompleted();

      setProgress((prev) => ({ ...prev, isSyncing: false }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sync failed'));
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, isSyncing, isPaused, syncOperation, updatePendingCount]);

  // Auto sync interval
  useEffect(() => {
    if (!autoSync || isPaused) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Sync immediately when coming online
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncNow();
    }

    // Set up interval
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && !isSyncing && !isPaused) {
        syncNow();
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, isOnline, isPaused, pendingCount, isSyncing, syncInterval, syncNow]);

  // Queue operation
  const queueOperation = useCallback(
    async (
      operation: Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>
    ): Promise<string> => {
      if (!queueRef.current) {
        throw new Error('Queue not initialized');
      }

      const id = await queueRef.current.add(operation);
      await updatePendingCount();
      return id;
    },
    [updatePendingCount]
  );

  // Pause sync
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume sync
  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Clear queue
  const clearQueue = useCallback(async (): Promise<void> => {
    if (!queueRef.current) return;
    await queueRef.current.clear();
    await updatePendingCount();
  }, [updatePendingCount]);

  return {
    isLoading,
    isOnline,
    isSyncing,
    isPaused,
    pendingCount,
    progress,
    error,
    queueOperation,
    syncNow,
    pause,
    resume,
    clearQueue,
  };
}
