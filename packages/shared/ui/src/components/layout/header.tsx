'use client';

import * as React from 'react';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useSidebar } from '../../hooks/use-sidebar';
import { useMobile } from '../../hooks/use-mobile';
import { Button } from '../ui/button';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo or brand element */
  logo?: React.ReactNode;
  /** Navigation elements (center) */
  nav?: React.ReactNode;
  /** Actions/user menu (right side) */
  actions?: React.ReactNode;
  /** Whether to show the sidebar toggle button (default: true) */
  showSidebarToggle?: boolean;
  /** Whether the header is sticky (default: true) */
  sticky?: boolean;
}

/**
 * Application header component with logo, navigation, and actions areas.
 * Includes sidebar toggle button for both mobile and desktop modes.
 *
 * @example
 * ```tsx
 * <Header
 *   logo={<Logo />}
 *   actions={<UserMenu />}
 * />
 * ```
 */
export function Header({
  className,
  logo,
  nav,
  actions,
  showSidebarToggle = true,
  sticky = true,
  ...props
}: HeaderProps) {
  const { toggle, isCollapsed, setCollapsed } = useSidebar();
  const isMobile = useMobile();

  const handleSidebarToggle = () => {
    if (isMobile) {
      toggle();
    } else {
      setCollapsed(!isCollapsed);
    }
  };

  return (
    <header
      className={cn(
        'flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6',
        sticky && 'sticky top-0 z-40',
        className
      )}
      {...props}
    >
      {/* Sidebar Toggle */}
      {showSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleSidebarToggle}
          aria-label={isMobile ? 'Toggle menu' : (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        >
          {isMobile ? (
            <Menu className="h-5 w-5" />
          ) : isCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Logo */}
      {logo && <div className="flex items-center gap-2">{logo}</div>}

      {/* Navigation (center) */}
      {nav && <nav className="hidden flex-1 md:flex">{nav}</nav>}

      {/* Spacer for layout */}
      <div className="flex-1" />

      {/* Actions (right) */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

// =============================================================================
// Header Title
// =============================================================================

export interface HeaderTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Subtitle text */
  subtitle?: string;
}

export function HeaderTitle({ className, children, subtitle, ...props }: HeaderTitleProps) {
  return (
    <div className="flex flex-col">
      <h1 className={cn('text-lg font-semibold', className)} {...props}>
        {children}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// =============================================================================
// Header Actions
// =============================================================================

export function HeaderActions({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}
