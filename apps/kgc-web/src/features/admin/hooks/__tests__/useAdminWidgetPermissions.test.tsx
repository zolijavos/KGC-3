import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminWidgetPermissions } from '../useAdminWidgetPermissions';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    request: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * useAdminWidgetPermissions Hook Tests (Story 45-1)
 *
 * Tests for admin widget permissions management hook
 */
describe('useAdminWidgetPermissions', () => {
  let queryClient: QueryClient;

  const mockPermissionsData = {
    data: {
      widgets: [
        {
          id: 'revenue-kpi',
          name: 'Bevétel KPI',
          category: 'finance',
          roles: { OPERATOR: false, STORE_MANAGER: true, ADMIN: true },
        },
        {
          id: 'stock-summary',
          name: 'Készlet összesítő',
          category: 'inventory',
          roles: { OPERATOR: true, STORE_MANAGER: true, ADMIN: true },
        },
        {
          id: 'notification-panel',
          name: 'Értesítések',
          category: 'alerts',
          roles: { OPERATOR: true, STORE_MANAGER: true, ADMIN: true },
        },
      ],
    },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe('Query State', () => {
    it('should fetch widget permissions on mount', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.get).toHaveBeenCalledWith('/dashboard/permissions/admin');
      expect(result.current.widgets).toHaveLength(3);
    });

    it('should return empty array when no data', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { widgets: [] } });

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.widgets).toEqual([]);
    });

    it('should handle API error', async () => {
      const error = new Error('Network error');
      // Mock all attempts to fail (hook has retry: 2 so we need all 3 to fail)
      vi.mocked(api.get).mockRejectedValue(error);

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      // Wait for all retries to complete and error state to be set
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.error).toBe(error);
    });
  });

  describe('Update Mutation', () => {
    it('should update permissions via API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 1,
          message: '1 jogosultság sikeresen mentve',
        },
      });

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = [{ widgetId: 'revenue-kpi', role: 'OPERATOR' as const, enabled: true }];

      await act(async () => {
        await result.current.updatePermissions(updates);
      });

      expect(api.request).toHaveBeenCalledWith('/dashboard/permissions/admin', {
        method: 'PUT',
        body: JSON.stringify({ permissions: updates }),
      });
    });

    it('should invalidate query after successful update', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 1,
          message: '1 jogosultság sikeresen mentve',
        },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePermissions([
          { widgetId: 'revenue-kpi', role: 'OPERATOR', enabled: true },
        ]);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('Reset Mutation', () => {
    it('should reset permissions to defaults', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 5,
          message: 'Jogosultságok visszaállítva az alapértelmezettekre',
        },
      });

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resetToDefaults();
      });

      expect(api.request).toHaveBeenCalledWith('/dashboard/permissions/admin', {
        method: 'DELETE',
      });
    });
  });

  describe('Helper Functions', () => {
    it('should create toggle update correctly', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update = result.current.createToggleUpdate('revenue-kpi', 'OPERATOR', false);

      expect(update).toEqual({
        widgetId: 'revenue-kpi',
        role: 'OPERATOR',
        enabled: true, // Toggled from false to true
      });
    });

    it('should group widgets by category', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      const { result } = renderHook(() => useAdminWidgetPermissions(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const grouped = result.current.widgetsByCategory();

      expect(grouped.get('finance')).toHaveLength(1);
      expect(grouped.get('inventory')).toHaveLength(1);
      expect(grouped.get('alerts')).toHaveLength(1);
    });
  });
});
