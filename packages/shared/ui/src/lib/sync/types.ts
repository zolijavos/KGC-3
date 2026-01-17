/**
 * Sync types for background sync and conflict resolution
 */

/** HTTP methods for sync operations */
export type SyncMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Status of a sync operation */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';

/** Priority levels for sync operations */
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * A sync operation that needs to be synchronized with the server
 */
export interface SyncOperation<T = unknown> {
  /** Unique identifier for this operation */
  id: string;
  /** Type/category of operation (e.g., 'rental', 'invoice', 'partner') */
  type: string;
  /** HTTP method */
  method: SyncMethod;
  /** API endpoint URL */
  url: string;
  /** Request payload */
  payload: T;
  /** Current status */
  status: SyncStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries: number;
  /** Priority level */
  priority: SyncPriority;
  /** Timestamp when operation was created */
  createdAt: number;
  /** Timestamp of last sync attempt */
  lastAttemptAt?: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Server response if conflict occurred */
  conflictData?: unknown;
  /** Metadata for conflict resolution (e.g., entity ID, version) */
  metadata?: SyncOperationMetadata;
}

/**
 * Metadata for sync operations
 */
export interface SyncOperationMetadata {
  /** Entity ID being modified */
  entityId?: string;
  /** Entity type (e.g., 'rental', 'partner') */
  entityType?: string;
  /** Client-side version/timestamp */
  clientVersion?: number;
  /** Server-side version (if known) */
  serverVersion?: number;
  /** Tenant ID for multi-tenant context */
  tenantId?: string;
}

/**
 * Conflict information when server and client data differ
 */
export interface ConflictInfo<T = unknown> {
  /** The sync operation that caused the conflict */
  operation: SyncOperation<T>;
  /** Client-side data */
  clientData: T;
  /** Server-side data */
  serverData: unknown;
  /** Timestamp of client data */
  clientTimestamp: number;
  /** Timestamp of server data */
  serverTimestamp: number;
  /** Resolution strategy to apply */
  resolution?: ConflictResolution;
}

/**
 * Conflict resolution strategies
 */
export type ConflictResolution =
  | 'client-wins'    // Use client data (Last-Write-Wins from client perspective)
  | 'server-wins'    // Use server data (discard local changes)
  | 'merge'          // Attempt to merge changes
  | 'manual';        // User must resolve manually

/**
 * Result of a sync attempt
 */
export interface SyncResult<T = unknown> {
  /** Whether the sync was successful */
  success: boolean;
  /** The operation that was synced */
  operation: SyncOperation<T>;
  /** Response data from server */
  response?: unknown;
  /** Error if sync failed */
  error?: Error;
  /** Conflict info if there was a conflict */
  conflict?: ConflictInfo<T>;
}

/**
 * Configuration for the sync queue
 */
export interface SyncQueueConfig {
  /** Database name for IndexedDB storage */
  dbName?: string;
  /** Database version */
  dbVersion?: number;
  /** Store name for operations */
  storeName?: string;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay for exponential backoff in ms (default: 30000) */
  maxDelay?: number;
  /** Callback when operation completes */
  onComplete?: (result: SyncResult) => void;
  /** Callback when conflict occurs */
  onConflict?: (conflict: ConflictInfo) => void;
  /** Callback when operation fails permanently */
  onFailed?: (operation: SyncOperation) => void;
}

/**
 * Progress information for sync operations
 */
export interface SyncProgress {
  /** Total number of pending operations */
  total: number;
  /** Number of completed operations */
  completed: number;
  /** Number of failed operations */
  failed: number;
  /** Number of operations with conflicts */
  conflicts: number;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Current operation being synced */
  currentOperation?: SyncOperation;
}

/**
 * Function type for executing sync operations
 */
export type SyncExecutor = <T>(operation: SyncOperation<T>) => Promise<SyncResult<T>>;

/**
 * Function type for conflict resolver
 */
export type ConflictResolver = <T>(conflict: ConflictInfo<T>) => Promise<ConflictResolution>;
