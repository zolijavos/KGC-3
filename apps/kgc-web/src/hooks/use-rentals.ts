/**
 * useRentals Hook
 * Epic 14: Bérlés kezelés
 * Fetches rental data from API with loading and error states
 */

import {
  getRentalById,
  getRentals,
  getRentalStatistics,
  type Rental,
  type RentalFilters,
  type RentalStatistics,
} from '@/api/rentals';
import { useCallback, useEffect, useState } from 'react';

interface UseRentalsResult {
  rentals: Rental[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseRentalResult {
  rental: Rental | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseRentalStatsResult {
  stats: RentalStatistics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch list of rentals with filters
 */
export function useRentals(filters: RentalFilters = {}): UseRentalsResult {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getRentals(filters);
      setRentals(response.data);
      setTotal(response.meta.total);
      setPage(response.meta.page);
      setPageSize(response.meta.pageSize);
      setHasMore(response.meta.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rentals');
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.status,
    filters.customerId,
    filters.equipmentId,
    filters.overdueOnly,
    filters.search,
    filters.page,
    filters.pageSize,
  ]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  return {
    rentals,
    total,
    page,
    pageSize,
    hasMore,
    loading,
    error,
    refetch: fetchRentals,
  };
}

/**
 * Hook to fetch a single rental by ID
 */
export function useRental(id: string | undefined): UseRentalResult {
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRental = useCallback(async () => {
    if (!id) {
      setRental(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getRentalById(id);
      setRental(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rental');
      setRental(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRental();
  }, [fetchRental]);

  return {
    rental,
    loading,
    error,
    refetch: fetchRental,
  };
}

/**
 * Hook to fetch rental statistics
 */
export function useRentalStats(): UseRentalStatsResult {
  const [stats, setStats] = useState<RentalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getRentalStatistics();
        setStats(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}
