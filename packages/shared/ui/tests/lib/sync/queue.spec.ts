import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SyncQueue } from '../../../src/lib/sync/queue';
import type { SyncOperation, SyncQueueConfig } from '../../../src/lib/sync/types';

// Use unique db names per test to avoid conflicts
let testCounter = 0;
const createTestConfig = (): SyncQueueConfig => ({
  dbName: `test-sync-queue-${testCounter++}`,
  dbVersion: 1,
  storeName: 'sync-operations',
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 1000,
});

const createTestOperation = (overrides: Partial<SyncOperation> = {}): Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'> => ({
  type: 'test',
  method: 'POST',
  url: '/api/test',
  payload: { foo: 'bar' },
  maxRetries: 3,
  priority: 'normal',
  ...overrides,
});

describe('SyncQueue', () => {
  describe('initialization', () => {
    it('should create a queue with default config', () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);
      expect(queue).toBeDefined();
    });

    it('should check if IndexedDB is supported', () => {
      expect(SyncQueue.isSupported()).toBe(true);
    });
  });

  describe('add operations', () => {
    it('should add an operation to the queue', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const op = createTestOperation();
      const id = await queue.add(op);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const retrieved = await queue.get(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.url).toBe('/api/test');
      expect(retrieved?.status).toBe('pending');
      expect(retrieved?.retryCount).toBe(0);
    });

    it('should assign unique IDs to operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id1 = await queue.add(createTestOperation());
      const id2 = await queue.add(createTestOperation());

      expect(id1).not.toBe(id2);
    });

    it('should set createdAt timestamp', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const before = Date.now();
      const id = await queue.add(createTestOperation());
      const after = Date.now();

      const op = await queue.get(id);
      expect(op?.createdAt).toBeGreaterThanOrEqual(before);
      expect(op?.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('get operations', () => {
    it('should get all pending operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation({ url: '/api/1' }));
      await queue.add(createTestOperation({ url: '/api/2' }));
      await queue.add(createTestOperation({ url: '/api/3' }));

      const pending = await queue.getPending();
      expect(pending).toHaveLength(3);
    });

    it('should return pending operations sorted by priority then createdAt', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation({ url: '/api/low', priority: 'low' }));
      await queue.add(createTestOperation({ url: '/api/critical', priority: 'critical' }));
      await queue.add(createTestOperation({ url: '/api/normal', priority: 'normal' }));

      const pending = await queue.getPending();
      expect(pending[0]?.url).toBe('/api/critical');
      expect(pending[1]?.url).toBe('/api/normal');
      expect(pending[2]?.url).toBe('/api/low');
    });

    it('should return undefined for non-existent operation', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const op = await queue.get('non-existent-id');
      expect(op).toBeUndefined();
    });
  });

  describe('update operations', () => {
    it('should update operation status', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation());
      await queue.updateStatus(id, 'syncing');

      const op = await queue.get(id);
      expect(op?.status).toBe('syncing');
    });

    it('should increment retry count', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation());
      await queue.incrementRetry(id);

      const op = await queue.get(id);
      expect(op?.retryCount).toBe(1);
      expect(op?.lastAttemptAt).toBeDefined();
    });

    it('should set error message on failure', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation());
      await queue.setFailed(id, 'Network error');

      const op = await queue.get(id);
      expect(op?.status).toBe('failed');
      expect(op?.errorMessage).toBe('Network error');
    });

    it('should set conflict data', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation());
      const serverData = { version: 2, data: 'server' };
      await queue.setConflict(id, serverData);

      const op = await queue.get(id);
      expect(op?.status).toBe('conflict');
      expect(op?.conflictData).toEqual(serverData);
    });
  });

  describe('remove operations', () => {
    it('should remove an operation', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation());
      await queue.remove(id);

      const op = await queue.get(id);
      expect(op).toBeUndefined();
    });

    it('should remove all completed operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id1 = await queue.add(createTestOperation());
      const id2 = await queue.add(createTestOperation());
      await queue.add(createTestOperation());

      await queue.updateStatus(id1, 'completed');
      await queue.updateStatus(id2, 'completed');

      await queue.removeCompleted();

      const all = await queue.getAll();
      expect(all).toHaveLength(1);
    });

    it('should clear all operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation());
      await queue.add(createTestOperation());
      await queue.add(createTestOperation());

      await queue.clear();

      const all = await queue.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('count operations', () => {
    it('should count total operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation());
      await queue.add(createTestOperation());

      const count = await queue.count();
      expect(count).toBe(2);
    });

    it('should count pending operations', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id1 = await queue.add(createTestOperation());
      await queue.add(createTestOperation());
      await queue.updateStatus(id1, 'completed');

      const count = await queue.countPending();
      expect(count).toBe(1);
    });

    it('should count operations by status', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id1 = await queue.add(createTestOperation());
      const id2 = await queue.add(createTestOperation());
      await queue.add(createTestOperation());

      await queue.updateStatus(id1, 'failed');
      await queue.updateStatus(id2, 'failed');

      const count = await queue.countByStatus('failed');
      expect(count).toBe(2);
    });
  });

  describe('retry logic', () => {
    it('should check if operation can be retried', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      const id = await queue.add(createTestOperation({ maxRetries: 3 }));

      expect(await queue.canRetry(id)).toBe(true);

      await queue.incrementRetry(id);
      await queue.incrementRetry(id);
      await queue.incrementRetry(id);

      expect(await queue.canRetry(id)).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      // baseDelay = 100, maxDelay = 1000
      expect(queue.getRetryDelay(0)).toBe(100);   // 100 * 2^0 = 100
      expect(queue.getRetryDelay(1)).toBe(200);   // 100 * 2^1 = 200
      expect(queue.getRetryDelay(2)).toBe(400);   // 100 * 2^2 = 400
      expect(queue.getRetryDelay(3)).toBe(800);   // 100 * 2^3 = 800
      expect(queue.getRetryDelay(4)).toBe(1000);  // 100 * 2^4 = 1600, capped at 1000
    });
  });

  describe('getByType', () => {
    it('should get operations by type', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation({ type: 'rental' }));
      await queue.add(createTestOperation({ type: 'invoice' }));
      await queue.add(createTestOperation({ type: 'rental' }));

      const rentals = await queue.getByType('rental');
      expect(rentals).toHaveLength(2);
      expect(rentals.every(op => op.type === 'rental')).toBe(true);
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      const config = createTestConfig();
      const queue = new SyncQueue(config);

      await queue.add(createTestOperation());
      queue.close();

      // Should not throw, but subsequent operations won't work
      expect(() => queue.close()).not.toThrow();
    });
  });
});
