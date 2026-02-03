import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentsKPICard } from './PaymentsKPICard';

// Mock components
vi.mock('../components/dashboard/TrendIndicator', () => ({
  TrendIndicator: () => <div data-testid="trend-indicator">Trend</div>,
}));
vi.mock('../components/dashboard/ComparisonText', () => ({
  ComparisonText: () => <div data-testid="comparison-text">Comparison</div>,
}));

describe('PaymentsKPICard', () => {
  const mockData = {
    current: 750000,
    previous: 700000,
    trend: 'up' as const,
  };

  it('should render card with title "Befizetések"', () => {
    render(<PaymentsKPICard data={mockData} />);
    expect(screen.getByText('Befizetések')).toBeInTheDocument();
  });

  it('should render CreditCard icon', () => {
    const { container } = render(<PaymentsKPICard data={mockData} />);
    const icon = container.querySelector('[data-icon="CreditCard"]');
    expect(icon).toBeInTheDocument();
  });

  it('should display formatted value', () => {
    render(<PaymentsKPICard data={mockData} />);
    expect(screen.getByText(/750 000/)).toBeInTheDocument();
  });
});
