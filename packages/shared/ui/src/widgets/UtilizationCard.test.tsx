import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UtilizationCard } from './UtilizationCard';

const mockData = {
  utilized: 290,
  total: 342,
  warehouse: 34,
  service: 18,
};

describe('UtilizationCard', () => {
  describe('loading state', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(<UtilizationCard data={mockData} isLoading />);

      const skeleton = container.querySelector('[data-testid="widget-skeleton"]');
      expect(skeleton).not.toBeNull();
    });
  });

  describe('data rendering', () => {
    it('should render UtilizationGauge component', () => {
      const { container } = render(<UtilizationCard data={mockData} />);

      // Check gauge is rendered
      const gauge = container.querySelector('[data-color]');
      expect(gauge).not.toBeNull();
    });

    it('should pass data to UtilizationGauge', () => {
      const { container } = render(<UtilizationCard data={mockData} />);

      // 290 / 342 = 84.8% - check data-color element
      const percentage = container.querySelector('[data-color]');
      expect(percentage?.textContent).toContain('84.8%');
    });

    it('should display TrendingUp icon', () => {
      const { container } = render(<UtilizationCard data={mockData} />);

      const icon = container.querySelector('[data-icon="TrendingUp"]');
      expect(icon).not.toBeNull();
    });

    it('should display card title', () => {
      render(<UtilizationCard data={mockData} />);

      expect(screen.getByText('Kihasználtság')).toBeInTheDocument();
    });
  });

  describe('color-coded percentage', () => {
    it('should show green percentage for > 80%', () => {
      const { container } = render(
        <UtilizationCard data={{ utilized: 85, total: 100, warehouse: 10, service: 5 }} />,
      );

      const percentage = container.querySelector('[data-color="green"]');
      expect(percentage).not.toBeNull();
    });

    it('should show yellow percentage for 60-80%', () => {
      const { container } = render(
        <UtilizationCard data={{ utilized: 70, total: 100, warehouse: 20, service: 10 }} />,
      );

      const percentage = container.querySelector('[data-color="yellow"]');
      expect(percentage).not.toBeNull();
    });

    it('should show red percentage for < 60%', () => {
      const { container } = render(
        <UtilizationCard data={{ utilized: 50, total: 100, warehouse: 30, service: 20 }} />,
      );

      const percentage = container.querySelector('[data-color="red"]');
      expect(percentage).not.toBeNull();
    });
  });

  describe('interaction', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn();
      const { container } = render(<UtilizationCard data={mockData} onClick={handleClick} />);

      const card = container.querySelector('[role="article"]');
      card?.click();

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const { container } = render(<UtilizationCard data={mockData} onClick={() => {}} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toContain('cursor-pointer');
    });
  });
});
