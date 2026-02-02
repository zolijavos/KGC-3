import { faker } from '@faker-js/faker/locale/hu';
import type { APIRequestContext } from '@playwright/test';

/**
 * Bérgép (Rental Equipment) Factory
 *
 * Használat:
 *   const factory = new BergepFactory(request);
 *   const bergep = await factory.create({ megnevezes: 'Hilti Fúrógép' });
 *   await factory.cleanup();
 */

export interface BergepData {
  megnevezes: string;
  gyartmany: string;
  tipus: string;
  sorozatszam: string;
  vonalkod?: string;
  napi_dij: number;
  heti_dij?: number;
  havi_dij?: number;
  kaucio_osszeg: number;
  allapot: 'ELERHETO' | 'KIADVA' | 'SZERVIZBEN' | 'SELEJT';
  kategoria: string;
  leiras?: string;
}

export interface CreatedBergep extends BergepData {
  id: string;
  created_at: string;
  tenant_id: string;
}

// Bérgép kategóriák a KGC üzleti domain-ből
const KATEGORIAK = [
  'Fúrógépek',
  'Csiszológépek',
  'Vágógépek',
  'Betonvágók',
  'Generátorok',
  'Kompresszorok',
  'Állványok',
  'Földmunkagépek',
  'Kertészeti gépek',
  'Hegesztők',
];

const GYARTMANYOK = [
  'Hilti',
  'Makita',
  'Bosch',
  'DeWalt',
  'Milwaukee',
  'Stihl',
  'Husqvarna',
  'Honda',
  'Wacker',
  'Atlas Copco',
];

export class BergepFactory {
  private createdIds: string[] = [];
  private request: APIRequestContext;
  private tenantId?: string;

  constructor(request: APIRequestContext, tenantId?: string) {
    this.request = request;
    this.tenantId = tenantId;
  }

  /**
   * Generál egy Bérgép objektumot faker adatokkal
   */
  generate(overrides: Partial<BergepData> = {}): BergepData {
    const napi_dij = overrides.napi_dij ?? faker.number.int({ min: 5000, max: 50000 });

    return {
      megnevezes: faker.commerce.productName(),
      gyartmany: faker.helpers.arrayElement(GYARTMANYOK),
      tipus: faker.string.alphanumeric(8).toUpperCase(),
      sorozatszam: faker.string.uuid(),
      vonalkod: faker.string.numeric(13),
      napi_dij,
      heti_dij: Math.round(napi_dij * 5 * 0.9), // 10% kedvezmény heti díjnál
      havi_dij: Math.round(napi_dij * 20 * 0.8), // 20% kedvezmény havi díjnál
      kaucio_osszeg: Math.round(napi_dij * 3),
      allapot: 'ELERHETO',
      kategoria: faker.helpers.arrayElement(KATEGORIAK),
      leiras: faker.lorem.sentence(),
      ...overrides,
    };
  }

  /**
   * Létrehoz egy Bérgépet az API-n keresztül
   */
  async create(overrides: Partial<BergepData> = {}): Promise<CreatedBergep> {
    const data = this.generate(overrides);

    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    const response = await this.request.post('/api/v1/bergepek', {
      data,
      headers,
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create bergep: ${response.status()} - ${error}`);
    }

    const created = await response.json();
    this.createdIds.push(created.id);

    return created;
  }

  /**
   * Elérhető bérgép létrehozása (ELERHETO állapotban)
   */
  async createAvailable(overrides: Partial<BergepData> = {}): Promise<CreatedBergep> {
    return this.create({ ...overrides, allapot: 'ELERHETO' });
  }

  /**
   * Több Bérgép létrehozása egyszerre
   */
  async createMany(count: number, overrides: Partial<BergepData> = {}): Promise<CreatedBergep[]> {
    const items: CreatedBergep[] = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.create(overrides));
    }
    return items;
  }

  /**
   * Cleanup - törli az összes létrehozott bérgépet
   */
  async cleanup(): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    for (const id of this.createdIds) {
      try {
        await this.request.delete(`/api/v1/bergepek/${id}`, { headers });
      } catch {
        // Ignore cleanup errors
      }
    }
    this.createdIds = [];
  }

  get createdCount(): number {
    return this.createdIds.length;
  }
}
