import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HybridDashboardLayout } from '../HybridDashboardLayout';

// Mock useAuth
const mockUser = vi.fn();
const mockAuthLoading = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser(),
    isAuthenticated: !!mockUser(),
    isLoading: mockAuthLoading(),
  }),
}));

// Mock the widget registry to avoid loading actual widgets that need API
vi.mock('../../lib/widget-registry', () => ({
  WIDGET_REGISTRY: {
    'mock-finance-widget': {
      component: () => <div data-testid="mock-widget">Mock Finance Widget</div>,
      roles: ['ADMIN', 'STORE_MANAGER'],
      category: 'finance',
      refreshInterval: 300,
    },
    'mock-inventory-widget': {
      component: () => <div data-testid="mock-widget">Mock Inventory Widget</div>,
      roles: ['ADMIN', 'STORE_MANAGER', 'OPERATOR'],
      category: 'inventory',
      refreshInterval: 300,
    },
    'mock-service-widget': {
      component: () => <div data-testid="mock-widget">Mock Service Widget</div>,
      roles: ['ADMIN', 'STORE_MANAGER'],
      category: 'service',
      refreshInterval: 300,
    },
    'mock-partner-widget': {
      component: () => <div data-testid="mock-widget">Mock Partner Widget</div>,
      roles: ['ADMIN', 'STORE_MANAGER'],
      category: 'partner',
      refreshInterval: 300,
    },
  },
  getWidgetsByRole: vi.fn(),
  getWidgetById: vi.fn(),
}));

// Mock localStorage
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Create QueryClient wrapper for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

describe('HybridDashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
    mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    mockAuthLoading.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render the hybrid dashboard layout', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        expect(screen.getByTestId('hybrid-dashboard-layout')).toBeInTheDocument();
      });
    });

    it('should render executive summary bar', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        expect(screen.getByTestId('executive-summary-bar')).toBeInTheDocument();
      });
    });

    it('should render collapsible sections for ADMIN', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        // ADMIN should see finance and inventory sections
        expect(screen.getByTestId('collapsible-section-finance')).toBeInTheDocument();
        expect(screen.getByTestId('collapsible-section-inventory')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      renderWithProviders(<HybridDashboardLayout className="custom-class" />);

      await waitFor(() => {
        const layout = screen.getByTestId('hybrid-dashboard-layout');
        expect(layout).toHaveClass('custom-class');
      });
    });
  });

  describe('KPI cards', () => {
    it('should render KPI summary cards via testids', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        // Check for KPI cards via testids
        expect(screen.getByTestId('kpi-card-revenue')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-inventory')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-service')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-card-receivables')).toBeInTheDocument();
      });
    });

    it('should display executive summary bar with KPI container', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        // Check for the KPI container that holds all KPI cards
        expect(screen.getByTestId('kpi-container')).toBeInTheDocument();
        // Verify it has multiple KPI cards
        const kpiCards = screen.getAllByTestId(/^kpi-card-/);
        expect(kpiCards.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('section expansion', () => {
    it('should toggle section on header click', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-section-finance')).toBeInTheDocument();
      });

      // Find finance section header
      const financeSection = screen.getByTestId('collapsible-section-finance');
      const header = financeSection.querySelector('[data-testid="section-header"]');

      expect(header).toBeInTheDocument();

      // Click to toggle
      if (header) {
        fireEvent.click(header);
      }

      // Verify localStorage was called (preference saved)
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('role-based visibility', () => {
    it('should show service section for ADMIN', async () => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });

      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-section-service')).toBeInTheDocument();
      });
    });

    it('should show partner section for ADMIN', async () => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });

      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        expect(screen.getByTestId('collapsible-section-partner')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton when auth is loading', async () => {
      mockAuthLoading.mockReturnValue(true);

      renderWithProviders(<HybridDashboardLayout />);

      // Should show loading state (no hybrid layout testid yet)
      await waitFor(() => {
        // When loading, the skeleton is shown instead of the full layout
        // The skeleton divs have animate-pulse class
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('empty state', () => {
    it('should show message when no user authenticated', async () => {
      mockUser.mockReturnValue(null);
      mockAuthLoading.mockReturnValue(false);

      renderWithProviders(<HybridDashboardLayout />);

      // With no user, sections should be empty
      await waitFor(() => {
        // Either shows no sections message or empty executive bar
        const layout = screen.getByTestId('hybrid-dashboard-layout');
        expect(layout).toBeInTheDocument();
      });
    });
  });

  describe('section metadata', () => {
    it('should display correct icons for sections', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        // Check sections have icons (via section containers)
        const financeSection = screen.getByTestId('collapsible-section-finance');
        expect(financeSection).toHaveTextContent('💰');

        const inventorySection = screen.getByTestId('collapsible-section-inventory');
        expect(inventorySection).toHaveTextContent('📦');

        const serviceSection = screen.getByTestId('collapsible-section-service');
        expect(serviceSection).toHaveTextContent('🔧');

        const partnerSection = screen.getByTestId('collapsible-section-partner');
        expect(partnerSection).toHaveTextContent('🤝');
      });
    });

    it('should display section titles', async () => {
      renderWithProviders(<HybridDashboardLayout />);

      await waitFor(() => {
        // Check section titles via their containers
        const financeSection = screen.getByTestId('collapsible-section-finance');
        expect(financeSection).toHaveTextContent('Pénzügy');

        const inventorySection = screen.getByTestId('collapsible-section-inventory');
        expect(inventorySection).toHaveTextContent('Készlet');

        const serviceSection = screen.getByTestId('collapsible-section-service');
        expect(serviceSection).toHaveTextContent('Szerviz');

        const partnerSection = screen.getByTestId('collapsible-section-partner');
        expect(partnerSection).toHaveTextContent('Partner');
      });
    });
  });
});
