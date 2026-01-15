# ADR-014: Moduláris Architektúra - Végleges Döntések

**Dátum:** 2025-12-11
**Státusz:** Elfogadva
**Résztvevők:** Javo!, Winston (Architect)

---

## Összefoglaló

Ez a dokumentum összefoglalja a KGC ERP moduláris architektúrájával kapcsolatos döntéseket, beleértve:
- Architektúra opció kiválasztása (A+B hibrid)
- Adatbázis/séma felépítés
- Partner kezelés
- Tenant (bolt) szeparáció
- Láthatósági szabályok

---

## 1. Kiválasztott Architektúra: A+B Hibrid

### Döntés

**CORE + KÉSZLET külön** (B opció eleme), de **egy szerveren, egy adatbázison belül** (A opció egyszerűsége).

### Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              1 SZERVER                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PostgreSQL                                     │  │
│  │                                                                        │  │
│  │  ╔═══════════════════════════════════════════════════════════════╗    │  │
│  │  ║                    KÖZÖS SÉMA (public)                         ║    │  │
│  │  ╠═══════════════════════════════════════════════════════════════╣    │  │
│  │  ║                                                                ║    │  │
│  │  ║  ┌─────────────────────────────────────────────────────────┐  ║    │  │
│  │  ║  │                      CORE                                │  ║    │  │
│  │  ║  │  • tenants (bolt lista + konfiguráció)                   │  ║    │  │
│  │  ║  │  • users (felhasználók + PIN kódok)                      │  ║    │  │
│  │  ║  │  • roles / permissions (RBAC)                            │  ║    │  │
│  │  ║  │  • partner (KÖZPONTI ügyféltörzs)                        │  ║    │  │
│  │  ║  │  • settings (rendszer beállítások)                       │  ║    │  │
│  │  ║  └─────────────────────────────────────────────────────────┘  ║    │  │
│  │  ║                                                                ║    │  │
│  │  ║  ┌─────────────────────────────────────────────────────────┐  ║    │  │
│  │  ║  │                    KÉSZLET                               │  ║    │  │
│  │  ║  │  • cikk (központi cikktörzs)                             │  ║    │  │
│  │  ║  │  • cikkcsoport                                           │  ║    │  │
│  │  ║  │  • beszallito                                            │  ║    │  │
│  │  ║  │  • arszabaly (árazási szabályok)                         │  ║    │  │
│  │  ║  │  • robbantott_abra (szerviz tudásbázis)                  │  ║    │  │
│  │  ║  └─────────────────────────────────────────────────────────┘  ║    │  │
│  │  ║                                                                ║    │  │
│  │  ╚═══════════════════════════════════════════════════════════════╝    │  │
│  │                                 │                                      │  │
│  │                                 │ Hivatkozások                         │  │
│  │                                 ▼                                      │  │
│  │  ╔═══════════════╗  ╔═══════════════╗  ╔═══════════════╗              │  │
│  │  ║ tenant_kgc1   ║  ║ tenant_kgc2   ║  ║ tenant_fr01   ║              │  │
│  │  ║ (KGC Pest)    ║  ║ (KGC Buda)    ║  ║ (Franchise)   ║              │  │
│  │  ╠═══════════════╣  ╠═══════════════╣  ╠═══════════════╣              │  │
│  │  ║               ║  ║               ║  ║               ║              │  │
│  │  ║ BÉRLÉS:       ║  ║ BÉRLÉS:       ║  ║ BÉRLÉS:       ║              │  │
│  │  ║ • bergep      ║  ║ • bergep      ║  ║ • bergep      ║              │  │
│  │  ║ • berles      ║  ║ • berles      ║  ║ • berles      ║              │  │
│  │  ║ • szerzodes   ║  ║ • szerzodes   ║  ║ • szerzodes   ║              │  │
│  │  ║ • kaucio      ║  ║ • kaucio      ║  ║ • kaucio      ║              │  │
│  │  ║               ║  ║               ║  ║               ║              │  │
│  │  ║ SZERVIZ:      ║  ║ SZERVIZ:      ║  ║ SZERVIZ:      ║              │  │
│  │  ║ • munkalap    ║  ║ • munkalap    ║  ║ • munkalap    ║              │  │
│  │  ║ • ml_tetel    ║  ║ • ml_tetel    ║  ║ • ml_tetel    ║              │  │
│  │  ║ • arajanalt   ║  ║ • arajanalt   ║  ║ • arajanalt   ║              │  │
│  │  ║ • garancia    ║  ║ • garancia    ║  ║ • garancia    ║              │  │
│  │  ║               ║  ║               ║  ║               ║              │  │
│  │  ║ ÉRTÉKESÍTÉS:  ║  ║ ÉRTÉKESÍTÉS:  ║  ║ ÉRTÉKESÍTÉS:  ║              │  │
│  │  ║ • keszlet     ║  ║ • keszlet     ║  ║ • keszlet     ║              │  │
│  │  ║ • bevetelezes ║  ║ • bevetelezes ║  ║ • bevetelezes ║              │  │
│  │  ║ • eladas      ║  ║ • eladas      ║  ║ • eladas      ║              │  │
│  │  ║ • szamla      ║  ║ • szamla      ║  ║ • szamla      ║              │  │
│  │  ║               ║  ║               ║  ║               ║              │  │
│  │  ║ KÖZÖS:        ║  ║ KÖZÖS:        ║  ║ KÖZÖS:        ║              │  │
│  │  ║ • audit_log   ║  ║ • audit_log   ║  ║ • audit_log   ║              │  │
│  │  ║ • ertesites   ║  ║ • ertesites   ║  ║ • ertesites   ║              │  │
│  │  ║               ║  ║               ║  ║               ║              │  │
│  │  ╚═══════════════╝  ╚═══════════════╝  ╚═══════════════╝              │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modul Struktúra

### 2.1 CORE Modul (Közös - public séma)

Mindig aktív, minden bolt használja.

| Entitás | Leírás | Megjegyzés |
|---------|--------|------------|
| `tenants` | Bolt lista + konfiguráció | Melyik bolt milyen modult használ |
| `users` | Felhasználók | PIN kód, szerepkör |
| `roles` | Szerepkörök | Szint 0/1/2 jogosultságok |
| `permissions` | Jogosultságok | Funkció szintű engedélyek |
| `settings` | Rendszer beállítások | Globális konfig |

### 2.2 KÉSZLET Modul (Közös - public séma)

Központi terméktörzs, minden bolt ugyanazt látja.

| Entitás | Leírás | Bolt-specifikus? |
|---------|--------|------------------|
| `cikk` | Termékek/alkatrészek | NEM - közös törzs |
| `cikkcsoport` | Kategóriák | NEM |
| `beszallito` | Beszállítók | NEM |
| `arszabaly` | Árazási szabályok | NEM - központi árak |
| `robbantott_abra` | Géptípus → alkatrész lista | NEM - közös tudásbázis |

### 2.3 PARTNER Modul (Közös - public séma)

**Döntés: Központi partner, nincs bolt-specifikus rekord.**

| Entitás | Leírás | Megjegyzés |
|---------|--------|------------|
| `partner` | Ügyfelek (magánszemély + cég) | Egy rekord, minden bolt látja |
| `ceg` | Céges ügyfelek extra adatai | Adószám, cégjegyzékszám |
| `meghatalmazott` | Céges meghatalmazottak | Ki vehet át gépet |

### 2.4 BÉRLÉS Modul (Bolt-specifikus - tenant séma)

| Entitás | Hivatkozik | Megjegyzés |
|---------|------------|------------|
| `bergep` | `public.cikk` | Bérelhető gépek állománya |
| `berles` | `public.partner`, `bergep` | Bérlési tranzakciók |
| `szerzodes` | `berles` | Bérlési szerződések |
| `kaucio` | `berles` | Kaució nyilvántartás |
| `keses` | `berles` | Késedelmi díjak |

### 2.5 SZERVIZ Modul (Bolt-specifikus - tenant séma)

| Entitás | Hivatkozik | Megjegyzés |
|---------|------------|------------|
| `munkalap` | `public.partner` | Szerviz munkalapok |
| `munkalap_tetel` | `munkalap`, `public.cikk` | Felhasznált alkatrészek |
| `arajanalt` | `munkalap` | Árajánlatok |
| `garancia_claim` | `munkalap` | Garanciális igények |
| `belso_megjegyzes` | `munkalap` | Szerviz → pult kommunikáció |

### 2.6 ÉRTÉKESÍTÉS Modul (Bolt-specifikus - tenant séma)

| Entitás | Hivatkozik | Megjegyzés |
|---------|------------|------------|
| `keszlet` | `public.cikk` | Bolt készlet szintje |
| `keszlet_mozgas` | `keszlet` | Készlet változások |
| `bevetelezes` | `public.beszallito` | Árubevételezés |
| `bevetelezes_tetel` | `bevetelezes`, `public.cikk` | Bevételezett tételek |
| `eladas` | `public.partner` | Értékesítések |
| `eladas_tetel` | `eladas`, `public.cikk` | Eladott tételek |
| `szamla` | `eladas`, `public.partner` | Számlák |

### 2.7 BESZERZÉS Modul (Hibrid - Közös + Bolt-specifikus)

**Döntés: Supplier API integráció adapter pattern-nel** ([ADR-017](ADR-017-szallitoi-api-integracio.md))

#### Közös (public séma)

| Entitás | Leírás | Megjegyzés |
|---------|--------|------------|
| `beszallito` | Beszállító alapadatok | Makita, Bosch, Hikoki, Agroforg |
| `beszallito_api_config` | API hozzáférési konfiguráció | Endpoint, auth kulcsok, scraper szabályok |
| `supplier_product_mapping` | Beszállító termék → Cikk mapping | Beszállítói kód → public.cikk |
| `supplier_price_history` | Ár napló | Napi árszinkronizáció előzmény |

#### Bolt-specifikus (tenant séma)

| Entitás | Hivatkozik | Megjegyzés |
|---------|------------|------------|
| `supplier_order` | `public.beszallito` | Beszállítói megrendelések |
| `supplier_order_items` | `supplier_order`, `public.cikk` | Megrendelt tételek |
| `price_override` | `public.cikk`, `public.beszallito` | Manuális árfelülbírálás |

**Architektúra:**
- **Adapter Pattern**: Unified API interface minden beszállítóhoz
- **Web Scraping Fallback**: Ha API nem elérhető (Puppeteer + proxy rotation)
- **Napi árszinkronizáció**: Automatikus + manuális felülbírálás
- **Robbantott ábra integráció**: Beszállítói parts explosion → public.robbantott_abra

### 2.8 AI CHATBOT Modul (Hibrid - Közös + Bolt-specifikus)

**Döntés: Google Gemini Flash API** ([ADR-016](ADR-016-ai-chatbot-koko.md))

#### Közös (public séma)

| Entitás | Leírás | Megjegyzés |
|---------|--------|------------|
| `ai_knowledge_base` | Tudásbázis cikkek | Magyar+English, pgvector embeddings |
| `ai_knowledge_embeddings` | Vektoros kereséshez | pgvector extension |
| `ai_intent_training` | Intent osztályozó adatok | Bérlés, szerviz, értékesítés, általános |
| `ai_approval_queue` | Admin jóváhagyásra váró válaszok | Közepes konfidencia (50-80%) |

#### Bolt-specifikus (tenant séma)

| Entitás | Hivatkozik | Megjegyzés |
|---------|------------|------------|
| `ai_conversations` | `public.partner` | Beszélgetés szálak |
| `ai_messages` | `ai_conversations` | Üzenetek (user/assistant) |
| `ai_escalations` | `ai_conversations` | Chatwoot-ba eszkalált ügyek |
| `ai_feedback` | `ai_messages` | Felhasználói értékelés (👍👎) |

**Architektúra:**
- **Gemini Flash API**: Managed service, cost-effective
- **Hybrid flow**: AI screening → KB search → Auto response OR Escalation
- **Admin Approval Loop**: 50-80% konfidencia esetén
- **Multi-channel**: Email, telefon, web chat, WhatsApp
- **Multi-language**: Magyar + English support

---

## 3. Partner Láthatóság

### Döntés: Mindenki látja az alapadatokat, részletek bolt-specifikusak

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PARTNER: Kovács János                                 │
│                                                                              │
│  MINDEN BOLT LÁTJA (public.partner):                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  • Név: Kovács János                                                   │  │
│  │  • Telefon: +36 30 123 4567                                           │  │
│  │  • Email: kovacs@email.hu                                             │  │
│  │  • Cím: 1111 Budapest, Fő u. 1.                                       │  │
│  │  • Adószám: 12345678-1-42                                             │  │
│  │  • Hitelkeret: 100.000 Ft (GLOBÁLIS)                                  │  │
│  │  • Össz tartozás: 45.000 Ft (számított, összesített)                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  BOLT-SPECIFIKUS (tenant séma):                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ KGC PEST        │  │ KGC BUDA        │  │ FRANCHISE GYŐR  │              │
│  │                 │  │                 │  │                 │              │
│  │ Bérlések: 2 db  │  │ Szerviz: 1 db   │  │ Vásárlás: 3 db │              │
│  │ Tartozás: 0 Ft  │  │ Tartozás: 15k   │  │ Tartozás: 30k  │              │
│  │                 │  │                 │  │                 │              │
│  │ [Részletek ✅]  │  │ [Részletek ?]   │  │ [Részletek ?]  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Láthatósági Mátrix

| Adat | Saját bolt | Saját hálózat | Franchise |
|------|------------|---------------|-----------|
| Partner alapadatok | ✅ Teljes | ✅ Teljes | ✅ Teljes |
| Partner hitelkeret | ✅ | ✅ | ✅ |
| Össz tartozás | ✅ | ✅ | ✅ |
| Saját tranzakciók részletei | ✅ | ❌ | ❌ |
| Más bolt tranzakció részletei | ❌ | ❌ | ❌ |
| Más bolt tranzakció összesítés | ✅ (darabszám) | ✅ (darabszám) | ✅ (darabszám) |

**Magyarázat:**
- Minden bolt látja a partner alapadatait és összesített tartozását
- Részletes tranzakciókat (melyik gépet bérelte, milyen szerviz volt) csak a saját bolt látja
- Más boltokról csak aggregált adatot lát (pl. "2 aktív bérlés Pesten")

---

## 4. Adat Felosztás Összefoglaló

### KÖZÖS (public séma) - Minden bolt ugyanazt látja

| Kategória | Táblák |
|-----------|--------|
| **CORE** | tenants, users, roles, permissions, settings |
| **PARTNER** | partner, ceg, meghatalmazott |
| **KÉSZLET TÖRZS** | cikk, cikkcsoport, beszallito, arszabaly |
| **TUDÁSBÁZIS** | robbantott_abra, geptipus_alkatresz |
| **BESZERZÉS (közös)** | beszallito_api_config, supplier_product_mapping, supplier_price_history |
| **AI CHATBOT (közös)** | ai_knowledge_base, ai_knowledge_embeddings, ai_intent_training, ai_approval_queue |

### BOLT-SPECIFIKUS (tenant_X séma) - Minden bolt a sajátját látja

| Kategória | Táblák |
|-----------|--------|
| **BÉRLÉS** | bergep, berles, szerzodes, kaucio, keses |
| **SZERVIZ** | munkalap, munkalap_tetel, arajanlat, garancia_claim, belso_megjegyzes |
| **ÉRTÉKESÍTÉS** | keszlet, keszlet_mozgas, bevetelezes, bevetelezes_tetel, eladas, eladas_tetel |
| **PÉNZÜGY** | szamla, szamla_tetel, befizetés |
| **AUDIT** | audit_log (7 év megőrzés) |
| **BESZERZÉS (bolt)** | supplier_order, supplier_order_items, price_override |
| **AI CHATBOT (bolt)** | ai_conversations, ai_messages, ai_escalations, ai_feedback |

---

## 5. Hivatkozások a Sémák Között

### Példa: Bérlés létrehozása

```
tenant_kgc1.berles
├─ partner_id → public.partner.id        (központi partner)
├─ bergep_id → tenant_kgc1.bergep.id     (saját bérgép)
│   └─ cikk_id → public.cikk.id          (központi cikk)
├─ kiadta_user_id → public.users.id      (központi user)
└─ tenant_id = 'kgc1'                     (implicit a sémából)
```

### Példa: Munkalap létrehozása

```
tenant_kgc1.munkalap
├─ partner_id → public.partner.id        (központi partner)
├─ geptipus → szabad szöveg VAGY public.cikk.id
├─ felvevo_user_id → public.users.id     (központi user)
└─ tenant_id = 'kgc1'

tenant_kgc1.munkalap_tetel
├─ munkalap_id → tenant_kgc1.munkalap.id (saját munkalap)
├─ cikk_id → public.cikk.id              (központi alkatrész)
└─ tenant_id = 'kgc1'
```

---

## 6. Modul Engedélyezés (Feature Flags)

### Tenant Konfiguráció

```
public.tenants:
├─ tenant_id: 'kgc1'
├─ nev: 'KGC Pest'
├─ tipus: 'sajat'              -- 'sajat' vagy 'franchise'
├─ halozat_id: 'kgc'           -- melyik hálózathoz tartozik
├─ modules_enabled:
│   ├─ berles: true
│   ├─ szerviz: true
│   ├─ ertekesites: true
│   ├─ garancia: true          -- Makita garancia kezelés
│   ├─ beszerzés: true         -- Supplier API integráció (ADR-017)
│   └─ ai_chatbot: true        -- Koko AI chatbot (ADR-016)
└─ created_at: 2025-01-01
```

### Elérhető Csomagok

| Csomag | Bérlés | Szerviz | Értékesítés | Garancia | Beszerzés | AI Chatbot |
|--------|--------|---------|-------------|----------|-----------|------------|
| **Basic Bérlés** | ✅ | ❌ | ✅ (alap) | ❌ | ❌ | ✅ (alap) |
| **Basic Szerviz** | ❌ | ✅ | ✅ (alap) | ✅ | ❌ | ✅ (alap) |
| **Pro** | ✅ | ✅ | ✅ | ✅ | ✅ (napi sync) | ✅ (multi-channel) |
| **Enterprise** | ✅ | ✅ | ✅ | ✅ + extra | ✅ (real-time) | ✅ (advanced) |

---

## 7. Séma Létrehozás Új Bolthoz

### Folyamat

```
1. Admin létrehoz új tenant-et
   └─ INSERT INTO public.tenants (...)

2. Rendszer létrehozza a sémát
   └─ CREATE SCHEMA tenant_xyz

3. Rendszer létrehozza a táblákat
   └─ Migrate: tenant_xyz.bergep, tenant_xyz.berles, ...

4. Rendszer beállítja a jogosultságokat
   └─ GRANT SELECT ON public.* TO tenant_xyz_role
   └─ GRANT ALL ON tenant_xyz.* TO tenant_xyz_role
```

---

## 8. Kapcsolat a Folyamatokhoz

### Érintett Folyamatok

| Folyamat | Hol változik? | Változás |
|----------|---------------|----------|
| Ügyfél felvétel | `01-ugyfelfelvitel-*.md` | Partner → public.partner |
| Bérlés | `03-bergep-*.md` | Bergep → tenant.bergep, hivatkozás public.cikk |
| Szerviz | `04-szerviz-*.md` | Munkalap → tenant.munkalap |
| Értékesítés | `02-ertekesites-*.md` | Készlet → tenant.keszlet + public.cikk |
| RBAC | `09-rbac-*.md` | Users → public.users, tenant szűrés |

### Új Diagramok Szükségesek

| Diagram | Típus | Prioritás |
|---------|-------|-----------|
| Multi-tenant adatfolyam | DFD | 🔴 Kritikus |
| Séma struktúra | ERD | 🔴 Kritikus |
| Partner láthatóság | Döntési fa | 🟡 Magas |

---

## 9. Összefoglaló Döntések

| # | Döntés | Választott opció |
|---|--------|------------------|
| 1 | Architektúra | A+B hibrid (1 szerver, séma szeparáció) |
| 2 | Partner | Központi (public.partner) |
| 3 | Partner részletek | Bolt-specifikus tranzakciók |
| 4 | Cikktörzs | Központi (public.cikk) |
| 5 | Készlet | Bolt-specifikus (tenant.keszlet) |
| 6 | Árazás | Központi szabályok (public.arszabaly) |
| 7 | Felhasználók | Központi (public.users) + tenant hozzárendelés |
| 8 | Franchise | Ugyanaz a struktúra, de külön tenant |

---

## 10. Kapcsolódó Dokumentumok

| Dokumentum | Elérési út |
|------------|------------|
| Architektúra opciók (A/B/C) | [/docs/architecture/ADR-009-modular-architecture-alternatives.md](ADR-009-modular-architecture-alternatives.md) |
| A vs B vezetői összefoglaló | [/docs/architecture/ADR-009-A-vs-B-vezetoi-osszefoglalas.md](ADR-009-A-vs-B-vezetoi-osszefoglalas.md) |
| Fit-Gap analízis | [/docs/Flows/FIT-GAP-ANALYSIS.md](../Flows/FIT-GAP-ANALYSIS.md) |
| Árazási stratégia | [/docs/architecture/ADR-012-arastrategia-opciok.md](ADR-012-arastrategia-opciok.md) |
| Fit-Gap döntések | [/docs/architecture/ADR-013-fit-gap-dontesek.md](ADR-013-fit-gap-dontesek.md) |
| AI Chatbot (Koko) | [/docs/architecture/ADR-016-ai-chatbot-koko.md](ADR-016-ai-chatbot-koko.md) |
| Supplier API Integráció | [/docs/architecture/ADR-017-szallitoi-api-integracio.md](ADR-017-szallitoi-api-integracio.md) |

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2025-12-11 | 1.0 | Kezdeti dokumentum |
| 2025-12-31 | 1.1 | **BESZERZÉS modul** (2.7, ADR-017) és **AI CHATBOT modul** (2.8, ADR-016) hozzáadása. Feature flag bővítés (6. szekció). Kapcsolódó dokumentumok frissítése (10. szekció). |
