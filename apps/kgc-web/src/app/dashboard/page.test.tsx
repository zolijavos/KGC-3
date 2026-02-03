import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

// Mock auth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock RoleBasedDashboard component
vi.mock('@/features/dashboard/components', () => ({
  RoleBasedDashboard: ({ userRole }: { userRole: string }) => (
    <div data-testid="role-based-dashboard" data-role={userRole}>
      Dashboard for {userRole}
    </div>
  ),
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RoleBasedDashboard with user role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'OPERATOR' },
      isAuthenticated: true,
    });

    render(<DashboardPage />);

    const dashboard = screen.getByTestId('role-based-dashboard');
    expect(dashboard).toBeInTheDocument();
    expect(dashboard).toHaveAttribute('data-role', 'OPERATOR');
  });

  it('renders dashboard for STORE_MANAGER role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'STORE_MANAGER' },
      isAuthenticated: true,
    });

    render(<DashboardPage />);

    const dashboard = screen.getByTestId('role-based-dashboard');
    expect(dashboard).toHaveAttribute('data-role', 'STORE_MANAGER');
  });

  it('renders dashboard for ADMIN role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'ADMIN' },
      isAuthenticated: true,
    });

    render(<DashboardPage />);

    const dashboard = screen.getByTestId('role-based-dashboard');
    expect(dashboard).toHaveAttribute('data-role', 'ADMIN');
  });

  it('shows loading state when user is not loaded', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    render(<DashboardPage />);

    expect(screen.getByText(/betöltés/i)).toBeInTheDocument();
  });

  it('redirects or shows error when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(<DashboardPage />);

    // Should show some indication of unauthenticated state
    // (In real app this would redirect, but for test we check the render)
    expect(screen.queryByTestId('role-based-dashboard')).not.toBeInTheDocument();
  });

  it('has dashboard page title', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'OPERATOR' },
      isAuthenticated: true,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });
});
