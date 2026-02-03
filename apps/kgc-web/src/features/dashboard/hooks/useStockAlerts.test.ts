import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useStockAlerts } from './useStockAlerts';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock stock alert data
const mockAlerts = {
  data: [
    {
      id: 'machine-001',
      model: 'Makita DHP485',
      type: 'Fúrócsavarbelyegzőgép',
      currentStock: 8,
      minimumThreshold: 15,
      severity: 'critical' as const,
      lastPurchase: '2026-01-15',
    },
    {
      id: 'machine-002',
      model: 'DeWalt DCD795',
      type: 'Csavarbelyegzőgép',
      currentStock: 22,
      minimumThreshold: 30,
      severity: 'warning' as const,
      lastPurchase: '2026-01-20',
    },
  ],
};

describe('useStockAlerts', () => {
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

  it('should fetch stock alerts successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    const { result } = renderHook(() => useStockAlerts(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAlerts.data);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/dashboard/inventory/alerts');
  });

  it('should fetch critical alerts only when severity filter is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockAlerts.data[0]] }),
    });

    const { result } = renderHook(() => useStockAlerts({ severity: 'critical' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/dashboard/inventory/alerts?severity=critical');
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useStockAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Failed to fetch stock alerts');
  });

  it('should use correct query key with severity filter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    const { result } = renderHook(() => useStockAlerts({ severity: 'warning' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queryKey = queryClient
      .getQueryCache()
      .getAll()
      .find((query) => query.state.status === 'success')?.queryKey;

    expect(queryKey).toEqual(['inventory', 'alerts', 'warning']);
  });

  it('should configure auto-refresh interval', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    renderHook(() => useStockAlerts(), { wrapper });

    await waitFor(() => {
      const queries = queryClient.getQueryCache().getAll();
      expect(queries.length).toBeGreaterThan(0);
    });

    const query = queryClient.getQueryCache().getAll()[0];
    const options = query?.options;

    // Check refetchInterval is set to 5 minutes (300000ms)
    expect(options?.refetchInterval).toBe(5 * 60 * 1000);
  });

  it('should support manual refetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    const { result } = renderHook(() => useStockAlerts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Manual refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
    });

    await result.current.refetch();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
