/**
 * Favorites Store - Zustand + localStorage
 * Epic 29-2: User Favorites State Management
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Maximum number of favorites allowed */
export const MAX_FAVORITES = 10;

/** Favorite item interface */
export interface UserFavorite {
  menuItemId: string;
  order: number;
  addedAt: Date;
  label?: string | undefined;
}

/** Pending change for offline sync */
export interface PendingChange {
  id: string;
  type: 'add' | 'remove' | 'reorder';
  menuItemId?: string;
  orderedIds?: string[];
  timestamp: number;
}

/** Store state interface */
interface FavoritesState {
  favorites: UserFavorite[];
  version: number;
  pendingChanges: PendingChange[];
  isLoading: boolean;
  lastSyncedAt: Date | null;

  // Actions
  addFavorite: (menuItemId: string, label?: string) => boolean;
  removeFavorite: (menuItemId: string) => void;
  reorderFavorites: (orderedIds: string[]) => void;
  setFavorites: (favorites: UserFavorite[], version: number) => void;
  clearPendingChanges: () => void;
  removePendingChange: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncedAt: (date: Date) => void;
  isFavorite: (menuItemId: string) => boolean;
  getFavoriteByMenuItemId: (menuItemId: string) => UserFavorite | undefined;
}

/** Generate unique ID for pending changes */
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      version: 0,
      pendingChanges: [],
      isLoading: false,
      lastSyncedAt: null,

      addFavorite: (menuItemId: string, label?: string) => {
        const state = get();

        // Check if already favorite
        if (state.favorites.some(f => f.menuItemId === menuItemId)) {
          return false;
        }

        // Check max limit
        if (state.favorites.length >= MAX_FAVORITES) {
          return false;
        }

        const newFavorite: UserFavorite = {
          menuItemId,
          order: state.favorites.length,
          addedAt: new Date(),
          label,
        };

        const pendingChange: PendingChange = {
          id: generateId(),
          type: 'add',
          menuItemId,
          timestamp: Date.now(),
        };

        set({
          favorites: [...state.favorites, newFavorite],
          pendingChanges: [...state.pendingChanges, pendingChange],
        });

        return true;
      },

      removeFavorite: (menuItemId: string) => {
        const state = get();
        const filtered = state.favorites.filter(f => f.menuItemId !== menuItemId);

        // Reorder remaining favorites
        const reordered = filtered.map((f, index) => ({ ...f, order: index }));

        const pendingChange: PendingChange = {
          id: generateId(),
          type: 'remove',
          menuItemId,
          timestamp: Date.now(),
        };

        set({
          favorites: reordered,
          pendingChanges: [...state.pendingChanges, pendingChange],
        });
      },

      reorderFavorites: (orderedIds: string[]) => {
        const state = get();
        const reordered: UserFavorite[] = [];

        orderedIds.forEach((id, index) => {
          const favorite = state.favorites.find(f => f.menuItemId === id);
          if (favorite) {
            reordered.push({ ...favorite, order: index });
          }
        });

        const pendingChange: PendingChange = {
          id: generateId(),
          type: 'reorder',
          orderedIds,
          timestamp: Date.now(),
        };

        set({
          favorites: reordered,
          pendingChanges: [...state.pendingChanges, pendingChange],
        });
      },

      setFavorites: (favorites: UserFavorite[], version: number) => {
        set({ favorites, version });
      },

      clearPendingChanges: () => {
        set({ pendingChanges: [] });
      },

      removePendingChange: (id: string) => {
        set(state => ({
          pendingChanges: state.pendingChanges.filter(p => p.id !== id),
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setSyncedAt: (date: Date) => {
        set({ lastSyncedAt: date });
      },

      isFavorite: (menuItemId: string) => {
        return get().favorites.some(f => f.menuItemId === menuItemId);
      },

      getFavoriteByMenuItemId: (menuItemId: string) => {
        return get().favorites.find(f => f.menuItemId === menuItemId);
      },
    }),
    {
      name: 'kgc-user-favorites',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        favorites: state.favorites,
        version: state.version,
        pendingChanges: state.pendingChanges,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

/** Selector for sorted favorites (by order) */
export const selectSortedFavorites = (state: FavoritesState): UserFavorite[] =>
  [...state.favorites].sort((a, b) => a.order - b.order);

/** Selector for pending changes count */
export const selectPendingChangesCount = (state: FavoritesState): number =>
  state.pendingChanges.length;
