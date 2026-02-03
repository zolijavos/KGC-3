# Property-Based Testing for Inventory Dashboard

## Áttekintés

Ez a könyvtár tartalmazza a készlet dashboard widgetek számításainak és adattranszformációinak property-based tesztjeit. A tesztek a **fast-check** könyvtárat használják véletlenszerű teszt adatok generálására és invariánsok (változatlan tulajdonságok) ellenőrzésére.

## Mi az a Property-Based Testing?

A hagyományos unit tesztekkel ellentétben, ahol konkrét input-output párokat tesztelünk, a property-based testing azt vizsgálja, hogy bizonyos **invariánsok** (matematikai tulajdonságok) teljesülnek-e **bármilyen** véletlenszerű input esetén.

### Példa

**Hagyományos unit teszt:**
```typescript
test('5 + 3 = 8', () => {
  expect(add(5, 3)).toBe(8);
});
```

**Property-based teszt:**
```typescript
test('összeadás kommutatív', () => {
  fc.assert(
    fc.property(fc.integer(), fc.integer(), (a, b) => {
      expect(add(a, b)).toBe(add(b, a)); // bármely a, b esetén
    })
  );
});
```

## Tesztelt Invariánsok

### 1. Magyar szám formázás

- **Invariáns**: A magyar locale számformázás mindig valid stringet ad vissza
- **Ellenőrzések**:
  - Nem üres string
  - Csak számjegyek és szóközök (ezres elválasztó)
  - Visszafordítható (parsing visszaadja az eredeti számot)
  - Megőrzi a számjegyek számát

### 2. Helyszín százalékok

- **Invariáns**: A helyszínek szerint elosztott készlet százalékai mindig ~100%-ra összegződnek
- **Ellenőrzések**:
  - Összeg = 100% ± 0.1% (float kerekítési tolerancia)
  - Minden százalék arányos a darabszámmal
  - Minden százalék 0-100 között van

### 3. Készletmozgás nettó számítás

- **Invariáns**: Nettó = Beérkezés - Kiadás (kommutatív)
- **Ellenőrzések**:
  - `net = inbound - outbound`
  - `net = -(outbound - inbound)` (kommutatív)
  - Ha inbound > outbound → net > 0
  - Ha outbound > inbound → net < 0
  - Ha egyenlők → net = 0

### 4. Hőtérkép szín intenzitás

- **Invariáns**: A szín intenzitás konzisztensen képződik le a kihasználtsági tartományokra
- **Ellenőrzések**:
  - 0%: szürke (használatlan)
  - 1-40%: világoskék
  - 41-70%: középkék
  - 71-90%: erős kék
  - 91-100%: sötétkék
  - Determinisztikus (ugyanaz az input → ugyanaz a szín)
  - Monoton növekvő (magasabb kihasználtság → intenzívebb szín)

### 5. Dátum formázás

- **Invariáns**: A dátum stringek mindig timezone-safe és visszaalakíthatók
- **Ellenőrzések**:
  - Visszaalakítható Date objektummá
  - Magyar formázás: `YYYY. MM. DD.` vagy `YYYY. M. D.`
  - Chart X-tengely formátum: `M/D` vagy `MM/DD`
  - Hónap: 1-12, Nap: 1-31

### 6. Készlet összesítés totalok

- **Invariáns**: A total mindig megegyezik a részösszegekkel
- **Ellenőrzések**:
  - Total = helyszínek darabszámának összege
  - Total = státusz breakdown összege (elérhető + bérlésben + szervizben)
  - Minden státusz ≥ 0 és ≤ total

### 7. Hőtérkép adat struktúra

- **Invariáns**: A hőtérkép cellák mindig valid adatokat tartalmaznak
- **Ellenőrzések**:
  - Kihasználtság: 0-100%
  - Darabszám ≥ 0
  - Gép típus és helyszín nem üres stringek

### 8. Szélsőséges esetek

- **Invariáns**: Edge case-ek konzisztens eredményt adnak
- **Ellenőrzések**:
  - 0 darabszám → 0% minden helyszínen
  - 1 helyszín → 100% eloszlás
  - Százalék formázás 1 tizedesjegyre stabil

## Tesztek futtatása

```bash
# Összes property-based teszt futtatása
pnpm --filter @kgc/ui test tests/property-based

# Csak inventory tesztek
pnpm --filter @kgc/ui test tests/property-based/inventory-properties.spec.ts

# Watch mode
pnpm --filter @kgc/ui test:watch tests/property-based/inventory-properties.spec.ts
```

## Konfiguráció

A tesztek a következő beállításokat használják:

- **fast-check**: Véletlenszerű teszt adat generálás
- **Vitest**: Test runner és assertion library
- **100 futtatás**: Alapértelmezetten minden property 100 véletlenszerű inputtal fut

## Használt Generátorok (Arbitraries)

```typescript
stockCountArb           // 0-10,000 közötti számok
locationNameArb         // Helyszín nevek (budapest_raktár, stb.)
machineTypeArb          // Gép típusok (Fúró, Csiszoló, stb.)
utilizationPercentArb   // 0-100 százalék
recentDateArb           // Utolsó 30 nap dátumai
stockMovementArb        // Készletmozgás rekord
locationBreakdownArb    // Helyszín breakdown
stockSummaryArb         // Teljes készlet összesítés
heatmapCellArb          // Hőtérkép cella
```

## Előnyök

1. **Több edge case lefedése**: Véletlenszerű generálással olyan edge case-eket találunk, amelyekre kézzel nem gondoltunk volna
2. **Regressziós védelem**: Ha egy property egyszer elromlik, a teszt mindig megtalálja
3. **Dokumentáció**: A property-k dokumentálják a rendszer invariánsait
4. **Bizalom**: 100 véletlenszerű teszt > 5 kézzel írt teszt

## További információk

- [fast-check dokumentáció](https://fast-check.dev/)
- [Property-Based Testing útmutató](https://fsharpforfunandprofit.com/posts/property-based-testing/)
- [Story 35-3 implementáció](/root/LABS/KGCERP/KGC-3/implementation-artifacts/stories/epic-35/)
