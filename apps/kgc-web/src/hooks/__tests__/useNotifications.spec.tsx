import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useNotifications, useMarkAsRead, useClearAllNotifications } from '../useNotifications';

// Mock fetch
global.fetch = vi.fn();

describe('useNotifications', () => {
  let queryClient: QueryClient;

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

  const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useNotifications hook', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'critical',
          title: 'Készlethiány',
          message: 'Test message',
          timestamp: '2025-01-20T10:30:00Z',
          isRead: false,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNotifications }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockNotifications);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/dashboard/notifications?unread=true'
      );
    });

    it('should handle fetch error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should poll every 5 minutes', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Check that refetchInterval is set to 5 minutes
      expect(result.current.refetchInterval).toBe(5 * 60 * 1000);
    });

    it('should have staleTime of 4 minutes', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Check that staleTime is set to 4 minutes
      expect(result.current.staleTime).toBe(4 * 60 * 1000);
    });

    it('should support manual refetch', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      vi.clearAllMocks();

      await result.current.refetch();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should filter unread notifications by default', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('unread=true')
      );
    });
  });

  describe('useMarkAsRead hook', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await result.current.mutateAsync(notificationId);

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v1/dashboard/notifications/${notificationId}/mark-read`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should update cache optimistically', async () => {
      // Set initial cache data
      queryClient.setQueryData(['dashboard', 'notifications', 'unread'], [
        { id: '1', isRead: false, title: 'Test' },
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await result.current.mutateAsync('1');

      // Check that cache was updated
      const updatedData = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]) as any[];

      expect(updatedData?.find((n) => n.id === '1')?.isRead).toBe(true);
    });

    it('should rollback on error', async () => {
      // Set initial cache data
      queryClient.setQueryData(['dashboard', 'notifications', 'unread'], [
        { id: '1', isRead: false, title: 'Test' },
      ]);

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await expect(result.current.mutateAsync('1')).rejects.toThrow();

      // Check that cache was rolled back
      const rollbackData = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]) as any[];

      expect(rollbackData?.find((n) => n.id === '1')?.isRead).toBe(false);
    });

    it('should invalidate queries on success', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      await result.current.mutateAsync('1');

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['dashboard', 'notifications'],
      });
    });
  });

  describe('useClearAllNotifications hook', () => {
    it('should clear all notifications', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 }),
      });

      const { result } = renderHook(() => useClearAllNotifications(), { wrapper });

      const response = await result.current.mutateAsync();

      expect(response.count).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/dashboard/notifications/clear-all',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should update cache optimistically', async () => {
      // Set initial cache data
      queryClient.setQueryData(['dashboard', 'notifications', 'unread'], [
        { id: '1', isRead: false },
        { id: '2', isRead: false },
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 2 }),
      });

      const { result } = renderHook(() => useClearAllNotifications(), { wrapper });

      await result.current.mutateAsync();

      // Check that cache was cleared
      const updatedData = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]) as any[];

      expect(updatedData).toEqual([]);
    });

    it('should rollback on error', async () => {
      const originalData = [
        { id: '1', isRead: false },
        { id: '2', isRead: false },
      ];

      queryClient.setQueryData(['dashboard', 'notifications', 'unread'], originalData);

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useClearAllNotifications(), { wrapper });

      await expect(result.current.mutateAsync()).rejects.toThrow();

      // Check that cache was rolled back
      const rollbackData = queryClient.getQueryData([
        'dashboard',
        'notifications',
        'unread',
      ]);

      expect(rollbackData).toEqual(originalData);
    });

    it('should refetch queries on success', async () => {
      const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3 }),
      });

      const { result } = renderHook(() => useClearAllNotifications(), { wrapper });

      await result.current.mutateAsync();

      expect(refetchSpy).toHaveBeenCalledWith({
        queryKey: ['dashboard', 'notifications'],
      });
    });
  });
});
