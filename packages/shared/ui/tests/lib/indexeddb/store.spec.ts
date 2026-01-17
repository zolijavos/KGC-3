import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBStore } from '../../../src/lib/indexeddb/store';
import type { StoreConfig } from '../../../src/lib/indexeddb/types';

interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
}

const testConfig: StoreConfig = {
  name: 'test-db',
  version: 1,
  stores: [
    {
      name: 'users',
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email', options: { unique: true } },
        { name: 'age', keyPath: 'age' },
      ],
    },
    {
      name: 'items',
      keyPath: 'id',
      autoIncrement: true,
    },
  ],
};

describe('IndexedDBStore', () => {
  let store: IndexedDBStore;

  beforeEach(() => {
    store = new IndexedDBStore(testConfig);
  });

  afterEach(async () => {
    await store.delete();
  });

  describe('isSupported', () => {
    it('should return true when IndexedDB is available', () => {
      expect(IndexedDBStore.isSupported()).toBe(true);
    });
  });

  describe('open', () => {
    it('should open the database', async () => {
      const db = await store.open();

      expect(db).toBeDefined();
      expect(db.name).toBe('test-db');
      expect(db.version).toBe(1);
    });

    it('should create object stores', async () => {
      const db = await store.open();

      expect(db.objectStoreNames.contains('users')).toBe(true);
      expect(db.objectStoreNames.contains('items')).toBe(true);
    });

    it('should reuse existing connection', async () => {
      const db1 = await store.open();
      const db2 = await store.open();

      expect(db1).toBe(db2);
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      await store.open();
      store.close();

      // Opening again should work
      const db = await store.open();
      expect(db).toBeDefined();
    });
  });

  describe('put', () => {
    it('should add a new record', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      const key = await store.put('users', user);

      expect(key).toBe('1');
    });

    it('should update an existing record', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      await store.put('users', user);

      const updatedUser: TestUser = { id: '1', name: 'John Doe', email: 'john@example.com', age: 31 };
      await store.put('users', updatedUser);

      const result = await store.get<TestUser>('users', '1');
      expect(result?.name).toBe('John Doe');
      expect(result?.age).toBe(31);
    });
  });

  describe('add', () => {
    it('should add a new record', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      const key = await store.add('users', user);

      expect(key).toBe('1');
    });

    it('should fail when key already exists', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      await store.add('users', user);

      await expect(store.add('users', user)).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get a record by key', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      await store.put('users', user);

      const result = await store.get<TestUser>('users', '1');

      expect(result).toEqual(user);
    });

    it('should return undefined for non-existent key', async () => {
      await store.open();

      const result = await store.get<TestUser>('users', 'non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should get all records', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      const result = await store.getAll<TestUser>('users');

      expect(result).toHaveLength(3);
    });

    it('should support limit option', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      const result = await store.getAll<TestUser>('users', { limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('should support offset option', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      const result = await store.getAll<TestUser>('users', { offset: 1 });

      expect(result).toHaveLength(2);
    });

    it('should support limit and offset together', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      const result = await store.getAll<TestUser>('users', { offset: 1, limit: 1 });

      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should remove a record', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      await store.put('users', user);

      await store.remove('users', '1');

      const result = await store.get<TestUser>('users', '1');
      expect(result).toBeUndefined();
    });

    it('should not throw for non-existent key', async () => {
      await store.open();

      await expect(store.remove('users', 'non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all records from a store', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      await store.clear('users');

      const result = await store.getAll<TestUser>('users');
      expect(result).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should count records in a store', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
      ];

      for (const user of users) {
        await store.put('users', user);
      }

      const count = await store.count('users');

      expect(count).toBe(2);
    });

    it('should return 0 for empty store', async () => {
      await store.open();

      const count = await store.count('users');

      expect(count).toBe(0);
    });
  });

  describe('bulkPut', () => {
    it('should add multiple records', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      const keys = await store.bulkPut('users', users);

      expect(keys).toHaveLength(3);
      expect(keys).toEqual(['1', '2', '3']);
    });
  });

  describe('bulkRemove', () => {
    it('should remove multiple records', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 35 },
      ];

      await store.bulkPut('users', users);
      await store.bulkRemove('users', ['1', '3']);

      const result = await store.getAll<TestUser>('users');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('2');
    });
  });

  describe('getByIndex', () => {
    it('should query records by index', async () => {
      await store.open();

      const users: TestUser[] = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com', age: 25 },
        { id: '3', name: 'Bob', email: 'bob@example.com', age: 30 },
      ];

      await store.bulkPut('users', users);

      const result = await store.getByIndex<TestUser>('users', 'age', 30);

      expect(result).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete the database', async () => {
      await store.open();

      const user: TestUser = { id: '1', name: 'John', email: 'john@example.com', age: 30 };
      await store.put('users', user);

      await store.delete();

      // Create a new store instance and verify data is gone
      const newStore = new IndexedDBStore(testConfig);
      await newStore.open();

      const result = await newStore.get<TestUser>('users', '1');
      expect(result).toBeUndefined();

      await newStore.delete();
    });
  });
});
