import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  const defaultProps = {
    id: 'finance',
    title: 'Pénzügy',
    icon: '💰',
    widgetCount: 6,
    alertCount: 1,
    children: <div data-testid="section-content">Widget content</div>,
  };

  describe('rendering', () => {
    it('should render section header with icon and title', () => {
      render(<CollapsibleSection {...defaultProps} />);

      expect(screen.getByText('💰')).toBeInTheDocument();
      expect(screen.getByText('Pénzügy')).toBeInTheDocument();
    });

    it('should render widget count', () => {
      render(<CollapsibleSection {...defaultProps} />);

      expect(screen.getByText('6 widget')).toBeInTheDocument();
    });

    it('should render alert badge when alertCount > 0', () => {
      render(<CollapsibleSection {...defaultProps} />);

      const alertBadge = screen.getByTestId('alert-badge');
      expect(alertBadge).toBeInTheDocument();
      expect(alertBadge).toHaveTextContent('1');
    });

    it('should not render alert badge when alertCount is 0', () => {
      render(<CollapsibleSection {...defaultProps} alertCount={0} />);

      expect(screen.queryByTestId('alert-badge')).not.toBeInTheDocument();
    });

    it('should render collapse/expand button', () => {
      render(<CollapsibleSection {...defaultProps} />);

      expect(screen.getByTestId('collapse-button')).toBeInTheDocument();
    });

    it('should render settings and pin buttons as placeholders', () => {
      render(<CollapsibleSection {...defaultProps} />);

      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
      expect(screen.getByTestId('pin-button')).toBeInTheDocument();
    });
  });

  describe('collapse/expand functionality', () => {
    it('should render content when expanded (default)', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      expect(screen.getByTestId('section-content')).toBeVisible();
    });

    it('should hide content when collapsed', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded={false} />);

      expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();
    });

    it('should toggle content visibility on header click', async () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      const header = screen.getByTestId('section-header');
      fireEvent.click(header);

      // After click, content should be hidden
      expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();
    });

    it('should toggle content on collapse button click', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      const collapseBtn = screen.getByTestId('collapse-button');
      fireEvent.click(collapseBtn);

      expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();
    });

    it('should show expanded icon when expanded', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      const icon = screen.getByTestId('collapse-icon');
      expect(icon).toHaveTextContent('▼');
    });

    it('should show collapsed icon when collapsed', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded={false} />);

      const icon = screen.getByTestId('collapse-icon');
      expect(icon).toHaveTextContent('▶');
    });
  });

  describe('alert badge styling', () => {
    it('should have critical styling when alertCount > 2', () => {
      render(<CollapsibleSection {...defaultProps} alertCount={3} />);

      const badge = screen.getByTestId('alert-badge');
      expect(badge).toHaveClass('bg-status-critical');
    });

    it('should have warning styling when alertCount <= 2', () => {
      render(<CollapsibleSection {...defaultProps} alertCount={2} />);

      const badge = screen.getByTestId('alert-badge');
      expect(badge).toHaveClass('bg-status-warning');
    });
  });

  describe('controlled mode', () => {
    it('should call onExpandedChange when toggled', () => {
      const onExpandedChange = vi.fn();
      render(
        <CollapsibleSection {...defaultProps} expanded={true} onExpandedChange={onExpandedChange} />
      );

      const header = screen.getByTestId('section-header');
      fireEvent.click(header);

      expect(onExpandedChange).toHaveBeenCalledWith(false);
    });
  });

  describe('accessibility', () => {
    it('should have appropriate aria attributes', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      const header = screen.getByTestId('section-header');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard accessible', () => {
      render(<CollapsibleSection {...defaultProps} defaultExpanded />);

      const header = screen.getByTestId('section-header');
      fireEvent.keyDown(header, { key: 'Enter' });

      expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();
    });
  });
});
