'use client';

import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { WIDGETS_BY_CATEGORY } from '../lib/widget-registry';
import type { SectionId, SectionVisibility } from './dashboard-types';
import { SECTION_METADATA } from './dashboard-types';

/**
 * Calculate section visibility based on user role
 *
 * A section is visible if the user has access to at least one widget in it.
 * Returns section metadata with visibility info and widget counts.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const sections = useVisibleSections();
 *
 *   return (
 *     <div>
 *       {sections.map(section => (
 *         section.isVisible && (
 *           <CollapsibleSection
 *             key={section.sectionId}
 *             title={section.title}
 *             icon={section.icon}
 *             widgetCount={section.visibleWidgetCount}
 *             alertCount={section.alertCount}
 *           />
 *         )
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVisibleSections(): SectionVisibility[] {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return [];

    const sectionIds = Object.keys(SECTION_METADATA) as SectionId[];

    return sectionIds.map((sectionId): SectionVisibility => {
      const sectionMeta = SECTION_METADATA[sectionId];

      // Performance: Use pre-computed WIDGETS_BY_CATEGORY instead of Object.entries iteration
      const sectionWidgets = sectionMeta.categories.flatMap(
        category => WIDGETS_BY_CATEGORY.get(category) ?? []
      );

      const visibleWidgets = sectionWidgets.filter(widget => {
        // Empty roles = all can see
        if (widget.roles.length === 0) return true;
        return widget.roles.includes(user.role);
      });

      // Count alert widgets (alerts category is special)
      const alertWidgets = visibleWidgets.filter(widget => widget.category === 'alerts');

      return {
        sectionId,
        isVisible: visibleWidgets.length > 0,
        visibleWidgetCount: visibleWidgets.length,
        alertCount: alertWidgets.length,
        icon: sectionMeta.icon,
        title: sectionMeta.title,
      };
    });
  }, [user]);
}

/**
 * Check if a specific section should be visible for the current user
 */
export function useSectionVisibility(sectionId: SectionId): SectionVisibility | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return null;

    const sectionMeta = SECTION_METADATA[sectionId];
    if (!sectionMeta) return null;

    // Performance: Use pre-computed WIDGETS_BY_CATEGORY instead of Object.entries iteration
    const sectionWidgets = sectionMeta.categories.flatMap(
      category => WIDGETS_BY_CATEGORY.get(category) ?? []
    );

    const visibleWidgets = sectionWidgets.filter(widget => {
      if (widget.roles.length === 0) return true;
      return widget.roles.includes(user.role);
    });

    const alertWidgets = visibleWidgets.filter(widget => widget.category === 'alerts');

    return {
      sectionId,
      isVisible: visibleWidgets.length > 0,
      visibleWidgetCount: visibleWidgets.length,
      alertCount: alertWidgets.length,
      icon: sectionMeta.icon,
      title: sectionMeta.title,
    };
  }, [user, sectionId]);
}

/**
 * Get section IDs that should be visible for the current user
 */
export function useVisibleSectionIds(): SectionId[] {
  const sections = useVisibleSections();
  return useMemo(() => sections.filter(s => s.isVisible).map(s => s.sectionId), [sections]);
}
