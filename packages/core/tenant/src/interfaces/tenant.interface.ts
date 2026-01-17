/**
 * Tenant related interfaces and types
 * @kgc/tenant - Multi-tenant infrastructure
 */

/**
 * Tenant státuszok
 */
export enum TenantStatus {
  PENDING = 'PENDING',       // Onboarding folyamatban
  ACTIVE = 'ACTIVE',         // Aktív tenant
  INACTIVE = 'INACTIVE',     // Soft deleted / inaktív
  SUSPENDED = 'SUSPENDED',   // Felfüggesztett (fizetési probléma)
}

/**
 * Tenant beállítások
 */
export interface TenantSettings {
  timezone: string;          // Default: 'Europe/Budapest'
  currency: string;          // Default: 'HUF'
  locale: string;            // Default: 'hu-HU'
  features: string[];        // Enabled feature flags
  plan?: string;             // Tenant plan type (basic, pro, enterprise)
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
}

/**
 * Tenant entity interface
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: TenantSettings;
  parentTenantId: string | null;
  schemaName: string | null;
  schemaCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Tenant lista válasz pagináció metaadatokkal
 */
export interface TenantListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Tenant lista válasz
 */
export interface TenantListResponse {
  data: Tenant[];
  meta: TenantListMeta;
}

/**
 * Tenant audit log entry
 */
export interface TenantAuditLogEntry {
  id: string;
  tenantId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  changes: Record<string, unknown>;
  userId: string | null;
  createdAt: Date;
}

/**
 * Default tenant settings
 */
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: 'Europe/Budapest',
  currency: 'HUF',
  locale: 'hu-HU',
  features: [],
};
