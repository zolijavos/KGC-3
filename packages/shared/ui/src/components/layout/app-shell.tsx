'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { SidebarProvider, type SidebarProviderProps } from '../../hooks/use-sidebar';
import { useSidebar } from '../../hooks/use-sidebar';
import { useMobile } from '../../hooks/use-mobile';

// =============================================================================
// AppShell
// =============================================================================

export interface AppShellProps extends Omit<SidebarProviderProps, 'children'> {
  /** Sidebar component */
  sidebar?: React.ReactNode;
  /** Header component */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Additional className for the root element */
  className?: string;
  /** Collapsed sidebar width (default: 64) */
  sidebarCollapsedWidth?: number;
  /** Expanded sidebar width (default: 256) */
  sidebarExpandedWidth?: number;
}

/**
 * Main application shell layout that combines Sidebar, Header, and Content areas.
 * Handles responsive layout automatically.
 *
 * @example
 * ```tsx
 * <AppShell
 *   sidebar={<Sidebar header={<Logo />}>...</Sidebar>}
 *   header={<Header actions={<UserMenu />} />}
 * >
 *   <main className="p-6">
 *     {children}
 *   </main>
 * </AppShell>
 * ```
 */
export function AppShell({
  className,
  sidebar,
  header,
  children,
  defaultOpen = true,
  defaultCollapsed = false,
  sidebarCollapsedWidth = 64,
  sidebarExpandedWidth = 256,
}: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} defaultCollapsed={defaultCollapsed}>
      <AppShellContent
        className={className}
        sidebar={sidebar}
        header={header}
        sidebarCollapsedWidth={sidebarCollapsedWidth}
        sidebarExpandedWidth={sidebarExpandedWidth}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  );
}

// =============================================================================
// Internal Content (needs SidebarProvider context)
// =============================================================================

interface AppShellContentProps {
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  sidebarCollapsedWidth: number;
  sidebarExpandedWidth: number;
}

function AppShellContent({
  className,
  sidebar,
  header,
  children,
  sidebarCollapsedWidth,
  sidebarExpandedWidth,
}: AppShellContentProps) {
  const { isCollapsed } = useSidebar();
  const isMobile = useMobile();

  const mainStyles = {
    '--sidebar-collapsed-width': `${sidebarCollapsedWidth}px`,
    '--sidebar-expanded-width': `${sidebarExpandedWidth}px`,
  } as React.CSSProperties;

  return (
    <div className={cn('flex h-screen overflow-hidden bg-background', className)}>
      {/* Sidebar */}
      {sidebar}

      {/* Main area (Header + Content) */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-[margin] duration-200',
          // On mobile, sidebar is a Sheet overlay, so no margin needed
          // On desktop, add margin based on sidebar state
          !isMobile && sidebar && (isCollapsed
            ? 'ml-[var(--sidebar-collapsed-width)]'
            : 'ml-[var(--sidebar-expanded-width)]')
        )}
        style={mainStyles}
      >
        {header}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// =============================================================================
// AppShell Page
// =============================================================================

export interface AppShellPageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Actions for the page header */
  actions?: React.ReactNode;
}

export function AppShellPage({
  className,
  title,
  description,
  actions,
  children,
  ...props
}: AppShellPageProps) {
  return (
    <div className={cn('flex flex-1 flex-col', className)} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
