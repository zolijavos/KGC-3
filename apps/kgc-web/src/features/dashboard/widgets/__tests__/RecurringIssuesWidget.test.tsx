import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecurringIssuesWidget from '../RecurringIssuesWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * RecurringIssuesWidget Tests (Story 49-2)
 *
 * Component tests for recurring issues dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('RecurringIssuesWidget', () => {
  let queryClient: QueryClient;

  const mockRecurringIssuesData = {
    data: {
      equipment: [
        {
          id: 'eq-001',
          name: 'Makita HR2470',
          serialNumber: 'MKT-2024-001234',
          serviceCount: 7,
          lastServiceDate: '2026-02-08T10:30:00.000Z',
          issues: ['Szenkefe kopott', 'Motor tulmelegedes', 'Kapcsolo hiba'],
          isCritical: true,
        },
        {
          id: 'eq-002',
          name: 'Bosch GBH 2-26',
          serialNumber: 'BSH-2023-005678',
          serviceCount: 4,
          lastServiceDate: '2026-02-05T14:15:00.000Z',
          issues: ['Olajszivargass', 'Utvemechanizmus kopas'],
          isCritical: false,
        },
      ],
      totalCount: 2,
      criticalCount: 1,
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
        <RecurringIssuesWidget />
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
    it('[P1] should display total count of problematic equipment', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Total count is displayed
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('[P1] should display critical count when present', async () => {
      // GIVEN: API returns data with critical equipment
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Critical count is displayed
      await waitFor(() => {
        expect(screen.getByText('1 kritikus')).toBeInTheDocument();
      });
    });

    it('[P1] should display equipment names', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Equipment names are displayed
      await waitFor(() => {
        expect(screen.getByText('Makita HR2470')).toBeInTheDocument();
        expect(screen.getByText('Bosch GBH 2-26')).toBeInTheDocument();
      });
    });

    it('[P1] should display service count badges', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Service count badges are displayed
      await waitFor(() => {
        expect(screen.getByText('7x')).toBeInTheDocument();
        expect(screen.getByText('4x')).toBeInTheDocument();
      });
    });

    it('[P2] should display issue tags', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Issue tags are displayed
      await waitFor(() => {
        expect(screen.getByText('Szenkefe kopott')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present with aria-label
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissites/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /frissites/i });
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
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/dashboard/service/recurring-issues?threshold=3&days=90'
        );
      });
    });
  });

  describe('Empty State', () => {
    it('[P2] should show empty state when no equipment', async () => {
      // GIVEN: API returns empty data
      const emptyData = {
        data: {
          equipment: [],
          totalCount: 0,
          criticalCount: 0,
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Empty state message is displayed
      await waitFor(() => {
        expect(screen.getByText('Nincs visszatero hiba')).toBeInTheDocument();
      });
    });
  });

  describe('Row Click', () => {
    it('[P1] should have clickable rows with aria-label', async () => {
      // GIVEN: API returns recurring issues data
      vi.mocked(api.get).mockResolvedValue(mockRecurringIssuesData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Rows are clickable buttons
      await waitFor(() => {
        const row = screen.getByRole('button', {
          name: /makita hr2470 szerviz elozmenyeinek megtekintese/i,
        });
        expect(row).toBeInTheDocument();
      });
    });
  });
});
