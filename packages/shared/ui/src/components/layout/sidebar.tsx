'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { useSidebar } from '../../hooks/use-sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { useMobile } from '../../hooks/use-mobile';

// =============================================================================
// Sidebar Root
// =============================================================================

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Sidebar header (logo, title) */
  header?: React.ReactNode;
  /** Sidebar footer (user info, settings) */
  footer?: React.ReactNode;
  /** Collapsed width in pixels (default: 64) */
  collapsedWidth?: number;
  /** Expanded width in pixels (default: 256) */
  expandedWidth?: number;
}

/**
 * Main sidebar container. Handles both desktop (permanent) and mobile (sheet) modes.
 */
export function Sidebar({
  className,
  children,
  header,
  footer,
  collapsedWidth = 64,
  expandedWidth = 256,
  ...props
}: SidebarProps) {
  const { isOpen, isCollapsed, close } = useSidebar();
  const isMobile = useMobile();

  const sidebarStyles = {
    '--sidebar-collapsed-width': `${collapsedWidth}px`,
    '--sidebar-expanded-width': `${expandedWidth}px`,
  } as React.CSSProperties;

  // Mobile: use Sheet component
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-[280px] p-0" showClose={false}>
          {header && (
            <SheetHeader className="border-b p-4">
              <SheetTitle asChild>{header}</SheetTitle>
            </SheetHeader>
          )}
          <nav className="flex flex-1 flex-col overflow-y-auto p-4" {...props}>
            {children}
          </nav>
          {footer && <div className="border-t p-4">{footer}</div>}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: permanent sidebar
  return (
    <aside
      data-sidebar="root"
      data-collapsed={isCollapsed}
      className={cn(
        'flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        isCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-expanded-width)]',
        className
      )}
      style={sidebarStyles}
      {...props}
    >
      {header && (
        <div className="flex h-14 items-center border-b px-4">
          {header}
        </div>
      )}
      <nav className="flex flex-1 flex-col overflow-y-auto p-2">
        {children}
      </nav>
      {footer && (
        <div className="border-t p-2">
          {footer}
        </div>
      )}
    </aside>
  );
}

// =============================================================================
// Sidebar Group
// =============================================================================

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label */
  label?: string;
}

export function SidebarGroup({ className, label, children, ...props }: SidebarGroupProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn('py-2', className)} {...props}>
      {label && !isCollapsed && (
        <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h4>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// =============================================================================
// Sidebar Collapsible
// =============================================================================

export interface SidebarCollapsibleProps {
  /** Trigger content (usually icon + label) */
  trigger: React.ReactNode;
  /** Icon to show when collapsed (optional) */
  icon?: React.ReactNode;
  /** Whether the collapsible is open by default */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SidebarCollapsible({
  trigger,
  icon,
  defaultOpen = false,
  children,
  className,
}: SidebarCollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { isCollapsed } = useSidebar();

  return (
    <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsiblePrimitive.Trigger
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {isCollapsed ? (
          icon
        ) : (
          <>
            <span className="flex-1 text-left">{trigger}</span>
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-90')}
            />
          </>
        )}
      </CollapsiblePrimitive.Trigger>
      {!isCollapsed && (
        <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="ml-4 mt-1 space-y-1 border-l pl-2">{children}</div>
        </CollapsiblePrimitive.Content>
      )}
    </CollapsiblePrimitive.Root>
  );
}

// =============================================================================
// Sidebar Item
// =============================================================================

const sidebarItemVariants = cva(
  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground',
        active: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-transparent hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SidebarItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof sidebarItemVariants> {
  /** Icon element */
  icon?: React.ReactNode;
  /** Whether this item is currently active */
  isActive?: boolean;
  /** Badge content (e.g., notification count) */
  badge?: React.ReactNode;
  /** Permission required to see this item (for filtering by consumer) */
  permission?: string;
  /** Custom component to render as (default: 'a') */
  as?: React.ElementType;
}

export function SidebarItem({
  className,
  variant,
  icon,
  isActive,
  badge,
  children,
  as: Component = 'a',
  ...props
}: SidebarItemProps) {
  const { isCollapsed } = useSidebar();
  const resolvedVariant = isActive ? 'active' : variant;

  return (
    <Component
      className={cn(sidebarItemVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{children}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </>
      )}
    </Component>
  );
}

// =============================================================================
// Sidebar Separator
// =============================================================================

export function SidebarSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('my-2 h-px bg-border', className)} {...props} />;
}
