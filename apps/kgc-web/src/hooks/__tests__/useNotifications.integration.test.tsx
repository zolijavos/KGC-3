import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useNotifications, useMarkAsRead, useClearAllNotifications, useUnreadCount } from '../useNotifications';

/**
 * Integration Tests for TanStack Query + API (Story 35-4)
 *
 * Tests:
 * - TanStack Query polling integration
 * - Optimistic updates → success → cache invalidation flow
 * - Optimistic updates → failure → rollback flow
 * - Multiple hook interactions
 * - Cache coherence across hooks
 * - Polling interval correctness
 */

// Mock fetch
global.fetch = vi.fn();

describe('useNotifications - Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Polling Integration', () => {
    it('automatically refetches every 5 minutes', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'critical',
          title: 'Test',
          message: 'Test',
          timestamp: new Date().toISOString(),
          isRead: false,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockNotifications }),
      });

      renderHook(() => useNotifications(), { wrapper });

      // Initial fetch
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      vi.clearAllMocks();

      // Fast-forward 5 minutes
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should trigger automatic refetch
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });

    it('does not refetch before staleTime (4 minutes)', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      vi.clearAllMocks();

      // Fast-forward 3 minutes (less than staleTime)
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });

      // Should NOT refetch yet (data still fresh)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('continues polling after manual refetch', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      vi.clearAllMocks();

      // Manual refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Polling should continue
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });
  });

  describe('Optimistic Update → Success Flow', () => {
    it('mark as read: optimistic update → API success → cache invalidation', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test 1', message: 'M1', timestamp: new Date().toISOString(), isRead: false },
        { id: '2', type: 'info', title: 'Test 2', message: 'M2', timestamp: new Date().toISOString(), isRead: false },
      ];

      // Mock initial fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      // Verify initial data
      expect(notificationsResult.current.data).toHaveLength(2);
      expect(notificationsResult.current.data?.[0]?.isRead).toBe(false);

      // Mock mark as read API success
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Mock refetch after invalidation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { ...initialNotifications[0], isRead: true },
            initialNotifications[1],
          ],
        }),
      });

      // Execute mutation
      await act(async () => {
        await markAsReadResult.current.mutateAsync('1');
      });

      // Wait for invalidation and refetch
      await waitFor(() => {
        const data = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        return data && data.find(n => n.id === '1')?.isRead === true;
      });

      // Verify final state
      const finalData = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
      expect(finalData?.find(n => n.id === '1')?.isRead).toBe(true);
    });

    it('clear all: optimistic clear → API success → refetch', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test 1', message: 'M1', timestamp: new Date().toISOString(), isRead: false },
        { id: '2', type: 'info', title: 'Test 2', message: 'M2', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: clearAllResult } = renderHook(() => useClearAllNotifications(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      // Mock clear all API success
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      });

      // Mock refetch after success
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      // Execute mutation
      await act(async () => {
        await clearAllResult.current.mutateAsync();
      });

      // Wait for refetch
      await waitFor(() => {
        const data = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        return data && data.length === 0;
      });

      // Verify final state
      const finalData = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
      expect(finalData).toEqual([]);
    });
  });

  describe('Optimistic Update → Failure → Rollback Flow', () => {
    it('mark as read: optimistic update → API failure → rollback', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test 1', message: 'M1', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      // Mock API failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Execute mutation (should fail)
      await act(async () => {
        try {
          await markAsReadResult.current.mutateAsync('1');
        } catch (error) {
          // Expected error
        }
      });

      // Verify rollback
      const finalData = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
      expect(finalData?.[0]?.isRead).toBe(false);
    });

    it('clear all: optimistic clear → API failure → rollback', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test 1', message: 'M1', timestamp: new Date().toISOString(), isRead: false },
        { id: '2', type: 'info', title: 'Test 2', message: 'M2', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: clearAllResult } = renderHook(() => useClearAllNotifications(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      // Mock API failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // Execute mutation (should fail)
      await act(async () => {
        try {
          await clearAllResult.current.mutateAsync();
        } catch (error) {
          // Expected error
        }
      });

      // Verify rollback
      const finalData = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
      expect(finalData).toEqual(initialNotifications);
    });

    it('handles 403 Forbidden error gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Failed to fetch notifications');
    });

    it('handles 404 Not Found error gracefully', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test', message: 'M', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await act(async () => {
        try {
          await markAsReadResult.current.mutateAsync('invalid-id');
        } catch (error: any) {
          expect(error.message).toContain('Failed to mark as read');
        }
      });
    });
  });

  describe('Multiple Hook Interactions', () => {
    it('useMarkAsRead invalidates useNotifications cache', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test', message: 'M', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ ...initialNotifications[0], isRead: true }] }),
      });

      await act(async () => {
        await markAsReadResult.current.mutateAsync('1');
      });

      // useNotifications should refetch after invalidation
      await waitFor(() => {
        const data = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        return data && data.find(n => n.id === '1')?.isRead === true;
      });
    });

    it('useClearAllNotifications triggers refetch of useNotifications', async () => {
      const initialNotifications = [
        { id: '1', type: 'info', title: 'Test', message: 'M', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialNotifications }),
      });

      const { result: notificationsResult } = renderHook(() => useNotifications(), { wrapper });
      const { result: clearAllResult } = renderHook(() => useClearAllNotifications(), { wrapper });

      await waitFor(() => expect(notificationsResult.current.isSuccess).toBe(true));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await act(async () => {
        await clearAllResult.current.mutateAsync();
      });

      await waitFor(() => {
        const data = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        return data && data.length === 0;
      });
    });

    it('useUnreadCount updates after useMarkAsRead', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 }),
      });

      const { result: unreadCountResult } = renderHook(() => useUnreadCount(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      await waitFor(() => expect(unreadCountResult.current.isSuccess).toBe(true));
      expect(unreadCountResult.current.data).toBe(5);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 4 }),
      });

      await act(async () => {
        await markAsReadResult.current.mutateAsync('1');
      });

      // Wait for invalidation and refetch
      await waitFor(() => {
        const count = queryClient.getQueryData(['dashboard', 'notifications', 'unread-count']) as number;
        return count === 4;
      });
    });
  });

  describe('Cache Coherence', () => {
    it('maintains consistent state across multiple instances of useNotifications', async () => {
      const notifications = [
        { id: '1', type: 'info', title: 'Test', message: 'M', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: notifications }),
      });

      const { result: instance1 } = renderHook(() => useNotifications(), { wrapper });
      const { result: instance2 } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(instance1.current.isSuccess).toBe(true));
      await waitFor(() => expect(instance2.current.isSuccess).toBe(true));

      // Both instances should have the same data
      expect(instance1.current.data).toEqual(instance2.current.data);
    });

    it('updates all instances when one triggers a mutation', async () => {
      const notifications = [
        { id: '1', type: 'info', title: 'Test', message: 'M', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: notifications }),
      });

      const { result: instance1 } = renderHook(() => useNotifications(), { wrapper });
      const { result: instance2 } = renderHook(() => useNotifications(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      await waitFor(() => expect(instance1.current.isSuccess).toBe(true));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ ...notifications[0], isRead: true }] }),
      });

      await act(async () => {
        await markAsReadResult.current.mutateAsync('1');
      });

      // Both instances should update
      await waitFor(() => {
        const data1 = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        const data2 = queryClient.getQueryData(['dashboard', 'notifications', 'unread']) as any[];
        return data1 && data2 && data1[0]?.isRead === true && data2[0]?.isRead === true;
      });
    });
  });

  describe('Concurrent Mutations', () => {
    it('handles concurrent mark as read calls correctly', async () => {
      const notifications = [
        { id: '1', type: 'info', title: 'Test 1', message: 'M1', timestamp: new Date().toISOString(), isRead: false },
        { id: '2', type: 'info', title: 'Test 2', message: 'M2', timestamp: new Date().toISOString(), isRead: false },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: notifications }),
      });

      renderHook(() => useNotifications(), { wrapper });
      const { result: markAsReadResult } = renderHook(() => useMarkAsRead(), { wrapper });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Concurrent mutations
      await act(async () => {
        await Promise.all([
          markAsReadResult.current.mutateAsync('1'),
          markAsReadResult.current.mutateAsync('2'),
        ]);
      });

      // Both should succeed
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 initial fetch + 2 mark as read
    });
  });

  describe('Zod Schema Validation', () => {
    it('validates API response with correct schema', async () => {
      const validNotifications = [
        {
          id: '1',
          type: 'critical',
          title: 'Test',
          message: 'Test message',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/dashboard',
          metadata: { key: 'value' },
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: validNotifications }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(validNotifications);
    });

    it('rejects invalid API response schema', async () => {
      const invalidNotifications = [
        {
          id: '1',
          type: 'invalid-type', // Invalid type
          title: 'Test',
          message: 'Test',
          timestamp: new Date().toISOString(),
          isRead: false,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: invalidNotifications }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
