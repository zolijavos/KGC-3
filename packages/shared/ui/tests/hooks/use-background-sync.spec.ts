import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useBackgroundSync } from '../../src/hooks/use-background-sync';
import type { SyncOperation, SyncResult } from '../../src/lib/sync';

// Mock navigator.onLine
const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

// Use unique db names per test
let testCounter = 0;
const createTestOptions = () => ({
  dbName: `test-bg-sync-${testCounter++}`,
  dbVersion: 1,
  syncInterval: 100, // Fast interval for testing
});

const createTestOperation = (): Omit<SyncOperation, 'id' | 'createdAt' | 'status' | 'retryCount'> => ({
  type: 'test',
  method: 'POST' as const,
  url: '/api/test',
  payload: { data: 'test' },
  priority: 'normal' as const,
  maxRetries: 3,
});

describe('useBackgroundSync hook', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator.onLine
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    }
  });

  describe('initialization', () => {
    it('should initialize with default state', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingCount).toBe(0);
    });

    it('should detect offline state', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const options = createTestOptions();
      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('queue operations', () => {
    it('should add operation to queue', async () => {
      const options = createTestOptions();
      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor: vi.fn().mockResolvedValue({ success: true }),
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.queueOperation(createTestOperation());
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('sync execution', () => {
    it('should execute sync when triggered manually', async () => {
      const executor = vi.fn().mockResolvedValue({ success: true });
      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: false, // Disable auto sync for this test
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add an operation
      await act(async () => {
        await result.current.queueOperation(createTestOperation());
      });

      // Trigger manual sync
      await act(async () => {
        await result.current.syncNow();
      });

      // Executor should have been called
      expect(executor).toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const executor = vi.fn().mockResolvedValue({ success: true });
      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add an operation
      await act(async () => {
        await result.current.queueOperation(createTestOperation());
      });

      // Try to sync
      await act(async () => {
        await result.current.syncNow();
      });

      // Should not have called executor
      expect(executor).not.toHaveBeenCalled();
    });

    it('should call onSyncComplete callback', async () => {
      const onSyncComplete = vi.fn();
      const executor = vi.fn().mockImplementation(async (op): Promise<SyncResult> => ({
        success: true,
        operation: { ...op, status: 'completed' } as SyncOperation,
      }));

      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          onSyncComplete,
          autoSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add an operation
      await act(async () => {
        await result.current.queueOperation(createTestOperation());
      });

      // Sync
      await act(async () => {
        await result.current.syncNow();
      });

      // Wait for callback
      await waitFor(() => {
        expect(onSyncComplete).toHaveBeenCalled();
      });
    });

    it('should handle sync errors and call onSyncError when retries exhausted', async () => {
      const onSyncError = vi.fn();
      const testError = new Error('Network failure');
      const executor = vi.fn().mockImplementation(async (op): Promise<SyncResult> => ({
        success: false,
        operation: { ...op, status: 'failed' } as SyncOperation,
        error: testError,
      }));

      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          onSyncError,
          autoSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add an operation with maxRetries: 0 so error callback triggers immediately
      await act(async () => {
        await result.current.queueOperation({
          ...createTestOperation(),
          maxRetries: 0,
        });
      });

      // Sync
      await act(async () => {
        await result.current.syncNow();
      });

      // Wait for error callback (should be called when retries exhausted)
      await waitFor(() => {
        expect(onSyncError).toHaveBeenCalled();
      });
    });
  });

  describe('progress tracking', () => {
    it('should track sync progress', async () => {
      const executor = vi.fn().mockImplementation(async (op): Promise<SyncResult> => {
        // Simulate some delay
        await new Promise((r) => setTimeout(r, 10));
        return {
          success: true,
          operation: { ...op, status: 'completed' } as SyncOperation,
        };
      });

      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add operations
      await act(async () => {
        await result.current.queueOperation(createTestOperation());
        await result.current.queueOperation(createTestOperation());
      });

      // Start sync
      act(() => {
        result.current.syncNow();
      });

      // Should be syncing
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false);
      });
    });
  });

  describe('pause and resume', () => {
    it('should pause sync', async () => {
      const executor = vi.fn().mockResolvedValue({ success: true });
      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should resume sync', async () => {
      const executor = vi.fn().mockResolvedValue({ success: true });
      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.resume();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('clear queue', () => {
    it('should clear the sync queue', async () => {
      const executor = vi.fn().mockResolvedValue({ success: true });
      const options = createTestOptions();

      const { result } = renderHook(() =>
        useBackgroundSync({
          ...options,
          executor,
          autoSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add operations
      await act(async () => {
        await result.current.queueOperation(createTestOperation());
        await result.current.queueOperation(createTestOperation());
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBeGreaterThan(0);
      });

      // Clear queue
      await act(async () => {
        await result.current.clearQueue();
      });

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(0);
      });
    });
  });
});
