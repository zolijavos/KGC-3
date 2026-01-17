// Sync types
export type {
  SyncMethod,
  SyncStatus,
  SyncPriority,
  SyncOperation,
  SyncOperationMetadata,
  ConflictInfo,
  ConflictResolution,
  SyncResult,
  SyncQueueConfig,
  SyncProgress,
  SyncExecutor,
  ConflictResolver,
} from './types';

// Sync queue
export { SyncQueue } from './queue';

// Conflict resolution
export {
  createConflictInfo,
  lastWriteWins,
  resolveConflict,
} from './conflict-resolution';
export type { ConflictResolutionResult } from './conflict-resolution';
