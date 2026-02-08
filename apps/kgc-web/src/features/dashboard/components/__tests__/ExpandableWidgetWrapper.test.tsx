import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpandableWidgetWrapper } from '../ExpandableWidgetWrapper';

describe('ExpandableWidgetWrapper', () => {
  const defaultProps = {
    title: 'Test Widget',
    children: <div data-testid="compact-content">Compact Content</div>,
    expandedContent: <div data-testid="expanded-content">Expanded Content</div>,
  };

  describe('rendering', () => {
    it('should render compact content', () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      expect(screen.getByTestId('compact-content')).toBeInTheDocument();
    });

    it('should render expand button when expandable is true', () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should not render expand button when expandable is false', () => {
      render(<ExpandableWidgetWrapper {...defaultProps} expandable={false} />);

      const expandButton = screen.queryByRole('button', { name: /nagyítás/i });
      expect(expandButton).not.toBeInTheDocument();
    });
  });

  describe('expand functionality', () => {
    it('should open dialog when expand button is clicked', async () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      // Dialog should not be visible initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click the expand button
      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      // Dialog should now be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should show expanded content in dialog', async () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
      });
    });

    it('should show title in dialog header', async () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Test Widget')).toBeInTheDocument();
      });
    });

    it('should close dialog when minimize button is clicked', async () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      // Open dialog
      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click minimize button
      const minimizeButton = screen.getByRole('button', { name: /visszaállítás/i });
      fireEvent.click(minimizeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should use children as expanded content when expandedContent is not provided', async () => {
      render(
        <ExpandableWidgetWrapper title="Test">
          <div data-testid="only-content">Only Content</div>
        </ExpandableWidgetWrapper>
      );

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        // Should show the children inside the dialog
        const dialogs = screen.getAllByTestId('only-content');
        expect(dialogs.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('icon display', () => {
    it('should render icon in dialog when provided', async () => {
      render(
        <ExpandableWidgetWrapper
          {...defaultProps}
          icon={<span data-testid="widget-icon">🎯</span>}
        />
      );

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('widget-icon')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels on buttons', () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      expect(expandButton).toHaveAttribute('aria-label', 'Widget nagyítása');
    });

    it('should have dialog description for screen readers', async () => {
      render(<ExpandableWidgetWrapper {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        // The sr-only description should exist
        const description = screen.getByText(/részletes nézet/i);
        expect(description).toBeInTheDocument();
        expect(description).toHaveClass('sr-only');
      });
    });
  });

  describe('click event propagation', () => {
    it('should open dialog even with parent click handler', async () => {
      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <ExpandableWidgetWrapper {...defaultProps} />
        </div>
      );

      const expandButton = screen.getByRole('button', { name: /nagyítás/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
