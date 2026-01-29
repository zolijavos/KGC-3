/**
 * Rentals API Client
 * Epic 14: Bérlés kezelés
 */

import { api } from './client';

// ============================================
// TYPES
// ============================================

export enum RentalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface RentalEquipment {
  id: string;
  name: string;
  serialNumber: string;
  condition: string;
}

export interface RentalPartner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'INDIVIDUAL' | 'COMPANY';
}

export interface RentalItem {
  id: string;
  equipmentId: string;
  quantity: number;
  dailyRate: number;
  totalDays: number;
  itemTotal: number;
}

export interface Rental {
  id: string;
  rentalCode: string;
  status: RentalStatus;
  customerId: string;
  customerName: string;
  equipmentId: string;
  equipmentName: string;
  startDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
  depositPaid: number;
  depositReturned: number;
  lateFeeAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalListResponse {
  data: Rental[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface RentalResponse {
  data: Rental;
}

export interface RentalStatistics {
  totalActive: number;
  totalOverdue: number;
  totalRevenue: number;
  averageRentalDuration: number;
}

export interface RentalFilters {
  status?: RentalStatus;
  customerId?: string;
  equipmentId?: string;
  overdueOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of rentals with filters
 * Uses /rentals-direct endpoint which directly queries Prisma
 */
export async function getRentals(filters: RentalFilters = {}): Promise<RentalListResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.customerId) params.append('customerId', filters.customerId);
  if (filters.equipmentId) params.append('equipmentId', filters.equipmentId);
  if (filters.overdueOnly) params.append('overdueOnly', 'true');
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/rentals-direct?${queryString}` : '/rentals-direct';

  return api.get<RentalListResponse>(endpoint);
}

/**
 * Get single rental by ID
 * Uses /rentals-direct endpoint which directly queries Prisma
 */
export async function getRentalById(id: string): Promise<RentalResponse> {
  return api.get<RentalResponse>(`/rentals-direct/${id}`);
}

/**
 * Get rental statistics
 */
export async function getRentalStatistics(): Promise<{ data: RentalStatistics }> {
  return api.get<{ data: RentalStatistics }>('/rentals/statistics');
}

/**
 * Create new rental
 */
export async function createRental(data: {
  partnerId: string;
  productId: string;
  startDate: string;
  plannedEndDate: string;
  depositAmount?: number;
  notes?: string;
}): Promise<RentalResponse> {
  return api.post<RentalResponse>('/rentals', data);
}

/**
 * Confirm equipment pickup
 */
export async function confirmPickup(
  id: string,
  data: {
    accessoryChecklistVerified: boolean;
    depositCollected: boolean;
    depositMethod?: 'CASH' | 'CARD' | 'PRE_AUTH';
    notes?: string;
  }
): Promise<RentalResponse> {
  return api.patch<RentalResponse>(`/rentals/${id}/pickup`, data);
}

/**
 * Process equipment return
 */
export async function processReturn(
  id: string,
  data: {
    returnDate: string;
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
    damageNotes?: string;
    depositAction?: 'RETURN' | 'RETAIN_PARTIAL' | 'RETAIN_FULL';
    retainedAmount?: number;
    retentionReason?: string;
  }
): Promise<RentalResponse> {
  return api.patch<RentalResponse>(`/rentals/${id}/return`, data);
}

/**
 * Extend rental period
 */
export async function extendRental(
  id: string,
  data: {
    newReturnDate: string;
    reason?: string;
  }
): Promise<RentalResponse> {
  return api.patch<RentalResponse>(`/rentals/${id}/extend`, data);
}

/**
 * Cancel rental
 */
export async function cancelRental(id: string, reason: string): Promise<RentalResponse> {
  return api.post<RentalResponse>(`/rentals/${id}/cancel`, { reason });
}
