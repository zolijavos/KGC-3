/**
 * Partner Factory
 * Creates test partners (customers/suppliers) for E2E tests.
 */

import { PartnerStatus, PartnerType, PrismaClient } from '@prisma/client';
import { SeedPartnerRequest, SeededPartner } from '../types';

export class PartnerFactory {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a test partner with unique partnerCode
   */
  async create(
    testRunId: string,
    request: SeedPartnerRequest,
    userId: string
  ): Promise<SeededPartner> {
    const timestamp = Date.now();
    const partnerCode = `TEST-${testRunId.substring(0, 8)}-${timestamp}`;
    const name = request.name ?? `Test Partner ${timestamp}`;

    const partner = await this.prisma.partner.create({
      data: {
        tenantId: request.tenantId,
        partnerCode,
        name,
        type: PartnerType.INDIVIDUAL,
        status: PartnerStatus.ACTIVE,
        email: request.email ?? `partner-${testRunId}-${timestamp}@test.kgc.local`,
        phone: request.phone ?? '+36201234567',
        taxNumber: request.taxNumber ?? null,
        createdBy: userId,
        updatedBy: userId,
        // Store testRunId for cleanup
        notes: `TEST_RUN_ID:${testRunId}`,
      },
    });

    return {
      id: partner.id,
      name: partner.name,
      tenantId: partner.tenantId,
    };
  }

  /**
   * Create a company partner
   */
  async createCompany(
    testRunId: string,
    request: SeedPartnerRequest,
    userId: string
  ): Promise<SeededPartner> {
    const timestamp = Date.now();
    const partnerCode = `TEST-${testRunId.substring(0, 8)}-${timestamp}`;
    const name = request.name ?? `Test Company ${timestamp}`;

    const partner = await this.prisma.partner.create({
      data: {
        tenantId: request.tenantId,
        partnerCode,
        name,
        companyName: name,
        type: PartnerType.COMPANY,
        status: PartnerStatus.ACTIVE,
        email: request.email ?? `company-${testRunId}-${timestamp}@test.kgc.local`,
        phone: request.phone ?? '+36201234567',
        taxNumber: request.taxNumber ?? '12345678-1-23',
        country: 'HU',
        city: 'Budapest',
        postalCode: '1234',
        address: 'Test utca 1.',
        createdBy: userId,
        updatedBy: userId,
        notes: `TEST_RUN_ID:${testRunId}`,
      },
    });

    return {
      id: partner.id,
      name: partner.name,
      tenantId: partner.tenantId,
    };
  }

  /**
   * Cleanup partners by test run
   */
  async cleanup(testRunId: string): Promise<number> {
    const result = await this.prisma.partner.deleteMany({
      where: {
        notes: {
          contains: `TEST_RUN_ID:${testRunId}`,
        },
      },
    });

    return result.count;
  }
}
