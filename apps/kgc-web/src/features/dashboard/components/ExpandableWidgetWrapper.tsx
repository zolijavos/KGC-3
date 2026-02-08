'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, cn } from '@kgc/ui';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface ExpandableWidgetWrapperProps {
  /** Widget title for the expanded modal header */
  title: string;
  /** Widget icon (emoji or component) */
  icon?: ReactNode;
  /** Compact view content */
  children: ReactNode;
  /** Expanded view content - if not provided, children will be used */
  expandedContent?: ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether to show the expand button */
  expandable?: boolean;
}

/**
 * ExpandableWidgetWrapper (Story 35-8)
 *
 * Wraps dashboard widgets with an expand button that opens
 * a fullscreen modal for detailed view.
 *
 * @example
 * ```tsx
 * <ExpandableWidgetWrapper
 *   title="Top Partnerek"
 *   icon={<Trophy className="h-5 w-5" />}
 *   expandedContent={<TopPartnersExpanded />}
 * >
 *   <TopPartnersCompact />
 * </ExpandableWidgetWrapper>
 * ```
 */
export function ExpandableWidgetWrapper({
  title,
  icon,
  children,
  expandedContent,
  className,
  expandable = true,
}: ExpandableWidgetWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Widget Container */}
      <div className={cn('relative group', className)}>
        {/* Expand Button - visible and clickable */}
        {expandable && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              setIsExpanded(true);
            }}
            className={cn(
              'absolute bottom-3 right-3 z-50',
              'w-10 h-10 flex items-center justify-center',
              'rounded-lg',
              'bg-slate-800 hover:bg-slate-700',
              'dark:bg-blue-600 dark:hover:bg-blue-500',
              'text-white',
              'border-2 border-slate-600',
              'dark:border-blue-400',
              'transition-all duration-200',
              'shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.5)]',
              'hover:scale-110',
              'cursor-pointer pointer-events-auto'
            )}
            title="Nagyítás"
            aria-label="Widget nagyítása"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Compact View */}
        {children}
      </div>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          className={cn('max-w-5xl w-[95vw] max-h-[90vh]', 'overflow-hidden flex flex-col')}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              {title}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className={cn(
                  'ml-auto mr-8',
                  'w-8 h-8 flex items-center justify-center',
                  'rounded-md',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent',
                  'transition-colors'
                )}
                title="Kis méret"
                aria-label="Visszaállítás kis méretre"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </DialogTitle>
            <DialogDescription className="sr-only">{title} részletes nézet</DialogDescription>
          </DialogHeader>

          {/* Expanded Content */}
          <div className="flex-1 overflow-y-auto mt-4 pr-2">{expandedContent ?? children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExpandableWidgetWrapper;
