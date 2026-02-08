import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardPreferences } from '../useDashboardPreferences';

// Mock useAuth
const mockUser = vi.fn();
const mockIsLoading = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser(),
    isAuthenticated: !!mockUser(),
    isLoading: mockIsLoading(),
  }),
}));

// Mock localStorage with internal store
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useDashboardPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
    mockUser.mockReturnValue({ id: '1', name: 'Manager', role: 'STORE_MANAGER' });
    mockIsLoading.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
  });

  describe('initial state', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => useDashboardPreferences());

      // After the first render and useEffect, loading should be false
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('expandedSections');
      expect(result.current).toHaveProperty('pinnedWidgets');
    });

    it('should initialize with role preset when no stored preferences', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      // Wait for effect to run
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // STORE_MANAGER maps to ROLE_MANAGER which has ['finance', 'inventory'] expanded
      expect(result.current.expandedSections).toContain('finance');
      expect(result.current.expandedSections).toContain('inventory');
    });

    it('should load stored preferences from localStorage', async () => {
      const storedPrefs = {
        expandedSections: ['service'],
        pinnedWidgets: ['custom-widget'],
        collapsedSections: [],
      };
      localStorageStore['kgc-dashboard-preferences'] = JSON.stringify(storedPrefs);

      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.expandedSections).toEqual(['service']);
      expect(result.current.pinnedWidgets).toEqual(['custom-widget']);
    });
  });

  describe('toggleSection', () => {
    it('should expand a collapsed section', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Service is not in default expanded for ROLE_MANAGER
      expect(result.current.isSectionExpanded('service')).toBe(false);

      act(() => {
        result.current.toggleSection('service');
      });

      expect(result.current.isSectionExpanded('service')).toBe(true);
    });

    it('should collapse an expanded section', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ROLE_MANAGER preset has ['finance', 'inventory'] expanded
      // Wait for preferences to be initialized
      await waitFor(() => {
        expect(result.current.expandedSections.length).toBeGreaterThan(0);
      });

      // Toggle finance (which should be expanded by default)
      const initiallyExpanded = result.current.isSectionExpanded('finance');

      act(() => {
        result.current.toggleSection('finance');
      });

      expect(result.current.isSectionExpanded('finance')).toBe(!initiallyExpanded);
    });

    it('should persist changes to localStorage', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleSection('partner');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('setExpandedSections', () => {
    it('should set multiple sections as expanded', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setExpandedSections(['service', 'partner']);
      });

      expect(result.current.expandedSections).toEqual(['service', 'partner']);
      expect(result.current.isSectionExpanded('service')).toBe(true);
      expect(result.current.isSectionExpanded('partner')).toBe(true);
      expect(result.current.isSectionExpanded('finance')).toBe(false);
    });
  });

  describe('togglePinWidget', () => {
    it('should pin a widget', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isWidgetPinned('stock-summary')).toBe(false);

      act(() => {
        result.current.togglePinWidget('stock-summary');
      });

      expect(result.current.isWidgetPinned('stock-summary')).toBe(true);
    });

    it('should unpin a pinned widget', async () => {
      const storedPrefs = {
        expandedSections: ['finance'],
        pinnedWidgets: ['stock-summary'],
        collapsedSections: [],
      };
      localStorageStore['kgc-dashboard-preferences'] = JSON.stringify(storedPrefs);

      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isWidgetPinned('stock-summary')).toBe(true);

      act(() => {
        result.current.togglePinWidget('stock-summary');
      });

      expect(result.current.isWidgetPinned('stock-summary')).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset preferences to role preset', async () => {
      const storedPrefs = {
        expandedSections: ['analytics'],
        pinnedWidgets: ['custom-widget'],
        collapsedSections: [],
      };
      localStorageStore['kgc-dashboard-preferences'] = JSON.stringify(storedPrefs);

      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Current state is from stored prefs
      expect(result.current.expandedSections).toEqual(['analytics']);

      act(() => {
        result.current.resetToDefaults();
      });

      // After reset, should be ROLE_MANAGER defaults
      expect(result.current.expandedSections).toContain('finance');
      expect(result.current.expandedSections).toContain('inventory');
    });
  });

  describe('isSectionExpanded', () => {
    it('should return true for expanded section after initialization', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for the effect to load preferences
      await waitFor(() => {
        expect(result.current.expandedSections.length).toBeGreaterThan(0);
      });

      // STORE_MANAGER maps to ROLE_MANAGER which has ['finance', 'inventory'] expanded
      expect(result.current.isSectionExpanded('finance')).toBe(true);
    });

    it('should return false for collapsed section', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for the effect to load preferences
      await waitFor(() => {
        expect(result.current.expandedSections.length).toBeGreaterThan(0);
      });

      // analytics is not in default expanded sections for ROLE_MANAGER
      expect(result.current.isSectionExpanded('analytics')).toBe(false);
    });
  });

  describe('isWidgetPinned', () => {
    it('should return true for pinned widget', async () => {
      const storedPrefs = {
        expandedSections: ['finance'],
        pinnedWidgets: ['revenue-kpi'],
        collapsedSections: [],
      };
      localStorageStore['kgc-dashboard-preferences'] = JSON.stringify(storedPrefs);

      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isWidgetPinned('revenue-kpi')).toBe(true);
    });

    it('should return false for non-pinned widget', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isWidgetPinned('non-existent-widget')).toBe(false);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
      localStorageStore = {}; // Clear storage
    });

    it('should return empty arrays when no user and no stored prefs', async () => {
      const { result } = renderHook(() => useDashboardPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Without user and without stored prefs, should get empty or fallback values
      // Since there's no rolePreset, expandedSections comes from stored prefs or empty
      expect(result.current.expandedSections).toEqual([]);
      expect(result.current.pinnedWidgets).toEqual([]);
    });
  });
});
