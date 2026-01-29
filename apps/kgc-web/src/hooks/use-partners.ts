/**
 * Partner Hooks - React hooks for partner data management
 */

import {
  createPartner,
  deletePartner,
  getPartnerById,
  getPartners,
  getPartnerStats,
  updatePartner,
  type Partner,
  type PartnerFilters,
  type PartnerListResponse,
  type PartnerStats,
} from '@/api/partners';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UsePartnersResult {
  partners: Partner[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePartnerResult {
  partner: Partner | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePartnerStatsResult {
  stats: PartnerStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePartnerMutationsResult {
  createPartner: typeof createPartner;
  updatePartner: typeof updatePartner;
  deletePartner: typeof deletePartner;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage partner list
 */
export function usePartners(filters: PartnerFilters = {}): UsePartnersResult {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: PartnerListResponse = await getPartners(filters);
      setPartners(response.data);
      setMeta(response.meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch partners';
      setError(message);
      console.error('Error fetching partners:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.type, filters.status, filters.search, filters.page, filters.pageSize]);

  useEffect(() => {
    void fetchPartners();
  }, [fetchPartners]);

  return {
    partners,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    hasMore: meta.hasMore,
    isLoading,
    error,
    refetch: fetchPartners,
  };
}

/**
 * Hook to fetch single partner
 */
export function usePartner(id: string | undefined): UsePartnerResult {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartner = useCallback(async () => {
    if (!id) {
      setPartner(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getPartnerById(id);
      setPartner(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch partner';
      setError(message);
      console.error('Error fetching partner:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchPartner();
  }, [fetchPartner]);

  return {
    partner,
    isLoading,
    error,
    refetch: fetchPartner,
  };
}

/**
 * Hook to fetch partner statistics
 */
export function usePartnerStats(): UsePartnerStatsResult {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPartnerStats();
      setStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch partner stats';
      setError(message);
      console.error('Error fetching partner stats:', err);
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
 * Hook for partner mutations (create, update, delete)
 */
export function usePartnerMutations(): UsePartnerMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrappedCreate: typeof createPartner = async data => {
    setIsLoading(true);
    setError(null);
    try {
      return await createPartner(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create partner';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const wrappedUpdate: typeof updatePartner = async (id, data) => {
    setIsLoading(true);
    setError(null);
    try {
      return await updatePartner(id, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update partner';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const wrappedDelete: typeof deletePartner = async id => {
    setIsLoading(true);
    setError(null);
    try {
      return await deletePartner(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete partner';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPartner: wrappedCreate,
    updatePartner: wrappedUpdate,
    deletePartner: wrappedDelete,
    isLoading,
    error,
  };
}
