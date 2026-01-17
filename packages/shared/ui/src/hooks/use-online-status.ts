import { useEffect, useState, useCallback } from 'react';

export interface UseOnlineStatusReturn {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether the browser is currently offline */
  isOffline: boolean;
  /** Manually check online status */
  checkOnlineStatus: () => boolean;
}

/**
 * Hook to track browser online/offline status.
 * Uses navigator.onLine and listens for online/offline events.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOnline, isOffline } = useOnlineStatus();
 *
 *   if (isOffline) {
 *     return <OfflineIndicator />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });

  const checkOnlineStatus = useCallback((): boolean => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync with current status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    checkOnlineStatus,
  };
}
