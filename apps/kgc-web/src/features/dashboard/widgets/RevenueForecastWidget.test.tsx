import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RevenueForecastWidget from './RevenueForecastWidget';

// Mock API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

const mockedApi = vi.mocked(api);

const mockForecastData = {
  data: {
    generatedAt: '2026-02-07T12:00:00.000Z',
    forecastMonth: '2026-02',
    totalForecast: 950000,
    sources: [
      { type: 'rental', label: 'Bérlési díjak', amount: 500000, percentage: 53, count: 2 },
      { type: 'contract', label: 'Szerződéses bevétel', amount: 300000, percentage: 32, count: 1 },
      { type: 'service', label: 'Szerviz bevétel', amount: 150000, percentage: 16, count: 2 },
    ],
    comparison: {
      previousMonth: 890000,
      changeAmount: 60000,
      changePercent: 6.74,
      trend: 'up',
    },
  },
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RevenueForecastWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockForecastData });
  });

  it('[P0] should render total forecast', async () => {
    renderWithClient(<RevenueForecastWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('total-forecast')).toBeInTheDocument();
    });

    const total = screen.getByTestId('total-forecast');
    expect(total.textContent).toContain('950');
  });

  it('[P0] should render all three sources', async () => {
    renderWithClient(<RevenueForecastWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-forecast-widget')).toBeInTheDocument();
    });

    expect(screen.getByText('Bérlési díjak')).toBeInTheDocument();
    expect(screen.getByText('Szerződéses bevétel')).toBeInTheDocument();
    expect(screen.getByText('Szerviz bevétel')).toBeInTheDocument();
  });

  it('[P1] should render month-over-month comparison', async () => {
    renderWithClient(<RevenueForecastWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('comparison')).toBeInTheDocument();
    });

    const comparison = screen.getByTestId('comparison');
    expect(comparison.textContent).toContain('6.7');
    expect(comparison.textContent).toContain('%');
  });

  it('[P1] should render forecast month', async () => {
    renderWithClient(<RevenueForecastWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-forecast-widget')).toBeInTheDocument();
    });

    expect(screen.getByText(/2026.*Február/i)).toBeInTheDocument();
  });

  it('[P1] should render previous month amount', async () => {
    renderWithClient(<RevenueForecastWidget />);

    await waitFor(() => {
      expect(screen.getByTestId('revenue-forecast-widget')).toBeInTheDocument();
    });

    expect(screen.getByText('Előző hónap tényleges')).toBeInTheDocument();
  });

  it('[P2] should show loading state', () => {
    // Make the API hang to show loading state
    mockedApi.get.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<RevenueForecastWidget />);

    expect(screen.getByTestId('revenue-forecast-loading')).toBeInTheDocument();
  });
});
