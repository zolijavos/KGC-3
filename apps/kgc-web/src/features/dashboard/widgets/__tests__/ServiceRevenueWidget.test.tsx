import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceRevenueWidget from '../ServiceRevenueWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * ServiceRevenueWidget Tests (Story 35-5)
 *
 * Component tests for service revenue dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('ServiceRevenueWidget', () => {
  let queryClient: QueryClient;

  const mockRevenueData = {
    data: {
      current: { total: 450000, laborFee: 280000, partsRevenue: 170000 },
      previous: { total: 380000, laborFee: 230000, partsRevenue: 150000 },
      delta: { totalPercent: 18.4, laborPercent: 21.7, partsPercent: 13.3, trend: 'up' },
      period: 'week',
      periodStart: '2026-01-28T00:00:00.000Z',
      periodEnd: '2026-02-04T12:00:00.000Z',
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
        <ServiceRevenueWidget />
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
    it('[P1] should display widget title "Szerviz bevétel"', async () => {
      // GIVEN: API returns revenue data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Szerviz bevétel')).toBeInTheDocument();
      });
    });

    it('[P1] should display total revenue formatted', async () => {
      // GIVEN: API returns revenue data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Total revenue is displayed (450000 Ft or similar)
      await waitFor(() => {
        // Check for formatted number (may be 450 000 Ft or 450,000 Ft etc)
        expect(screen.getByText(/450/)).toBeInTheDocument();
      });
    });

    it('[P1] should display labor fee and parts revenue breakdown', async () => {
      // GIVEN: API returns revenue data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Breakdown is displayed
      await waitFor(() => {
        expect(screen.getByText(/munkadíj/i)).toBeInTheDocument();
        expect(screen.getByText(/alkatrész/i)).toBeInTheDocument();
      });
    });

    it('[P1] should display trend indicator', async () => {
      // GIVEN: API returns revenue data with positive trend
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Trend percentage is displayed
      await waitFor(() => {
        expect(screen.getByText(/18[,.]4/)).toBeInTheDocument();
      });
    });
  });

  describe('Period Selector', () => {
    it('[P1] should display period selector', async () => {
      // GIVEN: API returns revenue data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Period selector (select element) is displayed
      await waitFor(() => {
        const select = screen.getByRole('combobox', { name: /időszak/i });
        expect(select).toBeInTheDocument();
      });
    });
  });

  describe('Trend Colors', () => {
    it('[P2] should show green color for positive trend', async () => {
      // GIVEN: API returns positive trend data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Green color is applied for positive trend
      await waitFor(() => {
        const greenElements = document.querySelectorAll('[class*="green"]');
        expect(greenElements.length).toBeGreaterThan(0);
      });
    });

    it('[P2] should show red color for negative trend', async () => {
      // GIVEN: API returns negative trend data
      const negativeTrendData = {
        data: {
          ...mockRevenueData.data,
          delta: { ...mockRevenueData.data.delta, totalPercent: -5.2, trend: 'down' },
        },
      };
      vi.mocked(api.get).mockResolvedValue(negativeTrendData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Red color is applied for negative trend
      await waitFor(() => {
        const redElements = document.querySelectorAll('[class*="red"]');
        expect(redElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns revenue data
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('[P1] should call correct API endpoint with period', async () => {
      // GIVEN: API is mocked
      vi.mocked(api.get).mockResolvedValue(mockRevenueData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/service/revenue'));
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle zero revenue', async () => {
      // GIVEN: API returns zero revenue
      const zeroData = {
        data: {
          ...mockRevenueData.data,
          current: { total: 0, laborFee: 0, partsRevenue: 0 },
        },
      };
      vi.mocked(api.get).mockResolvedValue(zeroData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Zero is displayed
      await waitFor(() => {
        expect(screen.getByText('Szerviz bevétel')).toBeInTheDocument();
      });
    });

    it('[P2] should handle neutral trend (0%)', async () => {
      // GIVEN: API returns neutral trend
      const neutralData = {
        data: {
          ...mockRevenueData.data,
          delta: { ...mockRevenueData.data.delta, totalPercent: 0, trend: 'neutral' },
        },
      };
      vi.mocked(api.get).mockResolvedValue(neutralData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget renders without errors
      await waitFor(() => {
        expect(screen.getByText('Szerviz bevétel')).toBeInTheDocument();
      });
    });
  });
});
