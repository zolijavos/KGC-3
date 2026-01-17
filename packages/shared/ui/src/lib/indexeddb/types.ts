/**
 * IndexedDB types and interfaces for type-safe operations
 */

export interface StoreConfig {
  /** Database name */
  name: string;
  /** Database version (for migrations) */
  version: number;
  /** Store definitions */
  stores: StoreDefinition[];
}

export interface StoreDefinition {
  /** Store name */
  name: string;
  /** Key path (e.g., 'id') */
  keyPath: string;
  /** Whether to auto-increment the key */
  autoIncrement?: boolean;
  /** Index definitions */
  indexes?: IndexDefinition[];
}

export interface IndexDefinition {
  /** Index name */
  name: string;
  /** Key path for the index */
  keyPath: string | string[];
  /** Index options */
  options?: IDBIndexParameters;
}

export interface CacheRecord<T> {
  /** The cached data */
  data: T;
  /** Timestamp when the record was cached */
  cachedAt: number;
  /** Time-to-live in milliseconds (optional) */
  ttl?: number;
  /** Version of the cached data */
  version?: number;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Version identifier */
  version?: number;
}

export interface QueryOptions {
  /** Index to use for query */
  index?: string;
  /** Only return first N results */
  limit?: number;
  /** Skip first N results */
  offset?: number;
  /** Sort direction */
  direction?: IDBCursorDirection;
}

export type TransactionMode = 'readonly' | 'readwrite';
