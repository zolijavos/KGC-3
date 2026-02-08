'use client';

import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import {
  WIDGET_REGISTRY,
  WIDGETS_BY_CATEGORY,
  type UserRole,
  type WidgetCategory,
  type WidgetConfig,
} from '../lib/widget-registry';
import type { AccessLevel, SectionId, WidgetVisibility } from './dashboard-types';
import { SECTION_METADATA } from './dashboard-types';

/**
 * Map legacy UserRole to widget access level
 * TODO: Replace with proper permission service when Auth Epic is complete
 */
function getAccessLevel(role: UserRole, widgetRoles: UserRole[]): AccessLevel {
  // Empty roles = all can access
  if (widgetRoles.length === 0) return 'FULL';

  // Check if role has access
  if (widgetRoles.includes(role)) {
    // OPERATOR gets READ, others get FULL
    return role === 'OPERATOR' ? 'READ' : 'FULL';
  }

  return 'NONE';
}

/**
 * Get visible widgets for a specific section
 *
 * @param sectionId - The section to filter widgets for
 * @returns Array of visible widget configs with access levels
 *
 * @example
 * ```tsx
 * function FinanceSection() {
 *   const visibleWidgets = useVisibleWidgets('finance');
 *
 *   if (visibleWidgets.length === 0) return null;
 *
 *   return (
 *     <CollapsibleSection title="Pénzügy">
 *       {visibleWidgets.map(w => <Widget key={w.id} {...w} />)}
 *     </CollapsibleSection>
 *   );
 * }
 * ```
 */
export function useVisibleWidgets(sectionId: SectionId): WidgetVisibility[] {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return [];

    const sectionMeta = SECTION_METADATA[sectionId];
    if (!sectionMeta) return [];

    // Performance: Use pre-computed WIDGETS_BY_CATEGORY instead of Object.entries iteration
    const sectionWidgets = sectionMeta.categories.flatMap(
      category => WIDGETS_BY_CATEGORY.get(category) ?? []
    );

    // Filter by user role and map to visibility info
    return sectionWidgets
      .map((widget): WidgetVisibility => {
        const accessLevel = getAccessLevel(user.role, widget.roles);
        return {
          widgetId: widget.id,
          isVisible: accessLevel !== 'NONE',
          accessLevel,
          category: widget.category,
        };
      })
      .filter(w => w.isVisible);
  }, [user, sectionId]);
}

/**
 * Get all visible widgets grouped by category
 * Useful for rendering the full dashboard
 */
export function useAllVisibleWidgets(): Map<WidgetCategory, WidgetConfig[]> {
  const { user } = useAuth();

  return useMemo(() => {
    const result = new Map<WidgetCategory, WidgetConfig[]>();

    if (!user) return result;

    // Performance: Iterate pre-computed map instead of Object.entries
    WIDGETS_BY_CATEGORY.forEach((widgets, category) => {
      const visibleWidgets = widgets.filter(widget => {
        const accessLevel = getAccessLevel(user.role, widget.roles);
        return accessLevel !== 'NONE';
      });

      if (visibleWidgets.length > 0) {
        result.set(category, visibleWidgets);
      }
    });

    return result;
  }, [user]);
}

/**
 * Check if user has access to a specific widget
 */
export function useWidgetAccess(widgetId: string): {
  hasAccess: boolean;
  accessLevel: AccessLevel;
} {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return { hasAccess: false, accessLevel: 'NONE' as const };
    }

    const widget = WIDGET_REGISTRY[widgetId];
    if (!widget) {
      return { hasAccess: false, accessLevel: 'NONE' as const };
    }

    const accessLevel = getAccessLevel(user.role, widget.roles);
    return {
      hasAccess: accessLevel !== 'NONE',
      accessLevel,
    };
  }, [user, widgetId]);
}
