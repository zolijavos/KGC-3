import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useStockData } from './useStockData';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock stock summary data
const mockStockSummary = {
  data: {
    total: 342,
    byLocation: {
      bolt_1: { count: 180, percentage: 52.6 },
      bolt_2: { count: 140, percentage: 40.9 },
      warehouse: { count: 22, percentage: 6.4 },
    },
    byStatus: {
      available: 52,
      rented: 290,
      service: 0,
    },
  },
};

describe('useStockData', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch stock summary data successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    const { result } = renderHook(() => useStockData(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStockSummary.data);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/dashboard/inventory/summary');
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useStockData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Failed to fetch stock summary');
  });

  it('should use correct query key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    const { result } = renderHook(() => useStockData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queryKey = queryClient
      .getQueryCache()
      .getAll()
      .find((query) => query.state.status === 'success')?.queryKey;

    expect(queryKey).toEqual(['inventory', 'summary']);
  });

  it('should support manual refetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    const { result } = renderHook(() => useStockData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Manual refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    await result.current.refetch();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should configure auto-refresh interval', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    renderHook(() => useStockData(), { wrapper });

    await waitFor(() => {
      const queries = queryClient.getQueryCache().getAll();
      expect(queries.length).toBeGreaterThan(0);
    });

    const query = queryClient.getQueryCache().getAll()[0];
    const options = query?.options;

    // Check refetchInterval is set to 5 minutes (300000ms)
    expect(options?.refetchInterval).toBe(5 * 60 * 1000);
  });

  it('should configure staleTime', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStockSummary,
    });

    renderHook(() => useStockData(), { wrapper });

    await waitFor(() => {
      const queries = queryClient.getQueryCache().getAll();
      expect(queries.length).toBeGreaterThan(0);
    });

    const query = queryClient.getQueryCache().getAll()[0];
    const options = query?.options;

    // Check staleTime is set to 4 minutes (240000ms)
    expect(options?.staleTime).toBe(4 * 60 * 1000);
  });
});
