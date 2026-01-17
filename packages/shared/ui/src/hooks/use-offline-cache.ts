import { useState, useEffect, useCallback, useRef } from 'react';
import { IndexedDBStore } from '../lib/indexeddb';
import type { StoreConfig, CacheRecord, CacheOptions } from '../lib/indexeddb';

const DEFAULT_CACHE_STORE = 'cache';
const DEFAULT_DB_NAME = 'kgc-offline-cache';
const DEFAULT_DB_VERSION = 1;

export interface UseOfflineCacheOptions {
  /** Custom database name (default: 'kgc-offline-cache') */
  dbName?: string;
  /** Database version (default: 1) */
  dbVersion?: number;
  /** Store name (default: 'cache') */
  storeName?: string;
  /** Default TTL in milliseconds (default: no expiration) */
  defaultTTL?: number;
  /** Callback when data is fetched from network */
  onNetworkFetch?: (key: string, data: unknown) => void;
  /** Callback when data is served from cache */
  onCacheHit?: (key: string, data: unknown) => void;
  /** Callback when cache is stale */
  onCacheStale?: (key: string) => void;
}

export interface UseOfflineCacheReturn<T> {
  /** Get data from cache (returns undefined if not found or expired) */
  get: (key: string) => Promise<T | undefined>;
  /** Set data in cache with optional TTL */
  set: (key: string, data: T, options?: CacheOptions) => Promise<void>;
  /** Remove data from cache */
  remove: (key: string) => Promise<void>;
  /** Clear all cached data */
  clear: () => Promise<void>;
  /** Check if a key exists and is not expired */
  has: (key: string) => Promise<boolean>;
  /** Get data with fallback to network fetch */
  getOrFetch: (key: string, fetcher: () => Promise<T>, options?: CacheOptions) => Promise<T>;
  /** Invalidate cache entry (mark as stale) */
  invalidate: (key: string) => Promise<void>;
  /** Get cache metadata (TTL, version, cachedAt) */
  getMeta: (key: string) => Promise<Omit<CacheRecord<T>, 'data'> | undefined>;
  /** Whether IndexedDB is supported */
  isSupported: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook for offline-first caching with TTL support.
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }) {
 *   const cache = useOfflineCache<User>({ defaultTTL: 5 * 60 * 1000 }); // 5 min TTL
 *
 *   const [user, setUser] = useState<User | null>(null);
 *
 *   useEffect(() => {
 *     cache.getOrFetch(
 *       `user:${userId}`,
 *       () => fetch(`/api/users/${userId}`).then(r => r.json())
 *     ).then(setUser);
 *   }, [userId, cache]);
 *
 *   return user ? <div>{user.name}</div> : <div>Loading...</div>;
 * }
 * ```
 */
export function useOfflineCache<T>(
  options: UseOfflineCacheOptions = {}
): UseOfflineCacheReturn<T> {
  const {
    dbName = DEFAULT_DB_NAME,
    dbVersion = DEFAULT_DB_VERSION,
    storeName = DEFAULT_CACHE_STORE,
    defaultTTL,
    onNetworkFetch,
    onCacheHit,
    onCacheStale,
  } = options;

  const storeRef = useRef<IndexedDBStore | null>(null);
  const [isSupported] = useState(() => IndexedDBStore.isSupported());
  const [error, setError] = useState<Error | null>(null);

  // Initialize store
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const config: StoreConfig = {
      name: dbName,
      version: dbVersion,
      stores: [
        {
          name: storeName,
          keyPath: 'key',
          indexes: [
            { name: 'cachedAt', keyPath: 'cachedAt' },
          ],
        },
      ],
    };

    storeRef.current = new IndexedDBStore(config);

    return () => {
      storeRef.current?.close();
      storeRef.current = null;
    };
  }, [dbName, dbVersion, storeName, isSupported]);

  const isExpired = useCallback((record: CacheRecord<T>): boolean => {
    // Check for undefined explicitly since ttl: 0 should mean "expired immediately"
    if (record.ttl === undefined) {
      return false;
    }
    // Use >= so that ttl: 0 is immediately expired even in the same millisecond
    return Date.now() >= record.cachedAt + record.ttl;
  }, []);

  const get = useCallback(
    async (key: string): Promise<T | undefined> => {
      if (!storeRef.current || !isSupported) {
        return undefined;
      }

      try {
        const record = await storeRef.current.get<CacheRecord<T> & { key: string }>(
          storeName,
          key
        );

        if (!record) {
          return undefined;
        }

        if (isExpired(record)) {
          onCacheStale?.(key);
          // Don't delete, let getOrFetch handle refresh
          return undefined;
        }

        onCacheHit?.(key, record.data);
        return record.data;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get from cache'));
        return undefined;
      }
    },
    [storeName, isSupported, isExpired, onCacheHit, onCacheStale]
  );

  const set = useCallback(
    async (key: string, data: T, cacheOptions?: CacheOptions): Promise<void> => {
      if (!storeRef.current || !isSupported) {
        return;
      }

      try {
        const record: CacheRecord<T> & { key: string } = {
          key,
          data,
          cachedAt: Date.now(),
          ttl: cacheOptions?.ttl ?? defaultTTL,
          version: cacheOptions?.version,
        };

        await storeRef.current.put(storeName, record);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to set cache'));
      }
    },
    [storeName, isSupported, defaultTTL]
  );

  const remove = useCallback(
    async (key: string): Promise<void> => {
      if (!storeRef.current || !isSupported) {
        return;
      }

      try {
        await storeRef.current.remove(storeName, key);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove from cache'));
      }
    },
    [storeName, isSupported]
  );

  const clear = useCallback(async (): Promise<void> => {
    if (!storeRef.current || !isSupported) {
      return;
    }

    try {
      await storeRef.current.clear(storeName);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear cache'));
    }
  }, [storeName, isSupported]);

  const has = useCallback(
    async (key: string): Promise<boolean> => {
      if (!storeRef.current || !isSupported) {
        return false;
      }

      try {
        const record = await storeRef.current.get<CacheRecord<T> & { key: string }>(
          storeName,
          key
        );

        if (!record) {
          return false;
        }

        return !isExpired(record);
      } catch {
        return false;
      }
    },
    [storeName, isSupported, isExpired]
  );

  const getOrFetch = useCallback(
    async (key: string, fetcher: () => Promise<T>, cacheOptions?: CacheOptions): Promise<T> => {
      // Try to get from cache first
      const cached = await get(key);
      if (cached !== undefined) {
        return cached;
      }

      // Fetch from network
      const data = await fetcher();
      onNetworkFetch?.(key, data);

      // Store in cache
      await set(key, data, cacheOptions);

      return data;
    },
    [get, set, onNetworkFetch]
  );

  const invalidate = useCallback(
    async (key: string): Promise<void> => {
      if (!storeRef.current || !isSupported) {
        return;
      }

      try {
        const record = await storeRef.current.get<CacheRecord<T> & { key: string }>(
          storeName,
          key
        );

        if (record) {
          // Set TTL to 0 to mark as expired
          await storeRef.current.put(storeName, {
            ...record,
            ttl: 0,
          });
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to invalidate cache'));
      }
    },
    [storeName, isSupported]
  );

  const getMeta = useCallback(
    async (key: string): Promise<Omit<CacheRecord<T>, 'data'> | undefined> => {
      if (!storeRef.current || !isSupported) {
        return undefined;
      }

      try {
        const record = await storeRef.current.get<CacheRecord<T> & { key: string }>(
          storeName,
          key
        );

        if (!record) {
          return undefined;
        }

        return {
          cachedAt: record.cachedAt,
          ttl: record.ttl,
          version: record.version,
        };
      } catch {
        return undefined;
      }
    },
    [storeName, isSupported]
  );

  return {
    get,
    set,
    remove,
    clear,
    has,
    getOrFetch,
    invalidate,
    getMeta,
    isSupported,
    error,
  };
}
