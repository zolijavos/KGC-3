import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPrompt } from '../../../src/components/pwa/notification-prompt';

// Mock the usePushNotifications hook
vi.mock('../../../src/hooks/use-push-notifications', () => ({
  usePushNotifications: vi.fn(),
}));

import { usePushNotifications } from '../../../src/hooks/use-push-notifications';

describe('NotificationPrompt component', () => {
  const mockUsePushNotifications = {
    state: {
      isSupported: true,
      permission: 'default',
      isRequesting: false,
      preferences: {
        enabled: true,
        categories: {
          rental: true,
          service: true,
          inventory: true,
          payment: true,
          system: true,
          chat: true,
          general: true,
        },
        sound: true,
        vibrate: true,
        badge: true,
      },
      queuedCount: 0,
    },
    requestPermission: vi.fn(),
    showNotification: vi.fn(),
    updatePreferences: vi.fn(),
    toggleCategory: vi.fn(),
    clearQueue: vi.fn(),
    processQueue: vi.fn(),
    isSupported: true,
    permission: 'default' as const,
    isPermissionGranted: false,
  };

  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage.store[key] = value;
    }),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.store = {};
    vi.mocked(usePushNotifications).mockReturnValue(mockUsePushNotifications);
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('rendering', () => {
    it('should render the prompt when conditions are met', () => {
      render(<NotificationPrompt />);
      expect(screen.getByTestId('notification-prompt')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<NotificationPrompt />);
      expect(screen.getByText('Értesítések engedélyezése')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<NotificationPrompt />);
      expect(
        screen.getByText(/Kapjon értesítéseket a fontos eseményekről/)
      ).toBeInTheDocument();
    });

    it('should render enable button', () => {
      render(<NotificationPrompt />);
      expect(screen.getByTestId('enable-btn')).toBeInTheDocument();
    });

    it('should render dismiss button by default', () => {
      render(<NotificationPrompt />);
      expect(screen.getByTestId('dismiss-btn')).toBeInTheDocument();
    });

    it('should hide dismiss button when showDismiss is false', () => {
      render(<NotificationPrompt showDismiss={false} />);
      expect(screen.queryByTestId('dismiss-btn')).not.toBeInTheDocument();
    });
  });

  describe('custom text', () => {
    it('should render custom title', () => {
      render(<NotificationPrompt title="Enable Notifications" />);
      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
    });

    it('should render custom description', () => {
      render(<NotificationPrompt description="Get notified about updates" />);
      expect(screen.getByText('Get notified about updates')).toBeInTheDocument();
    });

    it('should render custom enable button text', () => {
      render(<NotificationPrompt enableButtonText="Turn On" />);
      expect(screen.getByText('Turn On')).toBeInTheDocument();
    });

    it('should render custom dismiss button text', () => {
      render(<NotificationPrompt dismissButtonText="Not Now" />);
      expect(screen.getByText('Not Now')).toBeInTheDocument();
    });
  });

  describe('not rendering', () => {
    it('should not render when not supported', () => {
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        isSupported: false,
      });

      const { container } = render(<NotificationPrompt />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when permission is granted', () => {
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        permission: 'granted',
        isPermissionGranted: true,
      });

      const { container } = render(<NotificationPrompt />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when permission is denied', () => {
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        permission: 'denied',
      });

      const { container } = render(<NotificationPrompt />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when dismissed', () => {
      mockLocalStorage.store['kgc-notification-prompt-dismissed'] = 'true';

      const { container } = render(<NotificationPrompt />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('enable button', () => {
    it('should call requestPermission when clicked', async () => {
      const user = userEvent.setup();
      const mockRequest = vi.fn().mockResolvedValue('granted');
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        requestPermission: mockRequest,
      });

      render(<NotificationPrompt />);

      await user.click(screen.getByTestId('enable-btn'));

      expect(mockRequest).toHaveBeenCalled();
    });

    it('should call onPermissionGranted when granted', async () => {
      const user = userEvent.setup();
      const onPermissionGranted = vi.fn();
      const mockRequest = vi.fn().mockResolvedValue('granted');
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        requestPermission: mockRequest,
      });

      render(<NotificationPrompt onPermissionGranted={onPermissionGranted} />);

      await user.click(screen.getByTestId('enable-btn'));

      expect(onPermissionGranted).toHaveBeenCalled();
    });

    it('should call onPermissionDenied when denied', async () => {
      const user = userEvent.setup();
      const onPermissionDenied = vi.fn();
      const mockRequest = vi.fn().mockResolvedValue('denied');
      vi.mocked(usePushNotifications).mockReturnValue({
        ...mockUsePushNotifications,
        requestPermission: mockRequest,
      });

      render(<NotificationPrompt onPermissionDenied={onPermissionDenied} />);

      await user.click(screen.getByTestId('enable-btn'));

      expect(onPermissionDenied).toHaveBeenCalled();
    });
  });

  describe('dismiss button', () => {
    it('should hide prompt when dismissed', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<NotificationPrompt />);

      expect(screen.getByTestId('notification-prompt')).toBeInTheDocument();

      await user.click(screen.getByTestId('dismiss-btn'));

      rerender(<NotificationPrompt />);

      expect(screen.queryByTestId('notification-prompt')).not.toBeInTheDocument();
    });

    it('should call onDismiss callback', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(<NotificationPrompt onDismiss={onDismiss} />);

      await user.click(screen.getByTestId('dismiss-btn'));

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should persist dismissed state to localStorage', async () => {
      const user = userEvent.setup();

      render(<NotificationPrompt />);

      await user.click(screen.getByTestId('dismiss-btn'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'kgc-notification-prompt-dismissed',
        'true'
      );
    });

    it('should not persist when persistDismiss is false', async () => {
      const user = userEvent.setup();

      render(<NotificationPrompt persistDismiss={false} />);

      await user.click(screen.getByTestId('dismiss-btn'));

      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        'kgc-notification-prompt-dismissed',
        'true'
      );
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<NotificationPrompt className="my-custom-class" />);
      expect(screen.getByTestId('notification-prompt')).toHaveClass(
        'my-custom-class'
      );
    });
  });
});
