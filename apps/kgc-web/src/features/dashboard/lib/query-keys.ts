/**
 * Dashboard Query Key Factory (Performance Optimization)
 *
 * Centralized query keys for TanStack Query to enable:
 * - Type-safe query key generation
 * - Easy cache invalidation patterns
 * - Consistent key structure across widgets
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const dashboardKeys = {
  /** Root key for all dashboard queries */
  all: ['dashboard'] as const,

  /** KPI queries */
  kpis: () => [...dashboardKeys.all, 'kpi'] as const,
  kpi: (type: string) => [...dashboardKeys.kpis(), type] as const,

  /** Inventory queries */
  inventory: () => [...dashboardKeys.all, 'inventory'] as const,
  inventoryItem: (type: string) => [...dashboardKeys.inventory(), type] as const,

  /** Service queries */
  service: () => [...dashboardKeys.all, 'service'] as const,
  serviceItem: (type: string) => [...dashboardKeys.service(), type] as const,

  /** Partner queries */
  partner: () => [...dashboardKeys.all, 'partner'] as const,
  partnerItem: (type: string) => [...dashboardKeys.partner(), type] as const,

  /** Notifications */
  notifications: () => [...dashboardKeys.all, 'notifications'] as const,
  notificationsByType: (type: string) => [...dashboardKeys.notifications(), type] as const,
} as const;

/**
 * Query key type helpers for type inference
 */
export type DashboardQueryKey = ReturnType<(typeof dashboardKeys)[keyof typeof dashboardKeys]>;
