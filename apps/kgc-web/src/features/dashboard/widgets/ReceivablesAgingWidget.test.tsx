import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReceivablesAgingWidget from './ReceivablesAgingWidget';

// Mock API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

const mockedApi = vi.mocked(api);

// Mock data
const mockAgingReport = {
  data: {
    generatedAt: '2026-02-07T12:00:00.000Z',
    totalReceivables: 1878500,
    buckets: [
      { label: '0-30' as const, count: 2, totalAmount: 340000 },
      { label: '31-60' as const, count: 1, totalAmount: 128500 },
      { label: '61-90' as const, count: 1, totalAmount: 520000 },
      { label: '90+' as const, count: 1, totalAmount: 890000 },
    ],
    topDebtors: [
      {
        partnerId: 'partner-4',
        partnerName: 'Tóth Gépkölcsönző Zrt.',
        totalDebt: 890000,
        invoiceCount: 1,
        oldestDueDate: '2025-10-10T00:00:00.000Z',
      },
      {
        partnerId: 'partner-3',
        partnerName: 'Szabó és Társa Bt.',
        totalDebt: 520000,
        invoiceCount: 1,
        oldestDueDate: '2025-11-24T00:00:00.000Z',
      },
      {
        partnerId: 'partner-1',
        partnerName: 'Kovács Építőipari Kft.',
        totalDebt: 340000,
        invoiceCount: 2,
        oldestDueDate: '2026-01-23T00:00:00.000Z',
      },
    ],
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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ReceivablesAgingWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while fetching data', async () => {
    mockedApi.get.mockImplementation(
      () => new Promise(() => {}) // Never resolves - keeps loading
    );

    renderWithQueryClient(<ReceivablesAgingWidget />);

    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(<ReceivablesAgingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Hiba az adatok betöltésekor.')).toBeInTheDocument();
    });
  });

  it('displays widget title and total receivables', async () => {
    mockedApi.get.mockResolvedValue(mockAgingReport);

    renderWithQueryClient(<ReceivablesAgingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Kintlévőség Aging')).toBeInTheDocument();
    });

    expect(screen.getByText('Összes kintlévőség')).toBeInTheDocument();
    // Check for formatted amount (Hungarian format)
    expect(screen.getByText(/1\s?878\s?500\s?Ft/)).toBeInTheDocument();
  });

  it('displays all 4 aging buckets with correct labels', async () => {
    mockedApi.get.mockResolvedValue(mockAgingReport);

    renderWithQueryClient(<ReceivablesAgingWidget />);

    await waitFor(() => {
      expect(screen.getByText('0-30 nap')).toBeInTheDocument();
    });

    expect(screen.getByText('31-60 nap')).toBeInTheDocument();
    expect(screen.getByText('61-90 nap')).toBeInTheDocument();
    expect(screen.getByText('90+ nap')).toBeInTheDocument();
  });

  it('displays top debtors list with partner names', async () => {
    mockedApi.get.mockResolvedValue(mockAgingReport);

    renderWithQueryClient(<ReceivablesAgingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Top 5 Adós')).toBeInTheDocument();
    });

    expect(screen.getByText('Tóth Gépkölcsönző Zrt.')).toBeInTheDocument();
    expect(screen.getByText('Szabó és Társa Bt.')).toBeInTheDocument();
    expect(screen.getByText('Kovács Építőipari Kft.')).toBeInTheDocument();

    // Check ranking numbers
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('displays invoice counts in buckets', async () => {
    mockedApi.get.mockResolvedValue(mockAgingReport);

    renderWithQueryClient(<ReceivablesAgingWidget />);

    await waitFor(() => {
      // Use getAllByText since multiple elements show "2 számla" (bucket + debtor)
      const elements = screen.getAllByText(/2 számla/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
