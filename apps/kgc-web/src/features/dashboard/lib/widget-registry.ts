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
    component: lazy(() => import('@kgc/ui').then(m => ({ default: m.WelcomeCard }))),
    roles: [], // All roles can see
    category: 'general',
    refreshInterval: null,
  },
  'empty-state': {
    component: lazy(() => import('@kgc/ui').then(m => ({ default: m.EmptyStateWidget }))),
    roles: [], // All roles can see
    category: 'general',
    refreshInterval: null,
  },
  // Financial KPI Widgets (Story 35-2) - with data fetching wrappers
  'revenue-kpi': {
    component: lazy(() => import('../widgets/RevenueKPIWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'net-revenue-kpi': {
    component: lazy(() => import('../widgets/NetRevenueKPIWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'receivables-kpi': {
    component: lazy(() => import('../widgets/ReceivablesKPIWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },
  'payments-kpi': {
    component: lazy(() => import('../widgets/PaymentsKPIWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },

  // Inventory Stock Widgets (Story 35-3) - with data fetching wrappers
  'stock-summary': {
    component: lazy(() => import('../widgets/StockSummaryWidget')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-utilization': {
    component: lazy(() => import('../widgets/StockUtilizationWidget')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-alerts': {
    component: lazy(() => import('../widgets/StockAlertListWidget')),
    roles: ['OPERATOR', 'STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-movement': {
    component: lazy(() => import('../widgets/StockMovementChartWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'inventory',
    refreshInterval: 300, // 5 minutes
  },
  'stock-heatmap': {
    component: lazy(() => import('../widgets/StockHeatmapWidget')),
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

  // Service Dashboard Widgets (Story 35-5)
  'worksheet-summary': {
    component: lazy(() => import('../widgets/WorksheetSummaryWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'service',
    refreshInterval: 300, // 5 minutes
  },
  'technician-workload': {
    component: lazy(() => import('../widgets/TechnicianWorkloadWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'service',
    refreshInterval: 300, // 5 minutes
  },
  'service-revenue': {
    component: lazy(() => import('../widgets/ServiceRevenueWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'service',
    refreshInterval: 300, // 5 minutes
  },
  'warranty-ratio-placeholder': {
    component: lazy(() => import('../widgets/WarrantyRatioPlaceholder')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'service',
    refreshInterval: null, // Placeholder - no refresh
  },

  // Partner Dashboard Widgets (Story 35-6)
  'partner-overview': {
    component: lazy(() => import('../widgets/PartnerOverviewWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'partner',
    refreshInterval: 300, // 5 minutes
  },
  'top-partners': {
    component: lazy(() => import('../widgets/TopPartnersWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'partner',
    refreshInterval: 300, // 5 minutes
  },
  'partner-activity': {
    component: lazy(() => import('../widgets/PartnerActivityWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'partner',
    refreshInterval: 300, // 5 minutes
  },
  'partner-credit-placeholder': {
    component: lazy(() => import('../widgets/PartnerCreditPlaceholder')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'partner',
    refreshInterval: null, // Placeholder - no refresh
  },

  // Equipment Profit Widget (Story 40-4)
  'equipment-profit': {
    component: lazy(() => import('../widgets/EquipmentProfitWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
  },

  // Receivables Aging Widget (Story 41-1)
  'receivables-aging': {
    component: lazy(() => import('../widgets/ReceivablesAgingWidget')),
    roles: ['STORE_MANAGER', 'ADMIN'],
    category: 'finance',
    refreshInterval: 300, // 5 minutes
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
