import { IndexedDBStore } from '../indexeddb';
import type { StoreConfig } from '../indexeddb';
import type {
  SyncOperation,
  SyncQueueConfig,
  SyncStatus,
  SyncPriority,
} from './types';

const DEFAULT_DB_NAME = 'kgc-sync-queue';
const DEFAULT_DB_VERSION = 1;
const DEFAULT_STORE_NAME = 'sync-operations';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000;
const DEFAULT_MAX_DELAY = 30000;

// Priority weights for sorting (higher = process first)
const PRIORITY_WEIGHTS: Record<SyncPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Generates a unique ID for sync operations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sync queue with IndexedDB persistence for offline operations.
 *
 * @example
 * ```ts
 * const queue = new SyncQueue({ dbName: 'myapp-sync' });
 *
 * // Add an operation
 * const id = await queue.add({
 *   type: 'rental',
 *   method: 'POST',
 *   url: '/api/rentals',
 *   payload: { customerId: '123', equipmentId: '456' },
 *   priority: 'high',
 *   maxRetries: 3,
 * });
 *
 * // Get pending operations
 * const pending = await queue.getPending();
 *
 * // Update status after sync
 * await queue.updateStatus(id, 'completed');
 * ```
 */
export class SyncQueue {
  private store: IndexedDBStore;
  private config: Required<Omit<SyncQueueConfig, 'onComplete' | 'onConflict' | 'onFailed'>> & {
    onComplete?: SyncQueueConfig['onComplete'];
    onConflict?: SyncQueueConfig['onConflict'];
    onFailed?: SyncQueueConfig['onFailed'];
  };

  constructor(config: SyncQueueConfig = {}) {
    this.config = {
      dbName: config.dbName ?? DEFAULT_DB_NAME,
      dbVersion: config.dbVersion ?? DEFAULT_DB_VERSION,
      storeName: config.storeName ?? DEFAULT_STORE_NAME,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelay: config.baseDelay ?? DEFAULT_BASE_DELAY,
      maxDelay: config.maxDelay ?? DEFAULT_MAX_DELAY,
      onComplete: config.onComplete,
      onConflict: config.onConflict,
      onFailed: config.onFailed,
    };

    const storeConfig: StoreConfig = {
      name: this.config.dbName,
      version: this.config.dbVersion,
      stores: [
        {
          name: this.config.storeName,
          keyPath: 'id',
          indexes: [
            { name: 'status', keyPath: 'status' },
            { name: 'type', keyPath: 'type' },
            { name: 'priority', keyPath: 'priority' },
            { name: 'createdAt', keyPath: 'createdAt' },
          ],
        },
      ],
    };

    this.store = new IndexedDBStore(storeConfig);
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return IndexedDBStore.isSupported();
  }

  /**
   * Add a new operation to the queue
   */
  async add<T>(
    operation: Omit<SyncOperation<T>, 'id' | 'createdAt' | 'status' | 'retryCount'>
  ): Promise<string> {
    const id = generateId();
    const fullOperation: SyncOperation<T> = {
      ...operation,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    await this.store.put(this.config.storeName, fullOperation);
    return id;
  }

  /**
   * Get an operation by ID
   */
  async get<T>(id: string): Promise<SyncOperation<T> | undefined> {
    return this.store.get<SyncOperation<T>>(this.config.storeName, id);
  }

  /**
   * Get all operations
   */
  async getAll<T>(): Promise<SyncOperation<T>[]> {
    return this.store.getAll<SyncOperation<T>>(this.config.storeName);
  }

  /**
   * Get all pending operations, sorted by priority then createdAt
   */
  async getPending<T>(): Promise<SyncOperation<T>[]> {
    const all = await this.getAll<T>();
    return all
      .filter((op) => op.status === 'pending')
      .sort((a, b) => {
        // Higher priority first
        const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Earlier created first
        return a.createdAt - b.createdAt;
      });
  }

  /**
   * Get operations by type
   */
  async getByType<T>(type: string): Promise<SyncOperation<T>[]> {
    return this.store.getByIndex<SyncOperation<T>>(this.config.storeName, 'type', type);
  }

  /**
   * Get operations by status
   */
  async getByStatus<T>(status: SyncStatus): Promise<SyncOperation<T>[]> {
    return this.store.getByIndex<SyncOperation<T>>(this.config.storeName, 'status', status);
  }

  /**
   * Update operation status
   */
  async updateStatus(id: string, status: SyncStatus): Promise<void> {
    const op = await this.get(id);
    if (op) {
      await this.store.put(this.config.storeName, { ...op, status });
    }
  }

  /**
   * Increment retry count and set lastAttemptAt
   */
  async incrementRetry(id: string): Promise<void> {
    const op = await this.get(id);
    if (op) {
      await this.store.put(this.config.storeName, {
        ...op,
        retryCount: op.retryCount + 1,
        lastAttemptAt: Date.now(),
      });
    }
  }

  /**
   * Mark operation as failed with error message
   */
  async setFailed(id: string, errorMessage: string): Promise<void> {
    const op = await this.get(id);
    if (op) {
      await this.store.put(this.config.storeName, {
        ...op,
        status: 'failed' as SyncStatus,
        errorMessage,
      });
      this.config.onFailed?.(op);
    }
  }

  /**
   * Mark operation as having a conflict with server data
   */
  async setConflict<T>(id: string, serverData: unknown): Promise<void> {
    const op = await this.get<T>(id);
    if (op) {
      await this.store.put(this.config.storeName, {
        ...op,
        status: 'conflict' as SyncStatus,
        conflictData: serverData,
      });
    }
  }

  /**
   * Remove an operation
   */
  async remove(id: string): Promise<void> {
    await this.store.remove(this.config.storeName, id);
  }

  /**
   * Remove all completed operations
   */
  async removeCompleted(): Promise<void> {
    const completed = await this.getByStatus('completed');
    for (const op of completed) {
      await this.remove(op.id);
    }
  }

  /**
   * Clear all operations
   */
  async clear(): Promise<void> {
    await this.store.clear(this.config.storeName);
  }

  /**
   * Count total operations
   */
  async count(): Promise<number> {
    return this.store.count(this.config.storeName);
  }

  /**
   * Count pending operations
   */
  async countPending(): Promise<number> {
    const pending = await this.getByStatus('pending');
    return pending.length;
  }

  /**
   * Count operations by status
   */
  async countByStatus(status: SyncStatus): Promise<number> {
    const ops = await this.getByStatus(status);
    return ops.length;
  }

  /**
   * Check if an operation can be retried
   */
  async canRetry(id: string): Promise<boolean> {
    const op = await this.get(id);
    if (!op) return false;
    return op.retryCount < op.maxRetries;
  }

  /**
   * Calculate exponential backoff delay for retry
   */
  getRetryDelay(retryCount: number): number {
    const delay = this.config.baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.store.close();
  }
}
