import type {
  SyncOperation,
  ConflictInfo,
  ConflictResolution,
  ConflictResolver,
} from './types';

/**
 * Result of resolving a conflict
 */
export interface ConflictResolutionResult<T = unknown> {
  /** The resolved data to use */
  data: T | undefined;
  /** The resolution strategy applied */
  resolution: ConflictResolution;
  /** Whether the resolved data should be synced to server */
  shouldSync: boolean;
  /** Whether user input is required */
  requiresUserInput?: boolean;
}

/**
 * Create conflict info from a sync operation and server response.
 *
 * @param operation - The sync operation that caused the conflict
 * @param serverData - The server's current data
 * @param serverTimestamp - The server's data timestamp
 * @returns ConflictInfo object
 */
export function createConflictInfo<T>(
  operation: SyncOperation<T>,
  serverData: unknown,
  serverTimestamp: number
): ConflictInfo<T> {
  return {
    operation,
    clientData: operation.payload,
    serverData,
    clientTimestamp: operation.metadata?.clientVersion ?? operation.createdAt,
    serverTimestamp,
    resolution: undefined,
  };
}

/**
 * Last-Write-Wins conflict resolution strategy.
 * Compares timestamps and returns the resolution.
 * If timestamps are equal, server wins (server is source of truth).
 *
 * @param conflict - The conflict info
 * @returns 'client-wins' or 'server-wins'
 */
export function lastWriteWins<T>(conflict: ConflictInfo<T>): 'client-wins' | 'server-wins' {
  if (conflict.clientTimestamp > conflict.serverTimestamp) {
    return 'client-wins';
  }
  return 'server-wins';
}

/**
 * Merge two objects with client taking precedence on conflicts.
 * This is a shallow merge - for deep merge, use a custom resolver.
 */
function mergeData<T>(clientData: T, serverData: unknown): T {
  if (typeof clientData !== 'object' || clientData === null) {
    return clientData;
  }
  if (typeof serverData !== 'object' || serverData === null) {
    return clientData;
  }
  return { ...serverData, ...clientData } as T;
}

/**
 * Resolve a conflict using the specified or default strategy.
 *
 * @param conflict - The conflict info (may have resolution pre-set)
 * @param customResolver - Optional custom resolver function
 * @returns Resolution result with data and sync instructions
 */
export async function resolveConflict<T>(
  conflict: ConflictInfo<T>,
  customResolver?: ConflictResolver
): Promise<ConflictResolutionResult<T>> {
  // Determine resolution strategy
  let resolution = conflict.resolution;

  if (!resolution) {
    if (customResolver) {
      resolution = await customResolver(conflict);
    } else {
      resolution = lastWriteWins(conflict);
    }
  }

  // Apply resolution
  switch (resolution) {
    case 'client-wins':
      return {
        data: conflict.clientData,
        resolution: 'client-wins',
        shouldSync: true, // Need to push client data to server
      };

    case 'server-wins':
      return {
        data: conflict.serverData as T,
        resolution: 'server-wins',
        shouldSync: false, // Server already has correct data
      };

    case 'merge':
      return {
        data: mergeData(conflict.clientData, conflict.serverData),
        resolution: 'merge',
        shouldSync: true, // Need to push merged data
      };

    case 'manual':
      return {
        data: undefined,
        resolution: 'manual',
        shouldSync: false,
        requiresUserInput: true,
      };

    default:
      // Fallback to last-write-wins
      const fallback = lastWriteWins(conflict);
      return resolveConflict({ ...conflict, resolution: fallback });
  }
}
