import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetRevenueKPICard } from './NetRevenueKPICard';

// Mock components
vi.mock('../components/dashboard/TrendIndicator', () => ({
  TrendIndicator: () => <div data-testid="trend-indicator">Trend</div>,
}));
vi.mock('../components/dashboard/ComparisonText', () => ({
  ComparisonText: () => <div data-testid="comparison-text">Comparison</div>,
}));

describe('NetRevenueKPICard', () => {
  const mockData = {
    current: 900000,
    previous: 800000,
    trend: 'up' as const,
  };

  it('should render card with title "Nettó Bevétel"', () => {
    render(<NetRevenueKPICard data={mockData} />);
    expect(screen.getByText('Nettó Bevétel')).toBeInTheDocument();
  });

  it('should render Banknote icon', () => {
    const { container } = render(<NetRevenueKPICard data={mockData} />);
    const icon = container.querySelector('[data-icon="Banknote"]');
    expect(icon).toBeInTheDocument();
  });

  it('should display formatted value', () => {
    render(<NetRevenueKPICard data={mockData} />);
    expect(screen.getByText(/900 000/)).toBeInTheDocument();
  });
});
