import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WarrantyRatioWidget from '../WarrantyRatioWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock recharts to avoid SSR issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => null,
}));

import { api } from '@/api/client';

/**
 * WarrantyRatioWidget Tests (Story 49-1)
 *
 * Component tests for warranty ratio dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('WarrantyRatioWidget', () => {
  let queryClient: QueryClient;

  const mockWarrantyRatioData = {
    data: {
      warranty: { count: 42, revenue: 0, percentage: 35.0 },
      paid: { count: 78, revenue: 1560000, percentage: 65.0 },
      trend: [
        { month: '2026-02', warrantyPercent: 35 },
        { month: '2026-01', warrantyPercent: 32 },
        { month: '2025-12', warrantyPercent: 38 },
        { month: '2025-11', warrantyPercent: 41 },
        { month: '2025-10', warrantyPercent: 28 },
        { month: '2025-09', warrantyPercent: 33 },
      ],
      periodStart: '2026-02-01T00:00:00.000Z',
      periodEnd: '2026-02-11T12:00:00.000Z',
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderWidget = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WarrantyRatioWidget />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('[P1] should show loading skeleton initially', async () => {
      // GIVEN: API call is pending
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Loading skeleton is visible
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    it('[P1] should display widget title "Garanciális arány"', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Garanciális arány')).toBeInTheDocument();
      });
    });

    it('[P1] should display warranty count and percentage', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Warranty data is displayed
      await waitFor(() => {
        expect(screen.getByText('Garanciális')).toBeInTheDocument();
        expect(screen.getByText(/42 db/)).toBeInTheDocument();
        expect(screen.getByText(/35.0%/)).toBeInTheDocument();
      });
    });

    it('[P1] should display paid count and percentage', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Paid data is displayed
      await waitFor(() => {
        expect(screen.getByText('Fizetős')).toBeInTheDocument();
        expect(screen.getByText(/78 db/)).toBeInTheDocument();
        expect(screen.getByText(/65.0%/)).toBeInTheDocument();
      });
    });

    it('[P1] should display paid revenue in HUF format', async () => {
      // GIVEN: API returns warranty ratio data with revenue
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Revenue is displayed
      await waitFor(() => {
        expect(screen.getByText(/Fizetős bevétel/)).toBeInTheDocument();
        // Should show revenue in HUF format (1 560 000 Ft)
        expect(screen.getByText(/1[\s\xa0]560[\s\xa0]000/)).toBeInTheDocument();
      });
    });

    it('[P1] should render pie chart container', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Pie chart is rendered
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Trend Display', () => {
    it('[P1] should display 6-month trend sparkline', async () => {
      // GIVEN: API returns warranty ratio data with trend
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Trend label is displayed
      await waitFor(() => {
        expect(screen.getByText(/6 hó trend/)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present with aria-label
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should have clickable refresh button', async () => {
      // GIVEN: API returns warranty ratio data
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered and data is loaded
      renderWidget();

      // Wait for data to be fully loaded (not in fetching state)
      await waitFor(
        () => {
          const refreshButton = screen.getByRole('button', { name: /frissítés/i });
          const svg = refreshButton.querySelector('svg');
          // Button should not be in loading state (no animate-spin)
          expect(svg?.classList.contains('animate-spin')).toBe(false);
        },
        { timeout: 2000 }
      );

      // THEN: Button is present and ready for interaction
      const refreshButton = screen.getByRole('button', { name: /frissítés/i });
      expect(refreshButton).toBeInTheDocument();

      // Click the button - should not throw
      fireEvent.click(refreshButton);
    });
  });

  describe('API Integration', () => {
    it('[P1] should call correct API endpoint', async () => {
      // GIVEN: API is mocked
      vi.mocked(api.get).mockResolvedValue(mockWarrantyRatioData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/dashboard/service/warranty-ratio');
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle zero counts gracefully', async () => {
      // GIVEN: API returns zero counts
      const zeroData = {
        data: {
          warranty: { count: 0, revenue: 0, percentage: 0 },
          paid: { count: 0, revenue: 0, percentage: 0 },
          trend: [],
          periodStart: '2026-02-01T00:00:00.000Z',
          periodEnd: '2026-02-11T12:00:00.000Z',
        },
      };
      vi.mocked(api.get).mockResolvedValue(zeroData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors and shows the title and legends
      await waitFor(() => {
        expect(screen.getByText('Garanciális arány')).toBeInTheDocument();
        expect(screen.getByText('Garanciális')).toBeInTheDocument();
        expect(screen.getByText('Fizetős')).toBeInTheDocument();
      });
    });

    it('[P2] should handle empty trend array', async () => {
      // GIVEN: API returns empty trend
      const emptyTrendData = {
        data: {
          ...mockWarrantyRatioData.data,
          trend: [],
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyTrendData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget renders without trend sparkline
      await waitFor(() => {
        expect(screen.getByText('Garanciális arány')).toBeInTheDocument();
      });
      // Trend section should not be visible
      expect(screen.queryByText(/6 hó trend/)).not.toBeInTheDocument();
    });
  });
});
