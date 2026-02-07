import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EquipmentProfitWidget from './EquipmentProfitWidget';

// Mock API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

const mockedApi = vi.mocked(api);

// Mock data
const mockSummaryData = {
  data: {
    totalRevenue: 12450000,
    totalCosts: 8230000,
    totalProfit: 4220000,
    averageRoi: 64.9,
    equipmentCount: 20,
    profitableCount: 15,
    losingCount: 5,
  },
};

const mockTopEquipmentData = {
  data: [
    {
      equipmentId: 'eq-1',
      equipmentCode: 'BG-001',
      name: 'MAKITA DHP484',
      profit: 850000,
      roi: 85.0,
      totalRevenue: 1850000,
    },
    {
      equipmentId: 'eq-2',
      equipmentCode: 'BG-002',
      name: 'BOSCH GSR 18V',
      profit: 720000,
      roi: 72.0,
      totalRevenue: 1720000,
    },
    {
      equipmentId: 'eq-3',
      equipmentCode: 'BG-003',
      name: 'DEWALT DCH273',
      profit: 680000,
      roi: 68.0,
      totalRevenue: 1680000,
    },
    {
      equipmentId: 'eq-4',
      equipmentCode: 'BG-004',
      name: 'HIKOKI DH36DPA',
      profit: 550000,
      roi: 55.0,
      totalRevenue: 1550000,
    },
    {
      equipmentId: 'eq-5',
      equipmentCode: 'BG-005',
      name: 'FESTOOL TS 55',
      profit: 480000,
      roi: 48.0,
      totalRevenue: 1480000,
    },
  ],
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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EquipmentProfitWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while fetching data', async () => {
    // Mock with pending promise
    mockedApi.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves - keeps loading
    );

    renderWithQueryClient(<EquipmentProfitWidget />);

    // Should show loading skeleton (animate-pulse divs)
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(<EquipmentProfitWidget />);

    await waitFor(() => {
      expect(screen.getByText('Hiba az adatok betöltésekor.')).toBeInTheDocument();
    });
  });

  it('displays fleet summary data with correct Hungarian formatting', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/summary')) {
        return Promise.resolve(mockSummaryData);
      }
      if (url.includes('/top')) {
        return Promise.resolve(mockTopEquipmentData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithQueryClient(<EquipmentProfitWidget />);

    await waitFor(() => {
      // Widget title
      expect(screen.getByText('Bérgép Megtérülés')).toBeInTheDocument();
    });

    // Check summary labels
    expect(screen.getByText('Összes bevétel')).toBeInTheDocument();
    expect(screen.getByText('Összes költség')).toBeInTheDocument();
    expect(screen.getByText('Összes profit')).toBeInTheDocument();

    // Check ROI badge (format is +64.9% with dot separator)
    expect(screen.getByText(/Átl\. ROI:/)).toBeInTheDocument();
    expect(screen.getByText(/\+64\.9%/)).toBeInTheDocument();
  });

  it('displays equipment statistics correctly', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/summary')) {
        return Promise.resolve(mockSummaryData);
      }
      if (url.includes('/top')) {
        return Promise.resolve(mockTopEquipmentData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithQueryClient(<EquipmentProfitWidget />);

    await waitFor(() => {
      expect(screen.getByText('Összes gép: 20')).toBeInTheDocument();
    });

    expect(screen.getByText('Nyereséges: 15')).toBeInTheDocument();
    expect(screen.getByText('Veszteséges: 5')).toBeInTheDocument();
  });

  it('displays Top 5 most profitable equipment list', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/summary')) {
        return Promise.resolve(mockSummaryData);
      }
      if (url.includes('/top')) {
        return Promise.resolve(mockTopEquipmentData);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithQueryClient(<EquipmentProfitWidget />);

    await waitFor(() => {
      expect(screen.getByText('Top 5 Legjövedelmezőbb')).toBeInTheDocument();
    });

    // Check equipment names
    expect(screen.getByText('MAKITA DHP484')).toBeInTheDocument();
    expect(screen.getByText('BOSCH GSR 18V')).toBeInTheDocument();
    expect(screen.getByText('DEWALT DCH273')).toBeInTheDocument();
    expect(screen.getByText('HIKOKI DH36DPA')).toBeInTheDocument();
    expect(screen.getByText('FESTOOL TS 55')).toBeInTheDocument();

    // Check equipment codes
    expect(screen.getByText('BG-001')).toBeInTheDocument();
    expect(screen.getByText('BG-002')).toBeInTheDocument();

    // Check ranking numbers (1-5)
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByText('4.')).toBeInTheDocument();
    expect(screen.getByText('5.')).toBeInTheDocument();
  });
});
