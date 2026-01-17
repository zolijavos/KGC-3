import { useEffect, useState, useCallback, useRef } from 'react';

export interface ServiceWorkerState {
  /** Whether a service worker is supported in this browser */
  isSupported: boolean;
  /** Whether a service worker is currently registered */
  isRegistered: boolean;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether the service worker is currently installing */
  isInstalling: boolean;
  /** Whether the service worker is waiting to activate */
  isWaiting: boolean;
  /** The current registration object */
  registration: ServiceWorkerRegistration | null;
  /** Any error that occurred during registration */
  error: Error | null;
}

export interface UseServiceWorkerOptions {
  /** Path to the service worker file (default: '/sw.js') */
  path?: string;
  /** Scope of the service worker (default: '/') */
  scope?: string;
  /** Whether to register immediately (default: true) */
  immediate?: boolean;
  /** Callback when update is available */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when service worker is successfully registered */
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  /** Callback on registration error */
  onError?: (error: Error) => void;
}

export interface UseServiceWorkerReturn extends ServiceWorkerState {
  /** Register the service worker */
  register: () => Promise<ServiceWorkerRegistration | undefined>;
  /** Unregister the service worker */
  unregister: () => Promise<boolean>;
  /** Check for updates manually */
  checkForUpdates: () => Promise<void>;
  /** Skip waiting and activate the new service worker */
  skipWaiting: () => void;
}

/**
 * Hook for managing service worker registration and updates.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isRegistered, updateAvailable, skipWaiting } = useServiceWorker({
 *     path: '/sw.js',
 *     onUpdateAvailable: () => console.log('New version available!'),
 *   });
 *
 *   if (updateAvailable) {
 *     return (
 *       <div>
 *         <p>New version available!</p>
 *         <button onClick={skipWaiting}>Update now</button>
 *       </div>
 *     );
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useServiceWorker(options: UseServiceWorkerOptions = {}): UseServiceWorkerReturn {
  const {
    path = '/sw.js',
    scope = '/',
    immediate = true,
    onUpdateAvailable,
    onRegistered,
    onError,
  } = options;

  const [state, setState] = useState<ServiceWorkerState>(() => ({
    isSupported:
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker !== undefined,
    isRegistered: false,
    updateAvailable: false,
    isInstalling: false,
    isWaiting: false,
    registration: null,
    error: null,
  }));

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  const register = useCallback(async (): Promise<ServiceWorkerRegistration | undefined> => {
    if (!state.isSupported) {
      return undefined;
    }

    try {
      const registration = await navigator.serviceWorker.register(path, { scope });

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null,
      }));

      onRegistered?.(registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        setState((prev) => ({ ...prev, isInstalling: true }));

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available
            setState((prev) => ({
              ...prev,
              updateAvailable: true,
              isInstalling: false,
              isWaiting: true,
            }));
            waitingWorkerRef.current = newWorker;
            onUpdateAvailable?.(registration);
          } else if (newWorker.state === 'activated') {
            setState((prev) => ({
              ...prev,
              isInstalling: false,
              isWaiting: false,
            }));
          }
        });
      });

      // Check if there's already a waiting worker
      if (registration.waiting) {
        setState((prev) => ({
          ...prev,
          updateAvailable: true,
          isWaiting: true,
        }));
        waitingWorkerRef.current = registration.waiting;
        onUpdateAvailable?.(registration);
      }

      return registration;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service worker registration failed');
      setState((prev) => ({ ...prev, error: err }));
      onError?.(err);
      return undefined;
    }
  }, [state.isSupported, path, scope, onUpdateAvailable, onRegistered, onError]);

  const unregister = useCallback(async (): Promise<boolean> => {
    if (!state.registration) {
      return false;
    }

    try {
      const result = await state.registration.unregister();
      if (result) {
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
          updateAvailable: false,
          isWaiting: false,
        }));
      }
      return result;
    } catch {
      return false;
    }
  }, [state.registration]);

  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!state.registration) {
      return;
    }

    try {
      await state.registration.update();
    } catch {
      // Silently fail - update check failed
    }
  }, [state.registration]);

  const skipWaiting = useCallback((): void => {
    const waitingWorker = waitingWorkerRef.current;
    if (!waitingWorker) {
      return;
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // Reload to activate the new service worker
    waitingWorker.addEventListener('statechange', () => {
      if (waitingWorker.state === 'activated') {
        window.location.reload();
      }
    });
  }, []);

  // Register on mount if immediate is true
  useEffect(() => {
    if (immediate && state.isSupported) {
      register();
    }
  }, [immediate, state.isSupported, register]);

  // Listen for controller change (when skipWaiting is called)
  useEffect(() => {
    // Double-check at runtime since navigator.serviceWorker can be modified
    if (!state.isSupported || typeof navigator === 'undefined' || !navigator.serviceWorker) {
      return;
    }

    const handleControllerChange = () => {
      // Optionally reload when controller changes
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [state.isSupported]);

  return {
    ...state,
    register,
    unregister,
    checkForUpdates,
    skipWaiting,
  };
}
