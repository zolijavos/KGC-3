'use client';

import { Suspense, useMemo } from 'react';
import { cn } from '@kgc/ui/lib/utils';
import { WidgetSkeleton } from '@kgc/ui/components/dashboard';
import { getWidgetsByRole, type UserRole } from '../lib/widget-registry';
import { getLayoutForRole } from '../lib/layout-config';
import { ScannerFocusLayout } from './ScannerFocusLayout';
import { DashboardFirstLayout } from './DashboardFirstLayout';

export interface RoleBasedDashboardProps {
  userRole: UserRole;
  className?: string;
}

/**
 * Role-Based Dashboard Container
 * Orchestrates layout selection, widget filtering, and lazy loading based on user role
 */
export function RoleBasedDashboard({ userRole, className }: RoleBasedDashboardProps) {
  // Get layout type for role
  const layoutType = getLayoutForRole(userRole);

  // Get filtered widgets for role
  const widgetConfigs = useMemo(() => getWidgetsByRole(userRole), [userRole]);

  // Render widgets with Suspense boundary for lazy loading
  const widgets = widgetConfigs.map((config) => {
    const WidgetComponent = config.component;

    return (
      <Suspense
        key={config.id}
        fallback={<WidgetSkeleton size="medium" />}
      >
        <WidgetComponent />
      </Suspense>
    );
  });

  // Select layout based on role
  const LayoutComponent = layoutType === 'scanner-focus'
    ? ScannerFocusLayout
    : DashboardFirstLayout;

  return (
    <div className={cn('role-based-dashboard', className)}>
      <LayoutComponent widgets={widgets} />
    </div>
  );
}
