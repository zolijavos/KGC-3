import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell, AppShellPage } from '../../../src/components/layout/app-shell';
import { Sidebar } from '../../../src/components/layout/sidebar';
import { Header } from '../../../src/components/layout/header';

// Mock useMobile hook
vi.mock('../../../src/hooks/use-mobile', () => ({
  useMobile: vi.fn(() => false),
}));

import { useMobile } from '../../../src/hooks/use-mobile';

describe('AppShell component', () => {
  beforeEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <AppShell>
          <span data-testid="content">Content</span>
        </AppShell>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render sidebar when provided', () => {
      render(
        <AppShell sidebar={<Sidebar data-testid="sidebar" />}>Content</AppShell>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render header when provided', () => {
      render(
        <AppShell header={<Header data-testid="header" />}>Content</AppShell>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render with all components', () => {
      render(
        <AppShell
          sidebar={<Sidebar data-testid="sidebar">Nav</Sidebar>}
          header={<Header data-testid="header" />}
        >
          <span data-testid="content">Main Content</span>
        </AppShell>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should have flex container', () => {
      render(
        <AppShell className="test-shell">Content</AppShell>
      );

      const shell = document.querySelector('.test-shell');
      expect(shell).toHaveClass('flex');
    });

    it('should apply custom className', () => {
      render(
        <AppShell className="custom-class">Content</AppShell>
      );

      expect(document.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('sidebar state', () => {
    it('should respect defaultOpen prop', () => {
      vi.mocked(useMobile).mockReturnValue(true);

      render(
        <AppShell defaultOpen={true} sidebar={<Sidebar>Nav</Sidebar>}>
          Content
        </AppShell>
      );

      // On mobile, open sidebar renders as Sheet dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should respect defaultCollapsed prop on desktop', () => {
      vi.mocked(useMobile).mockReturnValue(false);

      render(
        <AppShell defaultCollapsed={true} sidebar={<Sidebar data-testid="sidebar">Nav</Sidebar>}>
          Content
        </AppShell>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    });
  });

  describe('responsive behavior', () => {
    it('should not apply margin on mobile', () => {
      vi.mocked(useMobile).mockReturnValue(true);

      render(
        <AppShell
          sidebar={<Sidebar>Nav</Sidebar>}
          defaultOpen={false}
        >
          <div data-testid="main">Content</div>
        </AppShell>
      );

      // On mobile, main content should not have sidebar margin
      const main = screen.getByTestId('main');
      const mainParent = main.closest('.flex-1');
      expect(mainParent).not.toHaveClass('ml-[var(--sidebar-expanded-width)]');
    });
  });
});

describe('AppShellPage component', () => {
  it('should render children', () => {
    render(
      <AppShellPage>
        <span data-testid="page-content">Page Content</span>
      </AppShellPage>
    );

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(
      <AppShellPage title="Page Title">Content</AppShellPage>
    );

    expect(screen.getByText('Page Title')).toBeInTheDocument();
  });

  it('should render title as h1', () => {
    render(
      <AppShellPage title="Page Title">Content</AppShellPage>
    );

    const title = screen.getByText('Page Title');
    expect(title.tagName).toBe('H1');
  });

  it('should render description when provided', () => {
    render(
      <AppShellPage title="Title" description="Page description">
        Content
      </AppShellPage>
    );

    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(
      <AppShellPage
        title="Title"
        actions={<button data-testid="action">Action</button>}
      >
        Content
      </AppShellPage>
    );

    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('should not render header section when no title or actions', () => {
    render(
      <AppShellPage data-testid="page">Content Only</AppShellPage>
    );

    // The page should just have the content, no border-b header section
    const page = screen.getByTestId('page');
    expect(page.querySelector('.border-b')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <AppShellPage data-testid="page" className="custom-class">
        Content
      </AppShellPage>
    );

    expect(screen.getByTestId('page')).toHaveClass('custom-class');
  });
});
