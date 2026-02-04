import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopPartnersWidget from '../TopPartnersWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * TopPartnersWidget Tests (Story 35-6)
 *
 * Component tests for top partners dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('TopPartnersWidget', () => {
  let queryClient: QueryClient;

  const mockTopPartnersData = {
    data: {
      partners: [
        {
          id: 'partner-1',
          name: 'Építő Kft.',
          totalRevenue: 2450000,
          rentalRevenue: 1800000,
          salesRevenue: 450000,
          serviceRevenue: 200000,
          trendPercent: 15.3,
        },
        {
          id: 'partner-2',
          name: 'Megabau Zrt.',
          totalRevenue: 2000000,
          rentalRevenue: 1500000,
          salesRevenue: 320000,
          serviceRevenue: 180000,
          trendPercent: 8.7,
        },
        {
          id: 'partner-3',
          name: 'Profi Szerelő Bt.',
          totalRevenue: 1910000,
          rentalRevenue: 980000,
          salesRevenue: 580000,
          serviceRevenue: 350000,
          trendPercent: -2.4,
        },
      ],
      period: 'month',
      periodStart: '2026-02-01T00:00:00.000Z',
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
        <TopPartnersWidget />
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
    it('[P1] should display widget title "Top partnerek"', async () => {
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Top partnerek')).toBeInTheDocument();
      });
    });

    it('[P1] should display partner names', async () => {
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Partner names are displayed
      await waitFor(() => {
        expect(screen.getByText('Építő Kft.')).toBeInTheDocument();
        expect(screen.getByText('Megabau Zrt.')).toBeInTheDocument();
        expect(screen.getByText('Profi Szerelő Bt.')).toBeInTheDocument();
      });
    });

    it('[P1] should display total revenue for partners', async () => {
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Revenue amounts are displayed (formatted as "X.XM Ft")
      await waitFor(() => {
        // Check for formatted currency (2450000 -> "2.5M Ft" after toFixed(1) rounding)
        expect(screen.getByText(/2\.5M/i)).toBeInTheDocument();
      });
    });

    it('[P1] should display trend indicators', async () => {
      // GIVEN: API returns top partners data with trends
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Trend percentages are displayed
      await waitFor(() => {
        expect(screen.getByText(/15[,.]3/)).toBeInTheDocument();
      });
    });
  });

  describe('Period Selector', () => {
    it('[P1] should display period selector', async () => {
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

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
    it('[P2] should show green for positive trend', async () => {
      // GIVEN: API returns partner with positive trend
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Green color is applied
      await waitFor(() => {
        const greenElements = document.querySelectorAll('[class*="green"]');
        expect(greenElements.length).toBeGreaterThan(0);
      });
    });

    it('[P2] should show red for negative trend', async () => {
      // GIVEN: API returns partner with negative trend (-2.4%)
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

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
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns top partners data
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('Építő Kft.')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /frissítés/i });
      fireEvent.click(refreshButton);

      // THEN: API is called again
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('API Integration', () => {
    it('[P1] should call correct API endpoint', async () => {
      // GIVEN: API is mocked
      vi.mocked(api.get).mockResolvedValue(mockTopPartnersData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/partner/top'));
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle empty partners array', async () => {
      // GIVEN: API returns no partners
      const emptyData = {
        data: {
          ...mockTopPartnersData.data,
          partners: [],
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors
      await waitFor(() => {
        expect(screen.getByText('Top partnerek')).toBeInTheDocument();
      });
    });

    it('[P2] should handle zero trend percentage', async () => {
      // GIVEN: API returns partner with zero trend
      const zeroTrendData = {
        data: {
          ...mockTopPartnersData.data,
          partners: [
            {
              ...mockTopPartnersData.data.partners[0],
              trendPercent: 0,
            },
          ],
        },
      };
      vi.mocked(api.get).mockResolvedValue(zeroTrendData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget renders without errors
      await waitFor(() => {
        expect(screen.getByText('Építő Kft.')).toBeInTheDocument();
      });
    });
  });
});
