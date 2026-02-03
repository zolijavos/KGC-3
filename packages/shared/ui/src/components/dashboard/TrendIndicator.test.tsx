import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendIndicator } from './TrendIndicator';

describe('TrendIndicator', () => {
  describe('delta calculation', () => {
    it('should calculate positive delta correctly', () => {
      render(<TrendIndicator value={120} previousValue={100} />);

      // Delta: (120 - 100) / 100 * 100 = 20%
      expect(screen.getByText('+20.0%')).toBeInTheDocument();
    });

    it('should calculate negative delta correctly', () => {
      render(<TrendIndicator value={80} previousValue={100} />);

      // Delta: (80 - 100) / 100 * 100 = -20%
      expect(screen.getByText('-20.0%')).toBeInTheDocument();
    });

    it('should handle zero delta', () => {
      render(<TrendIndicator value={100} previousValue={100} />);

      // Delta: (100 - 100) / 100 * 100 = 0%
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should guard against infinity when previousValue is zero', () => {
      render(<TrendIndicator value={100} previousValue={0} />);

      // Should show neutral state (—) instead of infinity
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('trend icon rendering', () => {
    it('should render green ArrowUp icon for positive trend', () => {
      const { container } = render(<TrendIndicator value={120} previousValue={100} />);

      // Check for green color class on parent div
      const icon = container.querySelector('[data-trend="up"]');
      expect(icon).toBeInTheDocument();

      const parentDiv = icon?.parentElement;
      expect(parentDiv).toHaveClass('text-green-600');
    });

    it('should render red ArrowDown icon for negative trend', () => {
      const { container } = render(<TrendIndicator value={80} previousValue={100} />);

      // Check for red color class on parent div
      const icon = container.querySelector('[data-trend="down"]');
      expect(icon).toBeInTheDocument();

      const parentDiv = icon?.parentElement;
      expect(parentDiv).toHaveClass('text-red-600');
    });

    it('should render gray Minus icon for neutral trend', () => {
      const { container } = render(<TrendIndicator value={100} previousValue={100} />);

      // Check for gray color class on parent div
      const icon = container.querySelector('[data-trend="neutral"]');
      expect(icon).toBeInTheDocument();

      const parentDiv = icon?.parentElement;
      expect(parentDiv).toHaveClass('text-gray-400');
    });
  });

  describe('percentage formatting', () => {
    it('should format percentage with one decimal place', () => {
      render(<TrendIndicator value={125.5} previousValue={100} />);

      // Delta: (125.5 - 100) / 100 * 100 = 25.5%
      expect(screen.getByText('+25.5%')).toBeInTheDocument();
    });

    it('should include plus sign for positive values', () => {
      render(<TrendIndicator value={110} previousValue={100} />);

      expect(screen.getByText('+10.0%')).toBeInTheDocument();
    });
  });
});
