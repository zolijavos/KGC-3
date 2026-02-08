'use client';

import { cn } from '@kgc/ui';
import { memo, Suspense, useCallback, useMemo } from 'react';
import {
  useDashboardPreferences,
  useVisibleSections,
  useVisibleWidgets,
  type SectionId,
} from '../hooks';
import { WIDGET_REGISTRY } from '../lib/widget-registry';
import { CollapsibleSection } from './CollapsibleSection';
import { ExecutiveSummaryBar } from './ExecutiveSummaryBar';

export interface HybridDashboardLayoutProps {
  /** Optional className for container */
  className?: string;
}

/**
 * Widget loading skeleton with enhanced styling
 */
function WidgetSkeleton() {
  return (
    <div
      data-testid="widget-skeleton"
      className="flex items-center justify-center p-6 rounded-lg animate-pulse bg-white/50 dark:bg-slate-800/50"
    >
      <div className="h-32 bg-muted rounded w-full" />
    </div>
  );
}

/**
 * Widget theme class mapping based on category
 * Provides visual contrast and category identification
 */
const WIDGET_THEME_CLASS: Record<string, string> = {
  finance: 'widget-finance',
  inventory: 'widget-inventory',
  service: 'widget-service',
  partner: 'widget-partner',
  general: 'widget-enhanced',
  alerts: 'widget-enhanced',
  analytics: 'widget-enhanced',
};

/**
 * Render a single widget with Suspense boundary
 * Applies category-based theme class for visual contrast
 *
 * Performance: Wrapped in React.memo to prevent unnecessary re-renders
 * when parent components update but widget props remain the same.
 */
const WidgetRenderer = memo(function WidgetRenderer({ widgetId }: { widgetId: string }) {
  const config = WIDGET_REGISTRY[widgetId];

  if (!config) {
    return null;
  }

  const WidgetComponent = config.component;
  const themeClass = WIDGET_THEME_CLASS[config.category] || 'widget-enhanced';

  return (
    <div className={cn(themeClass, 'rounded-xl p-4 transition-all duration-200')}>
      <Suspense fallback={<WidgetSkeleton />}>
        <WidgetComponent />
      </Suspense>
    </div>
  );
});

/**
 * Section content with widgets grid
 *
 * Performance: Wrapped in React.memo to prevent re-renders when
 * other sections are toggled or updated.
 */
const SectionWidgets = memo(function SectionWidgets({ sectionId }: { sectionId: SectionId }) {
  const visibleWidgets = useVisibleWidgets(sectionId);

  if (visibleWidgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nincs megjeleníthető widget ebben a szekcióban.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleWidgets.map(widget => (
        <WidgetRenderer key={widget.widgetId} widgetId={widget.widgetId} />
      ))}
    </div>
  );
});

/**
 * Hybrid Dashboard Layout (Story 35-8)
 *
 * Implements the hybrid dashboard layout with:
 * - Pinned Executive Summary Bar at top
 * - Collapsible sections for each category
 * - Role-based widget filtering
 * - User preference persistence
 *
 * @see ADR-053 Dashboard Hibrid Layout Architektúra
 */
export function HybridDashboardLayout({ className }: HybridDashboardLayoutProps) {
  const sections = useVisibleSections();
  const {
    isSectionExpanded,
    toggleSection,
    setExpandedSections,
    expandedSections,
    pinnedSections,
    isSectionPinned,
    togglePinSection,
    sectionOrder,
    moveSection,
    canMoveUp,
    canMoveDown,
    isLoading,
  } = useDashboardPreferences();

  // Filter out executive section (handled separately) and sections with no widgets
  // Sort by user-defined section order (persisted to localStorage)
  const collapsibleSections = useMemo(
    () =>
      sections
        .filter(section => section.sectionId !== 'executive' && section.isVisible)
        .sort((a, b) => {
          const aIndex = sectionOrder.indexOf(a.sectionId);
          const bIndex = sectionOrder.indexOf(b.sectionId);
          // Handle sections not in order array (put them at end)
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }),
    [sections, sectionOrder]
  );

  // Executive Summary visibility - uses 'executive' section pin state
  // When 'executive' is in pinnedSections array, it means user chose to HIDE it
  // Default: not in array = visible, in array = hidden
  const isExecutiveVisible = !pinnedSections.includes('executive');
  const toggleExecutiveVisibility = useCallback(() => {
    togglePinSection('executive' as SectionId);
  }, [togglePinSection]);

  // Get all collapsible section IDs for expand/collapse all
  const allSectionIds = useMemo(
    () => collapsibleSections.map(s => s.sectionId),
    [collapsibleSections]
  );

  // Check if all sections are expanded or collapsed
  const allExpanded = useMemo(
    () => allSectionIds.every(id => expandedSections.includes(id)),
    [allSectionIds, expandedSections]
  );
  const allCollapsed = useMemo(
    () => allSectionIds.every(id => !expandedSections.includes(id)),
    [allSectionIds, expandedSections]
  );

  // Expand all sections
  const handleExpandAll = useCallback(() => {
    setExpandedSections(allSectionIds);
  }, [allSectionIds, setExpandedSections]);

  // Collapse all sections
  const handleCollapseAll = useCallback(() => {
    setExpandedSections([]);
  }, [setExpandedSections]);

  // Executive section KPIs for the summary bar
  // TODO: Replace with real KPI data from API
  const executiveKpis = useMemo(
    () => [
      {
        id: 'health',
        label: 'Üzleti Egészség',
        value: 'Jó',
        icon: '🌤️',
        status: 'healthy' as const,
      },
      {
        id: 'revenue',
        label: 'Napi Bevétel',
        value: '847 500 Ft',
        trend: '+5%',
        subtext: 'cél: 1 000 000 Ft',
        icon: '💰',
        status: 'warning' as const,
      },
      {
        id: 'inventory',
        label: 'Készlet',
        value: '92%',
        trend: '±0%',
        subtext: 'kihasználtság',
        icon: '📦',
        status: 'healthy' as const,
      },
      {
        id: 'service',
        label: 'Aktív Munkalapok',
        value: '12 db',
        trend: '+3',
        subtext: 'ma nyitott',
        icon: '🔧',
        status: 'healthy' as const,
      },
      {
        id: 'receivables',
        label: 'Kintlévőség',
        value: '2 450 000 Ft',
        trend: '+12%',
        subtext: 'cél: 2 000 000 Ft',
        icon: '⚠️',
        status: 'critical' as const,
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="hybrid-dashboard-layout">
      {/* Executive Summary Bar - Toggleable visibility */}
      {isExecutiveVisible ? (
        <div className="relative">
          <ExecutiveSummaryBar kpiData={executiveKpis} />
          {/* Hide button */}
          <button
            data-testid="hide-executive-summary"
            type="button"
            onClick={toggleExecutiveVisibility}
            className={cn(
              'absolute top-2 right-2',
              'w-8 h-8 flex items-center justify-center',
              'rounded-md',
              'bg-card/80 hover:bg-card',
              'text-muted-foreground hover:text-foreground',
              'transition-colors',
              'border border-border/50'
            )}
            title="Executive Summary elrejtése"
            aria-label="Executive Summary elrejtése"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          data-testid="show-executive-summary"
          type="button"
          onClick={toggleExecutiveVisibility}
          className={cn(
            'w-full py-3 px-4',
            'flex items-center justify-center gap-2',
            'rounded-xl border-2 border-dashed border-primary/30',
            'bg-card/50 hover:bg-card',
            'text-muted-foreground hover:text-foreground',
            'transition-all duration-200'
          )}
        >
          <span>📊</span>
          <span className="text-sm font-medium">Executive Summary megjelenítése</span>
          <span>▼</span>
        </button>
      )}

      {/* Section Controls Toolbar */}
      {collapsibleSections.length > 0 && (
        <div data-testid="section-controls" className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">
            {collapsibleSections.length} szekció
          </span>
          <div className="flex items-center gap-2">
            <button
              data-testid="expand-all-button"
              type="button"
              onClick={handleExpandAll}
              disabled={allExpanded}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md',
                'border border-border',
                'transition-colors',
                allExpanded
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-card hover:bg-accent text-foreground'
              )}
            >
              ▼ Összes kinyitása
            </button>
            <button
              data-testid="collapse-all-button"
              type="button"
              onClick={handleCollapseAll}
              disabled={allCollapsed}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md',
                'border border-border',
                'transition-colors',
                allCollapsed
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-card hover:bg-accent text-foreground'
              )}
            >
              ▶ Összes összecsukása
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Sections */}
      {collapsibleSections.map(section => (
        <CollapsibleSection
          key={section.sectionId}
          id={section.sectionId}
          title={section.title}
          icon={section.icon}
          widgetCount={section.visibleWidgetCount}
          alertCount={section.alertCount}
          expanded={isSectionExpanded(section.sectionId)}
          onExpandedChange={() => toggleSection(section.sectionId)}
          isPinned={isSectionPinned(section.sectionId)}
          onPinChange={() => togglePinSection(section.sectionId)}
          canMoveUp={canMoveUp(section.sectionId)}
          canMoveDown={canMoveDown(section.sectionId)}
          onMoveUp={() => moveSection(section.sectionId, 'up')}
          onMoveDown={() => moveSection(section.sectionId, 'down')}
        >
          <SectionWidgets sectionId={section.sectionId} />
        </CollapsibleSection>
      ))}

      {/* Empty state if no sections visible */}
      {collapsibleSections.length === 0 && (
        <div data-testid="no-sections-message" className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Nincs megjeleníthető szekció.</p>
          <p className="text-sm mt-2">Kérd a rendszergazdát a jogosultságok beállításához.</p>
        </div>
      )}
    </div>
  );
}
