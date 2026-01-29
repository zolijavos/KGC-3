/**
 * Partners API Client
 * Epic 7: Partner Management
 */

import { api } from './client';

// ============================================
// TYPES
// ============================================

export type PartnerType = 'individual' | 'company';
export type PartnerStatus = 'active' | 'inactive' | 'blocked';
export type PartnerCategory =
  | 'retail'
  | 'wholesale'
  | 'rental'
  | 'service'
  | 'supplier'
  | 'contractor';

export interface PartnerAddress {
  id: string;
  type: 'billing' | 'shipping' | 'other';
  isDefault: boolean;
  country: string;
  postalCode: string;
  city: string;
  street: string;
  building?: string;
}

export interface PartnerContact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface Partner {
  id: string;
  code: string;
  type: PartnerType;
  status: PartnerStatus;
  name: string;
  shortName?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  phoneAlt?: string;
  taxNumber?: string;
  euVatNumber?: string;
  registrationNumber?: string;
  website?: string;
  country?: string;
  postalCode?: string;
  city?: string;
  address?: string;
  addressAlt?: string;
  creditLimit?: number;
  currentBalance: number;
  paymentTermDays: number;
  defaultDiscountPc: number;
  discountPercent?: number;
  loyaltyPoints: number;
  priceListId?: string;
  rentalDepositPercent?: number;
  rentalBlocked?: boolean;
  warningNote?: string;
  notes?: string;
  internalNotes?: string;
  categories: PartnerCategory[];
  addresses: PartnerAddress[];
  contacts: PartnerContact[];
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalRentals: number;
    totalServiceOrders: number;
    outstandingBalance: number;
    lastOrderDate?: string;
    lastRentalDate?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PartnerListResponse {
  data: Partner[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface PartnerResponse {
  data: Partner;
}

export interface PartnerStats {
  total: number;
  active: number;
  companies: number;
  withBalance: number;
  totalBalance: number;
}

export interface PartnerFilters {
  type?: 'INDIVIDUAL' | 'COMPANY';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of partners with filters
 */
export async function getPartners(filters: PartnerFilters = {}): Promise<PartnerListResponse> {
  const params = new URLSearchParams();

  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/partners-direct?${queryString}` : '/partners-direct';

  return api.get<PartnerListResponse>(endpoint);
}

/**
 * Get single partner by ID
 */
export async function getPartnerById(id: string): Promise<PartnerResponse> {
  return api.get<PartnerResponse>(`/partners-direct/${id}`);
}

/**
 * Get partner statistics
 */
export async function getPartnerStats(): Promise<{ data: PartnerStats }> {
  return api.get<{ data: PartnerStats }>('/partners-direct/stats');
}

/**
 * Create new partner
 */
export async function createPartner(data: {
  type: 'INDIVIDUAL' | 'COMPANY';
  name: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  country?: string;
  postalCode?: string;
  city?: string;
  address?: string;
  paymentTermDays?: number;
  creditLimit?: number;
  notes?: string;
}): Promise<PartnerResponse> {
  return api.post<PartnerResponse>('/partners-direct', data);
}

/**
 * Update partner
 */
export async function updatePartner(
  id: string,
  data: {
    type?: 'INDIVIDUAL' | 'COMPANY';
    status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
    name?: string;
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
    country?: string;
    postalCode?: string;
    city?: string;
    address?: string;
    paymentTermDays?: number;
    creditLimit?: number;
    notes?: string;
  }
): Promise<PartnerResponse> {
  return api.patch<PartnerResponse>(`/partners-direct/${id}`, data);
}

/**
 * Delete partner (soft delete)
 */
export async function deletePartner(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/partners-direct/${id}`);
}
