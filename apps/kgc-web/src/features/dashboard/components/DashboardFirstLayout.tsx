export interface DashboardFirstLayoutProps {
  widgets: React.ReactNode[];
  className?: string;
}

/**
 * Dashboard First Layout - STORE_MANAGER and ADMIN roles (Epic 35: Story 35-1)
 * Responsive multi-column grid layout optimized for analytics and data visualization
 */
export function DashboardFirstLayout({ widgets, className }: DashboardFirstLayoutProps) {
  return (
    <div className={className} data-testid="dashboard-first-layout" data-layout="dashboard-first">
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
