import { useState, useEffect, useCallback, useRef } from 'react';
import { IndexedDBStore } from '../lib/indexeddb';
import type { StoreConfig, QueryOptions } from '../lib/indexeddb';

export interface UseIndexedDBState<T> {
  /** Data from the store */
  data: T[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether IndexedDB is supported */
  isSupported: boolean;
}

export interface UseIndexedDBReturn<T> extends UseIndexedDBState<T> {
  /** Get a record by key */
  get: (key: IDBValidKey) => Promise<T | undefined>;
  /** Get all records with optional query options */
  getAll: (options?: QueryOptions) => Promise<T[]>;
  /** Add or update a record */
  put: (value: T, key?: IDBValidKey) => Promise<IDBValidKey>;
  /** Add a new record (fails if key exists) */
  add: (value: T, key?: IDBValidKey) => Promise<IDBValidKey>;
  /** Remove a record by key */
  remove: (key: IDBValidKey) => Promise<void>;
  /** Clear all records */
  clear: () => Promise<void>;
  /** Reload data from store */
  reload: () => Promise<void>;
  /** Count records in store */
  count: () => Promise<number>;
  /** Bulk put multiple records */
  bulkPut: (values: T[]) => Promise<IDBValidKey[]>;
  /** Bulk remove multiple records */
  bulkRemove: (keys: IDBValidKey[]) => Promise<void>;
  /** Query by index */
  getByIndex: (indexName: string, value: IDBValidKey) => Promise<T[]>;
}

/**
 * Hook for working with IndexedDB stores.
 *
 * @example
 * ```tsx
 * const config: StoreConfig = {
 *   name: 'myapp',
 *   version: 1,
 *   stores: [{ name: 'users', keyPath: 'id' }],
 * };
 *
 * function UserList() {
 *   const { data, isLoading, put, remove } = useIndexedDB<User>(config, 'users');
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <ul>
 *       {data.map(user => (
 *         <li key={user.id}>
 *           {user.name}
 *           <button onClick={() => remove(user.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useIndexedDB<T>(
  config: StoreConfig,
  storeName: string,
  autoLoad = true
): UseIndexedDBReturn<T> {
  const storeRef = useRef<IndexedDBStore | null>(null);
  const [state, setState] = useState<UseIndexedDBState<T>>({
    data: [],
    isLoading: autoLoad,
    error: null,
    isSupported: IndexedDBStore.isSupported(),
  });

  // Store config in a ref to avoid re-creating store on config object changes
  const configRef = useRef(config);
  configRef.current = config;

  // Initialize store - only recreate when database name or version changes
  useEffect(() => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    storeRef.current = new IndexedDBStore(configRef.current);

    return () => {
      storeRef.current?.close();
      storeRef.current = null;
    };
    // Only reinitialize when the database identity changes, not on every config object change
  }, [config.name, config.version, state.isSupported]);

  // Load data on mount
  const reload = useCallback(async (): Promise<void> => {
    if (!storeRef.current || !state.isSupported) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await storeRef.current.getAll<T>(storeName);
      setState((prev) => ({ ...prev, data, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to load data'),
        isLoading: false,
      }));
    }
  }, [storeName, state.isSupported]);

  useEffect(() => {
    if (autoLoad && state.isSupported && storeRef.current) {
      reload();
    }
  }, [autoLoad, state.isSupported, reload]);

  const get = useCallback(
    async (key: IDBValidKey): Promise<T | undefined> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      return storeRef.current.get<T>(storeName, key);
    },
    [storeName]
  );

  const getAll = useCallback(
    async (options?: QueryOptions): Promise<T[]> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      return storeRef.current.getAll<T>(storeName, options);
    },
    [storeName]
  );

  const put = useCallback(
    async (value: T, key?: IDBValidKey): Promise<IDBValidKey> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      const result = await storeRef.current.put<T>(storeName, value, key);
      await reload();
      return result;
    },
    [storeName, reload]
  );

  const add = useCallback(
    async (value: T, key?: IDBValidKey): Promise<IDBValidKey> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      const result = await storeRef.current.add<T>(storeName, value, key);
      await reload();
      return result;
    },
    [storeName, reload]
  );

  const remove = useCallback(
    async (key: IDBValidKey): Promise<void> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      await storeRef.current.remove(storeName, key);
      await reload();
    },
    [storeName, reload]
  );

  const clear = useCallback(async (): Promise<void> => {
    if (!storeRef.current) {
      throw new Error('IndexedDB store not initialized');
    }
    await storeRef.current.clear(storeName);
    await reload();
  }, [storeName, reload]);

  const count = useCallback(async (): Promise<number> => {
    if (!storeRef.current) {
      throw new Error('IndexedDB store not initialized');
    }
    return storeRef.current.count(storeName);
  }, [storeName]);

  const bulkPut = useCallback(
    async (values: T[]): Promise<IDBValidKey[]> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      const result = await storeRef.current.bulkPut<T>(storeName, values);
      await reload();
      return result;
    },
    [storeName, reload]
  );

  const bulkRemove = useCallback(
    async (keys: IDBValidKey[]): Promise<void> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      await storeRef.current.bulkRemove(storeName, keys);
      await reload();
    },
    [storeName, reload]
  );

  const getByIndex = useCallback(
    async (indexName: string, value: IDBValidKey): Promise<T[]> => {
      if (!storeRef.current) {
        throw new Error('IndexedDB store not initialized');
      }
      return storeRef.current.getByIndex<T>(storeName, indexName, value);
    },
    [storeName]
  );

  return {
    ...state,
    get,
    getAll,
    put,
    add,
    remove,
    clear,
    reload,
    count,
    bulkPut,
    bulkRemove,
    getByIndex,
  };
}
