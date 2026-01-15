# ADR-009 Melléklet: Moduláris Architektúra - Vezetői Összefoglaló

> **MEGJEGYZÉS:** Ez a dokumentum az **ADR-009 nem-technikai melléklete**, menedzsment döntéstámogatás céljából. A teljes technikai specifikációt lásd: [ADR-009-modular-architecture-alternatives.md](ADR-009-modular-architecture-alternatives.md)

## Vezetői Összefoglaló

**Dátum:** 2025-12-11
**Dokumentum típusa:** Döntéstámogató anyag menedzsment részére
**Kapcsolódó technikai dokumentum:** [ADR-009-modular-architecture-alternatives.md](ADR-009-modular-architecture-alternatives.md)

---

## Mi a kérdés?

A KGC ERP rendszert **moduláris SaaS**-ként értékesítjük. Az ügyfelek kiválaszthatják a szükséges modulokat:
- **Szerviz** - Munkalapok, garanciális javítás
- **Bérlés** - Bérgép kezelés, szerződések
- **Áruház** - Készletkezelés, értékesítés

**A döntés:** Hogyan építsük fel a rendszert belülről?

---

## A két opció röviden

| | **A) Nagy Központ** | **B) Szolgáltatás Réteg** |
|---|---------------------|--------------------------|
| **Egyszerű analógia** | Egy nagy épület közös alappal | Több kisebb épület összekötve |
| **Készlet kezelés** | A központban van | Külön "szolgáltatás" |
| **Komplexitás** | Egyszerűbb | Összetettebb |
| **Rugalmasság** | Kevesebb | Több |

---

## Opció A: Nagy Központ (Shared Core)

### Hogyan működik?

```
┌─────────────────────────────────────────────────┐
│              KÖZPONTI RENDSZER                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │Ügyfelek │ │ Készlet │ │ Számlák │ │Felh.ok │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ SZERVIZ │   │ BÉRLÉS  │   │ ÁRUHÁZ  │
   │ (extra) │   │ (extra) │   │ (extra) │
   └─────────┘   └─────────┘   └─────────┘
```

**Minden közös funkció egy helyen van**, a modulok csak a saját specifikus dolgaikat tartalmazzák.

---

### A opció ELŐNYEI

| Előny | Mit jelent az üzletnek? |
|-------|------------------------|
| **Gyorsabb fejlesztés** | Hamarabb piacra vihető a termék. MVP 2-3 hónappal korábban kész. |
| **Olcsóbb indulás** | Kevesebb fejlesztői munka szükséges az elején. |
| **Egyszerűbb üzemeltetés** | Egy rendszert kell karbantartani, nem többet. Alacsonyabb havi üzemeltetési költség. |
| **Könnyebb hibajavítás** | Ha valami elromlik, egy helyen kell keresni. Gyorsabb support. |
| **Új kollégák gyorsabban tanulják** | Egyszerűbb struktúra = kevesebb betanítási idő. |

---

### A opció HÁTRÁNYAI

| Hátrány | Mit jelent az üzletnek? |
|---------|------------------------|
| **Minden ügyfél ugyanazt kapja** | Nehezebb egyedi igényeket kiszolgálni. Fix 3-4 csomag lesz csak. |
| **Központi változás mindenkit érint** | Ha a központban módosítunk, minden modul tesztelése szükséges. |
| **Nehezebb később bővíteni** | Ha nagyon nő a rendszer, átstrukturálás kellhet. |
| **Skálázási korlát** | Egy szerveren fut minden - nagyon sok ügyfélnél lassulhat. |

---

### A opció - Üzleti számok

| Mutató | Érték |
|--------|-------|
| **Fejlesztési idő (MVP)** | 4-6 hónap |
| **Fejlesztési költség (MVP)** | Alap |
| **Havi üzemeltetési költség** | Alacsony |
| **Támogatható ügyfelek száma** | 1-100 ügyfél gond nélkül |
| **Szükséges csapat méret** | 2-4 fejlesztő |
| **Csomag variációk** | 3-4 fix csomag |

---

## Opció B: Szolgáltatás Réteg (Készlet Service)

### Hogyan működik?

```
┌─────────────────────────────────────────────────┐
│              KÖZPONTI RENDSZER                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │Ügyfelek │ │ Számlák │ │Felh.ok │             │
│  └─────────┘ └─────────┘ └─────────┘            │
└─────────────────────┬───────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌─────────────────────────┐
│ KÉSZLET SZOLG.   │    │       MODULOK           │
│ (külön rendszer) │◄───┤ Szerviz │ Bérlés │Áruház│
└──────────────────┘    └─────────────────────────┘
```

**A készletkezelés külön "szolgáltatásként" működik**, amit minden modul használ.

---

### B opció ELŐNYEI

| Előny | Mit jelent az üzletnek? |
|-------|------------------------|
| **Jobb teljesítmény** | A készlet kezelés külön szerveren futhat. Több egyidejű felhasználó. |
| **Rugalmasabb skálázás** | Ha a készlet a szűk keresztmetszet, csak azt kell erősíteni. |
| **Könnyebb specializáció** | A készlet fejlesztője csak arra koncentrál. |
| **Előkészület a jövőre** | Ha tovább bővül a rendszer, már kész az alap. |
| **Egyedi készlet logika** | Ügyfélspecifikus készlet szabályok könnyebben kezelhetők. |

---

### B opció HÁTRÁNYAI

| Hátrány | Mit jelent az üzletnek? |
|---------|------------------------|
| **Drágább fejlesztés** | Több kód, több tervezés szükséges. +30-50% fejlesztési költség. |
| **Lassabb indulás** | MVP 1-2 hónappal később készül el. |
| **Bonyolultabb üzemeltetés** | Két rendszert kell karbantartani. Magasabb havi költség. |
| **Nehezebb hibajavítás** | A hiba lehet a központban VAGY a készlet szolgáltatásban. |
| **Több szakértelem kell** | A csapatnak több területen kell értenie. |

---

### B opció - Üzleti számok

| Mutató | Érték |
|--------|-------|
| **Fejlesztési idő (MVP)** | 6-9 hónap |
| **Fejlesztési költség (MVP)** | Alap + 30-50% |
| **Havi üzemeltetési költség** | Közepes |
| **Támogatható ügyfelek száma** | 100-1000 ügyfél |
| **Szükséges csapat méret** | 4-7 fejlesztő |
| **Csomag variációk** | 4-6 csomag |

---

## Döntési Mátrix

### Mikor válasszuk A-t?

| Feltétel | Teljesül? |
|----------|-----------|
| Kis csapat (2-5 fő) | ☐ |
| Gyors piacra lépés fontos | ☐ |
| Kezdetben kevés ügyfél (<50) | ☐ |
| Fix csomagok elegendőek | ☐ |
| Korlátozott kezdeti büdzsé | ☐ |
| **Ha 3+ igen:** | **→ A opció** |

### Mikor válasszuk B-t?

| Feltétel | Teljesül? |
|----------|-----------|
| Nagyobb csapat (5+ fő) | ☐ |
| Hosszabb távú tervezés (2+ év) | ☐ |
| Sok ügyfél várható (100+) | ☐ |
| Egyedi igények fontosak | ☐ |
| Készlet intenzív működés | ☐ |
| **Ha 3+ igen:** | **→ B opció** |

---

## Költség Összehasonlítás

### Első év költségek (becslés)

| Költség típus | A opció | B opció | Különbség |
|---------------|---------|---------|-----------|
| **Fejlesztés (MVP)** | 100% | 140% | +40% |
| **Infrastruktúra/hó** | 100% | 150% | +50% |
| **Üzemeltetés/hó** | 100% | 130% | +30% |
| **Első év összköltsége** | 100% | 135% | +35% |

### Megtérülési pont

| Szempont | A opció | B opció |
|----------|---------|---------|
| **Ügyfelek amíg jól működik** | 1-100 | 100-1000 |
| **Mikor éri meg B-re váltani?** | 50+ ügyfél felett | - |
| **Átállás költsége A→B** | - | Alap fejlesztés 30%-a |

---

## Kockázatok

### A opció kockázatai

| Kockázat | Valószínűség | Hatás | Kezelés |
|----------|--------------|-------|---------|
| Rendszer lassul sok ügyfélnél | Közepes | Magas | Átállás B-re |
| Egyedi igény nem teljesíthető | Magas | Közepes | Elutasítás vagy kompromisszum |
| Nagy változtatás nehéz | Közepes | Közepes | Fokozatos refaktorálás |

### B opció kockázatai

| Kockázat | Valószínűség | Hatás | Kezelés |
|----------|--------------|-------|---------|
| Túl sokáig tart a fejlesztés | Magas | Magas | Szigorú határidők |
| Túl bonyolult a kiscsapatnak | Közepes | Magas | Csapatbővítés |
| Felesleges komplexitás | Közepes | Közepes | Egyszerűsítés |

---

## Ajánlás

### Javasolt stratégia: **Kezdj A-val, készülj B-re**

```
┌─────────────────────────────────────────────────────────────────┐
│                        IDŐBELI TERV                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2025 H1-H2          2025 H3-H4          2026+                  │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐           │
│  │ A OPCIÓ  │───────►│ ÉRTÉKELÉS│───────►│ B OPCIÓ? │           │
│  │   MVP    │        │  50+ üf? │        │ ÁTÁLLÁS  │           │
│  └──────────┘        └──────────┘        └──────────┘           │
│                                                                 │
│  • Gyors piacra      • Teljesítmény      • Csak ha              │
│    lépés               figyelés            szükséges            │
│  • Első ügyfelek     • Ügyfél             • Fokozatos           │
│  • Validálás           visszajelzések      átállás              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Miért ez a stratégia?

1. **Gyorsabb bevétel**: A opció 2-3 hónappal hamarabb termel.
2. **Kisebb kockázat**: Validáljuk a piacot mielőtt nagyot költünk.
3. **Rugalmasság**: Ha kell, átállunk B-re a megfelelő pillanatban.
4. **Erőforrás hatékonyság**: Kis csapattal is megvalósítható.

### Átállási trigger pontok (A→B)

| Trigger | Küszöb |
|---------|--------|
| Aktív ügyfelek száma | > 50 |
| Egyidejű felhasználók | > 200 |
| Készlet műveletek/nap | > 10.000 |
| Ügyfelek egyedi igényei | > 30% kér egyedit |

---

## Összefoglaló táblázat

| Szempont | A opció | B opció | Nyertes |
|----------|---------|---------|---------|
| Fejlesztési sebesség | ★★★★★ | ★★★☆☆ | A |
| Kezdeti költség | ★★★★★ | ★★★☆☆ | A |
| Egyszerűség | ★★★★★ | ★★★☆☆ | A |
| Skálázhatóság | ★★☆☆☆ | ★★★★☆ | B |
| Rugalmasság | ★★☆☆☆ | ★★★★☆ | B |
| Hosszú távú fenntarthatóság | ★★★☆☆ | ★★★★☆ | B |
| **Kis csapatnak (2-5 fő)** | ★★★★★ | ★★☆☆☆ | **A** |
| **Nagy csapatnak (5+ fő)** | ★★★☆☆ | ★★★★☆ | **B** |

---

## Döntés

| Mező | Érték |
|------|-------|
| **Kiválasztott opció** | ☐ A (Nagy Központ) / ☐ B (Szolgáltatás Réteg) |
| **Döntés dátuma** | _________________ |
| **Döntéshozó** | _________________ |
| **Felülvizsgálat időpontja** | _________________ |

### Megjegyzések:

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

---

## Kapcsolódó dokumentumok

| Dokumentum | Elérési út |
|------------|------------|
| Technikai részletek (A/B/C) | [/docs/architecture/ADR-009-modular-architecture-alternatives.md](ADR-009-modular-architecture-alternatives.md) |
| C opció részletek | [/docs/architecture/ADR-010-micro-modules-detailed.md](ADR-010-micro-modules-detailed.md) |
| B→C migrációs útmutató | [/docs/architecture/ADR-011-b-to-c-migration-guide.md](ADR-011-b-to-c-migration-guide.md) |
| Árazási stratégia | [/docs/architecture/ADR-012-arastrategia-opciok.md](ADR-012-arastrategia-opciok.md) |
