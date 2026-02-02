import { faker } from '@faker-js/faker/locale/hu';
import type { APIRequestContext } from '@playwright/test';

/**
 * Partner (Ügyfél) Factory
 *
 * Használat:
 *   const factory = new PartnerFactory(request);
 *   const partner = await factory.create({ nev: 'Custom Name' });
 *   // ... test logic ...
 *   await factory.cleanup(); // Automatikusan hívódik a fixture teardown-ban
 */

export interface PartnerData {
  nev: string;
  email: string;
  telefon: string;
  adoszam: string;
  cim: string;
  varos: string;
  iranyitoszam: string;
  tipus: 'SZEMELY' | 'CEG';
  hitelkeret?: number;
}

export interface CreatedPartner extends PartnerData {
  id: string;
  created_at: string;
  tenant_id: string;
}

export class PartnerFactory {
  private createdIds: string[] = [];
  private request: APIRequestContext;
  private tenantId?: string;

  constructor(request: APIRequestContext, tenantId?: string) {
    this.request = request;
    this.tenantId = tenantId;
  }

  /**
   * Generál egy Partner objektumot faker adatokkal
   */
  generate(overrides: Partial<PartnerData> = {}): PartnerData {
    const tipus = overrides.tipus ?? faker.helpers.arrayElement(['SZEMELY', 'CEG']);

    return {
      nev: tipus === 'CEG' ? faker.company.name() : faker.person.fullName(),
      email: faker.internet.email(),
      telefon: faker.phone.number('+36 ## ### ####'),
      adoszam: faker.string.numeric(11),
      cim: faker.location.streetAddress(),
      varos: faker.location.city(),
      iranyitoszam: faker.location.zipCode('####'),
      tipus,
      hitelkeret: tipus === 'CEG' ? faker.number.int({ min: 50000, max: 500000 }) : undefined,
      ...overrides,
    };
  }

  /**
   * Létrehoz egy Partner-t az API-n keresztül
   */
  async create(overrides: Partial<PartnerData> = {}): Promise<CreatedPartner> {
    const data = this.generate(overrides);

    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await this.request.post('/api/v1/partners-direct', {
      data,
      headers,
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create partner: ${response.status()} - ${error}`);
    }

    const created = await response.json();
    this.createdIds.push(created.id);

    return created;
  }

  /**
   * Több Partner létrehozása egyszerre
   */
  async createMany(count: number, overrides: Partial<PartnerData> = {}): Promise<CreatedPartner[]> {
    const partners: CreatedPartner[] = [];
    for (let i = 0; i < count; i++) {
      partners.push(await this.create(overrides));
    }
    return partners;
  }

  /**
   * Cleanup - törli az összes létrehozott partnert
   */
  async cleanup(): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    for (const id of this.createdIds) {
      try {
        await this.request.delete(`/api/v1/partners-direct/${id}`, { headers });
      } catch {
        // Ignore cleanup errors - partner may already be deleted
      }
    }
    this.createdIds = [];
  }

  /**
   * Létrehozott entity-k száma
   */
  get createdCount(): number {
    return this.createdIds.length;
  }
}
