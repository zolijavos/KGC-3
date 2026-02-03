import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Notification Toast Hook (Epic 35: Story 35-4)
 *
 * Hook for triggering notification toasts with action navigation
 */

export interface NotificationToastOptions {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  soundEnabled?: boolean;
}

/**
 * Hook to trigger notification toasts
 *
 * Features:
 * - Toast rendering with type-based styling
 * - Action URL navigation
 * - Optional sound alert (feature flag: NOTIFICATION_SOUND_ENABLED)
 */
export function useNotificationToast() {
  const navigate = useNavigate();

  const showToast = useCallback(
    (options: NotificationToastOptions) => {
      const {
        type,
        title,
        message,
        actionText = 'Részletek',
        actionUrl,
        soundEnabled = false,
      } = options;

      // Get feature flag from environment
      const soundFeatureEnabled =
        import.meta.env.VITE_NOTIFICATION_SOUND_ENABLED === 'true';

      // Play sound if enabled via feature flag
      if (soundFeatureEnabled && soundEnabled) {
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch((error) => {
            console.warn('Failed to play notification sound:', error);
          });
        } catch (error) {
          console.warn('Audio not supported:', error);
        }
      }

      // Handle action button click
      const handleAction = () => {
        if (actionUrl) {
          navigate(actionUrl);
        }
      };

      // Return toast data for rendering
      return {
        type,
        title,
        message,
        actionText,
        onAction: handleAction,
        soundEnabled: soundFeatureEnabled && soundEnabled,
      };
    },
    [navigate]
  );

  /**
   * Show critical stock alert toast
   */
  const showStockAlert = useCallback(
    (productName: string, productId: string, actionUrl = '/dashboard/inventory') => {
      return showToast({
        type: 'critical',
        title: 'Készlethiány',
        message: `${productName} készlet kritikus szinten (< 50%)`,
        actionUrl,
        soundEnabled: true,
      });
    },
    [showToast]
  );

  /**
   * Show payment failure toast
   */
  const showPaymentFailure = useCallback(
    (amount: number, actionUrl = '/dashboard/finance') => {
      const formattedAmount = new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
      }).format(amount);

      return showToast({
        type: 'warning',
        title: 'Fizetési hiba',
        message: `Tranzakció elutasítva (${formattedAmount})`,
        actionUrl,
        soundEnabled: true,
      });
    },
    [showToast]
  );

  /**
   * Show urgent worksheet toast
   */
  const showUrgentWorksheet = useCallback(
    (worksheetNumber: string, worksheetId: string) => {
      return showToast({
        type: 'info',
        title: 'Sürgős munkalap',
        message: `Új sürgős munkalap (${worksheetNumber}) létrehozva`,
        actionUrl: `/worksheets/${worksheetId}`,
        soundEnabled: false,
      });
    },
    [showToast]
  );

  return {
    showToast,
    showStockAlert,
    showPaymentFailure,
    showUrgentWorksheet,
  };
}
