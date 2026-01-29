/**
 * Worksheets API Client
 * Epic 17: Munkalap CRUD
 */

import { api } from './client';

// ============================================
// TYPES (matching backend)
// ============================================

export enum WorksheetStatus {
  FELVEVE = 'FELVEVE',
  FOLYAMATBAN = 'FOLYAMATBAN',
  VARHATO = 'VARHATO',
  KESZ = 'KESZ',
  SZAMLAZANDO = 'SZAMLAZANDO',
  LEZART = 'LEZART',
  TOROLVE = 'TOROLVE',
}

export enum WorksheetType {
  FIZETOS = 'FIZETOS',
  GARANCIALIS = 'GARANCIALIS',
  BERLESI = 'BERLESI',
  KARBANTARTAS = 'KARBANTARTAS',
}

export enum WorksheetPriority {
  NORMAL = 'NORMAL',
  SURGOS = 'SURGOS',
  FELARAS = 'FELARAS',
  GARANCIALIS = 'GARANCIALIS',
  FRANCHISE = 'FRANCHISE',
}

export interface Worksheet {
  id: string;
  tenantId: string;
  worksheetNumber: string;
  type: WorksheetType;
  status: WorksheetStatus;
  priority: WorksheetPriority;
  partnerId: string;
  deviceName: string;
  deviceSerialNumber?: string;
  faultDescription: string;
  diagnosis?: string;
  workPerformed?: string;
  internalNote?: string;
  assignedToId?: string;
  costLimit?: number;
  estimatedCompletionDate?: string;
  receivedAt: string;
  completedAt?: string;
  rentalId?: string;
  queuePosition?: number;
  storageStartDate?: string;
  storageDailyFee?: number;
  storageTotalFee?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorksheetListResponse {
  data: Worksheet[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface WorksheetResponse {
  data: Worksheet;
}

export interface WorksheetStats {
  total: number;
  felveve: number;
  folyamatban: number;
  varhato: number;
  kesz: number;
  szamlazando: number;
  lezart: number;
}

export interface WorksheetFilters {
  status?: WorksheetStatus;
  type?: WorksheetType;
  partnerId?: string;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get list of worksheets with filters
 */
export async function getWorksheets(
  filters: WorksheetFilters = {}
): Promise<WorksheetListResponse> {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', filters.status);
  if (filters.type) params.append('type', filters.type);
  if (filters.partnerId) params.append('partnerId', filters.partnerId);
  if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);
  if (filters.page !== undefined) params.append('page', filters.page.toString());
  if (filters.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const endpoint = queryString ? `/worksheets?${queryString}` : '/worksheets';

  return api.get<WorksheetListResponse>(endpoint);
}

/**
 * Get single worksheet by ID
 */
export async function getWorksheetById(id: string): Promise<WorksheetResponse> {
  return api.get<WorksheetResponse>(`/worksheets/${id}`);
}

/**
 * Get worksheet statistics
 */
export async function getWorksheetStats(): Promise<{ data: WorksheetStats }> {
  return api.get<{ data: WorksheetStats }>('/worksheets/stats');
}

/**
 * Create worksheet
 */
export async function createWorksheet(data: {
  partnerId: string;
  deviceName: string;
  deviceSerialNumber?: string;
  faultDescription: string;
  type?: WorksheetType;
  priority?: WorksheetPriority;
  costLimit?: number;
  estimatedCompletionDate?: string;
  internalNote?: string;
}): Promise<WorksheetResponse> {
  return api.post<WorksheetResponse>('/worksheets', data);
}

/**
 * Update worksheet
 */
export async function updateWorksheet(
  id: string,
  data: {
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
): Promise<WorksheetResponse> {
  return api.patch<WorksheetResponse>(`/worksheets/${id}`, data);
}

/**
 * Change worksheet status
 */
export async function changeWorksheetStatus(
  id: string,
  status: WorksheetStatus,
  reason?: string
): Promise<WorksheetResponse> {
  return api.patch<WorksheetResponse>(`/worksheets/${id}/status`, { status, reason });
}

// ============================================
// STATUS LABELS
// ============================================

export const STATUS_LABELS: Record<WorksheetStatus, string> = {
  [WorksheetStatus.FELVEVE]: 'Felvéve',
  [WorksheetStatus.FOLYAMATBAN]: 'Folyamatban',
  [WorksheetStatus.VARHATO]: 'Várakozó',
  [WorksheetStatus.KESZ]: 'Kész',
  [WorksheetStatus.SZAMLAZANDO]: 'Számlázandó',
  [WorksheetStatus.LEZART]: 'Lezárt',
  [WorksheetStatus.TOROLVE]: 'Törölve',
};

export const TYPE_LABELS: Record<WorksheetType, string> = {
  [WorksheetType.FIZETOS]: 'Fizetős javítás',
  [WorksheetType.GARANCIALIS]: 'Garanciális',
  [WorksheetType.BERLESI]: 'Bérlési szerviz',
  [WorksheetType.KARBANTARTAS]: 'Karbantartás',
};

export const PRIORITY_LABELS: Record<WorksheetPriority, string> = {
  [WorksheetPriority.SURGOS]: 'Sürgős (+20%)',
  [WorksheetPriority.FELARAS]: 'Feláras',
  [WorksheetPriority.GARANCIALIS]: 'Garanciális',
  [WorksheetPriority.FRANCHISE]: 'Franchise',
  [WorksheetPriority.NORMAL]: 'Normál',
};
