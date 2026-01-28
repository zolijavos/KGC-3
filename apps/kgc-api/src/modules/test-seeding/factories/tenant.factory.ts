/**
 * Tenant Factory
 * Creates test tenants with predictable data for E2E tests.
 */

import { PrismaClient, TenantStatus } from '@prisma/client';
import { SeedTenantRequest, SeededTenant } from '../types';

export class TenantFactory {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a test tenant with a unique slug
   */
  async create(testRunId: string, request?: SeedTenantRequest): Promise<SeededTenant> {
    const timestamp = Date.now();
    const slug = request?.slug ?? `test-${testRunId}-${timestamp}`;
    const name = request?.name ?? `Test Tenant ${testRunId}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        slug,
        status: (request?.status as TenantStatus) ?? TenantStatus.ACTIVE,
        settings: {
          testRunId,
          createdByFactory: true,
        },
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    };
  }

  /**
   * Cleanup all tenants created by a test run
   */
  async cleanup(testRunId: string): Promise<number> {
    // Find tenants with this testRunId in settings
    const tenants = await this.prisma.tenant.findMany({
      where: {
        settings: {
          path: ['testRunId'],
          equals: testRunId,
        },
      },
    });

    if (tenants.length === 0) return 0;

    // Delete in correct order (cascade)
    const tenantIds = tenants.map(t => t.id);

    // Delete related data first
    await this.prisma.user.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });

    await this.prisma.location.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });

    // Delete tenants
    const result = await this.prisma.tenant.deleteMany({
      where: { id: { in: tenantIds } },
    });

    return result.count;
  }
}
