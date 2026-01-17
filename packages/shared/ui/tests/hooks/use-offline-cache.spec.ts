import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useOfflineCache } from '../../src/hooks/use-offline-cache';
import { IndexedDBStore } from '../../src/lib/indexeddb';

interface TestData {
  id: string;
  value: string;
}

// Use unique db names per test group to avoid conflicts
let testCounter = 0;
const getTestOptions = () => ({
  dbName: `test-cache-db-${testCounter++}`,
  dbVersion: 1,
  storeName: 'cache',
});

describe('useOfflineCache hook', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should indicate IndexedDB is supported', () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      expect(result.current.isSupported).toBe(true);
    });

    it('should start with no error', () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      expect(result.current.error).toBeNull();
    });
  });

  describe('set and get', () => {
    it('should set and get a value', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      const data: TestData = { id: '1', value: 'test' };

      await act(async () => {
        await result.current.set('key1', data);
      });

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('key1');
      });

      expect(retrieved).toEqual(data);
    });

    it('should return undefined for non-existent key', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('non-existent');
      });

      expect(retrieved).toBeUndefined();
    });
  });

  describe('TTL (Time-To-Live)', () => {
    it('should expire data after TTL', async () => {
      // Use a very short TTL that we can test without fake timers
      const options = { ...getTestOptions(), defaultTTL: 50 };
      const { result } = renderHook(() => useOfflineCache<TestData>(options));

      const data: TestData = { id: '1', value: 'test' };

      await act(async () => {
        await result.current.set('key1', data);
      });

      // Data should be available immediately
      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('key1');
      });
      expect(retrieved).toEqual(data);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      await act(async () => {
        retrieved = await result.current.get('key1');
      });
      expect(retrieved).toBeUndefined();
    });

    it('should use per-item TTL when provided', async () => {
      const options = { ...getTestOptions(), defaultTTL: 10000 };
      const { result } = renderHook(() => useOfflineCache<TestData>(options));

      const data: TestData = { id: '1', value: 'test' };

      await act(async () => {
        await result.current.set('key1', data, { ttl: 50 });
      });

      // Data should be available immediately
      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('key1');
      });
      expect(retrieved).toEqual(data);

      // Wait for item TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      await act(async () => {
        retrieved = await result.current.get('key1');
      });
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' });
      });

      let exists = false;
      await act(async () => {
        exists = await result.current.has('key1');
      });

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      let exists = true;
      await act(async () => {
        exists = await result.current.has('non-existent');
      });

      expect(exists).toBe(false);
    });

    it('should return false for expired key', async () => {
      const options = { ...getTestOptions(), defaultTTL: 50 };
      const { result } = renderHook(() => useOfflineCache<TestData>(options));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' });
      });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      let exists = true;
      await act(async () => {
        exists = await result.current.has('key1');
      });

      expect(exists).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove a cached item', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' });
      });

      await act(async () => {
        await result.current.remove('key1');
      });

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('key1');
      });

      expect(retrieved).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all cached items', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test1' });
        await result.current.set('key2', { id: '2', value: 'test2' });
      });

      await act(async () => {
        await result.current.clear();
      });

      let has1 = true;
      let has2 = true;
      await act(async () => {
        has1 = await result.current.has('key1');
        has2 = await result.current.has('key2');
      });

      expect(has1).toBe(false);
      expect(has2).toBe(false);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached data if available', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      const cachedData: TestData = { id: '1', value: 'cached' };
      const fetcher = vi.fn().mockResolvedValue({ id: '1', value: 'fetched' });

      await act(async () => {
        await result.current.set('key1', cachedData);
      });

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.getOrFetch('key1', fetcher);
      });

      expect(retrieved).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache data if not available', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      const fetchedData: TestData = { id: '1', value: 'fetched' };
      const fetcher = vi.fn().mockResolvedValue(fetchedData);

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.getOrFetch('key1', fetcher);
      });

      expect(retrieved).toEqual(fetchedData);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Verify it was cached
      let cached: TestData | undefined;
      await act(async () => {
        cached = await result.current.get('key1');
      });
      expect(cached).toEqual(fetchedData);
    });

    it('should fetch if cached data is expired', async () => {
      const options = { ...getTestOptions(), defaultTTL: 50 };
      const { result } = renderHook(() => useOfflineCache<TestData>(options));

      const cachedData: TestData = { id: '1', value: 'cached' };
      const fetchedData: TestData = { id: '1', value: 'fetched' };
      const fetcher = vi.fn().mockResolvedValue(fetchedData);

      await act(async () => {
        await result.current.set('key1', cachedData);
      });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.getOrFetch('key1', fetcher);
      });

      expect(retrieved).toEqual(fetchedData);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('should mark cache entry as stale', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' });
      });

      await act(async () => {
        await result.current.invalidate('key1');
      });

      // After invalidation, get should return undefined
      let retrieved: TestData | undefined;
      await act(async () => {
        retrieved = await result.current.get('key1');
      });

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getMeta', () => {
    it('should return cache metadata', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' }, { ttl: 5000, version: 2 });
      });

      type CacheMeta = { cachedAt: number; ttl?: number; version?: number };
      let meta: CacheMeta | undefined;
      await act(async () => {
        meta = await result.current.getMeta('key1');
      });

      expect(meta).toBeDefined();
      expect(meta?.ttl).toBe(5000);
      expect(meta?.version).toBe(2);
      expect(meta?.cachedAt).toBeDefined();
    });

    it('should return undefined for non-existent key', async () => {
      const { result } = renderHook(() => useOfflineCache<TestData>(getTestOptions()));

      type CacheMeta = { cachedAt: number; ttl?: number; version?: number };
      let meta: CacheMeta | undefined;
      await act(async () => {
        meta = await result.current.getMeta('non-existent');
      });

      expect(meta).toBeUndefined();
    });
  });

  describe('callbacks', () => {
    it('should call onNetworkFetch when fetching from network', async () => {
      const onNetworkFetch = vi.fn();
      const { result } = renderHook(() =>
        useOfflineCache<TestData>({ ...getTestOptions(), onNetworkFetch })
      );

      const fetchedData: TestData = { id: '1', value: 'fetched' };
      const fetcher = vi.fn().mockResolvedValue(fetchedData);

      await act(async () => {
        await result.current.getOrFetch('key1', fetcher);
      });

      expect(onNetworkFetch).toHaveBeenCalledWith('key1', fetchedData);
    });

    it('should call onCacheHit when returning cached data', async () => {
      const onCacheHit = vi.fn();
      const { result } = renderHook(() =>
        useOfflineCache<TestData>({ ...getTestOptions(), onCacheHit })
      );

      const data: TestData = { id: '1', value: 'test' };

      await act(async () => {
        await result.current.set('key1', data);
      });

      await act(async () => {
        await result.current.get('key1');
      });

      expect(onCacheHit).toHaveBeenCalledWith('key1', data);
    });

    it('should call onCacheStale when cache is expired', async () => {
      const onCacheStale = vi.fn();
      const options = { ...getTestOptions(), defaultTTL: 50, onCacheStale };
      const { result } = renderHook(() => useOfflineCache<TestData>(options));

      await act(async () => {
        await result.current.set('key1', { id: '1', value: 'test' });
      });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      await act(async () => {
        await result.current.get('key1');
      });

      expect(onCacheStale).toHaveBeenCalledWith('key1');
    });
  });
});
