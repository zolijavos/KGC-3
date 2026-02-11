/**
 * useRentalReport Hook - Epic 48: Story 48-2
 * Bérlési Riport Oldal - TanStack Query hook for rental reports
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';

// ============================================
// TYPES
// ============================================

export interface RentalReportSummary {
  totalRentals: number;
  activeRentals: number;
  closedRentals: number;
  averageRentalDays: number;
  averageRevenuePerRental: number;
  overdueReturns: number;
}

export interface RentalByEquipmentType {
  type: string;
  count: number;
  revenue: number;
}

export interface RentalReportResponse {
  summary: RentalReportSummary;
  byEquipmentType: RentalByEquipmentType[];
  periodStart: string;
  periodEnd: string;
}

export interface RentalReportFilters {
  from?: string;
  to?: string;
  equipmentType?: string;
}

// ============================================
// API FUNCTION
// ============================================

async function fetchRentalReport(filters: RentalReportFilters): Promise<RentalReportResponse> {
  const params = new URLSearchParams();

  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.equipmentType) params.append('equipmentType', filters.equipmentType);

  const queryString = params.toString();
  const endpoint = queryString ? `/reports/rentals?${queryString}` : '/reports/rentals';

  return api.get<RentalReportResponse>(endpoint);
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to fetch rental report data with TanStack Query
 * Supports date range and equipment type filtering
 */
export function useRentalReport(filters: RentalReportFilters = {}) {
  const queryKey = ['rental-report', filters.from, filters.to, filters.equipmentType];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchRentalReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isError,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
