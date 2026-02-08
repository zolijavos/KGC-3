'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DashboardPreset,
  RoleCode,
  SectionId,
  UserDashboardPreferences,
} from './dashboard-types';
import { DASHBOARD_PRESETS, DEFAULT_SECTION_ORDER } from './dashboard-types';

const STORAGE_KEY = 'kgc-dashboard-preferences';

/**
 * Map legacy UserRole to RoleCode
 * TODO: Replace when Auth Epic provides proper role mapping
 */
function mapLegacyRole(legacyRole: string): RoleCode {
  const mapping: Record<string, RoleCode> = {
    ADMIN: 'ROLE_ADMIN',
    STORE_MANAGER: 'ROLE_MANAGER',
    OPERATOR: 'ROLE_STOCK', // Default operators to stock role
  };
  return mapping[legacyRole] || 'ROLE_STOCK';
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(): UserDashboardPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserDashboardPreferences;
  } catch {
    return null;
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferences(prefs: UserDashboardPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get default preset for a role
 */
function getPresetForRole(roleCode: RoleCode): DashboardPreset {
  const preset = DASHBOARD_PRESETS.find(p => p.roleCode === roleCode);
  return (
    preset || {
      roleCode,
      expandedSections: ['finance'],
      pinnedWidgets: [],
      defaultRefreshInterval: 300,
    }
  );
}

export interface UseDashboardPreferencesReturn {
  /** Currently expanded sections */
  expandedSections: SectionId[];
  /** Pinned widget IDs */
  pinnedWidgets: string[];
  /** Pinned section IDs */
  pinnedSections: SectionId[];
  /** Custom section order */
  sectionOrder: SectionId[];
  /** Whether preferences are still loading */
  isLoading: boolean;
  /** Toggle a section's expanded state */
  toggleSection: (sectionId: SectionId) => void;
  /** Set multiple sections expanded state */
  setExpandedSections: (sectionIds: SectionId[]) => void;
  /** Toggle a widget's pinned state */
  togglePinWidget: (widgetId: string) => void;
  /** Toggle a section's pinned state */
  togglePinSection: (sectionId: SectionId) => void;
  /** Move a section up or down in the order */
  moveSection: (sectionId: SectionId, direction: 'up' | 'down') => void;
  /** Reset to role-based defaults */
  resetToDefaults: () => void;
  /** Check if a section is expanded */
  isSectionExpanded: (sectionId: SectionId) => boolean;
  /** Check if a widget is pinned */
  isWidgetPinned: (widgetId: string) => boolean;
  /** Check if a section is pinned */
  isSectionPinned: (sectionId: SectionId) => boolean;
  /** Check if a section can move up */
  canMoveUp: (sectionId: SectionId) => boolean;
  /** Check if a section can move down */
  canMoveDown: (sectionId: SectionId) => boolean;
}

/**
 * Dashboard preferences hook with persistence
 *
 * Manages user preferences for:
 * - Expanded/collapsed sections
 * - Pinned widgets
 * - Persists to localStorage
 * - Falls back to role-based presets
 *
 * @example
 * ```tsx
 * function DashboardLayout() {
 *   const {
 *     expandedSections,
 *     toggleSection,
 *     isSectionExpanded,
 *     resetToDefaults
 *   } = useDashboardPreferences();
 *
 *   return (
 *     <CollapsibleSection
 *       id="finance"
 *       expanded={isSectionExpanded('finance')}
 *       onExpandedChange={() => toggleSection('finance')}
 *     />
 *   );
 * }
 * ```
 */
export function useDashboardPreferences(): UseDashboardPreferencesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserDashboardPreferences | null>(null);

  // Get role preset
  const rolePreset = useMemo(() => {
    if (!user) return null;
    const roleCode = mapLegacyRole(user.role);
    return getPresetForRole(roleCode);
  }, [user]);

  // Load preferences on mount using requestIdleCallback for performance
  // This prevents localStorage blocking the main thread during initial render
  useEffect(() => {
    if (authLoading) return;

    const loadAsync = () => {
      const stored = loadPreferences();
      if (stored) {
        setPreferences(stored);
      } else if (rolePreset) {
        // Initialize from role preset
        const initial: UserDashboardPreferences = {
          expandedSections: rolePreset.expandedSections,
          pinnedWidgets: rolePreset.pinnedWidgets,
          pinnedSections: [],
          collapsedSections: [],
        };
        setPreferences(initial);
        savePreferences(initial);
      }
      setIsLoading(false);
    };

    // Use requestIdleCallback if available, otherwise setTimeout with 0 delay
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleHandle = window.requestIdleCallback(loadAsync, { timeout: 100 });
      return () => window.cancelIdleCallback(idleHandle);
    } else {
      const timeoutHandle = setTimeout(loadAsync, 0);
      return () => clearTimeout(timeoutHandle);
    }
  }, [authLoading, rolePreset]);

  // Compute current expanded sections
  const expandedSections = useMemo(() => {
    if (!preferences) {
      return rolePreset?.expandedSections || [];
    }
    return preferences.expandedSections;
  }, [preferences, rolePreset]);

  // Compute current pinned widgets
  const pinnedWidgets = useMemo(() => {
    if (!preferences) {
      return rolePreset?.pinnedWidgets || [];
    }
    return preferences.pinnedWidgets;
  }, [preferences, rolePreset]);

  // Compute current pinned sections
  const pinnedSections = useMemo(() => {
    if (!preferences) {
      return [];
    }
    return preferences.pinnedSections ?? [];
  }, [preferences]);

  // Compute current section order
  const sectionOrder = useMemo(() => {
    if (!preferences?.sectionOrder) {
      return DEFAULT_SECTION_ORDER;
    }
    return preferences.sectionOrder;
  }, [preferences]);

  // Toggle section expanded state
  const toggleSection = useCallback(
    (sectionId: SectionId) => {
      setPreferences(prev => {
        // If no preferences yet, create from role preset or defaults
        const current = prev ?? {
          expandedSections: rolePreset?.expandedSections ?? [],
          pinnedWidgets: rolePreset?.pinnedWidgets ?? [],
          pinnedSections: [],
          collapsedSections: [],
        };

        const isExpanded = current.expandedSections.includes(sectionId);
        const newExpanded = isExpanded
          ? current.expandedSections.filter(id => id !== sectionId)
          : [...current.expandedSections, sectionId];

        const newPrefs: UserDashboardPreferences = {
          ...current,
          expandedSections: newExpanded,
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [rolePreset]
  );

  // Set expanded sections
  const setExpandedSections = useCallback(
    (sectionIds: SectionId[]) => {
      setPreferences(prev => {
        // If no preferences yet, create from role preset or defaults
        const current = prev ?? {
          expandedSections: rolePreset?.expandedSections ?? [],
          pinnedWidgets: rolePreset?.pinnedWidgets ?? [],
          pinnedSections: [],
          collapsedSections: [],
        };

        const newPrefs: UserDashboardPreferences = {
          ...current,
          expandedSections: sectionIds,
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [rolePreset]
  );

  // Toggle widget pinned state
  const togglePinWidget = useCallback(
    (widgetId: string) => {
      setPreferences(prev => {
        // If no preferences yet, create from role preset or defaults
        const current = prev ?? {
          expandedSections: rolePreset?.expandedSections ?? [],
          pinnedWidgets: rolePreset?.pinnedWidgets ?? [],
          pinnedSections: [],
          collapsedSections: [],
        };

        const isPinned = current.pinnedWidgets.includes(widgetId);
        const newPinned = isPinned
          ? current.pinnedWidgets.filter(id => id !== widgetId)
          : [...current.pinnedWidgets, widgetId];

        const newPrefs: UserDashboardPreferences = {
          ...current,
          pinnedWidgets: newPinned,
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [rolePreset]
  );

  // Toggle section pinned state
  const togglePinSection = useCallback(
    (sectionId: SectionId) => {
      setPreferences(prev => {
        // If no preferences yet, create from role preset or defaults
        const current = prev ?? {
          expandedSections: rolePreset?.expandedSections ?? [],
          pinnedWidgets: rolePreset?.pinnedWidgets ?? [],
          pinnedSections: [],
          collapsedSections: [],
        };

        const currentPinned = current.pinnedSections ?? [];
        const isPinned = currentPinned.includes(sectionId);
        const newPinned = isPinned
          ? currentPinned.filter(id => id !== sectionId)
          : [...currentPinned, sectionId];

        const newPrefs: UserDashboardPreferences = {
          ...current,
          pinnedSections: newPinned,
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [rolePreset]
  );

  // Move section up or down
  const moveSection = useCallback(
    (sectionId: SectionId, direction: 'up' | 'down') => {
      setPreferences(prev => {
        const current = prev ?? {
          expandedSections: rolePreset?.expandedSections ?? [],
          pinnedWidgets: rolePreset?.pinnedWidgets ?? [],
          pinnedSections: [],
          collapsedSections: [],
        };

        const currentOrder = current.sectionOrder ?? [...DEFAULT_SECTION_ORDER];
        const index = currentOrder.indexOf(sectionId);

        if (index === -1) return current;
        if (direction === 'up' && index === 0) return current;
        if (direction === 'down' && index === currentOrder.length - 1) return current;

        const newOrder = [...currentOrder];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const swapItem = newOrder[swapIndex];
        if (swapItem !== undefined) {
          newOrder[swapIndex] = sectionId;
          newOrder[index] = swapItem;
        }

        const newPrefs: UserDashboardPreferences = {
          ...current,
          sectionOrder: newOrder,
        };
        savePreferences(newPrefs);
        return newPrefs;
      });
    },
    [rolePreset]
  );

  // Reset to role defaults
  const resetToDefaults = useCallback(() => {
    if (!rolePreset) return;

    const defaultPrefs: UserDashboardPreferences = {
      expandedSections: rolePreset.expandedSections,
      pinnedWidgets: rolePreset.pinnedWidgets,
      pinnedSections: [],
      collapsedSections: [],
    };
    setPreferences(defaultPrefs);
    savePreferences(defaultPrefs);
  }, [rolePreset]);

  // Check if section is expanded
  const isSectionExpanded = useCallback(
    (sectionId: SectionId): boolean => {
      return expandedSections.includes(sectionId);
    },
    [expandedSections]
  );

  // Check if widget is pinned
  const isWidgetPinned = useCallback(
    (widgetId: string): boolean => {
      return pinnedWidgets.includes(widgetId);
    },
    [pinnedWidgets]
  );

  // Check if section is pinned
  const isSectionPinned = useCallback(
    (sectionId: SectionId): boolean => {
      return pinnedSections.includes(sectionId);
    },
    [pinnedSections]
  );

  // Check if section can move up
  const canMoveUp = useCallback(
    (sectionId: SectionId): boolean => {
      const index = sectionOrder.indexOf(sectionId);
      return index > 0;
    },
    [sectionOrder]
  );

  // Check if section can move down
  const canMoveDown = useCallback(
    (sectionId: SectionId): boolean => {
      const index = sectionOrder.indexOf(sectionId);
      return index >= 0 && index < sectionOrder.length - 1;
    },
    [sectionOrder]
  );

  return {
    expandedSections,
    pinnedWidgets,
    pinnedSections,
    sectionOrder,
    isLoading: isLoading || authLoading,
    toggleSection,
    setExpandedSections,
    togglePinWidget,
    togglePinSection,
    moveSection,
    resetToDefaults,
    isSectionExpanded,
    isWidgetPinned,
    isSectionPinned,
    canMoveUp,
    canMoveDown,
  };
}
