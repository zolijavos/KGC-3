/**
 * Worksheet Hooks - React hooks for worksheet data management
 */

import {
  changeWorksheetStatus,
  createWorksheet,
  getWorksheetById,
  getWorksheets,
  getWorksheetStats,
  updateWorksheet,
  type Worksheet,
  type WorksheetFilters,
  type WorksheetPriority,
  type WorksheetStats,
  type WorksheetStatus,
  type WorksheetType,
} from '@/api/worksheets';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseWorksheetsResult {
  worksheets: Worksheet[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseWorksheetResult {
  worksheet: Worksheet | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseWorksheetStatsResult {
  stats: WorksheetStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseWorksheetMutationsResult {
  createWorksheet: (data: CreateWorksheetInput) => Promise<Worksheet>;
  updateWorksheet: (id: string, data: UpdateWorksheetInput) => Promise<Worksheet>;
  changeStatus: (id: string, status: WorksheetStatus, reason?: string) => Promise<Worksheet>;
  isLoading: boolean;
  error: string | null;
}

interface CreateWorksheetInput {
  partnerId: string;
  deviceName: string;
  deviceSerialNumber?: string;
  faultDescription: string;
  type?: WorksheetType;
  priority?: WorksheetPriority;
  costLimit?: number;
  estimatedCompletionDate?: string;
  internalNote?: string;
}

interface UpdateWorksheetInput {
  deviceName?: string;
  deviceSerialNumber?: string;
  faultDescription?: string;
  diagnosis?: string;
  workPerformed?: string;
  priority?: WorksheetPriority;
  costLimit?: number;
  estimatedCompletionDate?: string;
  internalNote?: string;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage worksheet list
 */
export function useWorksheets(filters: WorksheetFilters = {}): UseWorksheetsResult {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorksheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getWorksheets(filters);
      setWorksheets(response.data);
      setMeta(response.meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch worksheets';
      setError(message);
      console.error('Error fetching worksheets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.status,
    filters.type,
    filters.partnerId,
    filters.assignedToId,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
    filters.page,
    filters.pageSize,
  ]);

  useEffect(() => {
    void fetchWorksheets();
  }, [fetchWorksheets]);

  return {
    worksheets,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    hasMore: meta.hasMore,
    isLoading,
    error,
    refetch: fetchWorksheets,
  };
}

/**
 * Hook to fetch single worksheet
 */
export function useWorksheet(id: string | undefined): UseWorksheetResult {
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorksheet = useCallback(async () => {
    if (!id) {
      setWorksheet(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getWorksheetById(id);
      setWorksheet(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch worksheet';
      setError(message);
      console.error('Error fetching worksheet:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchWorksheet();
  }, [fetchWorksheet]);

  return {
    worksheet,
    isLoading,
    error,
    refetch: fetchWorksheet,
  };
}

/**
 * Hook to fetch worksheet statistics
 */
export function useWorksheetStats(): UseWorksheetStatsResult {
  const [stats, setStats] = useState<WorksheetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getWorksheetStats();
      setStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch worksheet stats';
      setError(message);
      console.error('Error fetching worksheet stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook for worksheet mutations (create, update, status change)
 */
export function useWorksheetMutations(): UseWorksheetMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async (data: CreateWorksheetInput): Promise<Worksheet> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createWorksheet(data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create worksheet';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdate = useCallback(
    async (id: string, data: UpdateWorksheetInput): Promise<Worksheet> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await updateWorksheet(id, data);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update worksheet';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleChangeStatus = useCallback(
    async (id: string, status: WorksheetStatus, reason?: string): Promise<Worksheet> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await changeWorksheetStatus(id, status, reason);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to change worksheet status';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    createWorksheet: handleCreate,
    updateWorksheet: handleUpdate,
    changeStatus: handleChangeStatus,
    isLoading,
    error,
  };
}
