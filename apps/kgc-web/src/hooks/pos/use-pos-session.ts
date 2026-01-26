/**
 * POS Session React Query Hooks
 * Handles cash register session operations (open, close, suspend)
 */

import type {
  ApiResponse,
  ApproveVarianceDto,
  CashRegisterSession,
  CloseSessionDto,
  OpenSessionDto,
  SuspendSessionDto,
  ZReport,
} from '@/types/pos.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/v1/pos';

// ============================================
// API Functions
// ============================================

async function fetchCurrentSession(locationId: string): Promise<CashRegisterSession | null> {
  const response = await fetch(`${API_BASE}/sessions/current?locationId=${locationId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch current session');
  }

  const result: ApiResponse<CashRegisterSession> = await response.json();
  return result.data;
}

async function openSession(dto: OpenSessionDto): Promise<CashRegisterSession> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to open session');
  }

  const result: ApiResponse<CashRegisterSession> = await response.json();
  return result.data;
}

async function suspendSession(
  sessionId: string,
  dto?: SuspendSessionDto
): Promise<CashRegisterSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto ?? {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to suspend session');
  }

  const result: ApiResponse<CashRegisterSession> = await response.json();
  return result.data;
}

async function resumeSession(sessionId: string): Promise<CashRegisterSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to resume session');
  }

  const result: ApiResponse<CashRegisterSession> = await response.json();
  return result.data;
}

async function closeSession(sessionId: string, dto: CloseSessionDto): Promise<ZReport> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to close session');
  }

  const result: ApiResponse<ZReport> = await response.json();
  return result.data;
}

async function approveVariance(sessionId: string, dto: ApproveVarianceDto): Promise<ZReport> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/approve-variance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to approve variance');
  }

  const result: ApiResponse<ZReport> = await response.json();
  return result.data;
}

async function fetchSessionSummary(sessionId: string): Promise<ZReport> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/summary`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch session summary');
  }

  const result: ApiResponse<ZReport> = await response.json();
  return result.data;
}

// ============================================
// Query Keys
// ============================================

export const posSessionKeys = {
  all: ['pos-sessions'] as const,
  current: (locationId: string) => [...posSessionKeys.all, 'current', locationId] as const,
  summary: (sessionId: string) => [...posSessionKeys.all, 'summary', sessionId] as const,
};

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch the current active session for a location
 */
export function useCurrentSession(locationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posSessionKeys.current(locationId),
    queryFn: () => fetchCurrentSession(locationId),
    enabled: options?.enabled ?? !!locationId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to open a new cash register session
 */
export function useOpenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: openSession,
    onSuccess: session => {
      // Update the current session cache
      queryClient.setQueryData(posSessionKeys.current(session.locationId), session);
      // Invalidate all session queries to refresh
      queryClient.invalidateQueries({ queryKey: posSessionKeys.all });
    },
  });
}

/**
 * Hook to suspend the current session
 */
export function useSuspendSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto?: SuspendSessionDto }) =>
      suspendSession(sessionId, dto),
    onSuccess: session => {
      queryClient.setQueryData(posSessionKeys.current(session.locationId), session);
      queryClient.invalidateQueries({ queryKey: posSessionKeys.all });
    },
  });
}

/**
 * Hook to resume a suspended session
 */
export function useResumeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeSession,
    onSuccess: session => {
      queryClient.setQueryData(posSessionKeys.current(session.locationId), session);
      queryClient.invalidateQueries({ queryKey: posSessionKeys.all });
    },
  });
}

/**
 * Hook to close the session and generate Z-report
 */
export function useCloseSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { sessionId: string; locationId: string; dto: CloseSessionDto }) =>
      closeSession(params.sessionId, params.dto),
    onSuccess: (_, variables) => {
      // Clear the current session cache (session is now closed)
      // Use locationId (not sessionId) as that's how the cache key is structured
      queryClient.removeQueries({ queryKey: posSessionKeys.current(variables.locationId) });
      queryClient.invalidateQueries({ queryKey: posSessionKeys.all });
    },
  });
}

/**
 * Hook to approve variance during session close
 */
export function useApproveVariance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto: ApproveVarianceDto }) =>
      approveVariance(sessionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posSessionKeys.all });
    },
  });
}

/**
 * Hook to fetch session summary (for Z-report display)
 */
export function useSessionSummary(sessionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posSessionKeys.summary(sessionId),
    queryFn: () => fetchSessionSummary(sessionId),
    enabled: options?.enabled ?? !!sessionId,
  });
}
