import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../../../src/components/layout/breadcrumb';

describe('Breadcrumb components', () => {
  describe('Breadcrumb', () => {
    it('should render as nav element', () => {
      render(<Breadcrumb data-testid="breadcrumb" />);

      const nav = screen.getByTestId('breadcrumb');
      expect(nav.tagName).toBe('NAV');
    });

    it('should have aria-label="breadcrumb"', () => {
      render(<Breadcrumb data-testid="breadcrumb" />);

      const nav = screen.getByTestId('breadcrumb');
      expect(nav).toHaveAttribute('aria-label', 'breadcrumb');
    });

    it('should apply custom className', () => {
      render(<Breadcrumb data-testid="breadcrumb" className="custom-class" />);

      const nav = screen.getByTestId('breadcrumb');
      expect(nav).toHaveClass('custom-class');
    });
  });

  describe('BreadcrumbList', () => {
    it('should render as ol element', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList data-testid="list" />
        </Breadcrumb>
      );

      const list = screen.getByTestId('list');
      expect(list.tagName).toBe('OL');
    });

    it('should apply default styles', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList data-testid="list" />
        </Breadcrumb>
      );

      const list = screen.getByTestId('list');
      expect(list).toHaveClass('flex', 'flex-wrap', 'items-center');
    });
  });

  describe('BreadcrumbItem', () => {
    it('should render as li element', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem data-testid="item">Test</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const item = screen.getByTestId('item');
      expect(item.tagName).toBe('LI');
    });

    it('should render children', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Test Item</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbLink', () => {
    it('should render as anchor by default', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/test">Link</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const link = screen.getByText('Link');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
    });

    it('should support custom "as" component', () => {
      const CustomLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <span data-testid="custom-link" {...props} />
      );

      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink as={CustomLink} href="/test">
                Custom Link
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByTestId('custom-link')).toBeInTheDocument();
    });

    it('should apply hover styles class', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" data-testid="link">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const link = screen.getByTestId('link');
      expect(link).toHaveClass('transition-colors');
    });
  });

  describe('BreadcrumbPage', () => {
    it('should render as span element', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const page = screen.getByTestId('page');
      expect(page.tagName).toBe('SPAN');
    });

    it('should have aria-current="page"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const page = screen.getByTestId('page');
      expect(page).toHaveAttribute('aria-current', 'page');
    });

    it('should have aria-disabled="true"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const page = screen.getByTestId('page');
      expect(page).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('BreadcrumbSeparator', () => {
    it('should render with role="presentation"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbSeparator data-testid="separator" />
          </BreadcrumbList>
        </Breadcrumb>
      );

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('role', 'presentation');
    });

    it('should have aria-hidden="true"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbSeparator data-testid="separator" />
          </BreadcrumbList>
        </Breadcrumb>
      );

      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render default ChevronRight icon', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbSeparator data-testid="separator" />
          </BreadcrumbList>
        </Breadcrumb>
      );

      const separator = screen.getByTestId('separator');
      expect(separator.querySelector('svg')).toBeInTheDocument();
    });

    it('should support custom icon', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbSeparator icon={<span data-testid="custom-icon">/</span>} />
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should support children over icon', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbSeparator>
              <span data-testid="children-content">|</span>
            </BreadcrumbSeparator>
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByTestId('children-content')).toBeInTheDocument();
    });
  });

  describe('BreadcrumbEllipsis', () => {
    it('should render with role="presentation"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbEllipsis data-testid="ellipsis" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const ellipsis = screen.getByTestId('ellipsis');
      expect(ellipsis).toHaveAttribute('role', 'presentation');
    });

    it('should have aria-hidden="true"', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbEllipsis data-testid="ellipsis" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const ellipsis = screen.getByTestId('ellipsis');
      expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render MoreHorizontal icon', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbEllipsis data-testid="ellipsis" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      const ellipsis = screen.getByTestId('ellipsis');
      expect(ellipsis.querySelector('svg')).toBeInTheDocument();
    });

    it('should have screen reader text', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByText('More')).toHaveClass('sr-only');
    });
  });

  describe('Full breadcrumb example', () => {
    it('should render complete breadcrumb navigation', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });
  });
});
