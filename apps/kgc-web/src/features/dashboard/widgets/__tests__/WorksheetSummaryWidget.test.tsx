import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorksheetSummaryWidget from '../WorksheetSummaryWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * WorksheetSummaryWidget Tests (Story 35-5)
 *
 * Component tests for worksheet summary dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('WorksheetSummaryWidget', () => {
  let queryClient: QueryClient;

  const mockSummaryData = {
    data: {
      totalActive: 35,
      byStatus: [
        { status: 'DRAFT', count: 5, color: 'gray' },
        { status: 'DIAGNOSED', count: 8, color: 'purple' },
        { status: 'IN_PROGRESS', count: 15, color: 'blue' },
        { status: 'WAITING_PARTS', count: 7, color: 'yellow' },
        { status: 'COMPLETED', count: 4, color: 'green' },
        { status: 'CLOSED', count: 3, color: 'slate' },
      ],
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
        <WorksheetSummaryWidget />
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
    it('[P1] should display total active worksheets count', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Total active count is displayed
      await waitFor(() => {
        expect(screen.getByText('35')).toBeInTheDocument();
      });
    });

    it('[P1] should display "aktív munkalap" label', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Label is displayed
      await waitFor(() => {
        expect(screen.getByText('aktív munkalap')).toBeInTheDocument();
      });
    });

    it('[P1] should display widget title "Munkalapok"', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Munkalapok')).toBeInTheDocument();
      });
    });

    it('[P1] should display status badges with counts', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Status badges are displayed
      await waitFor(() => {
        expect(screen.getByText(/Vázlat: 5/)).toBeInTheDocument();
        expect(screen.getByText(/Folyamatban: 15/)).toBeInTheDocument();
      });
    });

    it('[P2] should display all status types with Hungarian labels', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: All statuses have Hungarian labels
      await waitFor(() => {
        expect(screen.getByText(/Vázlat/)).toBeInTheDocument();
        expect(screen.getByText(/Diagnosztizált/)).toBeInTheDocument();
        expect(screen.getByText(/Folyamatban/)).toBeInTheDocument();
        expect(screen.getByText(/Alkatrészre vár/)).toBeInTheDocument();
        expect(screen.getByText(/Befejezett/)).toBeInTheDocument();
        expect(screen.getByText(/Lezárt/)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present with aria-label
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns summary data
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('35')).toBeInTheDocument();
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
      vi.mocked(api.get).mockResolvedValue(mockSummaryData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/dashboard/service/summary');
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle zero active worksheets', async () => {
      // GIVEN: API returns zero active worksheets
      const zeroData = {
        data: {
          ...mockSummaryData.data,
          totalActive: 0,
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

    it('[P2] should handle empty byStatus array', async () => {
      // GIVEN: API returns empty status array
      const emptyData = {
        data: {
          ...mockSummaryData.data,
          byStatus: [],
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors
      await waitFor(() => {
        expect(screen.getByText('Munkalapok')).toBeInTheDocument();
      });
    });
  });
});
