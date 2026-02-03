import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockSummaryCard } from './StockSummaryCard';

const mockData = {
  total: 342,
  byLocation: {
    'bolt_1': { count: 180, percentage: 52.6 },
    'bolt_2': { count: 140, percentage: 40.9 },
    'warehouse': { count: 22, percentage: 6.4 },
  },
  byStatus: {
    available: 52,
    rented: 290,
    service: 0,
  },
};

describe('StockSummaryCard', () => {
  describe('loading state', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(<StockSummaryCard data={mockData} isLoading />);

      // Check for skeleton
      const skeleton = container.querySelector('[data-testid="widget-skeleton"]');
      expect(skeleton).not.toBeNull();
    });
  });

  describe('data rendering', () => {
    it('should render total machine count', () => {
      render(<StockSummaryCard data={mockData} />);

      expect(screen.getByText('342')).toBeInTheDocument();
    });

    it('should format numbers with Hungarian locale', () => {
      const largeData = {
        ...mockData,
        total: 1234,
        byLocation: {
          'bolt_1': { count: 1000, percentage: 81 },
        },
        byStatus: mockData.byStatus,
      };

      render(<StockSummaryCard data={largeData} />);

      // Hungarian number format renders 1234 or 1 234
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('should display Package icon', () => {
      const { container } = render(<StockSummaryCard data={mockData} />);

      const icon = container.querySelector('[data-icon="Package"]');
      expect(icon).not.toBeNull();
    });

    it('should display card title', () => {
      render(<StockSummaryCard data={mockData} />);

      expect(screen.getByText('Készlet Összesítés')).toBeInTheDocument();
    });
  });

  describe('location breakdown', () => {
    it('should render location counts', () => {
      render(<StockSummaryCard data={mockData} />);

      expect(screen.getByText('180')).toBeInTheDocument(); // bolt_1
      expect(screen.getByText('140')).toBeInTheDocument(); // bolt_2
      expect(screen.getByText('22')).toBeInTheDocument(); // warehouse
    });

    it('should render location percentages', () => {
      render(<StockSummaryCard data={mockData} />);

      expect(screen.getByText(/52\.6%/)).toBeInTheDocument(); // bolt_1
      expect(screen.getByText(/40\.9%/)).toBeInTheDocument(); // bolt_2
      expect(screen.getByText(/6\.4%/)).toBeInTheDocument(); // warehouse
    });
  });

  describe('interaction', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn();
      const { container } = render(<StockSummaryCard data={mockData} onClick={handleClick} />);

      const card = container.querySelector('[role="article"]');
      card?.click();

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const { container } = render(<StockSummaryCard data={mockData} onClick={() => {}} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toContain('cursor-pointer');
    });
  });
});
