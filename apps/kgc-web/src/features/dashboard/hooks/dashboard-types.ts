/**
 * Dashboard RBAC Types (Story 35-8)
 *
 * Type definitions for dashboard sections, widgets, and user preferences.
 * Based on ADR-053 Dashboard Hibrid Layout and RBAC Widget Spec.
 */

import type { WidgetCategory } from '../lib/widget-registry';

/** Section identifiers matching ADR-053 */
export type SectionId = 'executive' | 'finance' | 'inventory' | 'service' | 'partner' | 'analytics';

/** Extended role codes per RBAC spec */
export type RoleCode =
  | 'ROLE_ADMIN'
  | 'ROLE_MANAGER'
  | 'ROLE_FINANCE'
  | 'ROLE_FRANCHISE_OWNER'
  | 'ROLE_STOCK'
  | 'ROLE_TECHNICIAN'
  | 'ROLE_SALES'
  | 'ROLE_CASHIER'
  | 'ROLE_FRANCHISE_EMP';

/** Widget access level */
export type AccessLevel = 'FULL' | 'READ' | 'NONE';

/** Widget visibility info with access level */
export interface WidgetVisibility {
  widgetId: string;
  isVisible: boolean;
  accessLevel: AccessLevel;
  category: WidgetCategory;
}

/** Section visibility computed from widget permissions */
export interface SectionVisibility {
  sectionId: SectionId;
  isVisible: boolean;
  visibleWidgetCount: number;
  alertCount: number;
  icon: string;
  title: string;
}

/** Dashboard preset configuration per role */
export interface DashboardPreset {
  roleCode: RoleCode;
  expandedSections: SectionId[];
  pinnedWidgets: string[];
  defaultRefreshInterval: number; // seconds
}

/** User dashboard preferences (persisted) */
export interface UserDashboardPreferences {
  expandedSections: SectionId[];
  pinnedWidgets: string[];
  pinnedSections: SectionId[];
  collapsedSections: SectionId[];
  /** Custom section order (optional, defaults to standard order) */
  sectionOrder?: SectionId[];
}

/** Default section order */
export const DEFAULT_SECTION_ORDER: SectionId[] = [
  'finance',
  'inventory',
  'service',
  'partner',
  'analytics',
];

/** Dashboard state for context/hooks */
export interface DashboardState {
  expandedSections: SectionId[];
  pinnedWidgets: string[];
  userPreferences: UserDashboardPreferences | null;
  isPreferencesLoading: boolean;
}

/** Section metadata for rendering */
export const SECTION_METADATA: Record<
  SectionId,
  { title: string; icon: string; categories: WidgetCategory[] }
> = {
  executive: {
    title: 'Összefoglaló',
    icon: '📊',
    categories: ['general'],
  },
  finance: {
    title: 'Pénzügy',
    icon: '💰',
    categories: ['finance'],
  },
  inventory: {
    title: 'Készlet',
    icon: '📦',
    categories: ['inventory'],
  },
  service: {
    title: 'Szerviz',
    icon: '🔧',
    categories: ['service'],
  },
  partner: {
    title: 'Partner',
    icon: '🤝',
    categories: ['partner'],
  },
  analytics: {
    title: 'Analitika',
    icon: '📈',
    categories: ['analytics'],
  },
};

/** Default presets per role (from RBAC spec) */
export const DASHBOARD_PRESETS: DashboardPreset[] = [
  {
    roleCode: 'ROLE_ADMIN',
    expandedSections: ['finance', 'inventory'],
    pinnedWidgets: ['EXEC_HEALTH', 'EXEC_ALERTS'],
    defaultRefreshInterval: 60,
  },
  {
    roleCode: 'ROLE_MANAGER',
    expandedSections: ['finance', 'inventory'],
    pinnedWidgets: ['EXEC_HEALTH', 'EXEC_REVENUE', 'EXEC_ALERTS'],
    defaultRefreshInterval: 60,
  },
  {
    roleCode: 'ROLE_FINANCE',
    expandedSections: ['finance'],
    pinnedWidgets: ['FIN_RECEIVABLES', 'FIN_AGING'],
    defaultRefreshInterval: 300,
  },
  {
    roleCode: 'ROLE_FRANCHISE_OWNER',
    expandedSections: ['finance', 'inventory'],
    pinnedWidgets: ['EXEC_HEALTH', 'EXEC_REVENUE'],
    defaultRefreshInterval: 60,
  },
  {
    roleCode: 'ROLE_STOCK',
    expandedSections: ['inventory'],
    pinnedWidgets: ['INV_ALERTS', 'INV_SUMMARY'],
    defaultRefreshInterval: 120,
  },
  {
    roleCode: 'ROLE_TECHNICIAN',
    expandedSections: ['service'],
    pinnedWidgets: ['SVC_WORKSHEETS'],
    defaultRefreshInterval: 120,
  },
  {
    roleCode: 'ROLE_SALES',
    expandedSections: ['partner', 'inventory'],
    pinnedWidgets: ['PTR_TOP', 'INV_ALERTS'],
    defaultRefreshInterval: 300,
  },
  {
    roleCode: 'ROLE_CASHIER',
    expandedSections: ['finance'],
    pinnedWidgets: ['FIN_PAYMENTS'],
    defaultRefreshInterval: 60,
  },
  {
    roleCode: 'ROLE_FRANCHISE_EMP',
    expandedSections: ['inventory'],
    pinnedWidgets: [],
    defaultRefreshInterval: 300,
  },
];
