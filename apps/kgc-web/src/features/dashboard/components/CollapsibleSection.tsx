import { cn } from '@kgc/ui';
import { useCallback, useState, type KeyboardEvent, type ReactNode } from 'react';

/** Section theme mapping for visual differentiation */
const SECTION_THEMES: Record<string, string> = {
  finance: 'section-theme-finance',
  inventory: 'section-theme-inventory',
  service: 'section-theme-service',
  partner: 'section-theme-partner',
  analytics: 'section-theme-analytics',
};

/** Section icon colors for header accent */
const SECTION_ICON_COLORS: Record<string, string> = {
  finance: 'text-green-600 dark:text-green-400',
  inventory: 'text-blue-600 dark:text-blue-400',
  service: 'text-orange-600 dark:text-orange-400',
  partner: 'text-purple-600 dark:text-purple-400',
  analytics: 'text-cyan-600 dark:text-cyan-400',
};

export interface CollapsibleSectionProps {
  /** Unique section identifier */
  id: string;
  /** Section title displayed in header */
  title: string;
  /** Section icon emoji */
  icon: string;
  /** Number of widgets in this section */
  widgetCount: number;
  /** Number of alerts/warnings in this section */
  alertCount?: number;
  /** Section content (widgets) */
  children: ReactNode;
  /** Initial expanded state (uncontrolled mode) */
  defaultExpanded?: boolean;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether the section is pinned */
  isPinned?: boolean;
  /** Callback when pin state changes */
  onPinChange?: () => void;
  /** Whether section can move up */
  canMoveUp?: boolean;
  /** Whether section can move down */
  canMoveDown?: boolean;
  /** Callback when moving section up */
  onMoveUp?: () => void;
  /** Callback when moving section down */
  onMoveDown?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Collapsible Section Component (Story 35-8)
 *
 * Wraps dashboard widgets in a collapsible container with:
 * - Header with icon, title, widget count, alert badge
 * - Collapse/expand toggle with animation
 * - Settings and pin buttons (placeholders)
 *
 * @see ADR-053 Dashboard Hibrid Layout
 */
export function CollapsibleSection({
  id,
  title,
  icon,
  widgetCount,
  alertCount = 0,
  children,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  isPinned = false,
  onPinChange,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  className,
}: CollapsibleSectionProps) {
  // Uncontrolled state
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled or uncontrolled mode
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;

    if (isControlled) {
      onExpandedChange?.(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  }, [isExpanded, isControlled, onExpandedChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  // Determine alert badge styling
  const alertBadgeClass = alertCount > 2 ? 'bg-status-critical' : 'bg-status-warning';

  // Determine section border based on alert status
  const sectionBorderClass =
    alertCount > 2
      ? 'border-status-critical'
      : alertCount > 0
        ? 'border-status-warning'
        : 'border-border';

  // Get section theme class
  const sectionTheme = SECTION_THEMES[id] ?? '';
  const iconColorClass = SECTION_ICON_COLORS[id] ?? 'text-foreground';

  return (
    <div
      data-testid={`collapsible-section-${id}`}
      className={cn('mb-4 rounded-xl overflow-hidden', 'elevation-2', sectionTheme, className)}
    >
      {/* Section Header */}
      <div
        data-testid="section-header"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${id}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'section-header-bg',
          'flex items-center justify-between',
          'px-4 py-3',
          'bg-card/80 backdrop-blur-sm',
          'border-b-2',
          sectionBorderClass,
          'cursor-pointer',
          'transition-all duration-200',
          'hover:bg-card/90'
        )}
      >
        {/* Left side: Icon, Title, Widget Count, Alert Badge */}
        <div className="flex items-center gap-3">
          {/* Section Icon with theme color */}
          <span className={cn('text-2xl', iconColorClass)} aria-hidden="true">
            {icon}
          </span>

          {/* Section Title */}
          <span className="font-bold text-lg text-foreground">{title}</span>

          {/* Widget Count Pill */}
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {widgetCount} widget
          </span>

          {/* Alert Badge */}
          {alertCount > 0 && (
            <span
              data-testid="alert-badge"
              className={cn(
                'inline-flex items-center justify-center',
                'min-w-[24px] h-6 px-2',
                'rounded-full',
                'text-xs font-bold text-white',
                'shadow-sm',
                alertBadgeClass,
                alertCount > 2 && 'animate-pulse'
              )}
            >
              {alertCount}
            </span>
          )}
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center gap-2">
          {/* Move Section Controls - Compact grouped */}
          <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500 shadow-sm">
            <button
              data-testid="move-up-button"
              type="button"
              disabled={!canMoveUp}
              onClick={e => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className={cn(
                'w-6 h-6 flex items-center justify-center',
                'rounded text-base font-bold',
                'transition-all duration-150',
                canMoveUp
                  ? 'text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:scale-110'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              )}
              aria-label="Feljebb mozgatás"
              title={canMoveUp ? 'Szekció feljebb mozgatása' : 'Már a legfelső pozícióban'}
            >
              ↑
            </button>
            <div className="w-px h-4 bg-blue-300 dark:bg-blue-600" />
            <button
              data-testid="move-down-button"
              type="button"
              disabled={!canMoveDown}
              onClick={e => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className={cn(
                'w-6 h-6 flex items-center justify-center',
                'rounded text-base font-bold',
                'transition-all duration-150',
                canMoveDown
                  ? 'text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:scale-110'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              )}
              aria-label="Lejjebb mozgatás"
              title={canMoveDown ? 'Szekció lejjebb mozgatása' : 'Már a legalsó pozícióban'}
            >
              ↓
            </button>
          </div>

          {/* Collapse/Expand Button - Compact */}
          <button
            data-testid="collapse-button"
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleToggle();
            }}
            className={cn(
              'w-8 h-8 flex items-center justify-center',
              'rounded-full',
              'border-2',
              isExpanded
                ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-300 dark:border-emerald-400 text-white shadow-md'
                : 'bg-amber-500 dark:bg-amber-600 border-amber-300 dark:border-amber-400 text-white shadow-md',
              'hover:scale-110',
              'transition-all duration-200'
            )}
            aria-label={isExpanded ? 'Összecsuk' : 'Kinyit'}
            title={isExpanded ? 'Szekció összecsukása' : 'Szekció kinyitása'}
          >
            <span data-testid="collapse-icon" className="text-lg font-bold">
              {isExpanded ? '−' : '+'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            data-testid="settings-button"
            type="button"
            onClick={e => e.stopPropagation()}
            className={cn(
              'w-7 h-7 flex items-center justify-center',
              'rounded-md text-sm',
              'bg-slate-100 dark:bg-slate-800',
              'border border-slate-300 dark:border-slate-600',
              'text-slate-600 dark:text-slate-300',
              'hover:bg-slate-200 dark:hover:bg-slate-700',
              'transition-colors'
            )}
            aria-label="Beállítások"
            title="Hamarosan..."
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Section Content (Collapsible) */}
      {isExpanded && (
        <div
          id={`section-content-${id}`}
          data-testid={`section-content-${id}`}
          className={cn('p-5', 'bg-transparent', 'animate-collapsible-down')}
        >
          {children}
        </div>
      )}
    </div>
  );
}
