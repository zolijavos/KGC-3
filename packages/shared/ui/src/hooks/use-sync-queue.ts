import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncQueue } from '../lib/sync';
import type {
  SyncOperation,
  SyncQueueConfig,
  SyncStatus,
} from '../lib/sync';

export interface UseSyncQueueReturn {
  /** All operations in the queue */
  operations: SyncOperation[];
  /** Number of pending operations */
  pendingCount: number;
  /** Whether the queue is loading */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether IndexedDB is supported */
  isSupported: boolean;
  /** Add an operation to the queue */
  add: (
    operation: Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>
  ) => Promise<string>;
  /** Remove an operation from the queue */
  remove: (id: string) => Promise<void>;
  /** Clear all operations */
  clear: () => Promise<void>;
  /** Update operation status */
  updateStatus: (id: string, status: SyncStatus) => Promise<void>;
  /** Mark operation as failed */
  setFailed: (id: string, errorMessage: string) => Promise<void>;
  /** Get pending operations */
  getPending: () => Promise<SyncOperation[]>;
  /** Reload operations from database */
  reload: () => Promise<void>;
}

/**
 * Hook for managing a sync queue with IndexedDB persistence.
 *
 * @example
 * ```tsx
 * function OfflineManager() {
 *   const {
 *     operations,
 *     pendingCount,
 *     add,
 *     remove,
 *   } = useSyncQueue({
 *     dbName: 'myapp-sync',
 *     onFailed: (op) => toast.error(`Sync failed: ${op.errorMessage}`),
 *   });
 *
 *   const handleSave = async (data) => {
 *     // Queue the operation for background sync
 *     await add({
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
 *       <Badge>{pendingCount} pending</Badge>
 *       {operations.map(op => (
 *         <div key={op.id}>{op.type} - {op.status}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncQueue(config: SyncQueueConfig = {}): UseSyncQueueReturn {
  const queueRef = useRef<SyncQueue | null>(null);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSupported] = useState(() => SyncQueue.isSupported());

  // Store config in ref to avoid re-initialization
  const configRef = useRef(config);
  configRef.current = config;

  // Initialize queue
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    queueRef.current = new SyncQueue(configRef.current);

    // Load initial operations
    const loadOperations = async () => {
      try {
        const ops = await queueRef.current!.getAll();
        setOperations(ops);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load sync queue'));
        setIsLoading(false);
      }
    };

    loadOperations();

    return () => {
      queueRef.current?.close();
      queueRef.current = null;
    };
  }, [isSupported, config.dbName, config.dbVersion]);

  const reload = useCallback(async (): Promise<void> => {
    if (!queueRef.current || !isSupported) {
      return;
    }

    setIsLoading(true);
    try {
      const ops = await queueRef.current.getAll();
      setOperations(ops);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reload sync queue'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const add = useCallback(
    async (
      operation: Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'>
    ): Promise<string> => {
      if (!queueRef.current) {
        throw new Error('Sync queue not initialized');
      }

      const id = await queueRef.current.add(operation);
      await reload();
      return id;
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!queueRef.current) {
        throw new Error('Sync queue not initialized');
      }

      await queueRef.current.remove(id);
      await reload();
    },
    [reload]
  );

  const clear = useCallback(async (): Promise<void> => {
    if (!queueRef.current) {
      throw new Error('Sync queue not initialized');
    }

    await queueRef.current.clear();
    await reload();
  }, [reload]);

  const updateStatus = useCallback(
    async (id: string, status: SyncStatus): Promise<void> => {
      if (!queueRef.current) {
        throw new Error('Sync queue not initialized');
      }

      await queueRef.current.updateStatus(id, status);
      await reload();
    },
    [reload]
  );

  const setFailed = useCallback(
    async (id: string, errorMessage: string): Promise<void> => {
      if (!queueRef.current) {
        throw new Error('Sync queue not initialized');
      }

      await queueRef.current.setFailed(id, errorMessage);
      await reload();
    },
    [reload]
  );

  const getPending = useCallback(async (): Promise<SyncOperation[]> => {
    if (!queueRef.current) {
      return [];
    }

    return queueRef.current.getPending();
  }, []);

  const pendingCount = operations.filter((op) => op.status === 'pending').length;

  return {
    operations,
    pendingCount,
    isLoading,
    error,
    isSupported,
    add,
    remove,
    clear,
    updateStatus,
    setFailed,
    getPending,
    reload,
  };
}
