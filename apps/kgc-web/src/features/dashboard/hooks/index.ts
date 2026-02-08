/**
 * Dashboard RBAC Hooks (Story 35-8)
 *
 * Role-based access control hooks for dashboard sections and widgets.
 * Based on ADR-053 Dashboard Hibrid Layout and RBAC Widget Spec.
 */

// Types
export type {
  AccessLevel,
  DashboardPreset,
  DashboardState,
  RoleCode,
  SectionId,
  SectionVisibility,
  UserDashboardPreferences,
  WidgetVisibility,
} from './dashboard-types';

export { DASHBOARD_PRESETS, SECTION_METADATA } from './dashboard-types';

// Widget visibility hooks
export { useAllVisibleWidgets, useVisibleWidgets, useWidgetAccess } from './useVisibleWidgets';

// Section visibility hooks
export {
  useSectionVisibility,
  useVisibleSectionIds,
  useVisibleSections,
} from './useVisibleSections';

// Preferences hook
export {
  useDashboardPreferences,
  type UseDashboardPreferencesReturn,
} from './useDashboardPreferences';
