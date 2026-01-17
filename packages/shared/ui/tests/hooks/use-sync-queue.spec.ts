import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useSyncQueue } from '../../src/hooks/use-sync-queue';
import type { SyncQueueConfig } from '../../src/lib/sync';

// Use unique db names per test
let testCounter = 0;
const createTestOptions = (): SyncQueueConfig => ({
  dbName: `test-hook-sync-${testCounter++}`,
  dbVersion: 1,
  storeName: 'sync-operations',
  maxRetries: 3,
});

describe('useSyncQueue hook', () => {
  describe('initialization', () => {
    it('should initialize with empty queue', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.operations).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should indicate IndexedDB is supported', () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('add operations', () => {
    it('should add an operation to the queue', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string | undefined;
      await act(async () => {
        id = await result.current.add({
          type: 'rental',
          method: 'POST',
          url: '/api/rentals',
          payload: { customerId: '123' },
          priority: 'normal',
          maxRetries: 3,
        });
      });

      expect(id).toBeDefined();

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(1);
      });

      expect(result.current.operations[0]?.type).toBe('rental');
      expect(result.current.pendingCount).toBe(1);
    });

    it('should update operations list after adding', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.add({
          type: 'invoice',
          method: 'POST',
          url: '/api/invoices',
          payload: {},
          priority: 'high',
          maxRetries: 3,
        });
      });

      await act(async () => {
        await result.current.add({
          type: 'partner',
          method: 'PUT',
          url: '/api/partners/1',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(2);
      });
    });
  });

  describe('remove operations', () => {
    it('should remove an operation from the queue', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string | undefined;
      await act(async () => {
        id = await result.current.add({
          type: 'test',
          method: 'POST',
          url: '/api/test',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(1);
      });

      await act(async () => {
        await result.current.remove(id!);
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(0);
      });
    });

    it('should clear all operations', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.add({
          type: 'test1',
          method: 'POST',
          url: '/api/test1',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
        await result.current.add({
          type: 'test2',
          method: 'POST',
          url: '/api/test2',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(2);
      });

      await act(async () => {
        await result.current.clear();
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(0);
      });
    });
  });

  describe('update operations', () => {
    it('should update operation status', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string | undefined;
      await act(async () => {
        id = await result.current.add({
          type: 'test',
          method: 'POST',
          url: '/api/test',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await act(async () => {
        await result.current.updateStatus(id!, 'syncing');
      });

      await waitFor(() => {
        expect(result.current.operations[0]?.status).toBe('syncing');
      });
    });

    it('should mark operation as failed', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string | undefined;
      await act(async () => {
        id = await result.current.add({
          type: 'test',
          method: 'POST',
          url: '/api/test',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await act(async () => {
        await result.current.setFailed(id!, 'Network error');
      });

      await waitFor(() => {
        expect(result.current.operations[0]?.status).toBe('failed');
        expect(result.current.operations[0]?.errorMessage).toBe('Network error');
      });
    });
  });

  describe('callbacks', () => {
    it('should call onFailed callback when operation fails', async () => {
      const onFailed = vi.fn();
      const options = { ...createTestOptions(), onFailed };
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string | undefined;
      await act(async () => {
        id = await result.current.add({
          type: 'test',
          method: 'POST',
          url: '/api/test',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await act(async () => {
        await result.current.setFailed(id!, 'Test error');
      });

      await waitFor(() => {
        expect(onFailed).toHaveBeenCalled();
      });
    });
  });

  describe('getPending', () => {
    it('should return only pending operations sorted by priority', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id1: string | undefined;
      await act(async () => {
        id1 = await result.current.add({
          type: 'low',
          method: 'POST',
          url: '/api/low',
          payload: {},
          priority: 'low',
          maxRetries: 3,
        });
        await result.current.add({
          type: 'critical',
          method: 'POST',
          url: '/api/critical',
          payload: {},
          priority: 'critical',
          maxRetries: 3,
        });
        await result.current.add({
          type: 'completed',
          method: 'POST',
          url: '/api/completed',
          payload: {},
          priority: 'high',
          maxRetries: 3,
        });
      });

      // Mark one as completed
      await act(async () => {
        await result.current.updateStatus(id1!, 'completed');
      });

      let pending: Awaited<ReturnType<typeof result.current.getPending>> = [];
      await act(async () => {
        pending = await result.current.getPending();
      });

      // Should only have 2 pending (excluding completed), critical first
      expect(pending).toHaveLength(2);
      expect(pending[0]?.priority).toBe('critical');
    });
  });

  describe('reload', () => {
    it('should reload operations from database', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() => useSyncQueue(options));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.add({
          type: 'test',
          method: 'POST',
          url: '/api/test',
          payload: {},
          priority: 'normal',
          maxRetries: 3,
        });
      });

      await waitFor(() => {
        expect(result.current.operations).toHaveLength(1);
      });

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.operations).toHaveLength(1);
    });
  });
});
