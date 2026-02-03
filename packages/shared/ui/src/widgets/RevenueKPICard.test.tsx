import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RevenueKPICard } from './RevenueKPICard';

// Mock nested components to avoid lazy loading issues
vi.mock('../components/dashboard/TrendIndicator', () => ({
  TrendIndicator: ({ value, previousValue }: { value: number; previousValue: number }) => (
    <div data-testid="trend-indicator">
      {value > previousValue ? '+' : '-'}
      {Math.abs(((value - previousValue) / previousValue) * 100).toFixed(1)}%
    </div>
  ),
}));

vi.mock('../components/dashboard/ComparisonText', () => ({
  ComparisonText: ({ current, previous }: { current: number; previous: number }) => (
    <div data-testid="comparison-text">
      {current} vs. {previous}
    </div>
  ),
}));

describe('RevenueKPICard', () => {
  const mockData = {
    current: 1234567,
    previous: 1100000,
    trend: 'up' as const,
  };

  it('should render card with title "Bruttó Bevétel"', () => {
    render(<RevenueKPICard data={mockData} />);

    expect(screen.getByText('Bruttó Bevétel')).toBeInTheDocument();
  });

  it('should display current value formatted', () => {
    render(<RevenueKPICard data={mockData} />);

    expect(screen.getByText(/1 234 567/)).toBeInTheDocument();
  });

  it('should render DollarSign icon', () => {
    const { container } = render(<RevenueKPICard data={mockData} />);

    const icon = container.querySelector('[data-icon="DollarSign"]');
    expect(icon).toBeInTheDocument();
  });

  it('should render TrendIndicator component', () => {
    render(<RevenueKPICard data={mockData} />);

    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('should render ComparisonText component', () => {
    render(<RevenueKPICard data={mockData} />);

    expect(screen.getByTestId('comparison-text')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const mockOnClick = vi.fn();
    const { container } = render(<RevenueKPICard data={mockData} onClick={mockOnClick} />);

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should have pointer cursor when onClick is provided', () => {
    const mockOnClick = vi.fn();
    const { container } = render(<RevenueKPICard data={mockData} onClick={mockOnClick} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('cursor-pointer');
  });

  it('should not have pointer cursor when onClick is not provided', () => {
    const { container } = render(<RevenueKPICard data={mockData} />);

    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('should render loading skeleton when isLoading is true', () => {
    render(<RevenueKPICard data={mockData} isLoading={true} />);

    expect(screen.getByRole('status', { name: /loading widget/i })).toBeInTheDocument();
  });

  it('should not render content when isLoading is true', () => {
    render(<RevenueKPICard data={mockData} isLoading={true} />);

    expect(screen.queryByText('Bruttó Bevétel')).not.toBeInTheDocument();
  });
});
