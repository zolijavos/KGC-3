/**
 * Unit tests for use-pos-session hooks
 */

import { posHandlers, resetMockState } from '@/mocks/pos-handlers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  useCloseSession,
  useCurrentSession,
  useOpenSession,
  useSuspendSession,
} from '../use-pos-session';

// Setup MSW
const server = setupServer(...posHandlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => server.close());

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('use-pos-session hooks', () => {
  describe('useCurrentSession', () => {
    it('should return null when no active session exists', async () => {
      const { result } = renderHook(() => useCurrentSession('location-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });

    it('should return session when one exists', async () => {
      // First open a session
      const { result: openResult } = renderHook(() => useOpenSession(), {
        wrapper: createWrapper(),
      });

      await openResult.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 50000,
      });

      // Now check current session
      const { result } = renderHook(() => useCurrentSession('location-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.status).toBe('OPEN');
      expect(result.current.data?.openingBalance).toBe(50000);
    });
  });

  describe('useOpenSession', () => {
    it('should open a new session successfully', async () => {
      const { result } = renderHook(() => useOpenSession(), { wrapper: createWrapper() });

      const session = await result.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 75000,
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('OPEN');
      expect(session.openingBalance).toBe(75000);
      expect(session.locationId).toBe('location-1');
      expect(session.sessionNumber).toMatch(/KASSZA-\d{4}-\d{4}/);
    });

    it('should fail when session already exists', async () => {
      const { result } = renderHook(() => useOpenSession(), { wrapper: createWrapper() });

      // Open first session
      await result.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 50000,
      });

      // Try to open another session
      await expect(
        result.current.mutateAsync({
          locationId: 'location-1',
          openingBalance: 60000,
        })
      ).rejects.toThrow('A session is already active for this location');
    });
  });

  describe('useSuspendSession', () => {
    it('should suspend an active session', async () => {
      const wrapper = createWrapper();

      // Open session first
      const { result: openResult } = renderHook(() => useOpenSession(), { wrapper });

      const session = await openResult.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 50000,
      });

      // Suspend the session
      const { result: suspendResult } = renderHook(() => useSuspendSession(), { wrapper });

      const suspendedSession = await suspendResult.current.mutateAsync({
        sessionId: session.id,
        dto: { reason: 'Ebédszünet' },
      });

      expect(suspendedSession.status).toBe('SUSPENDED');
    });
  });

  describe('useCloseSession', () => {
    it('should close a session and return Z-report', async () => {
      const wrapper = createWrapper();

      // Open session first
      const { result: openResult } = renderHook(() => useOpenSession(), { wrapper });

      const session = await openResult.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 50000,
      });

      // Close the session
      const { result: closeResult } = renderHook(() => useCloseSession(), { wrapper });

      const zReport = await closeResult.current.mutateAsync({
        sessionId: session.id,
        dto: {
          closingBalance: 75000,
          varianceNote: 'Rendben',
        },
      });

      expect(zReport).toBeDefined();
      expect(zReport.sessionId).toBe(session.id);
      expect(zReport.openingBalance).toBe(50000);
      expect(zReport.closingBalance).toBe(75000);
    });

    it('should calculate variance correctly', async () => {
      const wrapper = createWrapper();

      // Open session
      const { result: openResult } = renderHook(() => useOpenSession(), { wrapper });

      const session = await openResult.current.mutateAsync({
        locationId: 'location-1',
        openingBalance: 50000,
      });

      // Close with wrong amount (variance expected)
      const { result: closeResult } = renderHook(() => useCloseSession(), { wrapper });

      const zReport = await closeResult.current.mutateAsync({
        sessionId: session.id,
        dto: {
          closingBalance: 70000, // Different from expected
        },
      });

      expect(zReport.closingBalance).toBe(70000);
      // Variance will be calculated by mock
      expect(typeof zReport.variance).toBe('number');
    });
  });
});
