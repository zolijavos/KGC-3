/**
 * Generic IndexedDB store wrapper with type-safe operations.
 *
 * @example
 * ```typescript
 * const store = new IndexedDBStore({
 *   name: 'myapp',
 *   version: 1,
 *   stores: [
 *     {
 *       name: 'users',
 *       keyPath: 'id',
 *       indexes: [{ name: 'email', keyPath: 'email', options: { unique: true } }],
 *     },
 *   ],
 * });
 *
 * await store.open();
 * await store.put('users', { id: '1', name: 'John', email: 'john@example.com' });
 * const user = await store.get('users', '1');
 * ```
 */

import type { StoreConfig, QueryOptions, TransactionMode } from './types';

export class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private config: StoreConfig;
  private openPromise: Promise<IDBDatabase> | null = null;

  constructor(config: StoreConfig) {
    this.config = config;
  }

  /**
   * Check if IndexedDB is supported in the current environment.
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Open the database connection.
   */
  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    // Reuse existing open promise to prevent race conditions
    if (this.openPromise) {
      return this.openPromise;
    }

    if (!IndexedDBStore.isSupported()) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        this.openPromise = null;
        reject(new Error(`Failed to open database: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.openPromise = null;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });

    return this.openPromise;
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database.
   */
  async delete(): Promise<void> {
    this.close();

    if (!IndexedDBStore.isSupported()) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.name);

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get a record by key from a store.
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get record: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };
    });
  }

  /**
   * Get all records from a store.
   */
  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const target = options?.index ? store.index(options.index) : store;

      // If we need limit/offset, use cursor
      if (options?.limit !== undefined || options?.offset !== undefined) {
        const results: T[] = [];
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? Infinity;
        let count = 0;

        const cursorRequest = target.openCursor(null, options?.direction);

        cursorRequest.onerror = () => {
          reject(new Error(`Failed to get records: ${cursorRequest.error?.message ?? 'Unknown error'}`));
        };

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor) {
            if (count >= offset && results.length < limit) {
              results.push(cursor.value as T);
            }
            count++;
            if (results.length < limit) {
              cursor.continue();
            } else {
              resolve(results);
            }
          } else {
            resolve(results);
          }
        };
      } else {
        const request = target.getAll();

        request.onerror = () => {
          reject(new Error(`Failed to get records: ${request.error?.message ?? 'Unknown error'}`));
        };

        request.onsuccess = () => {
          resolve(request.result as T[]);
        };
      }
    });
  }

  /**
   * Add or update a record in a store.
   */
  async put<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = key !== undefined ? store.put(value, key) : store.put(value);

      request.onerror = () => {
        reject(new Error(`Failed to put record: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Add a new record to a store (fails if key exists).
   */
  async add<T>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = key !== undefined ? store.add(value, key) : store.add(value);

      request.onerror = () => {
        reject(new Error(`Failed to add record: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Delete a record from a store.
   */
  async remove(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error(`Failed to delete record: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all records from a store.
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get the count of records in a store.
   */
  async count(storeName: string): Promise<number> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => {
        reject(new Error(`Failed to count records: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Perform multiple operations in a single transaction.
   */
  async transaction<T>(
    storeNames: string | string[],
    mode: TransactionMode,
    callback: (stores: Map<string, IDBObjectStore>) => Promise<T>
  ): Promise<T> {
    const db = await this.open();
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(names, mode);
      const stores = new Map<string, IDBObjectStore>();

      for (const name of names) {
        stores.set(name, transaction.objectStore(name));
      }

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message ?? 'Unknown error'}`));
      };

      transaction.oncomplete = () => {
        // Result will be set by the callback
      };

      callback(stores)
        .then(resolve)
        .catch((error) => {
          transaction.abort();
          reject(error);
        });
    });
  }

  /**
   * Bulk put operation for multiple records.
   */
  async bulkPut<T>(storeName: string, values: T[]): Promise<IDBValidKey[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const keys: IDBValidKey[] = [];

      transaction.onerror = () => {
        reject(new Error(`Bulk put failed: ${transaction.error?.message ?? 'Unknown error'}`));
      };

      transaction.oncomplete = () => {
        resolve(keys);
      };

      for (const value of values) {
        const request = store.put(value);
        request.onsuccess = () => {
          keys.push(request.result);
        };
      }
    });
  }

  /**
   * Bulk delete operation for multiple keys.
   */
  async bulkRemove(storeName: string, keys: IDBValidKey[]): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => {
        reject(new Error(`Bulk delete failed: ${transaction.error?.message ?? 'Unknown error'}`));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const key of keys) {
        store.delete(key);
      }
    });
  }

  /**
   * Query records by index value.
   */
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => {
        reject(new Error(`Failed to query by index: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
    });
  }

  /**
   * Create stores and indexes during database upgrade.
   */
  private createStores(db: IDBDatabase): void {
    for (const storeConfig of this.config.stores) {
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(storeConfig.name)) {
        const store = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement,
        });

        // Create indexes
        if (storeConfig.indexes) {
          for (const indexConfig of storeConfig.indexes) {
            store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
          }
        }
      }
    }
  }
}
