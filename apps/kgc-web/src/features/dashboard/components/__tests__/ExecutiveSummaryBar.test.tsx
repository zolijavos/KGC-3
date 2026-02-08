import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { KpiSummaryData } from '../ExecutiveSummaryBar';
import { ExecutiveSummaryBar } from '../ExecutiveSummaryBar';

// Mock KPI data for tests
const mockKpiData: KpiSummaryData[] = [
  { id: 'health', label: 'Üzleti Egészség', value: 'Stabil', icon: '☀️', status: 'healthy' },
  {
    id: 'revenue',
    label: 'Napi Bevétel',
    value: '1.23M Ft',
    trend: '+12%',
    icon: '💰',
    status: 'healthy',
  },
  {
    id: 'inventory',
    label: 'Készlet',
    value: '342 gép',
    trend: '84.8%',
    icon: '📦',
    status: 'warning',
  },
  { id: 'service', label: 'Aktív Munkalapok', value: '35 db', icon: '🔧', status: 'healthy' },
  {
    id: 'alerts',
    label: 'Alertek',
    value: '5 db',
    subtext: '2 kritikus',
    icon: '⚠️',
    status: 'critical',
  },
];

describe('ExecutiveSummaryBar', () => {
  describe('layout and structure', () => {
    it('should render with sticky positioning', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const summaryBar = screen.getByTestId('executive-summary-bar');
      expect(summaryBar).toBeInTheDocument();
      expect(summaryBar).toHaveClass('sticky');
    });

    it('should render pin icon indicating non-collapsible', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const pinIcon = screen.getByTestId('pin-indicator');
      expect(pinIcon).toBeInTheDocument();
    });

    it('should render all 5 KPI elements (1 health indicator + 4 KPI cards)', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      // 1 health indicator + 4 regular KPI cards
      const healthIndicator = screen.getByTestId('business-health-indicator');
      const kpiCards = screen.getAllByTestId(/^kpi-card-/);

      expect(healthIndicator).toBeInTheDocument();
      expect(kpiCards).toHaveLength(4);
    });

    it('should use flex layout for horizontal arrangement', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const kpiContainer = screen.getByTestId('kpi-container');
      expect(kpiContainer).toHaveClass('flex');
    });
  });

  describe('KPI card content', () => {
    it('should display KPI label', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByText('Napi Bevétel')).toBeInTheDocument();
    });

    it('should display KPI value', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByText('1.23M Ft')).toBeInTheDocument();
    });

    it('should display trend when provided', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByText('+12%')).toBeInTheDocument();
    });

    it('should display icon', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByText('💰')).toBeInTheDocument();
    });

    it('should display subtext when provided', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByText('2 kritikus')).toBeInTheDocument();
    });
  });

  describe('status coloring', () => {
    it('should apply healthy status color (green border)', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const healthyCard = screen.getByTestId('kpi-card-revenue');
      expect(healthyCard).toHaveClass('border-status-healthy');
    });

    it('should apply warning status color (yellow border)', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const warningCard = screen.getByTestId('kpi-card-inventory');
      expect(warningCard).toHaveClass('border-status-warning');
    });

    it('should apply critical status color (red border)', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const criticalCard = screen.getByTestId('kpi-card-alerts');
      expect(criticalCard).toHaveClass('border-status-critical');
    });
  });

  describe('business health indicator', () => {
    it('should render business health section', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      expect(screen.getByTestId('business-health-indicator')).toBeInTheDocument();
    });

    it('should display health icon', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      // First KPI is health with ☀️ icon
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have appropriate aria-label', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const summaryBar = screen.getByTestId('executive-summary-bar');
      expect(summaryBar).toHaveAttribute('aria-label', 'Executive Summary - Fő mutatók');
    });

    it('should have role region', () => {
      render(<ExecutiveSummaryBar kpiData={mockKpiData} />);

      const summaryBar = screen.getByTestId('executive-summary-bar');
      expect(summaryBar).toHaveAttribute('role', 'region');
    });
  });

  describe('empty state', () => {
    it('should render loading state when kpiData is empty', () => {
      render(<ExecutiveSummaryBar kpiData={[]} />);

      expect(screen.getByTestId('executive-summary-loading')).toBeInTheDocument();
    });
  });
});
