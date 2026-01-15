# ADR-002: Telepítési és Offline Stratégia

## Státusz

**ELFOGADVA** - 2025. december 2.

## Kontextus

A KGC ERP rendszernek több telepítési modellt kell támogatnia, és képesnek kell lennie offline működésre is. A valós üzleti környezetben előfordulnak:
- Internetkimaradások
- Áramszünetek
- Távoli helyszínek gyenge kapcsolattal
- Franchise partnerek saját IT infrastruktúrával

A rendszernek **resilient** (ellenálló) architektúrával kell rendelkeznie.

## Döntések

### 1. Telepítési Modellek

**Döntés:** Mindkét modell támogatása az MVP-ben

| Modell | Prioritás | Célcsoport |
|--------|-----------|------------|
| **Felhő (SaaS)** | Elsődleges | Kisgépcentrum központ, kis franchise partnerek |
| **On-Premise** | MVP része | Nagy franchise partnerek, speciális igények |

#### 1.1 Felhő (SaaS) Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│                     FELHŐ INFRASTRUKTÚRA                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   Load      │    │   App       │    │   App       │    │
│   │   Balancer  │───▶│   Server 1  │    │   Server 2  │    │
│   │   (nginx)   │    │   (Node.js) │    │   (Node.js) │    │
│   └─────────────┘    └──────┬──────┘    └──────┬──────┘    │
│                             │                  │            │
│                             └────────┬─────────┘            │
│                                      ▼                      │
│                          ┌─────────────────┐                │
│                          │   PostgreSQL    │                │
│                          │   (Primary)     │                │
│                          └────────┬────────┘                │
│                                   │                         │
│                          ┌────────▼────────┐                │
│                          │   PostgreSQL    │                │
│                          │   (Replica)     │                │
│                          └─────────────────┘                │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   Redis     │    │   MinIO/S3  │    │   Backup    │    │
│   │   (Cache)   │    │   (Files)   │    │   (Daily)   │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Hosting opciók:**
- Hetzner Cloud (EU, GDPR compliant, költséghatékony)
- DigitalOcean (egyszerű)
- AWS/Azure (enterprise igényekhez)

#### 1.2 On-Premise Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│              FRANCHISE PARTNER SZERVERSZOBÁJA               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                 DOCKER HOST                          │  │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │  │
│   │  │  nginx    │  │  backend  │  │  frontend │       │  │
│   │  │  :80/:443 │  │  :3000    │  │  :8080    │       │  │
│   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │  │
│   │        │              │              │              │  │
│   │        └──────────────┼──────────────┘              │  │
│   │                       ▼                             │  │
│   │              ┌───────────────┐                      │  │
│   │              │  PostgreSQL   │                      │  │
│   │              │  :5432        │                      │  │
│   │              └───────────────┘                      │  │
│   │                       │                             │  │
│   │              ┌───────────────┐                      │  │
│   │              │  Redis Cache  │                      │  │
│   │              │  :6379        │                      │  │
│   │              └───────────────┘                      │  │
│   └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │   SYNC AGENT    │                        │
│                  │   (opcionális)  │                        │
│                  │                 │                        │
│                  │  - Központ felé │                        │
│                  │  - Statisztika  │                        │
│                  │  - Készlet sync │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼ (Internet, ha van)
                    ┌───────────────┐
                    │   KÖZPONT     │
                    │   (Felhő)     │
                    └───────────────┘
```

**Docker Compose alapú telepítés:**

```yaml
# docker-compose.yml (On-Premise)
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend

  backend:
    image: kgc-erp/backend:latest
    environment:
      - DATABASE_URL=postgresql://kgc:password@postgres:5432/kgc
      - REDIS_URL=redis://redis:6379
      - TENANT_MODE=on-premise
      - SYNC_ENABLED=${SYNC_ENABLED:-false}
      - CENTRAL_API_URL=${CENTRAL_API_URL:-}
    depends_on:
      - postgres
      - redis

  frontend:
    image: kgc-erp/frontend:latest
    environment:
      - API_URL=http://backend:3000

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=kgc
      - POSTGRES_USER=kgc
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

  sync-agent:
    image: kgc-erp/sync-agent:latest
    environment:
      - CENTRAL_API_URL=${CENTRAL_API_URL}
      - SYNC_INTERVAL=300  # 5 perc
    profiles:
      - sync  # Csak ha kell központi szinkron

volumes:
  postgres_data:
  redis_data:
```

**Telepítési script:**
```bash
#!/bin/bash
# install-kgc.sh

echo "KGC ERP On-Premise Telepítő"
echo "==========================="

# Előfeltételek ellenőrzése
command -v docker >/dev/null 2>&1 || { echo "Docker szükséges!"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose szükséges!"; exit 1; }

# Konfiguráció
read -p "Központi szinkron engedélyezése? (i/n): " SYNC
if [ "$SYNC" = "i" ]; then
  export SYNC_ENABLED=true
  read -p "Központi API URL: " CENTRAL_API_URL
  export CENTRAL_API_URL
fi

# Indítás
docker-compose up -d

echo "KGC ERP elindult: http://localhost"
```

---

### 2. Offline Működés - PWA (Progressive Web App)

**Döntés:** PWA alapú offline megoldás

**Indoklás:**
- Egy kódbázis minden platformra (web, mobil, desktop)
- Nincs app store jóváhagyás szükséges
- Egyszerűbb karbantartás
- Modern böngészők teljes támogatása

#### 2.1 PWA Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│                    PWA ARCHITEKTÚRA                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                    BÖNGÉSZŐ                          │  │
│   │                                                      │  │
│   │   ┌─────────────┐    ┌─────────────────────────┐    │  │
│   │   │   React     │    │    Service Worker       │    │  │
│   │   │   App       │◄──▶│    (Workbox)            │    │  │
│   │   │             │    │                         │    │  │
│   │   └──────┬──────┘    │  - App Shell cache     │    │  │
│   │          │           │  - API cache           │    │  │
│   │          ▼           │  - Background Sync     │    │  │
│   │   ┌─────────────┐    │  - Push notifications  │    │  │
│   │   │  IndexedDB  │    └─────────────────────────┘    │  │
│   │   │             │                                   │  │
│   │   │ - Ügyfelek  │                                   │  │
│   │   │ - Cikkek    │                                   │  │
│   │   │ - Bérgépek  │                                   │  │
│   │   │ - Pending   │                                   │  │
│   │   │   Queue     │                                   │  │
│   │   └─────────────┘                                   │  │
│   │                                                      │  │
│   └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│              ┌─────────────────────────┐                    │
│              │   ONLINE?               │                    │
│              │   ┌─────┐    ┌─────┐    │                    │
│              │   │ YES │    │ NO  │    │                    │
│              │   └──┬──┘    └──┬──┘    │                    │
│              └──────┼─────────┼───────┘                    │
│                     │         │                            │
│                     ▼         ▼                            │
│              ┌───────────┐  ┌───────────┐                  │
│              │  Szerver  │  │ IndexedDB │                  │
│              │  API      │  │ + Queue   │                  │
│              └───────────┘  └───────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Offline Adattárolás (IndexedDB)

```javascript
// db-schema.js - IndexedDB struktúra

const DB_NAME = 'kgc-offline';
const DB_VERSION = 1;

const STORES = {
  // Szinkronizált adatok (letöltve a szerverről)
  customers: {
    keyPath: 'id',
    indexes: ['name', 'phone', 'taxNumber']
  },
  products: {
    keyPath: 'id',
    indexes: ['code', 'name', 'barcode', 'category']
  },
  rentalEquipment: {
    keyPath: 'id',
    indexes: ['code', 'status']
  },

  // Offline létrehozott rekordok (feltöltésre vár)
  pendingSync: {
    keyPath: 'localId',
    autoIncrement: true,
    indexes: ['type', 'createdAt', 'syncStatus']
  },

  // Metaadatok
  syncMeta: {
    keyPath: 'key'  // lastSync, syncInProgress, etc.
  }
};

// Tárhely becslés
const STORAGE_ESTIMATE = {
  customers: '10 MB',      // ~10,000 ügyfél
  products: '100 MB',      // ~50,000 cikk
  rentalEquipment: '1 MB', // ~500 bérgép
  pendingSync: '10 MB',    // Buffer offline műveleteknek
  total: '~150 MB'
};
```

#### 2.3 Service Worker Stratégiák

```javascript
// sw.js - Service Worker (Workbox)

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate
} from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// App Shell - mindig cache-ből
precacheAndRoute(self.__WB_MANIFEST);

// API stratégiák
registerRoute(
  // Statikus adatok (cikkek, bérgépek) - Cache first
  ({url}) => url.pathname.startsWith('/api/products') ||
             url.pathname.startsWith('/api/rental-equipment'),
  new CacheFirst({
    cacheName: 'static-data',
    plugins: [{
      cacheWillUpdate: async ({response}) => {
        // Csak sikeres válaszokat cache-elünk
        return response.status === 200 ? response : null;
      }
    }]
  })
);

registerRoute(
  // Dinamikus adatok (ügyfelek) - Stale while revalidate
  ({url}) => url.pathname.startsWith('/api/customers'),
  new StaleWhileRevalidate({
    cacheName: 'customer-data'
  })
);

registerRoute(
  // Írási műveletek - Network first + Background Sync
  ({request}) => request.method === 'POST' ||
                 request.method === 'PUT' ||
                 request.method === 'PATCH',
  new NetworkFirst({
    plugins: [
      new BackgroundSyncPlugin('offline-mutations', {
        maxRetentionTime: 24 * 60 // 24 óra
      })
    ]
  })
);
```

#### 2.4 Offline Funkciók Mátrix

| Funkció | Online | Offline | Szinkron |
|---------|--------|---------|----------|
| Ügyfél keresés | ✅ Valós idejű | ✅ Cache-ből | Auto |
| Új ügyfél | ✅ Azonnal | ✅ Pending queue | Háttérben |
| Bérlés indítás | ✅ Azonnal | ✅ Pending queue | Háttérben |
| Bérlés lezárás | ✅ Azonnal | ✅ Pending queue | Háttérben |
| Készlet lekérdezés | ✅ Valós idejű | ⚠️ Utolsó ismert | Auto |
| Készlet módosítás | ✅ Azonnal | ✅ Pending queue | Háttérben |
| Munkalap felvétel | ✅ Azonnal | ✅ Pending queue | Háttérben |
| Számla kiállítás | ✅ NAV online | ❌ Nem lehetséges | - |
| Vonalkód olvasás | ✅ | ✅ | - |
| Riportok | ✅ | ⚠️ Korlátozott | - |
| **Részletfizetés** 🆕 | ✅ | ⚠️ Olvasás | Háttérben |
| **Garancia claim** 🆕 | ✅ | ✅ Pending queue | Háttérben |
| **Norma tételek** 🆕 | ✅ | ✅ Cache-ből | Auto |
| **Online foglalás** 🆕 | ✅ | ❌ (online-only) | - |

#### 2.5 Offline Támogatás - 8. rész Funkciók 🆕

##### Részletfizetés Offline

```
┌─────────────────────────────────────────────────────────────┐
│              RÉSZLETFIZETÉS OFFLINE STRATÉGIA               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📖 OLVASÁS (offline támogatott):                           │
│     • Meglévő törlesztési tervek megtekintése               │
│     • Törlesztések állapota                                 │
│     • Díjbekérő előzmények                                  │
│                                                             │
│  ✏️ ÍRÁS (pending queue):                                   │
│     • Új részletfizetési terv (várakozik szinkronra)        │
│     • Törlesztés beérkezés rögzítése                        │
│                                                             │
│  ❌ OFFLINE NEM TÁMOGATOTT:                                 │
│     • Előlegszámla kiállítás (NAV online kötelező)          │
│     • Automatikus díjbekérő küldés (email/SMS)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Garanciális Javítás Offline

```javascript
// IndexedDB bővítés a norma tételekhez
const STORES_8_RESZ = {
  // Norma katalógus (cache-elhető, ritkán változik)
  normaTetelek: {
    keyPath: 'norma_id',
    indexes: ['szerzodes_id', 'munka_kod', 'gep_tipus']
  },

  // Garancia szerződések (gyártókkal)
  garanciaSzerzodesek: {
    keyPath: 'szerzodes_id',
    indexes: ['gyarto_id', 'ervenyesseg_vege']
  },

  // Offline létrehozott claim-ek
  pendingGaranciaClaims: {
    keyPath: 'localClaimId',
    autoIncrement: true,
    indexes: ['munkalap_id', 'syncStatus']
  }
};

// Tárhely becslés - 8. rész bővítés
const STORAGE_8_RESZ = {
  normaTetelek: '1 MB',      // ~1000 norma tétel
  garanciaSzerzodesek: '100 KB', // ~50 szerződés
  pendingClaims: '500 KB',   // Buffer
  total_8_resz: '~2 MB'
};
```

##### Online Foglalás - Kizárólag Online

```
┌─────────────────────────────────────────────────────────────┐
│                ONLINE FOGLALÁS - MIÉRT NEM OFFLINE?         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ Az online foglalás NEM működhet offline módban          │
│                                                             │
│  Indoklás:                                                  │
│  • Készlet valós idejű elérhetőség kritikus                 │
│  • Konfliktusok elkerülése (2 ügyfél = 1 termék)           │
│  • Bolt értesítése azonnal szükséges                        │
│  • Ügyfélnek azonnal visszajelzés kell                      │
│                                                             │
│  Megoldás:                                                  │
│  • Webshop jelzi ha offline → "Hívjon minket"              │
│  • Bolt telefon backup foglaláshoz                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Konfliktuskezelés - Last-Write-Wins

**Döntés:** Last-Write-Wins (LWW) stratégia

**Indoklás:**
- Egyszerű implementáció
- Érthető viselkedés
- A KGC use case-ekben ritka a valódi konfliktus

#### 3.1 Implementáció

```javascript
// conflict-resolution.js

class ConflictResolver {
  /**
   * Last-Write-Wins merge stratégia
   * A legfrissebb timestamp-pel rendelkező verzió nyer
   */
  resolve(localRecord, serverRecord) {
    const localTime = new Date(localRecord.updatedAt).getTime();
    const serverTime = new Date(serverRecord.updatedAt).getTime();

    if (localTime > serverTime) {
      // Lokális verzió frissebb
      return {
        winner: 'local',
        record: localRecord,
        conflict: this.createConflictLog(localRecord, serverRecord)
      };
    } else {
      // Szerver verzió frissebb (vagy egyenlő)
      return {
        winner: 'server',
        record: serverRecord,
        conflict: localTime === serverTime ? null :
                  this.createConflictLog(localRecord, serverRecord)
      };
    }
  }

  /**
   * Konfliktus napló létrehozása audit céljából
   */
  createConflictLog(local, server) {
    return {
      id: crypto.randomUUID(),
      entityType: local._type,
      entityId: local.id,
      localVersion: {
        data: local,
        updatedAt: local.updatedAt,
        updatedBy: local.updatedBy
      },
      serverVersion: {
        data: server,
        updatedAt: server.updatedAt,
        updatedBy: server.updatedBy
      },
      resolution: 'last-write-wins',
      resolvedAt: new Date().toISOString()
    };
  }
}
```

#### 3.2 Konfliktus Napló

Minden konfliktus naplózásra kerül későbbi audit céljából:

```sql
CREATE TABLE conflict_log (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    local_version JSONB NOT NULL,
    server_version JSONB NOT NULL,
    winner VARCHAR(10) NOT NULL,  -- 'local' vagy 'server'
    resolution_strategy VARCHAR(50) DEFAULT 'last-write-wins',
    resolved_at TIMESTAMP DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP
);

-- Index a nem áttekintett konfliktusokra
CREATE INDEX idx_conflict_unreviewed ON conflict_log(reviewed)
WHERE reviewed = FALSE;
```

#### 3.3 Admin Felület - Konfliktus Áttekintés

```
┌─────────────────────────────────────────────────────────────┐
│ KONFLIKTUS NAPLÓ                           [Szűrés] [Export]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️  3 nem áttekintett konfliktus                            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #1 - Ügyfél: Kovács János                               │ │
│ │ Időpont: 2025-12-02 14:35                               │ │
│ │                                                         │ │
│ │ LOKÁLIS (Pista - offline)    SZERVER (Jóska - online)   │ │
│ │ ─────────────────────────    ────────────────────────   │ │
│ │ Telefon: 06301234567         Telefon: 06309876543       │ │
│ │ Email: kovacs@gmail.com      Email: jkovacs@gmail.com   │ │
│ │                                                         │ │
│ │ ✅ NYERTES: Szerver (frissebb: +2 perc)                 │ │
│ │                                                         │ │
│ │ [Áttekintve ✓] [Visszaállítás lokálisra]               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Papír Backup - OCR-Ready Rendszer

**Döntés:** Teljes OCR-ready papír backup rendszer

**Komponensek:**
1. Előnyomott űrlapok azonosítókkal
2. QR kódos tracking
3. OCR-optimalizált layout
4. Digitalizálási workflow

#### 4.1 Űrlap Design Elvek

```
┌─────────────────────────────────────────────────────────────┐
│                    OCR-READY DESIGN ELVEK                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. FIX POZÍCIÓK                                            │
│     - Minden mező fix koordinátákon                         │
│     - Így az OCR tudja, hol mit keressen                    │
│                                                             │
│  2. KONTRASZT                                               │
│     - Fekete szöveg, fehér háttér                           │
│     - Vastag keretek a mezőknél                             │
│                                                             │
│  3. AZONOSÍTÓK                                              │
│     - QR kód: űrlap típus + egyedi ID + dátum               │
│     - Vonalkód: gyors azonosításhoz                         │
│     - Sorszám: manuális bevitelhez                          │
│                                                             │
│  4. ÚTMUTATÓ SZÖVEGEK                                       │
│     - "NYOMTATOTT BETŰKKEL"                                 │
│     - Példa formátum: "ÉÉÉÉ-HH-NN"                          │
│                                                             │
│  5. ELLENŐRZŐ MEZŐK                                         │
│     - Checkbox: ☐ Készpénz  ☐ Kártya                        │
│     - Összeg ellenőrzés: három helyen                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2 Bérlési Bizonylat (OCR-Ready)

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════╗  │
│ ║  KISGÉPCENTRUM                    ┌─────────────────┐ ║  │
│ ║  BÉRLÉSI BIZONYLAT                │ [QR KÓD]        │ ║  │
│ ║                                   │                 │ ║  │
│ ║  Sorszám: B-2025-______           │ BRL|2025|00001  │ ║  │
│ ║                                   └─────────────────┘ ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║                                                       ║  │
│ ║  DÁTUM (ÉÉÉÉ-HH-NN):  ┌──┬──┬──┬──┐-┌──┬──┐-┌──┬──┐  ║  │
│ ║                       │  │  │  │  │ │  │  │ │  │  │  ║  │
│ ║                       └──┴──┴──┴──┘-└──┴──┘-└──┴──┘  ║  │
│ ║                                                       ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║  ÜGYFÉL ADATOK (NYOMTATOTT BETŰKKEL!)                 ║  │
│ ║                                                       ║  │
│ ║  Név: ┌─────────────────────────────────────────────┐ ║  │
│ ║       │                                             │ ║  │
│ ║       └─────────────────────────────────────────────┘ ║  │
│ ║                                                       ║  │
│ ║  Telefon: ┌──┬──┬──┐-┌──┬──┬──┐-┌──┬──┬──┬──┐        ║  │
│ ║           │  │  │  │ │  │  │  │ │  │  │  │  │        ║  │
│ ║           └──┴──┴──┘-└──┴──┴──┘-└──┴──┴──┴──┘        ║  │
│ ║                                                       ║  │
│ ║  Személyi ig.: ┌──┬──┬──┬──┬──┬──┐-┌──┬──┐            ║  │
│ ║                │  │  │  │  │  │  │ │  │  │            ║  │
│ ║                └──┴──┴──┴──┴──┴──┘-└──┴──┘            ║  │
│ ║                                                       ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║  BÉRELT GÉP                                           ║  │
│ ║                                                       ║  │
│ ║  Gép kód: ┌──┬──┬──┬──┬──┬──┐  │││││││││││││││││││   ║  │
│ ║           │  │  │  │  │  │  │  (vonalkód)             ║  │
│ ║           └──┴──┴──┴──┴──┴──┘                         ║  │
│ ║                                                       ║  │
│ ║  Megnevezés: _________________________________________ ║  │
│ ║                                                       ║  │
│ ║  Tartozékok: _________________________________________ ║  │
│ ║                                                       ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║  PÉNZÜGYEK                                            ║  │
│ ║                                                       ║  │
│ ║  Napi díj:  ┌──┬──┬──┬──┬──┬──┐ Ft                    ║  │
│ ║             │  │  │  │  │  │  │                       ║  │
│ ║             └──┴──┴──┴──┴──┴──┘                       ║  │
│ ║                                                       ║  │
│ ║  Kaució:    ┌──┬──┬──┬──┬──┬──┐ Ft                    ║  │
│ ║             │  │  │  │  │  │  │                       ║  │
│ ║             └──┴──┴──┴──┴──┴──┘                       ║  │
│ ║                                                       ║  │
│ ║  Fizetés:   ☐ Készpénz   ☐ Kártya   ☐ Átutalás       ║  │
│ ║                                                       ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║  VISSZAHOZATAL                                        ║  │
│ ║                                                       ║  │
│ ║  Tervezett: ┌──┬──┬──┬──┐-┌──┬──┐-┌──┬──┐            ║  │
│ ║             │  │  │  │  │ │  │  │ │  │  │            ║  │
│ ║             └──┴──┴──┴──┘-└──┴──┘-└──┴──┘            ║  │
│ ║                                                       ║  │
│ ╠═══════════════════════════════════════════════════════╣  │
│ ║                                                       ║  │
│ ║  Ügyfél aláírása: _______________________            ║  │
│ ║                                                       ║  │
│ ║  Ügyintéző: _____________ Kód: ┌──┬──┬──┐            ║  │
│ ║                                │  │  │  │            ║  │
│ ║                                └──┴──┴──┘            ║  │
│ ║                                                       ║  │
│ ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  │││││││││││││││││││││││││││││││││││││││││││││││││││││││   │
│  B-2025-00001                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 Digitalizálási Workflow

```
┌─────────────────────────────────────────────────────────────┐
│               PAPÍR → DIGITÁLIS WORKFLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📄 Papír bizonylat                                        │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐                                           │
│   │  Szkennelés │  (multifunkciós nyomtató / telefon)       │
│   │  vagy fotó  │                                           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │  QR kód     │  → Azonosítja az űrlap típusát            │
│   │  beolvasás  │  → Előhívja a megfelelő sablont           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │    OCR      │  (Tesseract / Google Vision API)          │
│   │  feldolgozás│                                           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │ Validáció + │  → Emberi ellenőrzés                      │
│   │ Javítás     │  → Hiányzó/hibás mezők kitöltése          │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐                                           │
│   │  Rögzítés   │  → Adatbázisba mentés                     │
│   │  rendszerbe │  → Eredeti kép archiválás                 │
│   └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.4 Vészhelyzet Csomag

Minden boltban kötelezően elérhető:

```
┌─────────────────────────────────────────────────────────────┐
│              🆘 VÉSZHELYZET CSOMAG                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Tartalom:                                               │
│                                                             │
│  ├── 📄 Űrlapok (laminált tokban)                           │
│  │   ├── 50 db Bérlési bizonylat                           │
│  │   ├── 30 db Szerviz felvételi lap                       │
│  │   ├── 20 db Ügyfél adatlap                              │
│  │   └── 10 db Készlet ellenőrző                           │
│  │                                                          │
│  ├── 📋 Referencia anyagok                                  │
│  │   ├── Bérgép lista (kódok + árak)                       │
│  │   ├── Alkatrész árjegyzék (top 100)                     │
│  │   └── Ügyfélkód kereső (ABC sorrend)                    │
│  │                                                          │
│  ├── 🔧 Eszközök                                            │
│  │   ├── 2 db toll (kék)                                   │
│  │   ├── 1 db vonalzó                                      │
│  │   └── 1 db számológép (napelemes!)                      │
│  │                                                          │
│  └── 📖 Útmutató                                            │
│      └── "Mit tegyek áramszünetkor?" (laminált A4)         │
│                                                             │
│  🔄 Frissítés: Havonta ellenőrizni, negyedévente cserélni  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5 OCR Technológia Stack

```javascript
// ocr-service.js

const OCR_PROVIDERS = {
  // Ingyenes, self-hosted
  tesseract: {
    name: 'Tesseract OCR',
    type: 'self-hosted',
    cost: 'Ingyenes',
    accuracy: '85-90%',
    languages: ['hun', 'eng'],
    setup: 'npm install tesseract.js'
  },

  // Felhő alapú, fizetős de pontosabb
  googleVision: {
    name: 'Google Cloud Vision',
    type: 'cloud',
    cost: '$1.50 / 1000 kép',
    accuracy: '95-98%',
    features: ['Kézírás felismerés', 'Dokumentum AI']
  },

  // Hibrid megoldás (javasolt)
  hybrid: {
    strategy: [
      '1. Tesseract első próba (ingyenes)',
      '2. Ha confidence < 80% → Google Vision',
      '3. Ha még mindig < 90% → Manuális review'
    ]
  }
};
```

---

## Összefoglaló Táblázat

| Terület | Döntés | Technológia |
|---------|--------|-------------|
| **Felhő hosting** | Elsődleges | Docker + PostgreSQL |
| **On-premise** | MVP része | Docker Compose csomag |
| **Offline app** | PWA | Service Worker + IndexedDB |
| **Konfliktuskezelés** | Last-Write-Wins | Timestamp alapú + napló |
| **Papír backup** | OCR-ready | Tesseract + Google Vision |

---

## Következmények

### Pozitív

1. **Teljes lefedettség**: Felhőtől a papírig minden szcenárió kezelve
2. **Fokozatos degradáció**: Net elmegy → offline app; áram elmegy → papír
3. **Egyszerű konfliktuskezelés**: LWW érthető, auditálható
4. **Self-hosted opció**: GDPR, adatszuverenitás biztosított

### Kockázatok és Mitigáció

| Kockázat | Mitigáció |
|----------|-----------|
| PWA korlátok iOS-en | Safari fejlődik, 2025-re jobb támogatás |
| OCR pontatlanság | Hibrid megközelítés + manuális review |
| On-premise support terhelés | Docker = egyszerű telepítés, dokumentáció |
| Papír űrlapok elavulnak | Negyedéves csomag frissítés |

---

---

### 9. Email Sync Offline Stratégia

**Kiegészítés (2025-12-31):** Gmail API-val történő számlafeldolgozás offline támogatása.

**Döntés:** Background sync queue + Local storage drafts

**Implementáció:**

```typescript
// Email offline queue
interface EmailQueueItem {
  id: string;
  type: 'invoice' | 'delivery_note';
  attachments: File[];
  metadata: {
    supplierId: string;
    megrendelesId?: string;
  };
  createdAt: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
}

// IndexedDB store hozzáadása
const STORES = {
  // ... meglévő store-ok
  emailQueue: {
    keyPath: 'id',
    indexes: ['syncStatus', 'createdAt']
  }
};

// Offline email mentés
async function queueEmailForSync(email: EmailQueueItem): Promise<void> {
  await db.emailQueue.add(email);

  // Background sync trigger (amikor online lesz)
  if ('serviceWorker' in navigator && 'sync' in registration) {
    await registration.sync.register('sync-emails');
  }
}

// Service Worker sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emails') {
    event.waitUntil(syncPendingEmails());
  }
});

async function syncPendingEmails() {
  const pending = await db.emailQueue
    .where('syncStatus').equals('pending')
    .toArray();

  for (const email of pending) {
    try {
      await uploadEmailToGmailAPI(email);
      await db.emailQueue.update(email.id, { syncStatus: 'synced' });
    } catch (error) {
      await db.emailQueue.update(email.id, { syncStatus: 'error' });
    }
  }
}
```

**Korlátok:**
- Gmail API offline nem használható → Queue-ba kerül
- Attachments local storage-ben (max 50 MB/email)
- Sync amikor internet visszajön

---

### 10. OCR Local Processing (Offline)

**Kiegészítés (2025-12-31):** Papír számlák OCR feldolgozása offline környezetben.

**Döntés:** Tesseract.js (JavaScript OCR) fallback + Queue to Cloud Vision

**Indoklás:**
- **Online:** Google Cloud Vision API (> 95% accuracy)
- **Offline:** Tesseract.js (~85% accuracy, local processing)
- **Hybrid:** Tesseract offline → Cloud Vision re-process amikor online

**Implementáció:**

```typescript
import Tesseract from 'tesseract.js';

@Injectable()
export class OCROfflineService {

  async processInvoiceOffline(
    imageFile: File
  ): Promise<InvoiceOCRResult> {

    // Check online status
    const isOnline = navigator.onLine;

    if (isOnline) {
      // Use Cloud Vision API (high accuracy)
      return await this.cloudVisionService.extractInvoiceData(imageFile);

    } else {
      // Fallback to Tesseract.js (offline)
      const result = await Tesseract.recognize(
        imageFile,
        'hun+eng', // Magyar + Angol
        {
          logger: (m) => console.log(m) // Progress
        }
      );

      const parsed = this.parseInvoiceFields(result.data.text);

      // Save to queue for re-processing when online
      await this.queueForReprocessing({
        imageFile,
        tesseractResult: parsed,
        confidence: 0.7, // Lower confidence offline
        requiresReview: true
      });

      return {
        ...parsed,
        confidence: 0.7,
        source: 'tesseract_offline',
        requiresManualReview: true,
        requiresReprocessing: true
      };
    }
  }

  private async queueForReprocessing(data: any): Promise<void> {
    await db.ocrQueue.add({
      ...data,
      syncStatus: 'pending',
      createdAt: new Date()
    });
  }
}

// Service Worker - OCR reprocessing amikor online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ocr') {
    event.waitUntil(reprocessOCRWithCloudVision());
  }
});

async function reprocessOCRWithCloudVision() {
  const pending = await db.ocrQueue
    .where('syncStatus').equals('pending')
    .toArray();

  for (const item of pending) {
    try {
      const cloudResult = await fetch('/api/ocr/cloud-vision', {
        method: 'POST',
        body: item.imageFile
      });

      // Update invoice with higher accuracy data
      await updateInvoiceData(item.invoiceId, cloudResult);

      await db.ocrQueue.update(item.id, { syncStatus: 'reprocessed' });
    } catch (error) {
      console.error('OCR reprocess failed:', error);
    }
  }
}
```

**IndexedDB kiegészítés:**

```javascript
const STORES = {
  // ... meglévő store-ok

  ocrQueue: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: ['syncStatus', 'createdAt', 'invoiceId']
  }
};
```

**Trade-offs:**

| | Cloud Vision (Online) | Tesseract.js (Offline) |
|---|---|---|
| **Accuracy** | > 95% | ~85% |
| **Speed** | 2-5 sec | 10-30 sec |
| **Magyar nyelv** | Natív | Támogatott de gyengébb |
| **Költség** | API hívás | Ingyenes |
| **Használat** | Elsődleges | Fallback offline |

---

## Kapcsolódó Dokumentumok

- [ADR-001: Franchise Multi-Tenant](./ADR-001-franchise-multitenancy.md)
- [ADR-018: Email-Szál Feldolgozás](./ADR-018-email-szal-feldolgozas.md)
- [ADR-019: OCR Számlákhoz](./ADR-019-ocr-szamlakhoz.md)
- [7.resz.md](../Flows/7.resz.md) - Új követelmények

---

## Döntéshozók

- **Javo!** - Projekt tulajdonos
- **Winston** - Architect (BMAD)

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2025-12-02 | 1.0 | Kezdeti döntések rögzítése |
| 2025-12-03 | 1.1 | 8. rész bővítés: Részletfizetés, Garancia, Foglalás offline stratégia |
| 2025-12-31 | 1.2 | Email sync offline + OCR local processing kiegészítés |
