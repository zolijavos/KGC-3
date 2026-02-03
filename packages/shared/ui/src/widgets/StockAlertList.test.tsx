import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockAlertList } from './StockAlertList';

const mockAlerts = [
  {
    id: 'machine-001',
    model: 'Makita DHP485',
    type: 'Fúrócsavarbelyegzőgép',
    currentStock: 8,
    minimumThreshold: 15,
    severity: 'critical' as const,
    lastPurchase: '2026-01-15',
  },
  {
    id: 'machine-002',
    model: 'DeWalt DCD795',
    type: 'Csavarbelyegzőgép',
    currentStock: 22,
    minimumThreshold: 30,
    severity: 'warning' as const,
    lastPurchase: '2026-01-20',
  },
];

describe('StockAlertList', () => {
  describe('loading state', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(<StockAlertList data={[]} isLoading />);

      const skeleton = container.querySelector('[data-testid="widget-skeleton"]');
      expect(skeleton).not.toBeNull();
    });
  });

  describe('empty state', () => {
    it('should render empty state when no alerts', () => {
      render(<StockAlertList data={[]} />);

      expect(screen.getByText('Nincs készlethiány')).toBeInTheDocument();
    });
  });

  describe('alert rendering', () => {
    it('should render alert list table', () => {
      render(<StockAlertList data={mockAlerts} />);

      expect(screen.getByText('Makita DHP485')).toBeInTheDocument();
      expect(screen.getByText('DeWalt DCD795')).toBeInTheDocument();
    });

    it('should render critical severity badge', () => {
      const { container } = render(<StockAlertList data={mockAlerts} />);

      const criticalBadge = container.querySelector('[data-severity="critical"]');
      expect(criticalBadge).not.toBeNull();
    });

    it('should render warning severity badge', () => {
      const { container } = render(<StockAlertList data={mockAlerts} />);

      const warningBadge = container.querySelector('[data-severity="warning"]');
      expect(warningBadge).not.toBeNull();
    });

    it('should display alert count badge in header', () => {
      render(<StockAlertList data={mockAlerts} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display current stock values', () => {
      render(<StockAlertList data={mockAlerts} />);

      expect(screen.getByText('8')).toBeInTheDocument(); // machine-001
      expect(screen.getByText('22')).toBeInTheDocument(); // machine-002
    });

    it('should display minimum threshold values', () => {
      render(<StockAlertList data={mockAlerts} />);

      expect(screen.getByText('15')).toBeInTheDocument(); // machine-001 threshold
      expect(screen.getByText('30')).toBeInTheDocument(); // machine-002 threshold
    });
  });

  describe('alert list limits', () => {
    it('should limit to max 10 alerts', () => {
      const manyAlerts = Array.from({ length: 15 }, (_, i) => ({
        id: `machine-${i}`,
        model: `Model ${i}`,
        type: 'Test',
        currentStock: 10,
        minimumThreshold: 20,
        severity: 'warning' as const,
        lastPurchase: '2026-01-01',
      }));

      const { container } = render(<StockAlertList data={manyAlerts} />);

      // Should only render 10 rows (tbody > tr)
      const rows = container.querySelectorAll('tbody > tr');
      expect(rows.length).toBeLessThanOrEqual(10);
    });
  });

  describe('interaction', () => {
    it('should call onAlertClick when row is clicked', () => {
      const handleClick = vi.fn();
      const { container } = render(<StockAlertList data={mockAlerts} onAlertClick={handleClick} />);

      const firstRow = container.querySelector('tbody > tr');
      firstRow?.click();

      expect(handleClick).toHaveBeenCalledWith(mockAlerts[0]);
    });

    it('should have hover effect on clickable rows', () => {
      const { container } = render(<StockAlertList data={mockAlerts} onAlertClick={() => {}} />);

      const firstRow = container.querySelector('tbody > tr');
      expect(firstRow?.className).toContain('hover:bg-gray-50');
    });
  });

  describe('icons', () => {
    it('should display AlertTriangle icon in header', () => {
      const { container } = render(<StockAlertList data={mockAlerts} />);

      const icon = container.querySelector('[data-icon="AlertTriangle"]');
      expect(icon).not.toBeNull();
    });
  });
});
