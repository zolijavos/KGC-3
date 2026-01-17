import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useIndexedDB } from '../../src/hooks/use-indexed-db';
import { IndexedDBStore } from '../../src/lib/indexeddb';
import type { StoreConfig } from '../../src/lib/indexeddb';

interface TestUser {
  id: string;
  name: string;
  email: string;
}

// Use unique db names per test to avoid conflicts
let testCounter = 0;
const createTestConfig = (): StoreConfig => ({
  name: `test-hook-db-${testCounter++}`,
  version: 1,
  stores: [
    {
      name: 'users',
      keyPath: 'id',
      indexes: [{ name: 'email', keyPath: 'email', options: { unique: true } }],
    },
  ],
});

describe('useIndexedDB hook', () => {
  describe('initialization', () => {
    it('should initialize with empty data', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should indicate IndexedDB is supported', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      expect(result.current.isSupported).toBe(true);
    });

    it('should not auto-load when autoLoad is false', () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users', false));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    it('should add and retrieve a record', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com' };

      await act(async () => {
        await result.current.put(user);
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
      });

      expect(result.current.data[0]).toEqual(user);
    });

    it('should get a specific record', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com' };

      await act(async () => {
        await result.current.put(user);
      });

      let fetchedUser: TestUser | undefined;
      await act(async () => {
        fetchedUser = await result.current.get('1');
      });

      expect(fetchedUser).toEqual(user);
    });

    it('should remove a record', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com' };

      await act(async () => {
        await result.current.put(user);
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
      });

      await act(async () => {
        await result.current.remove('1');
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(0);
      });
    });

    it('should clear all records', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      for (const user of users) {
        await act(async () => {
          await result.current.put(user);
        });
      }

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });

      await act(async () => {
        await result.current.clear();
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(0);
      });
    });
  });

  describe('bulk operations', () => {
    it('should bulk put records', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      await act(async () => {
        await result.current.bulkPut(users);
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(3);
      });
    });

    it('should bulk remove records', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      await act(async () => {
        await result.current.bulkPut(users);
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(3);
      });

      await act(async () => {
        await result.current.bulkRemove(['1', '3']);
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
      });

      expect(result.current.data[0]?.id).toBe('2');
    });
  });

  describe('count', () => {
    it('should count records', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      await act(async () => {
        await result.current.bulkPut(users);
      });

      // Wait for data to be updated first
      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });

      let count = 0;
      await act(async () => {
        count = await result.current.count();
      });

      expect(count).toBe(2);
    });
  });

  describe('getByIndex', () => {
    it('should query by index', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      await act(async () => {
        await result.current.bulkPut(users);
      });

      // Wait for data to be updated first
      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });

      let results: TestUser[] = [];
      await act(async () => {
        results = await result.current.getByIndex('email', 'john@example.com');
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('John');
    });
  });

  describe('reload', () => {
    it('should reload data from store', async () => {
      const config = createTestConfig();
      const { result } = renderHook(() => useIndexedDB<TestUser>(config, 'users'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add data directly to the store
      const store = new IndexedDBStore(config);
      await store.open();
      await store.put('users', { id: '1', name: 'John', email: 'john@example.com' });
      store.close();

      // Reload the hook data
      await act(async () => {
        await result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
      });
    });
  });
});
