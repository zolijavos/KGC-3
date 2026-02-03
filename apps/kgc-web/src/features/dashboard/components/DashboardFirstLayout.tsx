import { cn } from '@kgc/ui/lib/utils';

export interface DashboardFirstLayoutProps {
  widgets: React.ReactNode[];
  className?: string;
}

/**
 * Dashboard First Layout - STORE_MANAGER and ADMIN roles
 * Responsive multi-column grid layout optimized for analytics and data visualization
 */
export function DashboardFirstLayout({ widgets, className }: DashboardFirstLayoutProps) {
  return (
    <div
      className={cn('dashboard-first-layout', className)}
      data-testid="dashboard-first-layout"
      data-layout="dashboard-first"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget, index) => (
          <div key={index} className="widget-slot">
            {widget}
          </div>
        ))}
      </div>
    </div>
  );
}
