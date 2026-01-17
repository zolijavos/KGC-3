import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../../../src/components/pwa/offline-indicator';

// Mock useOnlineStatus hook
vi.mock('../../../src/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true, isOffline: false })),
}));

import { useOnlineStatus } from '../../../src/hooks/use-online-status';

describe('OfflineIndicator component', () => {
  beforeEach(() => {
    vi.mocked(useOnlineStatus).mockReturnValue({
      isOnline: true,
      isOffline: false,
      checkOnlineStatus: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when online', () => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: true,
        isOffline: false,
        checkOnlineStatus: vi.fn(() => true),
      });

      const { container } = render(<OfflineIndicator />);

      expect(container.firstChild).toBeNull();
    });

    it('should render when offline', () => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: false,
        isOffline: true,
        checkOnlineStatus: vi.fn(() => false),
      });

      render(<OfflineIndicator />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render when forceShow is true even when online', () => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: true,
        isOffline: false,
        checkOnlineStatus: vi.fn(() => true),
      });

      render(<OfflineIndicator forceShow />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    beforeEach(() => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: false,
        isOffline: true,
        checkOnlineStatus: vi.fn(() => false),
      });
    });

    it('should display default message', () => {
      render(<OfflineIndicator />);

      expect(screen.getByText('Nincs internetkapcsolat')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(<OfflineIndicator message="You are offline" />);

      expect(screen.getByText('You are offline')).toBeInTheDocument();
    });

    it('should display default icon', () => {
      render(<OfflineIndicator />);

      // WifiOff icon renders as SVG
      const alert = screen.getByRole('alert');
      expect(alert.querySelector('svg')).toBeInTheDocument();
    });

    it('should display custom icon', () => {
      render(<OfflineIndicator icon={<span data-testid="custom-icon">!</span>} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    beforeEach(() => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: false,
        isOffline: true,
        checkOnlineStatus: vi.fn(() => false),
      });
    });

    it('should position at top by default', () => {
      render(<OfflineIndicator data-testid="indicator" />);

      expect(screen.getByTestId('indicator')).toHaveClass('top-0');
    });

    it('should position at bottom when specified', () => {
      render(<OfflineIndicator data-testid="indicator" position="bottom" />);

      expect(screen.getByTestId('indicator')).toHaveClass('bottom-0');
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: false,
        isOffline: true,
        checkOnlineStatus: vi.fn(() => false),
      });
    });

    it('should have role="alert"', () => {
      render(<OfflineIndicator />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<OfflineIndicator />);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      vi.mocked(useOnlineStatus).mockReturnValue({
        isOnline: false,
        isOffline: true,
        checkOnlineStatus: vi.fn(() => false),
      });
    });

    it('should apply custom className', () => {
      render(<OfflineIndicator data-testid="indicator" className="custom-class" />);

      expect(screen.getByTestId('indicator')).toHaveClass('custom-class');
    });

    it('should have fixed positioning', () => {
      render(<OfflineIndicator data-testid="indicator" />);

      expect(screen.getByTestId('indicator')).toHaveClass('fixed');
    });

    it('should have destructive background', () => {
      render(<OfflineIndicator data-testid="indicator" />);

      expect(screen.getByTestId('indicator')).toHaveClass('bg-destructive');
    });
  });
});
