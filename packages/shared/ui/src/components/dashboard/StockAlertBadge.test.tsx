import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockAlertBadge } from './StockAlertBadge';

describe('StockAlertBadge', () => {
  describe('critical severity', () => {
    it('should render critical badge with red background', () => {
      const { container } = render(<StockAlertBadge severity="critical" />);

      const badge = container.querySelector('[data-severity="critical"]');
      expect(badge).not.toBeNull();
      expect(badge?.className).toContain('bg-red-600');
    });

    it('should display exclamation icon for critical', () => {
      const { container } = render(<StockAlertBadge severity="critical" />);

      const icon = container.querySelector('[data-icon="AlertCircle"]');
      expect(icon).not.toBeNull();
    });

    it('should render children text for critical', () => {
      render(<StockAlertBadge severity="critical">Kritikus hiány</StockAlertBadge>);

      expect(screen.getByText('Kritikus hiány')).toBeInTheDocument();
    });
  });

  describe('warning severity', () => {
    it('should render warning badge with yellow background', () => {
      const { container } = render(<StockAlertBadge severity="warning" />);

      const badge = container.querySelector('[data-severity="warning"]');
      expect(badge).not.toBeNull();
      expect(badge?.className).toContain('bg-yellow-500');
    });

    it('should display warning icon for warning', () => {
      const { container } = render(<StockAlertBadge severity="warning" />);

      const icon = container.querySelector('[data-icon="AlertTriangle"]');
      expect(icon).not.toBeNull();
    });

    it('should render children text for warning', () => {
      render(<StockAlertBadge severity="warning">Figyelmeztetés</StockAlertBadge>);

      expect(screen.getByText('Figyelmeztetés')).toBeInTheDocument();
    });
  });
});
