import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UtilizationGauge } from './UtilizationGauge';

describe('UtilizationGauge', () => {
  describe('percentage calculation', () => {
    it('should calculate percentage correctly for normal values', () => {
      const { container } = render(<UtilizationGauge utilized={290} total={342} />);

      // 290 / 342 = 84.8% - find in data-color element
      const percentageElement = container.querySelector('[data-color]');
      expect(percentageElement?.textContent).toContain('84.8%');
    });

    it('should handle 100% utilization', () => {
      const { container } = render(<UtilizationGauge utilized={100} total={100} />);

      const percentageElement = container.querySelector('[data-color]');
      expect(percentageElement?.textContent).toContain('100.0%');
    });

    it('should handle 0% utilization', () => {
      const { container } = render(<UtilizationGauge utilized={0} total={100} />);

      const percentageElement = container.querySelector('[data-color]');
      expect(percentageElement?.textContent).toContain('0.0%');
    });

    it('should guard against division by zero', () => {
      render(<UtilizationGauge utilized={50} total={0} />);

      // Should show fallback
      expect(screen.getByText(/—/)).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('should apply green color for > 80% utilization', () => {
      const { container } = render(<UtilizationGauge utilized={85} total={100} />);

      // 85% → green
      const percentageElement = container.querySelector('[data-color="green"]');
      expect(percentageElement).toBeInTheDocument();
    });

    it('should apply yellow color for 60-80% utilization', () => {
      const { container } = render(<UtilizationGauge utilized={70} total={100} />);

      // 70% → yellow
      const percentageElement = container.querySelector('[data-color="yellow"]');
      expect(percentageElement).toBeInTheDocument();
    });

    it('should apply red color for < 60% utilization', () => {
      const { container } = render(<UtilizationGauge utilized={50} total={100} />);

      // 50% → red
      const percentageElement = container.querySelector('[data-color="red"]');
      expect(percentageElement).toBeInTheDocument();
    });

    it('should apply yellow color for exactly 80%', () => {
      const { container } = render(<UtilizationGauge utilized={80} total={100} />);

      // 80% → yellow (not > 80)
      const percentageElement = container.querySelector('[data-color="yellow"]');
      expect(percentageElement).not.toBeNull();
    });

    it('should apply yellow color for exactly 60%', () => {
      const { container } = render(<UtilizationGauge utilized={60} total={100} />);

      // 60% → yellow (>= 60 boundary)
      const percentageElement = container.querySelector('[data-color="yellow"]');
      expect(percentageElement).toBeInTheDocument();
    });
  });

  describe('label and subtext', () => {
    it('should display main label with utilized/total format', () => {
      render(<UtilizationGauge utilized={290} total={342} />);

      expect(screen.getByText(/Bérlésben:/)).toBeInTheDocument();
      expect(screen.getByText(/290 \/ 342/)).toBeInTheDocument();
    });

    it('should display warehouse count when provided', () => {
      render(<UtilizationGauge utilized={290} total={342} warehouseCount={34} />);

      expect(screen.getByText(/Raktár:/)).toBeInTheDocument();
      expect(screen.getByText(/34 \/ 342/)).toBeInTheDocument();
    });

    it('should display service count when provided', () => {
      render(<UtilizationGauge utilized={290} total={342} serviceCount={18} />);

      expect(screen.getByText(/Szerviz:/)).toBeInTheDocument();
      expect(screen.getByText(/18 \/ 342/)).toBeInTheDocument();
    });
  });
});
