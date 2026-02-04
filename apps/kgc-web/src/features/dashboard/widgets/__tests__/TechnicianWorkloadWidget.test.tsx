import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TechnicianWorkloadWidget from '../TechnicianWorkloadWidget';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * TechnicianWorkloadWidget Tests (Story 35-5)
 *
 * Component tests for technician workload dashboard widget
 * Priority: P1 (High - PR to main)
 */
describe('TechnicianWorkloadWidget', () => {
  let queryClient: QueryClient;

  const mockWorkloadData = {
    data: {
      technicians: [
        {
          id: 'tech-1',
          name: 'Kovács János',
          activeWorksheets: 3,
          maxCapacity: 5,
          utilizationPercent: 60,
          worksheets: [
            { id: 'ws-1', title: 'Makita fúró javítás', priority: 'HIGH' },
            { id: 'ws-2', title: 'Bosch flex szerviz', priority: 'NORMAL' },
            { id: 'ws-3', title: 'DeWalt csavarbehajtó', priority: 'URGENT' },
          ],
        },
        {
          id: 'tech-2',
          name: 'Nagy Péter',
          activeWorksheets: 2,
          maxCapacity: 5,
          utilizationPercent: 40,
          worksheets: [
            { id: 'ws-4', title: 'Hilti kalapács', priority: 'NORMAL' },
            { id: 'ws-5', title: 'Milwaukee akkumulátor', priority: 'LOW' },
          ],
        },
        {
          id: 'tech-3',
          name: 'Szabó István',
          activeWorksheets: 4,
          maxCapacity: 5,
          utilizationPercent: 80,
          worksheets: [
            { id: 'ws-6', title: 'Metabo sarokcsiszoló', priority: 'HIGH' },
            { id: 'ws-7', title: 'Festool porszívó', priority: 'NORMAL' },
            { id: 'ws-8', title: 'Stihl láncfűrész', priority: 'NORMAL' },
            { id: 'ws-9', title: 'Husqvarna vágó', priority: 'HIGH' },
          ],
        },
      ],
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
        <TechnicianWorkloadWidget />
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
    it('[P1] should display widget title "Szerelő terhelés"', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Title is displayed
      await waitFor(() => {
        expect(screen.getByText('Szerelő terhelés')).toBeInTheDocument();
      });
    });

    it('[P1] should display technician names', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Technician names are displayed
      await waitFor(() => {
        expect(screen.getByText('Kovács János')).toBeInTheDocument();
        expect(screen.getByText('Nagy Péter')).toBeInTheDocument();
        expect(screen.getByText('Szabó István')).toBeInTheDocument();
      });
    });

    it('[P1] should display active worksheet counts', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Worksheet counts are displayed (3/5, 2/5, 4/5)
      await waitFor(() => {
        expect(screen.getByText(/3\/5/)).toBeInTheDocument();
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
        expect(screen.getByText(/4\/5/)).toBeInTheDocument();
      });
    });

    it('[P1] should display progress bars for each technician', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Progress bars are rendered
      await waitFor(() => {
        const progressBars = document.querySelectorAll('[role="progressbar"], .h-2');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Color Coding', () => {
    it('[P2] should render technician with low utilization (< 60%)', async () => {
      // GIVEN: API returns technician with 40% utilization (Nagy Péter)
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Low utilization technician is displayed with progress bar
      await waitFor(() => {
        expect(screen.getByText('Nagy Péter')).toBeInTheDocument();
        expect(screen.getByText(/2\/5/)).toBeInTheDocument();
      });
    });

    it('[P2] should render technician with medium utilization (60-80%)', async () => {
      // GIVEN: API returns technician with 60% utilization (Kovács János)
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Medium utilization technician is displayed
      await waitFor(() => {
        expect(screen.getByText('Kovács János')).toBeInTheDocument();
        expect(screen.getByText(/3\/5/)).toBeInTheDocument();
      });
    });

    it('[P2] should render technician with high utilization (>= 80%)', async () => {
      // GIVEN: API returns technician with 80% utilization (Szabó István)
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: High utilization technician is displayed
      await waitFor(() => {
        expect(screen.getByText('Szabó István')).toBeInTheDocument();
        expect(screen.getByText(/4\/5/)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Button', () => {
    it('[P1] should have refresh button with aria-label', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Refresh button is present
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /frissítés/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('[P1] should call refetch when refresh button is clicked', async () => {
      // GIVEN: API returns workload data
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered and refresh button is clicked
      renderWidget();
      await waitFor(() => {
        expect(screen.getByText('Kovács János')).toBeInTheDocument();
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
      vi.mocked(api.get).mockResolvedValue(mockWorkloadData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Correct endpoint is called
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/dashboard/service/workload');
      });
    });
  });

  describe('Edge Cases', () => {
    it('[P2] should handle empty technicians array', async () => {
      // GIVEN: API returns empty technicians
      const emptyData = {
        data: {
          technicians: [],
        },
      };
      vi.mocked(api.get).mockResolvedValue(emptyData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Widget still renders without errors
      await waitFor(() => {
        expect(screen.getByText('Szerelő terhelés')).toBeInTheDocument();
      });
    });

    it('[P2] should handle technician with zero worksheets', async () => {
      // GIVEN: API returns technician with no worksheets
      const zeroData = {
        data: {
          technicians: [
            {
              id: 'tech-1',
              name: 'Új Szerelő',
              activeWorksheets: 0,
              maxCapacity: 5,
              utilizationPercent: 0,
              worksheets: [],
            },
          ],
        },
      };
      vi.mocked(api.get).mockResolvedValue(zeroData);

      // WHEN: Widget is rendered
      renderWidget();

      // THEN: Technician is displayed with 0/5
      await waitFor(() => {
        expect(screen.getByText('Új Szerelő')).toBeInTheDocument();
        expect(screen.getByText(/0\/5/)).toBeInTheDocument();
      });
    });
  });
});
