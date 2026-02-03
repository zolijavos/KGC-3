import type { UserRole } from './widget-registry';

export type LayoutType = 'scanner-focus' | 'dashboard-first';

/**
 * Role-to-Layout mapping
 * OPERATOR: Scanner-focused minimal UI (quick actions)
 * STORE_MANAGER + ADMIN: Dashboard-first with analytics and widgets
 */
export const ROLE_LAYOUT_MAP: Record<UserRole, LayoutType> = {
  OPERATOR: 'scanner-focus',
  STORE_MANAGER: 'dashboard-first',
  ADMIN: 'dashboard-first',
};

/**
 * Get layout type for a given user role
 */
export function getLayoutForRole(role: UserRole): LayoutType {
  return ROLE_LAYOUT_MAP[role];
}
