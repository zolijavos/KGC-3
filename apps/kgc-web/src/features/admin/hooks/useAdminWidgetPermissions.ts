import { api } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Admin Widget Permissions Hook (Story 45-1)
 *
 * Provides CRUD operations for dashboard widget permissions admin UI.
 */

// Types matching backend DTOs
export type WidgetRole = 'OPERATOR' | 'STORE_MANAGER' | 'ADMIN';

export type WidgetCategory =
  | 'general'
  | 'finance'
  | 'inventory'
  | 'service'
  | 'partner'
  | 'alerts'
  | 'analytics';

export interface RolePermissions {
  OPERATOR: boolean;
  STORE_MANAGER: boolean;
  ADMIN: boolean;
}

export interface AdminWidgetPermission {
  id: string;
  name: string;
  category: WidgetCategory;
  roles: RolePermissions;
}

export interface AdminPermissionsResponse {
  data: {
    widgets: AdminWidgetPermission[];
  };
}

export interface PermissionUpdate {
  widgetId: string;
  role: WidgetRole;
  enabled: boolean;
}

export interface UpdatePermissionsRequest {
  permissions: PermissionUpdate[];
}

export interface UpdatePermissionsResponse {
  data: {
    success: boolean;
    updatedCount: number;
    message: string;
  };
}

// Query key for caching
const ADMIN_PERMISSIONS_KEY = ['admin', 'widget-permissions'] as const;

/**
 * Fetch admin widget permissions matrix
 */
async function fetchAdminPermissions(): Promise<AdminWidgetPermission[]> {
  const response = await api.get<AdminPermissionsResponse>('/dashboard/permissions/admin');
  return response.data.widgets;
}

/**
 * Update widget permissions
 */
async function updatePermissions(
  updates: PermissionUpdate[]
): Promise<UpdatePermissionsResponse['data']> {
  const response = await api.request<UpdatePermissionsResponse>('/dashboard/permissions/admin', {
    method: 'PUT',
    body: JSON.stringify({ permissions: updates }),
  });
  return response.data;
}

/**
 * Reset permissions to defaults
 */
async function resetPermissions(): Promise<UpdatePermissionsResponse['data']> {
  const response = await api.request<UpdatePermissionsResponse>('/dashboard/permissions/admin', {
    method: 'DELETE',
  });
  return response.data;
}

/**
 * Hook for admin widget permissions management
 */
export function useAdminWidgetPermissions() {
  const queryClient = useQueryClient();

  // Query for fetching permissions
  const query = useQuery({
    queryKey: ADMIN_PERMISSIONS_KEY,
    queryFn: fetchAdminPermissions,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Mutation for updating permissions
  const updateMutation = useMutation({
    mutationFn: updatePermissions,
    onSuccess: () => {
      // Invalidate query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ADMIN_PERMISSIONS_KEY });
    },
  });

  // Mutation for resetting to defaults
  const resetMutation = useMutation({
    mutationFn: resetPermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PERMISSIONS_KEY });
    },
  });

  // Helper to create a toggle update
  const createToggleUpdate = useCallback(
    (widgetId: string, role: WidgetRole, currentValue: boolean): PermissionUpdate => ({
      widgetId,
      role,
      enabled: !currentValue,
    }),
    []
  );

  // Group widgets by category for UI display
  const widgetsByCategory = useCallback((): Map<WidgetCategory, AdminWidgetPermission[]> => {
    if (!query.data) return new Map();

    const map = new Map<WidgetCategory, AdminWidgetPermission[]>();
    for (const widget of query.data) {
      const existing = map.get(widget.category) ?? [];
      map.set(widget.category, [...existing, widget]);
    }
    return map;
  }, [query.data]);

  return {
    // Query state
    widgets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    updatePermissions: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    resetToDefaults: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
    resetError: resetMutation.error,

    // Helpers
    createToggleUpdate,
    widgetsByCategory,
  };
}

/**
 * Category display names (Hungarian)
 */
export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  general: 'Általános',
  finance: 'Pénzügy',
  inventory: 'Készlet',
  service: 'Szerviz',
  partner: 'Partner',
  alerts: 'Értesítések',
  analytics: 'Analitika',
};

/**
 * Role display names (Hungarian)
 */
export const ROLE_LABELS: Record<WidgetRole, string> = {
  OPERATOR: 'Operátor',
  STORE_MANAGER: 'Boltvezető',
  ADMIN: 'Admin',
};

/**
 * Category order for display
 */
export const CATEGORY_ORDER: WidgetCategory[] = [
  'finance',
  'inventory',
  'service',
  'partner',
  'alerts',
  'general',
  'analytics',
];
