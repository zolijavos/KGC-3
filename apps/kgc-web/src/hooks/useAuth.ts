'use client';

import { useState, useEffect } from 'react';
import type { UserRole } from '@/features/dashboard/lib/widget-registry';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Mock Auth Hook for Story 35-1
 * TODO: Replace with real auth implementation in Auth Epic
 *
 * This mock simulates an authenticated OPERATOR user for testing purposes
 */
export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate async auth check
    const timer = setTimeout(() => {
      // Mock user - change role here to test different layouts
      setUser({
        id: 'mock-user-1',
        name: 'Teszt Felhasználó',
        role: 'OPERATOR', // Change to 'STORE_MANAGER' or 'ADMIN' for testing
      });
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
}
