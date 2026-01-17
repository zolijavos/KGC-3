import { Injectable, Inject } from '@nestjs/common';
import type {
  ILicenseRepository,
  License,
  LicenseValidationResult,
} from '../interfaces/license.interface';
import {
  LicenseType,
  LicenseStatus,
  DEFAULT_LICENSE_LIMITS,
} from '../interfaces/license.interface';

export const LICENSE_REPOSITORY = 'LICENSE_REPOSITORY';

interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

interface CreateLicenseOptions {
  maxUsers?: number;
  maxLocations?: number;
  enabledModules?: string[];
  gracePeriodDays?: number;
  licenseKey?: string;
  issuedBy?: string;
  notes?: string;
}

const WARNING_DAYS_THRESHOLD = 14;
const DEFAULT_GRACE_PERIOD_DAYS = 7;

/**
 * Service for managing tenant licenses
 * Handles license validation, limits checking, and module access control
 */
@Injectable()
export class LicenseService {
  constructor(
    @Inject(LICENSE_REPOSITORY)
    private readonly repository: ILicenseRepository
  ) {}

  /**
   * Get license for a tenant
   */
  async getLicense(tenantId: string): Promise<License | null> {
    return this.repository.get(tenantId);
  }

  /**
   * Get license type for a tenant
   */
  async getLicenseType(tenantId: string): Promise<LicenseType | null> {
    const license = await this.repository.get(tenantId);
    return license?.type ?? null;
  }

  /**
   * Validate a tenant's license
   */
  async validateLicense(tenantId: string): Promise<LicenseValidationResult> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return {
        isValid: false,
        status: 'EXPIRED',
        daysUntilExpiration: 0,
        errors: ['No license found for tenant'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if suspended
    if (license.status === 'SUSPENDED') {
      return {
        isValid: false,
        status: 'SUSPENDED',
        daysUntilExpiration: this.calculateDaysUntilExpiration(license.expirationDate),
        errors: ['License is suspended'],
        warnings: [],
      };
    }

    // Calculate days until expiration
    const daysUntilExpiration = this.calculateDaysUntilExpiration(license.expirationDate);
    const gracePeriodDays = license.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;

    // Determine status based on expiration
    let status: LicenseStatus;
    let isValid: boolean;

    if (daysUntilExpiration > 0) {
      // Not expired yet
      status = 'ACTIVE';
      isValid = true;

      // Add warning if expiring soon
      if (daysUntilExpiration <= WARNING_DAYS_THRESHOLD) {
        warnings.push(`License expires in ${daysUntilExpiration} days`);
      }
    } else if (daysUntilExpiration >= -gracePeriodDays) {
      // In grace period
      status = 'GRACE_PERIOD';
      isValid = true;
      warnings.push(
        `License expired ${Math.abs(daysUntilExpiration)} days ago, in grace period (${gracePeriodDays - Math.abs(daysUntilExpiration)} days remaining)`
      );
    } else {
      // Fully expired
      status = 'EXPIRED';
      isValid = false;
      errors.push(
        `License expired ${Math.abs(daysUntilExpiration)} days ago (grace period ended)`
      );
    }

    return {
      isValid,
      status,
      daysUntilExpiration,
      errors,
      warnings,
    };
  }

  /**
   * Check if a module is enabled for the tenant's license
   */
  async isModuleEnabled(tenantId: string, moduleName: string): Promise<boolean> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return false;
    }

    // Check for wildcard (enterprise)
    if (license.enabledModules.includes('*')) {
      return true;
    }

    return license.enabledModules.includes(moduleName);
  }

  /**
   * Check if adding users would exceed the license limit
   */
  async checkUserLimit(tenantId: string, currentUserCount: number): Promise<LimitCheckResult> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    // -1 means unlimited
    if (license.maxUsers === -1) {
      return { allowed: true, remaining: -1, limit: -1 };
    }

    const remaining = license.maxUsers - currentUserCount;
    return {
      allowed: remaining > 0,
      remaining,
      limit: license.maxUsers,
    };
  }

  /**
   * Check if adding locations would exceed the license limit
   */
  async checkLocationLimit(
    tenantId: string,
    currentLocationCount: number
  ): Promise<LimitCheckResult> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    // -1 means unlimited
    if (license.maxLocations === -1) {
      return { allowed: true, remaining: -1, limit: -1 };
    }

    const remaining = license.maxLocations - currentLocationCount;
    return {
      allowed: remaining > 0,
      remaining,
      limit: license.maxLocations,
    };
  }

  /**
   * Create a new license for a tenant
   */
  async createLicense(
    tenantId: string,
    type: LicenseType,
    durationDays: number,
    options: CreateLicenseOptions = {}
  ): Promise<License> {
    if (durationDays <= 0) {
      throw new Error('License duration must be a positive number of days');
    }

    const defaults = DEFAULT_LICENSE_LIMITS[type];
    const now = new Date();
    const expirationDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const license: Parameters<typeof this.repository.set>[0] = {
      tenantId,
      type,
      status: 'ACTIVE',
      maxUsers: options.maxUsers ?? defaults.maxUsers,
      maxLocations: options.maxLocations ?? defaults.maxLocations,
      enabledModules: options.enabledModules ?? defaults.enabledModules,
      startDate: now,
      expirationDate,
      gracePeriodDays: options.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS,
    };

    if (options.licenseKey !== undefined) {
      license.licenseKey = options.licenseKey;
    }
    if (options.issuedBy !== undefined) {
      license.issuedBy = options.issuedBy;
    }
    if (options.notes !== undefined) {
      license.notes = options.notes;
    }

    return this.repository.set(license);
  }

  /**
   * Upgrade a license to a higher tier
   */
  async upgradeLicense(tenantId: string, newType: LicenseType): Promise<License | null> {
    const existingLicense = await this.repository.get(tenantId);

    if (!existingLicense) {
      return null;
    }

    const newDefaults = DEFAULT_LICENSE_LIMITS[newType];

    return this.repository.update(tenantId, {
      type: newType,
      maxUsers: newDefaults.maxUsers,
      maxLocations: newDefaults.maxLocations,
      enabledModules: newDefaults.enabledModules,
    });
  }

  /**
   * Extend license expiration date
   */
  async extendLicense(tenantId: string, additionalDays: number): Promise<License | null> {
    if (additionalDays <= 0) {
      throw new Error('Additional days must be a positive number');
    }

    const existingLicense = await this.repository.get(tenantId);

    if (!existingLicense) {
      return null;
    }

    const newExpiration = new Date(
      existingLicense.expirationDate.getTime() + additionalDays * 24 * 60 * 60 * 1000
    );

    return this.repository.update(tenantId, {
      expirationDate: newExpiration,
      status: 'ACTIVE', // Reactivate if was in grace period
    });
  }

  /**
   * Suspend a license
   */
  async suspendLicense(tenantId: string, reason?: string): Promise<License | null> {
    const updates: Partial<License> = {
      status: 'SUSPENDED',
    };

    if (reason) {
      updates.notes = `Suspended: ${reason}`;
    }

    return this.repository.update(tenantId, updates);
  }

  /**
   * Reactivate a suspended license
   */
  async reactivateLicense(tenantId: string): Promise<License | null> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return null;
    }

    // Check if still within valid period
    const daysUntilExpiration = this.calculateDaysUntilExpiration(license.expirationDate);
    const gracePeriodDays = license.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;

    let newStatus: LicenseStatus;
    if (daysUntilExpiration > 0) {
      newStatus = 'ACTIVE';
    } else if (daysUntilExpiration >= -gracePeriodDays) {
      newStatus = 'GRACE_PERIOD';
    } else {
      newStatus = 'EXPIRED';
    }

    return this.repository.update(tenantId, { status: newStatus });
  }

  /**
   * Get days until license expiration
   */
  async getDaysUntilExpiration(tenantId: string): Promise<number> {
    const license = await this.repository.get(tenantId);

    if (!license) {
      return 0;
    }

    return this.calculateDaysUntilExpiration(license.expirationDate);
  }

  /**
   * Delete a license
   */
  async deleteLicense(tenantId: string): Promise<boolean> {
    return this.repository.delete(tenantId);
  }

  /**
   * Calculate days until expiration from a date
   */
  private calculateDaysUntilExpiration(expirationDate: Date): number {
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
