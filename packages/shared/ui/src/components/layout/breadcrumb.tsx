'use client';

import * as React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';

// =============================================================================
// Breadcrumb Root
// =============================================================================

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {
  /** Custom separator element (default: ChevronRight) */
  separator?: React.ReactNode;
}

/**
 * Breadcrumb navigation component for hierarchical page navigation.
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/">Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href="/products">Products</BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>Current Page</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * ```
 */
export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  return <nav aria-label="breadcrumb" className={cn('', className)} {...props} />;
}

// =============================================================================
// Breadcrumb List
// =============================================================================

export function BreadcrumbList({ className, ...props }: React.ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// Breadcrumb Item
// =============================================================================

export function BreadcrumbItem({ className, ...props }: React.ComponentPropsWithoutRef<'li'>) {
  return <li className={cn('inline-flex items-center gap-1.5', className)} {...props} />;
}

// =============================================================================
// Breadcrumb Link
// =============================================================================

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Custom component to render as (e.g., Next.js Link) */
  as?: React.ElementType;
}

export function BreadcrumbLink({
  as: Component = 'a',
  className,
  ...props
}: BreadcrumbLinkProps) {
  return (
    <Component
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
}

// =============================================================================
// Breadcrumb Page (current page, not a link)
// =============================================================================

export function BreadcrumbPage({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  );
}

// =============================================================================
// Breadcrumb Separator
// =============================================================================

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<'li'> {
  /** Custom separator icon */
  icon?: React.ReactNode;
}

export function BreadcrumbSeparator({
  className,
  icon,
  children,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? icon ?? <ChevronRight />}
    </li>
  );
}

// =============================================================================
// Breadcrumb Ellipsis (for collapsed items)
// =============================================================================

export function BreadcrumbEllipsis({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
}
