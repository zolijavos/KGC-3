import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the viewport is mobile-sized.
 * Uses the 'md' Tailwind breakpoint (768px) as the threshold.
 *
 * @example
 * ```tsx
 * const isMobile = useMobile();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export { MOBILE_BREAKPOINT };
