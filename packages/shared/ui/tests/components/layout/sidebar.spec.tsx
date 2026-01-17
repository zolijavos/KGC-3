import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  Sidebar,
  SidebarGroup,
  SidebarItem,
  SidebarSeparator,
} from '../../../src/components/layout/sidebar';
import { SidebarProvider } from '../../../src/hooks/use-sidebar';

// Mock useMobile hook
vi.mock('../../../src/hooks/use-mobile', () => ({
  useMobile: vi.fn(() => false),
}));

import { useMobile } from '../../../src/hooks/use-mobile';

// Wrapper for sidebar context
const Wrapper = ({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
}) => (
  <SidebarProvider defaultOpen={defaultOpen} defaultCollapsed={defaultCollapsed}>
    {children}
  </SidebarProvider>
);

describe('Sidebar component', () => {
  beforeEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('desktop mode', () => {
    it('should render as aside element on desktop', () => {
      render(
        <Wrapper>
          <Sidebar data-testid="sidebar" />
        </Wrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.tagName).toBe('ASIDE');
    });

    it('should have data-sidebar attribute', () => {
      render(
        <Wrapper>
          <Sidebar data-testid="sidebar" />
        </Wrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-sidebar', 'root');
    });

    it('should have data-collapsed attribute', () => {
      render(
        <Wrapper defaultCollapsed={true}>
          <Sidebar data-testid="sidebar" />
        </Wrapper>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    });

    it('should render header when provided', () => {
      render(
        <Wrapper>
          <Sidebar header={<span data-testid="header">Header</span>} />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Wrapper>
          <Sidebar footer={<span data-testid="footer">Footer</span>} />
        </Wrapper>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <Wrapper>
          <Sidebar>
            <span data-testid="content">Content</span>
          </Sidebar>
        </Wrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Wrapper>
          <Sidebar data-testid="sidebar" className="custom-class" />
        </Wrapper>
      );

      expect(screen.getByTestId('sidebar')).toHaveClass('custom-class');
    });
  });

  describe('mobile mode', () => {
    beforeEach(() => {
      vi.mocked(useMobile).mockReturnValue(true);
    });

    it('should render as Sheet component on mobile when open', () => {
      render(
        <Wrapper defaultOpen={true}>
          <Sidebar header={<span>Logo</span>}>Content</Sidebar>
        </Wrapper>
      );

      // Sheet renders into a portal, check for sheet-specific elements
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render visible content when closed on mobile', () => {
      render(
        <Wrapper defaultOpen={false}>
          <Sidebar>
            <span data-testid="sidebar-content">Content</span>
          </Sidebar>
        </Wrapper>
      );

      expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument();
    });
  });
});

describe('SidebarGroup component', () => {
  it('should render children', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarGroup>
            <span data-testid="group-content">Items</span>
          </SidebarGroup>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('group-content')).toBeInTheDocument();
  });

  it('should render label when provided and not collapsed', () => {
    render(
      <Wrapper defaultCollapsed={false}>
        <Sidebar>
          <SidebarGroup label="Group Label">Items</SidebarGroup>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByText('Group Label')).toBeInTheDocument();
  });

  it('should hide label when collapsed', () => {
    render(
      <Wrapper defaultCollapsed={true}>
        <Sidebar>
          <SidebarGroup label="Group Label">Items</SidebarGroup>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.queryByText('Group Label')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarGroup data-testid="group" className="custom-class">
            Items
          </SidebarGroup>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('group')).toHaveClass('custom-class');
  });
});

describe('SidebarItem component', () => {
  it('should render as anchor by default', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem href="/test" data-testid="sidebar-item">Link</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    const item = screen.getByTestId('sidebar-item');
    expect(item.tagName).toBe('A');
    expect(item).toHaveAttribute('href', '/test');
  });

  it('should support custom "as" component', () => {
    const CustomLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <button type="button" data-testid="custom-link">
        {props.children}
      </button>
    );

    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem as={CustomLink}>Custom</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem icon={<span data-testid="icon">Icon</span>}>Item</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render badge when provided', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem badge={<span data-testid="badge">5</span>}>Item</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('should apply active variant when isActive', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem data-testid="item" isActive>
            Active Item
          </SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    const item = screen.getByTestId('item');
    expect(item).toHaveClass('bg-primary');
  });

  it('should hide text content when collapsed', () => {
    render(
      <Wrapper defaultCollapsed={true}>
        <Sidebar>
          <SidebarItem icon={<span data-testid="icon">I</span>}>Hidden Text</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    // Icon should be visible
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    // Text should be hidden
    expect(screen.queryByText('Hidden Text')).not.toBeInTheDocument();
  });

  it('should accept permission prop', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarItem permission="admin.view">Admin Item</SidebarItem>
        </Sidebar>
      </Wrapper>
    );

    // Permission prop doesn't affect rendering directly,
    // it's for filtering by consumer code
    expect(screen.getByText('Admin Item')).toBeInTheDocument();
  });
});

describe('SidebarSeparator component', () => {
  it('should render as div element', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarSeparator data-testid="separator" />
        </Sidebar>
      </Wrapper>
    );

    const separator = screen.getByTestId('separator');
    expect(separator.tagName).toBe('DIV');
  });

  it('should have border styling', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarSeparator data-testid="separator" />
        </Sidebar>
      </Wrapper>
    );

    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('bg-border');
  });

  it('should apply custom className', () => {
    render(
      <Wrapper>
        <Sidebar>
          <SidebarSeparator data-testid="separator" className="custom-class" />
        </Sidebar>
      </Wrapper>
    );

    expect(screen.getByTestId('separator')).toHaveClass('custom-class');
  });
});
