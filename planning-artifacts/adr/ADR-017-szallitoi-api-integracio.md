# ADR-017: Szállítói API Integráció Stratégia

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

A Beszerzési modul fejlesztéséhez szükséges automatikus árszinkronizáció és alkatrész-információ lekérése több szállítótól (Makita, Bosch, Hikoki, Agroforg).

### Üzleti Követelmények

1. **Szállítók**: Makita, Bosch, Hikoki, Agroforg (API még nincs, tervezve)
2. **Árfrissítés**: Naponta auto sync + manuális override lehetőség
3. **Robbantott táblák**: Auto sync + manuális upload
4. **Web scraping**: Megengedett átmenetileg (ha nincs API)
5. **Készlet szinkronizáció**: Szállítói készlet real-time lekérdezés

## Döntések

### 1. Integr

ációs Pattern

**Döntés:** Unified API Layer (Adapter Pattern) + Web Scraping Fallback

**Indoklás:**
- **Egységes interface**: Frontend/backend egy API-t lát
- **Könnyű bővítés**: Új szállító = új adapter
- **Fallback**: Scraping ha nincs API
- **Testability**: Mockolt adapter unit testekhez

**Architektúra:**

```
┌────────────────────────────────────────────────────────┐
│            KGC Beszerzési Modul (NestJS)               │
└────────────────────────┬───────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │  Supplier Service (Facade)  │
          │   - getProducts()           │
          │   - getPricing()            │
          │   - getStock()              │
          │   - getPartsExplosion()     │
          └──────────────┬──────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼───────┐    ┌──────▼──────┐    ┌────────▼──────┐
│  Makita   │    │    Bosch    │    │    Hikoki     │
│  Adapter  │    │   Adapter   │    │    Adapter    │
└───┬───────┘    └──────┬──────┘    └────────┬──────┘
    │                   │                     │
┌───▼───────┐    ┌──────▼──────┐    ┌────────▼──────┐
│  API      │    │  Scraper    │    │   API         │
│  Client   │    │  (Puppeteer)│    │   Client      │
└───────────┘    └─────────────┘    └───────────────┘
```

**Implementáció:**

```typescript
// Base Supplier Adapter interface
export interface ISupplierAdapter {
  getProducts(filters: ProductFilter): Promise<Product[]>;
  getPricing(productId: string): Promise<PricingInfo>;
  getStock(productId: string): Promise<StockInfo>;
  getPartsExplosion(modelNumber: string): Promise<PartsExplosion>;
}

// Makita Adapter (API)
@Injectable()
export class MakitaAdapter implements ISupplierAdapter {
  constructor(private readonly httpService: HttpService) {}

  async getProducts(filters: ProductFilter): Promise<Product[]> {
    const response = await this.httpService.get(
      `${MAKITA_API_URL}/products`,
      {
        headers: { 'Authorization': `Bearer ${MAKITA_API_KEY}` },
        params: filters
      }
    );
    return this.mapMakitaProducts(response.data);
  }

  async getPricing(productId: string): Promise<PricingInfo> {
    const response = await this.httpService.get(
      `${MAKITA_API_URL}/pricing/${productId}`
    );
    return {
      listPrice: response.data.msrp,
      wholesalePrice: response.data.dealer_price,
      currency: 'HUF',
      validUntil: new Date(response.data.valid_until)
    };
  }

  // ... további metódusok
}

// Bosch Adapter (Web Scraping fallback)
@Injectable()
export class BoschAdapter implements ISupplierAdapter {
  constructor(
    private readonly scraperService: ScraperService
  ) {}

  async getProducts(filters: ProductFilter): Promise<Product[]> {
    // Puppeteer scraping
    const html = await this.scraperService.fetchPage(
      `${BOSCH_WEB_URL}/products?category=${filters.category}`
    );
    return this.parseBoschProductsFromHTML(html);
  }

  async getPricing(productId: string): Promise<PricingInfo> {
    const html = await this.scraperService.fetchPage(
      `${BOSCH_WEB_URL}/product/${productId}`
    );
    return this.parsePricingFromHTML(html);
  }

  // ...
}

// Unified Supplier Service (Facade)
@Injectable()
export class SupplierService {
  private adapters: Map<string, ISupplierAdapter>;

  constructor(
    private readonly makitaAdapter: MakitaAdapter,
    private readonly boschAdapter: BoschAdapter,
    private readonly hikokiAdapter: HikokiAdapter
  ) {
    this.adapters = new Map([
      ['makita', makitaAdapter],
      ['bosch', boschAdapter],
      ['hikoki', hikokiAdapter]
    ]);
  }

  async getProductsFromSupplier(
    supplier: string,
    filters: ProductFilter
  ): Promise<Product[]> {
    const adapter = this.adapters.get(supplier.toLowerCase());
    if (!adapter) throw new Error(`Unknown supplier: ${supplier}`);

    return await adapter.getProducts(filters);
  }

  async getAllSupplierPrices(productName: string): Promise<SupplierPrice[]> {
    const results = await Promise.allSettled(
      Array.from(this.adapters.entries()).map(async ([supplier, adapter]) => {
        const products = await adapter.getProducts({ name: productName });
        if (products.length === 0) return null;

        const pricing = await adapter.getPricing(products[0].id);
        return { supplier, product: products[0], pricing };
      })
    );

    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<any>).value);
  }
}
```

**Alternatívák (elutasítva):**

- **Direct API hívások mindenhol**: Code duplication, nehéz karbantartás
- **Csak scraping**: Törékeny, lassú, jogi kérdések
- **3rd party aggregator**: Extra költség, vendor lock-in

---

### 2. Web Scraping Implementáció

**Döntés:** Puppeteer + Proxy rotation + Rate limiting

**Indoklás:**
- **Puppeteer**: Headless browser, JavaScript rendering
- **Proxy rotation**: IP ban elkerülés
- **Rate limiting**: Etikus scraping, server terhelés csökkentés
- **Caching**: Naponta 1x scrape, cache 24 óra

**Implementáció:**

```typescript
import puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
  private browser: Browser;
  private proxyList: string[];
  private requestCount: Map<string, number> = new Map();

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async fetchPage(
    url: string,
    options: ScraperOptions = {}
  ): Promise<string> {
    // Rate limiting check
    const domain = new URL(url).hostname;
    const count = this.requestCount.get(domain) || 0;

    if (count >= MAX_REQUESTS_PER_DAY) {
      throw new Error(`Rate limit exceeded for ${domain}`);
    }

    // Proxy rotation
    const proxy = this.getNextProxy();

    const page = await this.browser.newPage();

    if (proxy) {
      await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD
      });
    }

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Random delay (human-like behavior)
      await page.waitForTimeout(Math.random() * 2000 + 1000);

      const html = await page.content();

      // Increment request count
      this.requestCount.set(domain, count + 1);

      return html;

    } finally {
      await page.close();
    }
  }

  private getNextProxy(): string {
    // Proxy rotation logic
    return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
  }
}
```

**Alternatívák (elutasítva):**

- **Axios + Cheerio**: Nem kezeli JavaScript rendering
- **Selenium**: Lassú, resource intensive
- **Paid scraping service**: Extra költség

---

### 3. Árfrissítési Stratégia

**Döntés:** Hibrid (Napi scheduled job + Manuális trigger + Cache)

**Indoklás:**
- **Scheduled**: Minden nap 01:00-kor automatikus sync
- **Manuális**: Admin bármikor frissíthet
- **Cache**: 24 óra TTL, gyors lekérdezés

**Implementáció:**

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PriceSyncService {

  // Scheduled job - minden nap 01:00
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async syncAllSupplierPrices(): Promise<void> {
    console.log('Starting daily price sync...');

    const suppliers = ['makita', 'bosch', 'hikoki', 'agroforg'];

    for (const supplier of suppliers) {
      try {
        await this.syncSupplierPrices(supplier);
      } catch (error) {
        console.error(`Price sync failed for ${supplier}:`, error);
        // Notify admin
        await this.notificationService.send({
          type: 'price_sync_error',
          supplier,
          error: error.message
        });
      }
    }
  }

  async syncSupplierPrices(supplier: string): Promise<void> {
    const products = await this.productService.getProductsBySupplier(supplier);

    for (const product of products) {
      const pricing = await this.supplierService.getPricing(
        supplier,
        product.supplierProductId
      );

      // Update pricing in DB
      await this.productService.updatePricing(product.id, {
        listPrice: pricing.listPrice,
        wholesalePrice: pricing.wholesalePrice,
        lastSyncAt: new Date(),
        syncSource: 'auto'
      });

      // Cache update
      await this.cacheManager.set(
        `price:${product.id}`,
        pricing,
        { ttl: 86400 } // 24 hours
      );
    }
  }

  // Manual trigger (Admin API endpoint)
  async manualPriceSync(
    supplier: string,
    productIds?: string[]
  ): Promise<SyncResult> {
    const products = productIds
      ? await this.productService.getProductsByIds(productIds)
      : await this.productService.getProductsBySupplier(supplier);

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const product of products) {
      try {
        await this.syncSupplierPrices(supplier);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          productId: product.id,
          error: error.message
        });
      }
    }

    return results;
  }
}
```

**Alternatívák (elutasítva):**

- **Real-time minden lekérdezéskor**: Túl lassú, API overload
- **Csak manual**: Elfelejtik frissíteni
- **Hetente**: Túl ritka, elavult árak

---

### 4. Robbantott Táblák (Parts Explosion) Sync

**Döntés:** Hibrid (Auto sync API-ról + Manual upload + Versioning)

**Indoklás:**
- **API sync**: Ha elérhető, automatikus frissítés
- **Manual upload**: Admin feltöltheti PDF/képeket
- **Versioning**: Változások követése, rollback lehetőség

**Implementáció:**

```typescript
// Robbantott tábla entitás
export class PartsExplosion {
  id: string;
  productModelNumber: string;
  supplier: string;
  diagramImageUrl: string; // S3/Cloud Storage
  partsList: PartInfo[]; // JSON array
  version: number;
  source: 'api' | 'manual';
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartInfo {
  partNumber: string;
  description: string;
  quantity: number;
  wholesalePrice?: number;
  availableStock?: number;
}

// Parts Explosion Service
@Injectable()
export class PartsExplosionService {

  // Auto sync from API
  async syncPartsExplosion(
    supplier: string,
    modelNumber: string
  ): Promise<PartsExplosion> {

    const adapter = this.supplierService.getAdapter(supplier);
    const apiData = await adapter.getPartsExplosion(modelNumber);

    // Upload diagram image to Cloud Storage
    const diagramUrl = await this.uploadDiagram(apiData.diagramImage);

    // Save to DB
    const partsExplosion = await this.partsExplosionRepo.save({
      productModelNumber: modelNumber,
      supplier,
      diagramImageUrl: diagramUrl,
      partsList: apiData.parts,
      version: await this.getNextVersion(modelNumber, supplier),
      source: 'api',
      createdAt: new Date()
    });

    return partsExplosion;
  }

  // Manual upload
  async uploadPartsExplosion(
    file: Express.Multer.File,
    metadata: PartsExplosionMetadata,
    adminId: string
  ): Promise<PartsExplosion> {

    // Upload diagram to Cloud Storage
    const diagramUrl = await this.storageService.upload(file);

    // OCR if needed (PDF → parts list extraction)
    const partsList = await this.ocrService.extractPartsList(file);

    const partsExplosion = await this.partsExplosionRepo.save({
      productModelNumber: metadata.modelNumber,
      supplier: metadata.supplier,
      diagramImageUrl: diagramUrl,
      partsList: partsList || [],
      version: await this.getNextVersion(metadata.modelNumber, metadata.supplier),
      source: 'manual',
      uploadedBy: adminId,
      createdAt: new Date()
    });

    return partsExplosion;
  }

  // Get latest version
  async getLatest(modelNumber: string, supplier: string): Promise<PartsExplosion> {
    return await this.partsExplosionRepo.findOne({
      where: { productModelNumber: modelNumber, supplier },
      order: { version: 'DESC' }
    });
  }
}
```

**Alternatívák (elutasítva):**

- **Csak API**: Nem minden szállítónál elérhető
- **Csak manual**: Túl sok munka, nem skálázható
- **Nincs versioning**: Változások követése lehetetlen

---

## Következmények

### Pozitív

1. ✅ **Egységes interface**: Egy API minden szállítóhoz
2. ✅ **Könnyű bővítés**: Új adapter = új szállító
3. ✅ **Fallback**: Scraping ahol nincs API
4. ✅ **Auto sync**: Napi árak frissülnek
5. ✅ **Manual override**: Admin kontroll
6. ✅ **Versioning**: Robbantott táblák változáskövetése

### Negatív / Kockázatok

1. ⚠️ **Scraping törékeny**: HTML változás → scraper frissítés
   - **Mitigáció**: Automated tests, monitoring, fallback to manual

2. ⚠️ **Rate limiting**: Szállítók korlátozhatják request számot
   - **Mitigáció**: Cache, proxy rotation, etikus scraping

3. ⚠️ **API változások**: Breaking changes szállítói API-ban
   - **Mitigáció**: Adapter pattern, verziókezelés, contract testing

4. ⚠️ **Costs**: Proxy szolgáltatás, Cloud Storage
   - **Mitigáció**: Önhostolt proxy, költség monitoring

---

## Referenciák

- Mary Analyst jelentés: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q5-Q8)
- Puppeteer: https://pptr.dev/
- NestJS Schedule: https://docs.nestjs.com/techniques/task-scheduling

---

---

### 5. Email-Alapú JSON Import (Fázis 2 Bővítés)

**Döntés:** Dedikált email cím (technikai@kisgepcentrum.hu) + automatikus JSON parsing

**Indoklás:**
Nem minden beszállítónak van API-ja. Egyesek (pl. kisebb helyi beszállítók) JSON fájlt küldenek emailben. A manuális feldolgozás időigényes.

**Ügyfél igény:**
> "vannak beszállítók, akik vállalják, hogy elküldik a készletinformációikat .Json fájlban mailen"

**Architektúra:**

```
┌─────────────────────────────────────────────────────────────┐
│          EMAIL INBOX POLLING SERVICE (NestJS)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  technikai@kisgepcentrum.hu                                 │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────┐                                        │
│  │  IMAP Listener │  (poll interval: 5 min)                │
│  │  (node-imap)   │                                        │
│  └───────┬────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────┐                                        │
│  │  Attachment    │  - Filter: *.json files                │
│  │  Extractor     │  - Max size: 10MB                      │
│  └───────┬────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────┐                                        │
│  │  JSON Schema   │  - Validate against schema             │
│  │  Validator     │  - Reject invalid formats              │
│  └───────┬────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────┐                                        │
│  │  Supplier      │  - Map email sender → supplier         │
│  │  Identifier    │  - Allow-list based                    │
│  └───────┬────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────┐                                        │
│  │  Import        │  - Upsert products/prices              │
│  │  Processor     │  - Generate diff report                │
│  └───────┬────────┘                                        │
│          │                                                  │
│          ▼                                                  │
│  Admin Notification (email summary + diff)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**JSON Schema (Elvárt Formátum):**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["supplier", "products"],
  "properties": {
    "supplier": {
      "type": "string"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["sku", "name", "price"],
        "properties": {
          "sku": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "currency": { "type": "string", "default": "HUF" },
          "stock": { "type": "integer" },
          "category": { "type": "string" }
        }
      }
    }
  }
}
```

**Biztonsági Intézkedések:**

| Kockázat | Mitigáció |
|----------|-----------|
| Spam/malware | Email sender allow-list |
| JSON injection | Schema validation |
| Data overflow | Max 10MB attachment limit |
| Unauthorized sender | Sender verification + admin notification |

**Manuális Feltöltés (Admin UI):**

Ha a beszállító nem emailen küldi, az admin feltöltheti a JSON/CSV/Excel fájlt a web felületen:

- `POST /api/v1/suppliers/{supplier_id}/import`
- Támogatott formátumok: JSON, CSV, XLSX
- Excel esetén: első sor fejléc, auto-mapping

**Kapcsolódó PRD:**
- FR94: Email JSON import
- FR95: Manuális fájl feltöltés

---

**Utolsó frissítés**: 2026. január 10.
**Készítette**: Winston (Architect Agent)
**Jóváhagyta**: Javo!

**Változásnapló:**
| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2025-12-31 | Első verzió |
| 1.1 | 2026-01-10 | Email JSON Import és Manuális Upload bővítés (FR94, FR95) |
