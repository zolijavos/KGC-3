import { Suspense, useMemo } from 'react';
import { getLayoutForRole } from '../lib/layout-config';
import { getWidgetsByRole, type UserRole } from '../lib/widget-registry';
import { DashboardFirstLayout } from './DashboardFirstLayout';
import { ScannerFocusLayout } from './ScannerFocusLayout';

export interface RoleBasedDashboardProps {
  userRole: UserRole;
  className?: string;
}

/**
 * Role-Based Dashboard Container (Epic 35: Story 35-1)
 * Orchestrates layout selection, widget filtering, and lazy loading based on user role
 */
export function RoleBasedDashboard({ userRole, className }: RoleBasedDashboardProps) {
  // Get layout type for role
  const layoutType = getLayoutForRole(userRole);

  // Get filtered widgets for role
  const widgetConfigs = useMemo(() => getWidgetsByRole(userRole), [userRole]);

  // Render widgets with Suspense boundary for lazy loading
  const widgets = widgetConfigs.map(config => {
    const WidgetComponent = config.component;

    return (
      <Suspense
        key={config.id}
        fallback={
          <div className="flex items-center justify-center p-6 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        }
      >
        <WidgetComponent />
      </Suspense>
    );
  });

  // Select layout based on role
  const LayoutComponent =
    layoutType === 'scanner-focus' ? ScannerFocusLayout : DashboardFirstLayout;

  return (
    <div className={className}>
      <LayoutComponent widgets={widgets} />
    </div>
  );
}
