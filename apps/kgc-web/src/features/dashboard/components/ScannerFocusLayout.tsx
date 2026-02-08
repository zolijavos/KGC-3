export interface ScannerFocusLayoutProps {
  widgets: React.ReactNode[];
  className?: string;
}

/**
 * Scanner Focus Layout - OPERATOR role (Epic 35: Story 35-1)
 * Minimal UI optimized for quick barcode scanning and minimal widget display
 */
export function ScannerFocusLayout({ widgets, className }: ScannerFocusLayoutProps) {
  return (
    <div className={className} data-testid="scanner-focus-layout" data-layout="scanner-focus">
      <div className="space-y-6">
        {/* Scanner widgets appear first, then inventory widgets */}
        {widgets.map((widget, index) => (
          <div key={index} className="widget-slot">
            {widget}
          </div>
        ))}
      </div>
    </div>
  );
}
