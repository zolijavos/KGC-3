import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockHeatmap } from './StockHeatmap';

const mockData = [
  { machineType: 'Fúrócsavarbelyegzőgép', location: 'Bolt 1', count: 45, utilizationPercent: 92 },
  { machineType: 'Fúrócsavarbelyegzőgép', location: 'Bolt 2', count: 38, utilizationPercent: 78 },
  { machineType: 'Csavarbelyegzőgép', location: 'Bolt 1', count: 30, utilizationPercent: 65 },
  { machineType: 'Csavarbelyegzőgép', location: 'Bolt 2', count: 25, utilizationPercent: 50 },
];

describe('StockHeatmap', () => {
  it('should render skeleton when loading', () => {
    const { container } = render(<StockHeatmap data={[]} isLoading />);

    const skeleton = container.querySelector('[data-testid="widget-skeleton"]');
    expect(skeleton).not.toBeNull();
  });

  it('should render heatmap with data', () => {
    const { container } = render(<StockHeatmap data={mockData} />);

    expect(container.querySelector('[data-testid="heatmap-container"]')).not.toBeNull();
  });

  it('should display chart title', () => {
    render(<StockHeatmap data={mockData} />);

    expect(screen.getByText('Készlet Hőtérkép')).toBeInTheDocument();
  });

  it('should display grid icon', () => {
    const { container } = render(<StockHeatmap data={mockData} />);

    const icon = container.querySelector('[data-icon="Grid3x3"]');
    expect(icon).not.toBeNull();
  });

  it('should render machine types as headers', () => {
    render(<StockHeatmap data={mockData} />);

    expect(screen.getByText('Fúrócsavarbelyegzőgép')).toBeInTheDocument();
    expect(screen.getByText('Csavarbelyegzőgép')).toBeInTheDocument();
  });

  it('should render location labels', () => {
    render(<StockHeatmap data={mockData} />);

    expect(screen.getByText('Bolt 1')).toBeInTheDocument();
    expect(screen.getByText('Bolt 2')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(<StockHeatmap data={[]} />);

    expect(container.querySelector('[data-testid="heatmap-container"]')).not.toBeNull();
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<StockHeatmap data={mockData} onClick={handleClick} />);

    const card = container.querySelector('[role="article"]');
    card?.click();

    expect(handleClick).toHaveBeenCalled();
  });
});
