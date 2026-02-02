# KGC ERP Technológia - Házépítési Analógia

**Célközönség:** Új fejlesztők
**Cél:** A KGC ERP v7.0 architektúrájának megértése építészeti szemlélettel

---

## Bevezetés

Képzeld el, hogy egy **modern társasházi komplexumot** építünk, ahol minden lakás (tenant) önálló, de közös infrastruktúrát használ. Ez a KGC ERP.

```
                    🏢 KGC ERP TÁRSASHÁZ
    ┌─────────────────────────────────────────────┐
    │  🏠 KGC Érd   🏠 KGC Győr   🏠 Franchise-1  │  ← Lakások (Tenant-ek)
    ├─────────────────────────────────────────────┤
    │         🔌 Közös közművek (Shared)          │  ← Utils, Types, i18n
    ├─────────────────────────────────────────────┤
    │         🧱 Alapozás + Tartószerkezet        │  ← Core packages
    └─────────────────────────────────────────────┘
              ⬇️ PostgreSQL + Redis ⬇️
```

---

## 1. Alapozás - Core Packages

### Az alap, ami mindent tart

Ahogy egy ház sem állhat meg stabil alapozás nélkül, a KGC ERP sem működhet a **Core réteg** nélkül.

| Építészeti elem         | KGC Package   | Funkció                                        |
| ----------------------- | ------------- | ---------------------------------------------- |
| **Betonalap**           | `@kgc/common` | Közös típusok, hibakezelés, alapvető utility-k |
| **Tartópillérek**       | `@kgc/auth`   | Autentikáció - ki léphet be az épületbe        |
| **Főfalak**             | `@kgc/tenant` | Multi-tenancy - a lakások elkülönítése         |
| **Központi vezérlés**   | `@kgc/config` | Környezeti beállítások, feature flagek         |
| **Biztonsági rendszer** | `@kgc/audit`  | Minden mozdulat naplózása                      |

```
packages/core/
├── auth/       ← Bejárati kapu + kulcsrendszer
├── tenant/     ← Lakások elkülönítése
├── audit/      ← Biztonsági kamerák
├── config/     ← Központi vezérlőpult
└── common/     ← Betonalap
```

**Szabály:** A Core SOHA nem függ más rétegektől. Az alap nem támaszkodhat a tetőre!

---

## 2. Közműhálózat - Shared Packages

### Villany, víz, gáz - amit minden lakás használ

A Shared réteg olyan, mint a társasház közműhálózata: mindenki használja, de senki sem birtokolja.

| Közmű                  | KGC Package      | Funkció                               |
| ---------------------- | ---------------- | ------------------------------------- |
| **Elektromos hálózat** | `@kgc/utils`     | Közös segédfüggvények                 |
| **Vízhálózat**         | `@kgc/types`     | TypeScript típusok (az adat "folyik") |
| **Gázhálózat**         | `@kgc/i18n`      | Többnyelvűség (magyar/angol)          |
| **Raktár**             | `@kgc/inventory` | Közös készletkezelés                  |
| **Tesztelő labor**     | `@kgc/testing`   | Tesztelési segédeszközök              |
| **Dizájn rendszer**    | `@kgc/ui`        | shadcn/ui komponensek                 |

```
packages/shared/
├── ui/         ← Egységes bútorok és dekoráció
├── utils/      ← Szerszámosláda
├── types/      ← Tervrajzok (TypeScript)
├── i18n/       ← Többnyelvű feliratok
├── testing/    ← Minőségellenőrző labor
└── inventory/  ← Központi raktár
```

**Analógia:** Az `@kgc/inventory` olyan, mint a társasház közös raktára - a bérlés, szerviz és értékesítés domain-ek mind innen veszik a készletadatokat.

---

## 3. Lakások - Domain Packages

### Minden lakásnak megvan a saját funkciója

A KGC ERP-ben három fő "lakástípus" van, mindegyik saját célra:

### 🔧 Szerviz Lakás (A szárny)

```
packages/szerviz/
├── service-core/      ← Központi szerviz logika
├── service-worksheet/ ← Munkalapok kezelése
├── service-warranty/  ← Garanciális javítások
└── service-parts/     ← Alkatrész kezelés
```

### 🏭 Bérlés Lakás (B szárny)

```
packages/berles/
├── rental-core/       ← Bérlési alaplogika
├── rental-checkout/   ← Kiadás/visszavétel
└── rental-contract/   ← Szerződéskezelés
```

### 🛒 Értékesítés Lakás (C szárny)

```
packages/aruhaz/
├── sales-core/        ← Értékesítési alaplogika
├── sales-pos/         ← Pénztárgép
├── sales-invoice/     ← Számlázás
└── sales-quote/       ← Árajánlatok
```

**Szabály:** A lakások (domain-ek) NEM kommunikálhatnak közvetlenül egymással! Ha a B szárnyból át kell menni a C-be, a közös folyosón (event bus vagy shared interface) keresztül kell.

---

## 4. Külső Kapcsolatok - Integration Packages

### Bekötések a külvilághoz

Ahogy a házat be kell kötni a városi hálózatokba, a KGC ERP-t is össze kell kapcsolni külső rendszerekkel.

```
packages/integration/
├── nav-online/     ← NAV Online Számla (mint a kötelező villanyóra)
├── mypos/          ← Bankkártya terminál (mint a kaputelefon)
├── szamlazz-hu/    ← Számlázz.hu API
├── twenty-crm/     ← CRM rendszer (mint a portás)
├── chatwoot/       ← Ügyfélszolgálat
└── horilla-hr/     ← HR rendszer
```

| Bekötés típusa | Analógia        | KGC Integráció       |
| -------------- | --------------- | -------------------- |
| **Kötelező**   | Villany bekötés | NAV Online           |
| **Komfort**    | Okos otthon     | Twenty CRM, Chatwoot |
| **Opcionális** | Napelem         | Horilla HR           |

---

## 5. Homlokzat - Frontend Alkalmazások

### Amit a látogatók látnak

A frontend olyan, mint a ház homlokzata és a belső terek dizájnja - ez az, amit a felhasználók látnak és használnak.

```
apps/
├── kgc-web/    ← Főbejárat (Next.js PWA - ügyfelek számára)
├── kgc-admin/  ← Hátsó bejárat (Admin dashboard - belső)
└── kgc-api/    ← Szolgálati bejárat (NestJS API)
```

### Frontend Rétegek (mint az épület szintjei)

```
┌─────────────────────────────────────────┐
│  4. Composable Dashboard                │ ← Tetőterasz (widget-ek)
├─────────────────────────────────────────┤
│  3. Headless API Layer                  │ ← Emelet (adatkezelés)
├─────────────────────────────────────────┤
│  2. Workflow Engine (XState)            │ ← Földszint (folyamatok)
├─────────────────────────────────────────┤
│  1. Schema-driven Forms (Zod)           │ ← Alagsor (űrlapok)
└─────────────────────────────────────────┘
```

---

## 6. Társasház Kezelés - Multi-Tenancy

### Minden lakás önálló, de közös az infrastruktúra

A KGC ERP **multi-tenant** architektúrája olyan, mint egy társasház:

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL ADATBÁZIS                      │
├─────────────────────────────────────────────────────────────┤
│  PUBLIC SÉMA (Közös helyiségek)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ • users (lakók)    • partners (ügyfelek)            │    │
│  │ • tenants (lakások)  • cikk (termékek)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│     ┌─────────────────────┼─────────────────────┐           │
│     ▼                     ▼                     ▼            │
│  ╔═══════════╗      ╔═══════════╗      ╔═══════════╗        │
│  ║ tenant_1  ║      ║ tenant_2  ║      ║ tenant_3  ║        │
│  ║ (KGC Érd) ║      ║ (KGC Győr)║      ║(Franchise)║        │
│  ╠═══════════╣      ╠═══════════╣      ╠═══════════╣        │
│  ║ • bérlés  ║      ║ • bérlés  ║      ║ • bérlés  ║        │
│  ║ • szerviz ║      ║ • szerviz ║      ║ • szerviz ║        │
│  ║ • eladás  ║      ║ • eladás  ║      ║ • eladás  ║        │
│  ╚═══════════╝      ╚═══════════╝      ╚═══════════╝        │
└─────────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS) = A lakáskulcs

```sql
-- Minden lakó csak a saját lakását látja
CREATE POLICY tenant_isolation ON bergep
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Analógia:** Az RLS olyan, mint a kulcsrendszer - a KGC Érd kulcsa nem nyitja a KGC Győr ajtaját.

---

## 7. Biztonsági Rendszer - RBAC

### Ki mit csinálhat az épületben

| Szerepkör         | Analógia         | Mit tehet                                      |
| ----------------- | ---------------- | ---------------------------------------------- |
| **OPERATOR**      | Takarító         | Napi műveletek, de nem nyithat páncélszekrényt |
| **TECHNIKUS**     | Karbantartó      | Szerviz + mindent, amit az operátor            |
| **BOLTVEZETO**    | Házmester        | Kedvezmények, riportok, +20% mozgástér         |
| **PARTNER_OWNER** | Lakástulajdonos  | Teljes hozzáférés a saját lakáshoz             |
| **CENTRAL_ADMIN** | Társasház-kezelő | Országos áttekintés                            |
| **SUPER_ADMIN**   | Főépítész        | Mindent lát, mindent módosíthat                |

---

## 8. Minőségbiztosítás - TDD/ATDD

### Az épület átvételi folyamata

Ahogy egy építkezésnél is vannak kötelező ellenőrzések, a KGC ERP-ben is:

| Ellenőrzés típusa   | Építészeti analógia  | KGC Megvalósítás                   |
| ------------------- | -------------------- | ---------------------------------- |
| **TDD (Unit test)** | Anyagminőség teszt   | Vitest - minden függvény tesztelve |
| **ATDD (E2E)**      | Lakhatósági engedély | Playwright - teljes folyamatok     |
| **Code Review**     | Műszaki ellenőr      | Adversarial review (min. 3 hiba!)  |

```bash
# Anyagvizsgálat
pnpm test                 # Unit tesztek

# Lakhatósági teszt
pnpm test:e2e             # E2E tesztek

# Műszaki átadás
/bmad:bmm:workflows:code-review  # Adversarial review
```

---

## 9. Függőségi Szabályok - Ki kire támaszkodhat

### Az építészeti statika

```
                    ┌─────────────────┐
                    │      APPS       │  ← Tető
                    │  (web, admin)   │
                    └────────┬────────┘
                             │ függ
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │  BÉRLÉS   │  │  SZERVIZ  │  │ ÉRTÉKESÍT │  ← Falak
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┴──────────────┘
                             │ függ
                    ┌────────┴────────┐
                    │     SHARED      │  ← Közművek
                    └────────┬────────┘
                             │ függ
                    ┌────────┴────────┐
                    │      CORE       │  ← Alapozás
                    └─────────────────┘
```

### TILOS kapcsolatok (statikai hiba!)

```
packages/berles/ → packages/szerviz/  ❌  Fal nem támaszkodhat falra!
packages/core/ → packages/shared/     ❌  Alap nem függhet közműtől!
```

**Ha domain-ek közötti kommunikáció kell:** Event bus vagy shared interface - mint a házközpont!

---

## 10. Összefoglaló Táblázat

| Építészeti elem   | KGC Komponens   | Helye a projektben                           |
| ----------------- | --------------- | -------------------------------------------- |
| Betonalap         | Core packages   | `packages/core/*`                            |
| Közművek          | Shared packages | `packages/shared/*`                          |
| Lakások           | Domain packages | `packages/berles/*`, `szerviz/*`, `aruhaz/*` |
| Külső bekötések   | Integration     | `packages/integration/*`                     |
| Homlokzat         | Frontend        | `apps/kgc-web/`, `apps/kgc-admin/`           |
| Szolgálati rész   | Backend API     | `apps/kgc-api/`                              |
| Társasház-kezelés | Multi-tenancy   | PostgreSQL RLS                               |
| Kulcsrendszer     | RBAC            | `@kgc/auth`                                  |
| Tervrajzok        | ADR-ek          | `planning-artifacts/adr/`                    |

---

## Gyors Referencia

### Hol keressek valamit?

| Keresett elem         | Hely                                 |
| --------------------- | ------------------------------------ |
| Autentikáció          | `packages/core/auth/`                |
| UI komponensek        | `packages/shared/ui/`                |
| Bérlési logika        | `packages/berles/rental-core/`       |
| NAV számlázás         | `packages/integration/nav-online/`   |
| Tesztek               | `*.spec.ts` (unit), `*.e2e.ts` (E2E) |
| Architektúra döntések | `planning-artifacts/adr/`            |

### Hasznos parancsok

```bash
# Fejlesztés indítása
pnpm dev

# Egy modul tesztjei
pnpm --filter @kgc/rental-core test

# Típusellenőrzés
pnpm typecheck

# Teljes build
pnpm build
```

---

_Üdv az építkezésen! Ha kérdésed van, a "főépítész" (CLAUDE.md) és a "tervrajzok" (ADR-ek) mindig rendelkezésre állnak._
