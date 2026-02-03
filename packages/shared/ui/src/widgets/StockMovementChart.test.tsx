import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockMovementChart } from './StockMovementChart';

// Mock Recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

const mockData = [
  { date: '2026-01-04', inbound: 5, outbound: 12, net: -7 },
  { date: '2026-01-05', inbound: 8, outbound: 10, net: -2 },
  { date: '2026-01-06', inbound: 15, outbound: 5, net: 10 },
];

describe('StockMovementChart', () => {
  it('should render skeleton when loading', () => {
    const { container } = render(<StockMovementChart data={[]} isLoading />);

    const skeleton = container.querySelector('[data-testid="widget-skeleton"]');
    expect(skeleton).not.toBeNull();
  });

  it('should render chart with data', () => {
    const { container } = render(<StockMovementChart data={mockData} />);

    expect(container.querySelector('[data-testid="line-chart"]')).not.toBeNull();
  });

  it('should display chart title', () => {
    render(<StockMovementChart data={mockData} />);

    expect(screen.getByText('Készlet Mozgás')).toBeInTheDocument();
  });

  it('should display TrendingUp icon', () => {
    const { container } = render(<StockMovementChart data={mockData} />);

    const icon = container.querySelector('[data-icon="TrendingUp"]');
    expect(icon).not.toBeNull();
  });

  it('should render LineChart component', () => {
    const { container } = render(<StockMovementChart data={mockData} />);

    expect(container.querySelector('[data-testid="line-chart"]')).not.toBeNull();
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(<StockMovementChart data={[]} />);

    expect(container.querySelector('[data-testid="line-chart"]')).not.toBeNull();
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<StockMovementChart data={mockData} onClick={handleClick} />);

    const card = container.querySelector('[role="article"]');
    card?.click();

    expect(handleClick).toHaveBeenCalled();
  });

  it('should have responsive container', () => {
    const { container } = render(<StockMovementChart data={mockData} />);

    expect(container.querySelector('[data-testid="responsive-container"]')).not.toBeNull();
  });
});
