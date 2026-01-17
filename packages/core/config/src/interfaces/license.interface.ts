/**
 * License types available in the system
 */
export type LicenseType = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';

/**
 * License status
 */
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'GRACE_PERIOD' | 'SUSPENDED';

/**
 * License interface
 */
export interface License {
  id: string;
  tenantId: string;
  type: LicenseType;
  status: LicenseStatus;

  // Limits
  maxUsers: number;
  maxLocations: number;

  // Dates
  startDate: Date;
  expirationDate: Date;
  gracePeriodDays: number;

  // Enabled modules/features
  enabledModules: string[];

  // Metadata
  licenseKey?: string;
  issuedBy?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * License validation result
 */
export interface LicenseValidationResult {
  isValid: boolean;
  status: LicenseStatus;
  daysUntilExpiration: number;
  errors: string[];
  warnings: string[];
}

/**
 * License limits per type
 */
export interface LicenseLimits {
  maxUsers: number;
  maxLocations: number;
  enabledModules: string[];
}

/**
 * Default license limits per type
 */
export const DEFAULT_LICENSE_LIMITS: Record<LicenseType, LicenseLimits> = {
  TRIAL: {
    maxUsers: 3,
    maxLocations: 1,
    enabledModules: ['auth', 'config', 'tenant', 'ui'],
  },
  BASIC: {
    maxUsers: 10,
    maxLocations: 1,
    enabledModules: ['auth', 'config', 'tenant', 'ui', 'rental-core', 'inventory'],
  },
  PRO: {
    maxUsers: 50,
    maxLocations: 5,
    enabledModules: [
      'auth', 'config', 'tenant', 'ui', 'audit',
      'rental-core', 'rental-checkout', 'rental-contract',
      'service-core', 'service-worksheet',
      'inventory', 'sales-core', 'sales-pos',
    ],
  },
  ENTERPRISE: {
    maxUsers: -1, // Unlimited
    maxLocations: -1, // Unlimited
    enabledModules: ['*'], // All modules
  },
};

/**
 * License repository interface
 */
export interface ILicenseRepository {
  get(tenantId: string): Promise<License | null>;
  set(license: Omit<License, 'id' | 'createdAt' | 'updatedAt'>): Promise<License>;
  update(tenantId: string, updates: Partial<License>): Promise<License | null>;
  delete(tenantId: string): Promise<boolean>;
}
