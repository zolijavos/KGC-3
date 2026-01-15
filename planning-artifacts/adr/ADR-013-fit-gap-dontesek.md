# ADR-013: Fit-Gap Analízis Döntések

**Dátum:** 2025-12-11
**Státusz:** Elfogadva
**Résztvevők:** Javo!, Winston (Architect)

---

## Összefoglaló

A Fit-Gap analízis során felmerült kérdésekre adott válaszok és döntések dokumentálása.

---

## 1. Garanciális Munkalap - Bevizsgálási Díj

### Döntés: **B) Felhasználó dönt (figyelmeztetéssel)**

| Tulajdonság | Érték |
|-------------|-------|
| Mező | Bevizsgálási díj |
| Alapértelmezett | 0 Ft (garanciálisnál) |
| Módosítható | IGEN |
| Figyelmeztetés | "Garanciális gépnél általában 0 Ft a bevizsgálási díj" |

### Implementáció

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MUNKALAP FELVÉTEL - Garanciális javítás                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Típus: (•) Garanciális javítás                                         │
│                                                                         │
│  Bevizsgálási díj: [ 0 ] Ft                                             │
│  ⚠️ Garanciális gépnél általában 0 Ft a bevizsgálási díj               │
│                                                                         │
│  [ ] Mégis felszámítom (indoklás kötelező)                              │
│      Indoklás: [________________________________]                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Indoklás
- Rugalmasság: Egyedi esetekben lehet díjat felszámítani
- Figyelmeztetés megakadályozza a véletlenszerű hibát
- Audit: Ha mégis díjat számítanak, az indoklás rögzítve

---

## 2. Ügyféltér Belépési Kód

### Döntés: **B) 4 számjegy**

| Tulajdonság | Érték |
|-------------|-------|
| Formátum | 4 számjegy (0000-9999) |
| Kombinációk | 10.000 |
| Példa | 4721 |
| Érvényesség | Nem jár le automatikusan |

### Implementáció

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KGC ERP                                         │
│                                                                         │
│           Emelt funkció eléréséhez adja meg PIN kódját:                 │
│                                                                         │
│                     ┌───┬───┬───┬───┐                                   │
│                     │ * │ * │ * │ _ │                                   │
│                     └───┴───┴───┴───┘                                   │
│                                                                         │
│                 [1] [2] [3]                                             │
│                 [4] [5] [6]                                             │
│                 [7] [8] [9]                                             │
│                     [0]                                                 │
│                                                                         │
│              [Mégse]            [Belépés]                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Belépési Szintek

| Szint | Név | Hozzáférés | PIN szükséges? |
|-------|-----|------------|----------------|
| 0 | Alap (Ügyféltér) | Bérlés, Szerviz felvétel, Eladás | NEM |
| 1 | Emelt | Bevételezés, Statisztikák, Ügyfél részletek | IGEN (4 számjegy) |
| 2 | Admin | Ár módosítás, Pénzügy, Riportok, Beállítások | IGEN (4 számjegy + jogosultság) |

### Biztonsági Szabályok
- 3 hibás próbálkozás → 1 perc várakozás
- 10 hibás próbálkozás → Admin értesítés
- Inaktivitás (5 perc) → Visszaáll Szint 0-ra

---

## 3. Kaució Visszatérítés Szabályok

### Döntés: **A1 + A3 + B2**

### A) Ha más hozza vissza a gépet

| Ügyfél típus | Szabály |
|--------------|---------|
| **Magánszemély** | A1: Mindig meghatalmazás szükséges |
| **Céges** | A3: Ha rajta van a meghatalmazott listán → OK |

### B) Készpénzes visszaadás (ha nincs kártya)

| Szabály | B2: Csak meghatalmazással |
|---------|---------------------------|
| Követelmény | Eredeti bérlő írásban engedélyezi |
| Dokumentum | Meghatalmazás + Átvételi elismervény |
| Aláírás | Átvevő + Személyi ig. szám |

### Implementáció - Folyamat

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KAUCIÓ VISSZATÉRÍTÉS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Bérlés: BER-2025-00456                                                 │
│  Eredeti bérlő: Kovács János                                            │
│  Kaució: 50.000 Ft (bankkártyával fizetve)                              │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Ki hozta vissza a gépet?                                               │
│  (•) Eredeti bérlő (Kovács János)                                       │
│  ( ) Más személy                                                        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  [Ha "Más személy" választva:]                                          │
│                                                                         │
│  Átvevő neve: [Kiss Péter_______________]                               │
│                                                                         │
│  Ügyfél típus: ( ) Magánszemély  (•) Céges                              │
│                                                                         │
│  [Céges esetén:]                                                        │
│  ✅ Meghatalmazott listán szerepel (ABC Kft. - 2025.01.15 óta)          │
│                                                                         │
│  [Magánszemély esetén:]                                                 │
│  ⚠️ Meghatalmazás szükséges!                                            │
│  [ ] Meghatalmazás csatolva (PDF/fotó)                                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Visszatérítés módja:                                                   │
│  (•) Bankkártyára (eredeti kártyára: **** **** **** 4521)               │
│  ( ) Készpénz                                                           │
│                                                                         │
│  [Ha "Készpénz" választva:]                                             │
│  ⚠️ Készpénzes visszaadáshoz meghatalmazás szükséges!                   │
│  [ ] Meghatalmazás csatolva                                             │
│  Átvevő személyi ig. szám: [________]                                   │
│                                                                         │
│                        [Visszatérítés] [Mégse]                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Döntési Fa

```
                    Kaució visszatérítés
                           │
              ┌────────────┴────────────┐
              │                         │
      Eredeti bérlő            Más személy hozza
              │                         │
              ▼                         ▼
     ┌────────────────┐      ┌──────────────────┐
     │ Van kártyája?  │      │  Ügyfél típus?   │
     └───────┬────────┘      └────────┬─────────┘
             │                        │
      ┌──────┴──────┐          ┌──────┴──────┐
      │             │          │             │
    IGEN          NEM      Magán-        Céges
      │             │      személy          │
      ▼             ▼          │             ▼
   Kártyára    Meghatalm.      ▼      ┌───────────┐
   visszautal   + Készpénz  Meghatalm. │ Listán    │
                szükséges   KÖTELEZŐ   │ szerepel? │
                                       └─────┬─────┘
                                             │
                                      ┌──────┴──────┐
                                      │             │
                                    IGEN          NEM
                                      │             │
                                      ▼             ▼
                                    OK ✅      Meghatalm.
                                              KÖTELEZŐ
```

---

## 4. Audit Log Megőrzés

### Döntés: **B) 7 év**

| Tulajdonság | Érték |
|-------------|-------|
| Megőrzési idő | 7 év |
| Jogalap | Magyar adótörvény (NAV visszaellenőrzés) |
| GDPR | Törvényi kötelezettség alapján indokolt |

### Mit tartalmaz az audit log?

| Kategória | Példák | Megőrzés |
|-----------|--------|----------|
| Bérlési tranzakciók | Kiadás, visszavétel, kaució | 7 év |
| Pénzügyi bizonylatok | Számlák, befizetések | 7 év |
| Szerviz munkalapok | Felvétel, javítás, kiadás | 7 év |
| Készlet mozgások | Bevételezés, eladás | 7 év |
| Felhasználói műveletek | Bejelentkezés, módosítások | 7 év |

### Technikai Megvalósítás

```sql
-- Audit log tábla
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    tabla_nev VARCHAR(100) NOT NULL,
    rekord_id UUID NOT NULL,
    muvelet VARCHAR(20) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE'
    regi_ertek JSONB,
    uj_ertek JSONB,
    felhasznalo_id UUID NOT NULL,
    ip_cim VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Automatikus törlés 7 év után (cron job)
DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '7 years';
```

### GDPR Megfelelőség

| Követelmény | Megoldás |
|-------------|----------|
| Jogalap | Törvényi kötelezettség (adótörvény) |
| Indoklás | NAV 7 éves visszaellenőrzési jog |
| Törlés | Automatikus 7 év után |
| Hozzáférés | Csak Admin + Könyvelő |

---

## Összefoglaló Táblázat

| # | Kérdés | Döntés | Kód |
|---|--------|--------|-----|
| 1 | Garanciális bevizsgálási díj | Felhasználó dönt (figyelmeztetéssel) | B |
| 2 | Ügyféltér PIN kód | 4 számjegy | B |
| 3a | Más hozza vissza (magán) | Mindig meghatalmazás | A1 |
| 3b | Más hozza vissza (céges) | Listáról OK | A3 |
| 3c | Készpénzes visszaadás | Csak meghatalmazással | B2 |
| 4 | Audit log megőrzés | 7 év | B |

---

## Következő Lépések

1. ✅ Döntések dokumentálva (ADR-013)
2. ⏳ Fit-Gap analízis frissítése
3. ⏳ Érintett diagramok módosítása
4. ⏳ PRD frissítése az új követelményekkel

---

## Kapcsolódó Dokumentumok

| Dokumentum | Hely |
|------------|------|
| Fit-Gap Analízis | [FIT-GAP-ANALYSIS.md](../Flows/FIT-GAP-ANALYSIS.md) |
| Árazási Stratégia | [ADR-012-arastrategia-opciok.md](ADR-012-arastrategia-opciok.md) |
| Szerviz folyamat | [04-szerviz-folyamat.md](../Flows/diagram-docs/04-szerviz-folyamat.md) |
| RBAC hierarchia | [09-rbac-hierarchia.md](../Flows/diagram-docs/09-rbac-hierarchia.md) |
