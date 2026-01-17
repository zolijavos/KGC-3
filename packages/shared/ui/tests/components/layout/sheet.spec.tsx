import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../../../src/components/ui/sheet';

describe('Sheet components', () => {
  describe('Sheet (Root)', () => {
    it('should render trigger', () => {
      render(
        <Sheet>
          <SheetTrigger data-testid="trigger">Open</SheetTrigger>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('should not render content when closed', () => {
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <span data-testid="content">Sheet Content</span>
          </SheetContent>
        </Sheet>
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should render content when opened', () => {
      render(
        <Sheet>
          <SheetTrigger data-testid="trigger">Open</SheetTrigger>
          <SheetContent>
            <span data-testid="content">Sheet Content</span>
          </SheetContent>
        </Sheet>
      );

      fireEvent.click(screen.getByTestId('trigger'));

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should support controlled open state', () => {
      const onOpenChange = vi.fn();

      render(
        <Sheet open={true} onOpenChange={onOpenChange}>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <span data-testid="content">Content</span>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('SheetContent', () => {
    it('should render as dialog', () => {
      render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <span data-testid="children">Children Content</span>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('children')).toBeInTheDocument();
    });

    it('should show close button by default', () => {
      render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );

      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });

    it('should hide close button when showClose=false', () => {
      render(
        <Sheet open={true}>
          <SheetContent showClose={false}>Content</SheetContent>
        </Sheet>
      );

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('should support side="left"', () => {
      render(
        <Sheet open={true}>
          <SheetContent side="left" data-testid="content">
            Content
          </SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('left-0');
    });

    it('should support side="right" (default)', () => {
      render(
        <Sheet open={true}>
          <SheetContent data-testid="content">Content</SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('right-0');
    });

    it('should support side="top"', () => {
      render(
        <Sheet open={true}>
          <SheetContent side="top" data-testid="content">
            Content
          </SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('top-0');
    });

    it('should support side="bottom"', () => {
      render(
        <Sheet open={true}>
          <SheetContent side="bottom" data-testid="content">
            Content
          </SheetContent>
        </Sheet>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('bottom-0');
    });

    it('should apply custom className', () => {
      render(
        <Sheet open={true}>
          <SheetContent data-testid="content" className="custom-class">
            Content
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('content')).toHaveClass('custom-class');
    });
  });

  describe('SheetHeader', () => {
    it('should render children', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetHeader>
              <span data-testid="header-content">Header</span>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('header-content')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetHeader data-testid="header">Header</SheetHeader>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col');
    });
  });

  describe('SheetFooter', () => {
    it('should render children', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetFooter>
              <button data-testid="footer-button">Submit</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('footer-button')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetFooter data-testid="footer">Footer</SheetFooter>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('footer')).toHaveClass('flex');
    });
  });

  describe('SheetTitle', () => {
    it('should render as heading', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetTitle>Title Text</SheetTitle>
          </SheetContent>
        </Sheet>
      );

      // Radix Dialog.Title renders as h2 by default
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetTitle data-testid="title" className="custom-class">
              Title
            </SheetTitle>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('title')).toHaveClass('custom-class');
    });
  });

  describe('SheetDescription', () => {
    it('should render description text', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetDescription>Description text</SheetDescription>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should have muted text styling', () => {
      render(
        <Sheet open={true}>
          <SheetContent>
            <SheetDescription data-testid="desc">Description</SheetDescription>
          </SheetContent>
        </Sheet>
      );

      expect(screen.getByTestId('desc')).toHaveClass('text-muted-foreground');
    });
  });

  describe('SheetClose', () => {
    it('should close sheet when clicked', () => {
      const onOpenChange = vi.fn();

      render(
        <Sheet open={true} onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetClose data-testid="close">Close Me</SheetClose>
          </SheetContent>
        </Sheet>
      );

      fireEvent.click(screen.getByTestId('close'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
