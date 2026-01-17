/**
 * RLS (Row Level Security) Interface Types
 * @kgc/tenant - Multi-tenant RLS infrastructure
 */

/**
 * RLS Policy típusok
 */
export enum RlsPolicyType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ALL = 'ALL',
}

/**
 * RLS Policy definíció
 */
export interface RlsPolicy {
  name: string;
  tableName: string;
  schemaName: string;
  policyType: RlsPolicyType;
  usingClause?: string;
  withCheckClause?: string;
  createdAt: Date;
}

/**
 * RLS Policy létrehozás DTO
 */
export interface CreateRlsPolicyDto {
  tableName: string;
  schemaName: string;
  tenantIdColumn?: string; // Default: 'tenant_id'
  policyNamePrefix?: string; // Default: 'tenant_isolation'
}

/**
 * RLS Status egy táblán
 */
export interface RlsTableStatus {
  schemaName: string;
  tableName: string;
  rlsEnabled: boolean;
  policies: RlsPolicy[];
}

/**
 * Session context beállítás
 */
export interface TenantSessionContext {
  tenantId: string;
  isSuperAdmin?: boolean;
  bypassRls?: boolean;
}

/**
 * RLS aktiválás eredmény
 */
export interface RlsActivationResult {
  schemaName: string;
  tableName: string;
  rlsEnabled: boolean;
  policiesCreated: string[];
  success: boolean;
  error?: string;
}

/**
 * Bulk RLS aktiválás eredmény
 */
export interface BulkRlsActivationResult {
  schemaName: string;
  tablesProcessed: number;
  tablesSuccessful: number;
  tablesFailed: number;
  results: RlsActivationResult[];
}
