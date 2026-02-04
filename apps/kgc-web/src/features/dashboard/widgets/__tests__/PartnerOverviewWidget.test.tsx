import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PartnerOverviewWidget from '../PartnerOverviewWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * PartnerOverviewWidget Tests (Story 35-6)
 *
 * Component tests for partner overview dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('PartnerOverviewWidget', () => {
  let queryClient: QueryClient;

  const mockOverviewData = {
    data: {
      totalActive: 156,
      newPartners: 12,
      byCategory: [
        { category: 'RETAIL', count: 98, color: 'blue' },
        { category: 'B2B', count: 45, color: 'purple' },
        { category: 'VIP', count: 13, color: 'amber' },
      ],
      periodStart: '2026-01-05T00:00:00.000Z',
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
        <PartnerOverviewWidget />
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
    it('[P1] should display total active partners count', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Total active count is displayed
      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
      });
    });

    it('[P1] should display new partners count with 30 day label', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: New partners count is displayed
      await waitFor(() => {
        expect(screen.getByText(/\+12/)).toBeInTheDocument();
        expect(screen.getByText(/30 nap/)).toBeInTheDocument();
      });
    });

    it('[P1] should display widget title "Partner összesítés"', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Partner összesítés')).toBeInTheDocument();
      });
    });

    it('[P1] should display "aktív partner" label', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Label is displayed
      await waitFor(() => {
        expect(screen.getByText('aktív partner')).toBeInTheDocument();
      });
    });

    it('[P1] should display category badges with counts', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Category badges are displayed with Hungarian labels
      await waitFor(() => {
        expect(screen.getByText(/Lakossági: 98/)).toBeInTheDocument();
        expect(screen.getByText(/Céges: 45/)).toBeInTheDocument();
        expect(screen.getByText(/Kiemelt: 13/)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns overview data
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
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
      vi.mocked(api.get).mockResolvedValue(mockOverviewData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/dashboard/partner/overview');
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle zero active partners', async () => {
      // GIVEN: API returns zero partners
      const zeroData = {
        data: {
          ...mockOverviewData.data,
          totalActive: 0,
          newPartners: 0,
        },
      };
      vi.mocked(api.get).mockResolvedValue(zeroData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Zero is displayed
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('[P2] should handle empty byCategory array', async () => {
      // GIVEN: API returns empty categories
      const emptyData = {
        data: {
          ...mockOverviewData.data,
          byCategory: [],
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors
      await waitFor(() => {
        expect(screen.getByText('Partner összesítés')).toBeInTheDocument();
      });
    });
  });
});
