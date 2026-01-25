/**
 * useFavorites Hook
 * Epic 29-2: Combines Zustand store with React Query for server sync
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  MAX_FAVORITES,
  selectSortedFavorites,
  useFavoritesStore,
  type PendingChange,
  type UserFavorite,
} from '../stores/favorites.store';

/** API base URL - should be configured via environment */
const API_BASE = '/api/v1/user/settings';

/** API response types */
interface FavoritesResponse {
  favorites: UserFavorite[];
  version: number;
}

interface FavoritesApi {
  fetchFavorites: () => Promise<FavoritesResponse>;
  addFavorite: (menuItemId: string) => Promise<UserFavorite>;
  removeFavorite: (menuItemId: string) => Promise<void>;
  reorderFavorites: (orderedIds: string[]) => Promise<void>;
}

/** Default API implementation */
const defaultApi: FavoritesApi = {
  fetchFavorites: async () => {
    const res = await fetch(`${API_BASE}/favorites`);
    if (!res.ok) throw new Error('Kedvencek betöltése sikertelen');
    return res.json();
  },
  addFavorite: async (menuItemId: string) => {
    const res = await fetch(`${API_BASE}/favorites/${menuItemId}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Kedvenc hozzáadása sikertelen');
    return res.json();
  },
  removeFavorite: async (menuItemId: string) => {
    const res = await fetch(`${API_BASE}/favorites/${menuItemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Kedvenc törlése sikertelen');
  },
  reorderFavorites: async (orderedIds: string[]) => {
    const res = await fetch(`${API_BASE}/favorites/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error('Sorrend mentése sikertelen');
  },
};

interface UseFavoritesOptions {
  api?: Partial<FavoritesApi>;
  enabled?: boolean;
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const { api: customApi, enabled = true } = options;
  const api = { ...defaultApi, ...customApi };
  const queryClient = useQueryClient();

  // Store access
  const store = useFavoritesStore();
  const favorites = useFavoritesStore(selectSortedFavorites);
  const pendingChanges = store.pendingChanges;

  // Fetch favorites from server
  const {
    data: serverData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-favorites'],
    queryFn: api.fetchFavorites,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Sync server data to store when fetched
  useEffect(() => {
    if (serverData && pendingChanges.length === 0) {
      store.setFavorites(serverData.favorites, serverData.version);
      store.setSyncedAt(new Date());
    }
  }, [serverData, pendingChanges.length, store]);

  // Add favorite mutation
  const addMutation = useMutation({
    mutationFn: api.addFavorite,
    onError: (error: Error, menuItemId) => {
      // Rollback optimistic update
      store.removeFavorite(menuItemId);
      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  // Remove favorite mutation
  const removeMutation = useMutation({
    mutationFn: api.removeFavorite,
    onError: (error: Error) => {
      toast.error(error.message);
      // Refetch to restore state
      refetch();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: api.reorderFavorites,
    onError: (error: Error) => {
      toast.error(error.message);
      refetch();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  // Add favorite with optimistic update
  const addFavorite = useCallback(
    (menuItemId: string, label?: string) => {
      if (favorites.length >= MAX_FAVORITES) {
        toast.error(`Maximum ${MAX_FAVORITES} kedvenc engedélyezett`);
        return false;
      }

      if (store.isFavorite(menuItemId)) {
        toast.info('Már a kedvencek között van');
        return false;
      }

      // Optimistic update
      const added = store.addFavorite(menuItemId, label);
      if (added) {
        toast.success('Hozzáadva a kedvencekhez');
        addMutation.mutate(menuItemId);
      }
      return added;
    },
    [favorites.length, store, addMutation]
  );

  // Remove favorite with optimistic update
  const removeFavorite = useCallback(
    (menuItemId: string) => {
      store.removeFavorite(menuItemId);
      toast.success('Eltávolítva a kedvencekből');
      removeMutation.mutate(menuItemId);
    },
    [store, removeMutation]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    (menuItemId: string, label?: string) => {
      if (store.isFavorite(menuItemId)) {
        removeFavorite(menuItemId);
        return false;
      } else {
        return addFavorite(menuItemId, label);
      }
    },
    [store, addFavorite, removeFavorite]
  );

  // Reorder favorites
  const reorderFavorites = useCallback(
    (orderedIds: string[]) => {
      store.reorderFavorites(orderedIds);
      reorderMutation.mutate(orderedIds);
    },
    [store, reorderMutation]
  );

  // Check if item is favorite
  const isFavorite = useCallback((menuItemId: string) => store.isFavorite(menuItemId), [store]);

  // Sync pending changes (for offline support)
  const syncPendingChanges = useCallback(async () => {
    for (const change of pendingChanges) {
      try {
        switch (change.type) {
          case 'add':
            if (change.menuItemId) {
              await api.addFavorite(change.menuItemId);
            }
            break;
          case 'remove':
            if (change.menuItemId) {
              await api.removeFavorite(change.menuItemId);
            }
            break;
          case 'reorder':
            if (change.orderedIds) {
              await api.reorderFavorites(change.orderedIds);
            }
            break;
        }
        store.removePendingChange(change.id);
      } catch {
        // Keep pending change for next sync attempt
        break;
      }
    }
  }, [pendingChanges, api, store]);

  return {
    // Data
    favorites,
    isLoading: isLoading || store.isLoading,
    error,
    pendingChangesCount: pendingChanges.length,
    canAddMore: favorites.length < MAX_FAVORITES,
    maxFavorites: MAX_FAVORITES,

    // Actions
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reorderFavorites,
    isFavorite,
    refetch,
    syncPendingChanges,
  };
}

export type { PendingChange, UserFavorite };
