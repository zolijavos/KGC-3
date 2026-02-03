import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceivablesKPICard } from './ReceivablesKPICard';

// Mock components
vi.mock('../components/dashboard/TrendIndicator', () => ({
  TrendIndicator: () => <div data-testid="trend-indicator">Trend</div>,
}));
vi.mock('../components/dashboard/ComparisonText', () => ({
  ComparisonText: () => <div data-testid="comparison-text">Comparison</div>,
}));

describe('ReceivablesKPICard', () => {
  const mockData = {
    current: 600000,
    previous: 500000,
    trend: 'up' as const,
  };

  it('should render card with title "Kintlévőség"', () => {
    render(<ReceivablesKPICard data={mockData} />);
    expect(screen.getByText('Kintlévőség')).toBeInTheDocument();
  });

  it('should show red badge when value > threshold (500,000)', () => {
    render(<ReceivablesKPICard data={mockData} threshold={500000} />);
    expect(screen.getByTestId('threshold-badge')).toBeInTheDocument();
    expect(screen.getByText('Magas')).toBeInTheDocument();
  });

  it('should not show badge when value <= threshold', () => {
    const lowData = { ...mockData, current: 400000 };
    render(<ReceivablesKPICard data={lowData} threshold={500000} />);
    expect(screen.queryByTestId('threshold-badge')).not.toBeInTheDocument();
  });

  it('should render AlertCircle icon when over threshold', () => {
    const { container } = render(<ReceivablesKPICard data={mockData} threshold={500000} />);
    const icon = container.querySelector('[data-icon="AlertCircle"]');
    expect(icon).toBeInTheDocument();
  });
});
