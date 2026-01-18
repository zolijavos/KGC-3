/**
 * @kgc/twenty-crm - Twenty CRM Interfaces
 * Epic 28: Twenty CRM Integration
 */

export enum SyncDirection {
  KGC_TO_CRM = 'KGC_TO_CRM',
  CRM_TO_KGC = 'CRM_TO_KGC',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum EntityType {
  PARTNER = 'PARTNER',
  CONTACT = 'CONTACT',
  COMPANY = 'COMPANY',
  DEAL = 'DEAL',
  NOTE = 'NOTE',
  ACTIVITY = 'ACTIVITY',
}

export interface ICrmPartner {
  id: string;
  externalId?: string;
  type: 'PERSON' | 'COMPANY';
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: ICrmAddress;
  tags?: string[];
  customFields?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICrmAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface ICrmContact {
  id: string;
  partnerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICrmDeal {
  id: string;
  partnerId: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability?: number;
  expectedCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICrmNote {
  id: string;
  entityType: EntityType;
  entityId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface ICrmActivity {
  id: string;
  partnerId: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';
  subject: string;
  description?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface IPartnerMapping {
  id: string;
  tenantId: string;
  kgcPartnerId: string;
  crmPartnerId: string;
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISyncResult {
  direction: SyncDirection;
  entityType: EntityType;
  totalCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ISyncError[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface ISyncError {
  entityId: string;
  entityType: EntityType;
  error: string;
  details?: Record<string, unknown>;
}

export interface IDashboardConfig {
  id: string;
  tenantId: string;
  name: string;
  crmDashboardId: string;
  embedUrl: string;
  width?: string;
  height?: string;
  refreshInterval?: number;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmbedToken {
  token: string;
  expiresAt: Date;
  dashboardId: string;
  permissions: string[];
}
