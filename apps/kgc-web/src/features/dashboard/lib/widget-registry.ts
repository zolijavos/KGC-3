import { lazy, type ComponentType } from 'react';

export type UserRole = 'OPERATOR' | 'STORE_MANAGER' | 'ADMIN';

export type WidgetCategory = 'general' | 'finance' | 'inventory' | 'service' | 'partner' | 'alerts';

export interface WidgetConfig {
  id: string;
  component: ComponentType<Record<string, unknown>>;
  roles: UserRole[]; // Empty array = all roles can see
  category: WidgetCategory;
  refreshInterval: number | null; // seconds, null = no auto-refresh
}

// Widget Registry - centralized lazy loading with role-based filtering
export const WIDGET_REGISTRY: Record<string, Omit<WidgetConfig, 'id'>> = {
  'welcome-card': {
    component: lazy(() => import('@kgc/ui/widgets/WelcomeCard')),
    roles: [], // All roles can see
    category: 'general',
    refreshInterval: null,
  },
  'empty-state': {
    component: lazy(() => import('@kgc/ui/widgets/EmptyStateWidget')),
    roles: [], // All roles can see
    category: 'general',
    refreshInterval: null,
  },
  // Financial KPI Widgets (Story 35-2)
  'revenue-kpi': {
    component: lazy(() => import('@kgc/ui/widgets/RevenueKPICard')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'net-revenue-kpi': {
    component: lazy(() => import('@kgc/ui/widgets/NetRevenueKPICard')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'receivables-kpi': {
    component: lazy(() => import('@kgc/ui/widgets/ReceivablesKPICard')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'payments-kpi': {
    component: lazy(() => import('@kgc/ui/widgets/PaymentsKPICard')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },

  // Inventory Stock Widgets (Story 35-3)
  'stock-summary': {
    component: lazy(() => import('@kgc/ui/widgets/StockSummaryCard')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-utilization': {
    component: lazy(() => import('@kgc/ui/widgets/UtilizationCard')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-alerts': {
    component: lazy(() => import('@kgc/ui/widgets/StockAlertList')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-movement': {
    component: lazy(() => import('@kgc/ui/widgets/StockMovementChart')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-heatmap': {
    component: lazy(() => import('@kgc/ui/widgets/StockHeatmap')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },

  // Notification Panel Widget (Story 35-4)
  'notification-panel': {
    component: lazy(() => import('../widgets/NotificationPanelWidget')),
    roles: [], // All roles can see notifications
    category: 'alerts',
    refreshInterval: 300, // 5 minutes (managed by TanStack Query polling)
  },
};

/**
 * Get all widgets that the given user role can access
 * Widgets with empty roles array are visible to all roles
 */
export function getWidgetsByRole(role: UserRole): WidgetConfig[] {
  return Object.entries(WIDGET_REGISTRY)
    .filter(([, config]) => {
      // Empty roles = all roles can see
      if (config.roles.length === 0) return true;
      // Check if user role is in widget's allowed roles
      return config.roles.includes(role);
    })
    .map(([id, config]) => ({
      id,
      ...config,
    }));
}

/**
 * Get widget configuration by widget ID
 * Returns undefined if widget doesn't exist
 */
export function getWidgetById(widgetId: string): WidgetConfig | undefined {
  const config = WIDGET_REGISTRY[widgetId];
  if (!config) return undefined;

  return {
    id: widgetId,
    ...config,
  };
}
