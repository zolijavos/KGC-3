# Story 5.2: Layout és Navigation Components

## Status: done

## User Story

**As a** felhasználó,
**I want** konzisztens layout-ot és navigációt,
**So that** könnyen eligazodjak a rendszerben.

## Acceptance Criteria

- [x] AC1: Sidebar komponens működik (collapsible, navigation items)
- [x] AC2: Header komponens működik (logo, user menu, actions)
- [x] AC3: Breadcrumb komponens működik (hierarchikus navigáció)
- [x] AC4: Responsive layout (mobile/tablet/desktop breakpoints)
- [x] AC5: Role-based menu filtering támogatás (permission prop)
- [x] AC6: AppShell layout komponens (Sidebar + Header + Content area)
- [x] AC7: Sheet komponens (mobile sidebar-hoz)
- [x] AC8: Navigation típusok és hook-ok

## Technical Context

**Package:** @kgc/ui
**Dependencies:**
- Radix UI primitives (Sheet, Collapsible)
- class-variance-authority
- tailwind-merge
- lucide-react (icons)

**Related Files:**
- packages/shared/ui/src/components/layout/sidebar.tsx
- packages/shared/ui/src/components/layout/header.tsx
- packages/shared/ui/src/components/layout/breadcrumb.tsx
- packages/shared/ui/src/components/layout/app-shell.tsx
- packages/shared/ui/src/components/ui/sheet.tsx
- packages/shared/ui/src/hooks/use-sidebar.tsx
- packages/shared/ui/src/hooks/use-mobile.ts

## Tasks

1. [x] Implement Sheet component (Radix Dialog for mobile drawer)
2. [x] Implement useMobile hook (responsive breakpoint detection)
3. [x] Implement useSidebar hook (sidebar state management)
4. [x] Implement Sidebar component (collapsible, groups, items)
5. [x] Implement Header component (logo, user menu, mobile toggle)
6. [x] Implement Breadcrumb component (with separator, ellipsis)
7. [x] Implement AppShell layout (combines Sidebar + Header + Content)
8. [x] Write unit tests for all components and hooks
9. [x] Test responsive behavior
10. [x] Export all components from index.ts

## Test Plan

- Unit tests: Vitest + @testing-library/react
- Test files: tests/components/layout/*.spec.tsx
- Coverage target: 80%+

## Notes

- A sidebar collapsible funkcionalitást Radix Collapsible-lel valósítjuk meg
- Mobile breakpoint: 768px (md)
- Desktop sidebar width: 256px, collapsed: 64px
- A permission-based filtering a fogyasztó kód felelőssége (csak props interface)

## Changelog

- 2026-01-16: Story created (ready-for-dev)
- 2026-01-16: Implementation started (in-progress)
- 2026-01-16: Story completed - 271 tests passing, 95.14% coverage
