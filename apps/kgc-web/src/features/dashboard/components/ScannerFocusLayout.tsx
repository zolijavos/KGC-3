import { cn } from '@kgc/ui/lib/utils';

export interface ScannerFocusLayoutProps {
  widgets: React.ReactNode[];
  className?: string;
}

/**
 * Scanner Focus Layout - OPERATOR role
 * Minimal single-column layout optimized for quick actions and scanner workflows
 */
export function ScannerFocusLayout({ widgets, className }: ScannerFocusLayoutProps) {
  return (
    <div
      className={cn('scanner-focus-layout', className)}
      data-testid="scanner-focus-layout"
      data-layout="scanner-focus"
    >
      <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
        {widgets.map((widget, index) => (
          <div key={index} className="widget-slot">
            {widget}
          </div>
        ))}
      </div>
    </div>
  );
}
