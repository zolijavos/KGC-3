import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerActivityWidget from '../PartnerActivityWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { api } from '@/api/client';

/**
 * PartnerActivityWidget Tests (Story 35-6)
 *
 * Component tests for partner activity dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('PartnerActivityWidget', () => {
  let queryClient: QueryClient;

  const mockActivityData = {
    data: {
      activities: [
        { date: '2026-02-04', rentals: 12, sales: 8, services: 5, total: 25 },
        { date: '2026-02-03', rentals: 15, sales: 10, services: 7, total: 32 },
        { date: '2026-02-02', rentals: 10, sales: 6, services: 4, total: 20 },
        { date: '2026-02-01', rentals: 8, sales: 5, services: 3, total: 16 },
      ],
      totalTransactions: 450,
      previousTotalTransactions: 396,
      deltaPercent: 13.6,
      periodDays: 14,
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
        <PartnerActivityWidget />
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
    it('[P1] should display widget title "Partner aktivitás"', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Partner aktivitás')).toBeInTheDocument();
      });
    });

    it('[P1] should display total transactions count', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Total transactions is displayed
      await waitFor(() => {
        expect(screen.getByText('450')).toBeInTheDocument();
      });
    });

    it('[P1] should display "tranzakció" label', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Label is displayed
      await waitFor(() => {
        expect(screen.getByText('tranzakció')).toBeInTheDocument();
      });
    });

    it('[P1] should display trend percentage', async () => {
      // GIVEN: API returns activity data with positive trend
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Trend percentage is displayed
      await waitFor(() => {
        expect(screen.getByText(/13[,.]6/)).toBeInTheDocument();
      });
    });

    it('[P1] should render chart component', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Chart is rendered
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Trend Colors', () => {
    it('[P2] should show green for positive trend', async () => {
      // GIVEN: API returns positive trend data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Green color is applied
      await waitFor(() => {
        const greenElements = document.querySelectorAll('[class*="green"]');
        expect(greenElements.length).toBeGreaterThan(0);
      });
    });

    it('[P2] should show red for negative trend', async () => {
      // GIVEN: API returns negative trend data
      const negativeData = {
        data: {
          ...mockActivityData.data,
          deltaPercent: -5.2,
        },
      };
      vi.mocked(api.get).mockResolvedValue(negativeData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Red color is applied
      await waitFor(() => {
        const redElements = document.querySelectorAll('[class*="red"]');
        expect(redElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns activity data
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('450')).toBeInTheDocument();
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
      vi.mocked(api.get).mockResolvedValue(mockActivityData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('/dashboard/partner/activity')
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle empty activities array', async () => {
      // GIVEN: API returns no activities
      const emptyData = {
        data: {
          ...mockActivityData.data,
          activities: [],
          totalTransactions: 0,
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors
      await waitFor(() => {
        expect(screen.getByText('Partner aktivitás')).toBeInTheDocument();
      });
    });

    it('[P2] should handle zero trend percentage', async () => {
      // GIVEN: API returns neutral trend
      const neutralData = {
        data: {
          ...mockActivityData.data,
          deltaPercent: 0,
        },
      };
      vi.mocked(api.get).mockResolvedValue(neutralData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget renders without errors
      await waitFor(() => {
        expect(screen.getByText('Partner aktivitás')).toBeInTheDocument();
      });
    });
  });
});
