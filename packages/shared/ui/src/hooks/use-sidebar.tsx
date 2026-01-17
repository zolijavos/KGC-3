import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface SidebarContextValue {
  /** Whether the sidebar is currently open (mobile) or expanded (desktop) */
  isOpen: boolean;
  /** Whether the sidebar is collapsed (icon-only mode on desktop) */
  isCollapsed: boolean;
  /** Toggle sidebar open/closed (mobile) or expanded/collapsed (desktop) */
  toggle: () => void;
  /** Explicitly set sidebar open state */
  setOpen: (open: boolean) => void;
  /** Explicitly set sidebar collapsed state (desktop only) */
  setCollapsed: (collapsed: boolean) => void;
  /** Close sidebar (mobile only) */
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export interface SidebarProviderProps {
  children: ReactNode;
  /** Initial open state (default: true) */
  defaultOpen?: boolean;
  /** Initial collapsed state for desktop (default: false) */
  defaultCollapsed?: boolean;
}

/**
 * Provider for sidebar state management.
 * Handles both mobile (open/close) and desktop (expand/collapse) states.
 *
 * @example
 * ```tsx
 * <SidebarProvider defaultOpen={true} defaultCollapsed={false}>
 *   <AppShell>
 *     <Sidebar />
 *     <main>Content</main>
 *   </AppShell>
 * </SidebarProvider>
 * ```
 */
export function SidebarProvider({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
}: SidebarProviderProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value: SidebarContextValue = {
    isOpen,
    isCollapsed,
    toggle,
    setOpen,
    setCollapsed,
    close,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/**
 * Hook to access sidebar state and controls.
 * Must be used within a SidebarProvider.
 *
 * @example
 * ```tsx
 * const { isOpen, toggle, isCollapsed } = useSidebar();
 * ```
 */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export { SidebarContext };
