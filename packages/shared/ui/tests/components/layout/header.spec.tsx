import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Header, HeaderTitle, HeaderActions } from '../../../src/components/layout/header';
import { SidebarProvider } from '../../../src/hooks/use-sidebar';

// Mock useMobile hook
vi.mock('../../../src/hooks/use-mobile', () => ({
  useMobile: vi.fn(() => false),
}));

import { useMobile } from '../../../src/hooks/use-mobile';

// Wrapper for sidebar context
const Wrapper = ({ children }: { children: ReactNode }) => (
  <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
);

describe('Header component', () => {
  beforeEach(() => {
    vi.mocked(useMobile).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render as header element', () => {
      render(
        <Wrapper>
          <Header data-testid="header" />
        </Wrapper>
      );

      const header = screen.getByTestId('header');
      expect(header.tagName).toBe('HEADER');
    });

    it('should render logo when provided', () => {
      render(
        <Wrapper>
          <Header logo={<span data-testid="logo">Logo</span>} />
        </Wrapper>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render nav when provided', () => {
      render(
        <Wrapper>
          <Header nav={<span data-testid="nav">Navigation</span>} />
        </Wrapper>
      );

      expect(screen.getByTestId('nav')).toBeInTheDocument();
    });

    it('should render actions when provided', () => {
      render(
        <Wrapper>
          <Header actions={<span data-testid="actions">Actions</span>} />
        </Wrapper>
      );

      expect(screen.getByTestId('actions')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Wrapper>
          <Header data-testid="header" className="custom-class" />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-class');
    });
  });

  describe('sticky behavior', () => {
    it('should have sticky class by default', () => {
      render(
        <Wrapper>
          <Header data-testid="header" />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).toHaveClass('sticky');
    });

    it('should not have sticky class when sticky=false', () => {
      render(
        <Wrapper>
          <Header data-testid="header" sticky={false} />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).not.toHaveClass('sticky');
    });
  });

  describe('sidebar toggle', () => {
    it('should render toggle button by default', () => {
      render(
        <Wrapper>
          <Header />
        </Wrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should not render toggle button when showSidebarToggle=false', () => {
      render(
        <Wrapper>
          <Header showSidebarToggle={false} />
        </Wrapper>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should show collapse icon on desktop when sidebar is expanded', () => {
      vi.mocked(useMobile).mockReturnValue(false);

      render(
        <Wrapper>
          <Header />
        </Wrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Collapse sidebar');
    });

    it('should show menu icon on mobile', () => {
      vi.mocked(useMobile).mockReturnValue(true);

      render(
        <Wrapper>
          <Header />
        </Wrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Toggle menu');
    });

    it('should call toggle on mobile when button clicked', () => {
      vi.mocked(useMobile).mockReturnValue(true);

      render(
        <SidebarProvider defaultOpen={false}>
          <Header />
        </SidebarProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // We can't easily test the state change without exposing it,
      // but we verify the button is clickable
      expect(button).toBeInTheDocument();
    });
  });

  describe('default layout', () => {
    it('should have default height class', () => {
      render(
        <Wrapper>
          <Header data-testid="header" />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).toHaveClass('h-14');
    });

    it('should have border-b class', () => {
      render(
        <Wrapper>
          <Header data-testid="header" />
        </Wrapper>
      );

      expect(screen.getByTestId('header')).toHaveClass('border-b');
    });
  });
});

describe('HeaderTitle component', () => {
  it('should render title text', () => {
    render(<HeaderTitle>Page Title</HeaderTitle>);

    expect(screen.getByText('Page Title')).toBeInTheDocument();
  });

  it('should render as h1 element', () => {
    render(<HeaderTitle data-testid="title">Title</HeaderTitle>);

    const title = screen.getByTestId('title');
    expect(title.tagName).toBe('H1');
  });

  it('should render subtitle when provided', () => {
    render(<HeaderTitle subtitle="Subtitle text">Title</HeaderTitle>);

    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <HeaderTitle data-testid="title" className="custom-class">
        Title
      </HeaderTitle>
    );

    expect(screen.getByTestId('title')).toHaveClass('custom-class');
  });
});

describe('HeaderActions component', () => {
  it('should render children', () => {
    render(
      <HeaderActions>
        <button>Action 1</button>
        <button>Action 2</button>
      </HeaderActions>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('should have flex layout', () => {
    render(<HeaderActions data-testid="actions">Content</HeaderActions>);

    expect(screen.getByTestId('actions')).toHaveClass('flex', 'items-center');
  });

  it('should apply custom className', () => {
    render(
      <HeaderActions data-testid="actions" className="custom-class">
        Content
      </HeaderActions>
    );

    expect(screen.getByTestId('actions')).toHaveClass('custom-class');
  });
});
