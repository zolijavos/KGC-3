/**
 * In-Memory Authorization Service
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 *
 * Manages cross-tenant access permissions.
 * Will be replaced with real RBAC integration.
 */

import { IAuthorizationService } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

interface UserAccess {
  userId: string;
  tenantIds: string[];
}

@Injectable()
export class InMemoryAuthorizationService implements IAuthorizationService {
  // Mock user access map (holding admin sees all tenants)
  private userAccess: Map<string, UserAccess> = new Map([
    [
      'holding-admin',
      {
        userId: 'holding-admin',
        tenantIds: ['tenant-1', 'tenant-2', 'tenant-3', 'tenant-4', 'tenant-5'],
      },
    ],
    [
      'franchise-owner',
      {
        userId: 'franchise-owner',
        tenantIds: ['tenant-1', 'tenant-2', 'tenant-3'],
      },
    ],
    [
      'location-admin',
      {
        userId: 'location-admin',
        tenantIds: ['tenant-1'],
      },
    ],
  ]);

  async canAccessTenant(userId: string, tenantId: string): Promise<boolean> {
    const access = this.userAccess.get(userId);
    if (!access) {
      return false;
    }
    return access.tenantIds.includes(tenantId);
  }

  async getAccessibleTenants(userId: string): Promise<string[]> {
    const access = this.userAccess.get(userId);
    return access?.tenantIds ?? [];
  }

  // Test/Admin helpers
  grantAccess(userId: string, tenantIds: string[]): void {
    this.userAccess.set(userId, { userId, tenantIds });
  }

  revokeAccess(userId: string): void {
    this.userAccess.delete(userId);
  }

  clear(): void {
    this.userAccess.clear();
  }
}
