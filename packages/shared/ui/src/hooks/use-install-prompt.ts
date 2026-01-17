import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * The BeforeInstallPromptEvent interface for PWA installation.
 * This event is fired before the browser shows the install prompt.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UseInstallPromptReturn {
  /** Whether the app can be installed (prompt is available) */
  canInstall: boolean;
  /** Whether the app is already installed (standalone mode) */
  isInstalled: boolean;
  /** Whether the install prompt is currently showing */
  isPromptShowing: boolean;
  /** Show the install prompt */
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
  /** Platforms available for installation */
  platforms: string[];
}

/**
 * Hook for handling PWA installation prompts.
 * Captures the beforeinstallprompt event and provides a way to trigger the install dialog.
 *
 * @example
 * ```tsx
 * function InstallBanner() {
 *   const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
 *
 *   if (isInstalled) {
 *     return null; // Already installed
 *   }
 *
 *   if (!canInstall) {
 *     return null; // Cannot install (not supported or already dismissed)
 *   }
 *
 *   return (
 *     <div className="install-banner">
 *       <p>Install this app for a better experience!</p>
 *       <button onClick={promptInstall}>Install</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const [canInstall, setCanInstall] = useState(false);
  const [isPromptShowing, setIsPromptShowing] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if app is already installed (standalone mode)
  const isInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - navigator.standalone is iOS-specific
    window.navigator.standalone === true
  );

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      return null;
    }

    setIsPromptShowing(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt - it can only be used once
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsPromptShowing(false);

      return outcome;
    } catch {
      setIsPromptShowing(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();

      // Store the event for later use
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;

      // Update state
      setCanInstall(true);
      setPlatforms(promptEvent.platforms);
    };

    const handleAppInstalled = () => {
      // Clear the deferred prompt
      deferredPromptRef.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    canInstall,
    isInstalled,
    isPromptShowing,
    promptInstall,
    platforms,
  };
}
