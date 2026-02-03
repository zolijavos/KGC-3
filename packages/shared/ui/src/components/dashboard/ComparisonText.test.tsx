import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonText } from './ComparisonText';

describe('ComparisonText', () => {
  describe('formatting', () => {
    it('should format currency values with Hungarian locale', () => {
      render(<ComparisonText current={1234567} previous={1100000} format="currency" />);

      // Hungarian locale uses space as thousands separator: "1 234 567 Ft"
      expect(screen.getByText(/1 234 567 Ft/)).toBeInTheDocument();
      expect(screen.getByText(/1 100 000 Ft/)).toBeInTheDocument();
    });

    it('should format number values with Hungarian locale', () => {
      render(<ComparisonText current={1234567} previous={1100000} format="number" />);

      // Hungarian locale uses space as thousands separator: "1 234 567"
      expect(screen.getByText(/1 234 567/)).toBeInTheDocument();
      expect(screen.getByText(/1 100 000/)).toBeInTheDocument();
    });

    it('should default to currency format when format is not specified', () => {
      render(<ComparisonText current={500000} previous={400000} />);

      expect(screen.getByText(/500 000 Ft/)).toBeInTheDocument();
    });
  });

  describe('delta display', () => {
    it('should show absolute and percentage delta for positive change', () => {
      render(<ComparisonText current={1234567} previous={1100000} format="currency" />);

      // Delta: 1 234 567 - 1 100 000 = +134 567 Ft
      // Percentage: (134 567 / 1 100 000) * 100 = +12.2%
      expect(screen.getByText(/\+134 567 Ft/)).toBeInTheDocument();
      expect(screen.getByText(/\+12\.2%/)).toBeInTheDocument();
    });

    it('should show absolute and percentage delta for negative change', () => {
      render(<ComparisonText current={900000} previous={1100000} format="currency" />);

      // Delta: 900 000 - 1 100 000 = -200 000 Ft
      // Percentage: (-200 000 / 1 100 000) * 100 = -18.2%
      expect(screen.getByText(/-200 000 Ft/)).toBeInTheDocument();
      expect(screen.getByText(/-18\.2%/)).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('should apply green color for positive delta', () => {
      const { container } = render(<ComparisonText current={120} previous={100} />);

      // Check for green color class
      const deltaElement = container.querySelector('[data-delta-sign="positive"]');
      expect(deltaElement).toBeInTheDocument();
      expect(deltaElement).toHaveClass('text-green-600');
    });

    it('should apply red color for negative delta', () => {
      const { container } = render(<ComparisonText current={80} previous={100} />);

      // Check for red color class
      const deltaElement = container.querySelector('[data-delta-sign="negative"]');
      expect(deltaElement).toBeInTheDocument();
      expect(deltaElement).toHaveClass('text-red-600');
    });

    it('should apply gray color for zero delta', () => {
      const { container } = render(<ComparisonText current={100} previous={100} />);

      // Check for gray color class
      const deltaElement = container.querySelector('[data-delta-sign="neutral"]');
      expect(deltaElement).toBeInTheDocument();
      expect(deltaElement).toHaveClass('text-gray-500');
    });
  });
});
