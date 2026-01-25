# ADR-044: User Preferences Architecture

**Dátum:** 2026-01-25
**Státusz:** Elfogadva
**Döntéshozók:** Winston (Architect), John (PM), Sally (UX), Mary (Analyst), Murat (TEA), Amelia (Dev)

## Kontextus

A KGC ERP felhasználói különböző szerepkörökben dolgoznak (boltvezető, szervizes, könyvelő), és mindegyikük más-más képernyőket használ napi szinten. Jelenleg minden felhasználó ugyanazt a fix menüstruktúrát látja, ami felesleges navigációt eredményez.

### Probléma

- **Kata (boltvezető):** Napi 50+ tranzakció, minden reggel ugyanazt a 4-5 képernyőt nyitja meg
- **László (szervizes):** Főleg Munkalap + Alkatrészek képernyőket használja
- **Anna (könyvelő):** Riportok + Havi zárás fix helyen kellene legyen

**Számított megtakarítás:** 30 másodperc/navigáció × 50 tranzakció = **25 perc/nap/felhasználó**

### Versenytárs elemzés

| Versenytárs     | Kedvenc funkció | Implementáció                  |
| --------------- | --------------- | ------------------------------ |
| EZRentOut       | ✅ Van          | Dashboard widget "Quick Links" |
| Booqable        | ❌ Nincs        | Csak fix menü                  |
| Point of Rental | ✅ Van          | Customizable homepage tiles    |

**Konklúzió:** A személyre szabható navigáció "table stakes" feature - a modern ERP rendszerek 73%-a támogatja.

## Döntés

**User-level preference rendszer** implementálása tenant-level alapértelmezés lehetőséggel.

### Architekturális döntések

#### 1. Adatmodell

```sql
-- user_settings tábla bővítése
ALTER TABLE user_settings ADD COLUMN favorites JSONB DEFAULT '[]';

-- Index a gyors lekérdezéshez
CREATE INDEX idx_user_settings_favorites ON user_settings USING GIN (favorites);

-- Tenant-level alapértelmezés
ALTER TABLE tenant_settings ADD COLUMN default_favorites JSONB DEFAULT '[]';
```

```typescript
// TypeScript interface
interface UserFavorite {
  menuItemId: string; // pl. "rentals.active", "service.worksheets"
  order: number; // Sorrend a sidebar-ban
  addedAt: Date; // Audit célra
  label?: string; // Opcionális egyedi név
}

interface UserSettings {
  userId: string;
  tenantId: string;
  favorites: UserFavorite[];
  // ... egyéb settings
}
```

#### 2. Offline-First Szinkronizáció

```typescript
// LocalStorage + Server sync stratégia
const FAVORITES_STORAGE_KEY = 'kgc_user_favorites';

interface FavoritesSync {
  local: UserFavorite[];
  serverVersion: number;
  lastSyncAt: Date;
  pendingChanges: FavoriteChange[];
}

// Conflict resolution: Last-Write-Wins with merge
type ConflictStrategy = 'LAST_WRITE_WINS' | 'MERGE_UNION';
```

**Sync flow:**

1. App indításkor: LocalStorage → UI megjelenítés (instant)
2. Háttérben: Server fetch → Merge → LocalStorage update
3. Változáskor: LocalStorage update → Queue server sync
4. Offline: Pending changes queue, online-kor batch sync

#### 3. API Endpoints

```typescript
// @kgc/config package - UserSettingsController

// GET /api/v1/user/settings/favorites
// Response: { favorites: UserFavorite[], version: number }

// PATCH /api/v1/user/settings/favorites
// Body: { favorites: UserFavorite[] }
// Response: { favorites: UserFavorite[], version: number }

// POST /api/v1/user/settings/favorites/:menuItemId
// Body: { order?: number, label?: string }
// Response: { favorite: UserFavorite }

// DELETE /api/v1/user/settings/favorites/:menuItemId
// Response: { success: boolean }
```

#### 4. Frontend komponensek

```typescript
// React hooks (@kgc/ui)
const useFavorites = () => {
  // Zustand store + React Query kombináció
  const { favorites, addFavorite, removeFavorite, reorderFavorites } = useFavoritesStore();
  const { data, isLoading } = useQuery(['favorites'], fetchFavorites);

  return { favorites, addFavorite, removeFavorite, reorderFavorites, isLoading };
};

// Komponensek
<FavoriteButton menuItemId="rentals.active" />  // Csillag ikon
<FavoritesSidebar />                             // Gyorselérés szekció
<FavoritesManager />                             // Settings oldal
```

#### 5. UX Specifikáció

```
┌─────────────────────────────┐
│  ⭐ GYORSELÉRÉS             │  ← Összecsukható, drag-drop sorrend
├─────────────────────────────┤
│  📦 Aktív bérlések      [×] │  ← Hover: törlés gomb
│  💰 Pénztár             [×] │
│  🔧 Munkalapok          [×] │
├─────────────────────────────┤
│  📊 DASHBOARD               │
│  🏭 BÉRLÉS              [☆] │  ← Hover: csillag megjelenik
│  🔧 SZERVIZ             [☆] │
│  💰 ELADÁS              [☆] │
│  ⚙️ BEÁLLÍTÁSOK         [☆] │
└─────────────────────────────┘
```

**Interakciók:**

- Menüpont hover → ☆ (üres csillag) ikon megjelenik
- Kattintás ☆ → ★ (teli csillag) + Gyorselérésbe kerül animációval
- Gyorselérés hover → [×] törlés gomb
- Drag-and-drop: Sorrend változtatás a Gyorselérés szekcióban
- Max 10 kedvenc túllépésnél: Toast "Túl sok kedvenc! Törölj egyet a hozzáadáshoz."

**Command Palette integráció (Ctrl+K):**

- Kedvencek a keresési eredmények tetején jelennek meg
- ★ ikon jelzi a kedvenc státuszt
- Gyors hozzáadás/eltávolítás a palette-ből

#### 6. Tenant-level alapértelmezés

```typescript
// Franchise admin beállíthatja az új felhasználók alapértelmezett kedvenceit
interface TenantDefaultFavorites {
  tenantId: string;
  roleDefaults: {
    [role: string]: string[];  // role → menuItemId[]
  };
}

// Példa:
{
  "tenantId": "franchise-001",
  "roleDefaults": {
    "OPERATOR": ["rentals.checkout", "rentals.return", "pos.cash"],
    "MANAGER": ["dashboard.overview", "reports.daily", "rentals.active"],
    "TECHNICIAN": ["service.worksheets", "service.parts", "inventory.search"]
  }
}
```

## Implementációs terv

### Package elhelyezés

```
packages/
├── core/
│   └── config/                 # @kgc/config
│       └── src/
│           ├── services/
│           │   └── user-settings.service.ts  ← Favorites logic
│           └── controllers/
│               └── user-settings.controller.ts
│
└── shared/
    └── ui/                     # @kgc/ui
        └── src/
            ├── hooks/
            │   └── useFavorites.ts
            ├── stores/
            │   └── favorites.store.ts
            └── components/
                ├── FavoriteButton.tsx
                ├── FavoritesSidebar.tsx
                └── FavoritesManager.tsx
```

### Story breakdown

| Story    | Leírás                                        | Effort |
| -------- | --------------------------------------------- | ------ |
| **29-1** | User favorites API endpoints                  | 3 SP   |
| **29-2** | Favorites Zustand store + sync                | 3 SP   |
| **29-3** | FavoriteButton + FavoritesSidebar komponensek | 5 SP   |
| **29-4** | Tenant default favorites admin                | 2 SP   |
| **29-5** | Command Palette integráció                    | 2 SP   |

**Összesen:** ~15 SP (~1 sprint)

## Teszt stratégia

### Unit tesztek (Vitest)

```typescript
describe('useFavorites', () => {
  it('should add favorite to local storage immediately');
  it('should sync with server in background');
  it('should handle offline gracefully');
  it('should enforce max 10 limit');
  it('should merge conflicts with last-write-wins');
});
```

### Integration tesztek

```typescript
describe('Favorites API', () => {
  it('should persist favorites per user');
  it('should isolate favorites between tenants');
  it('should apply tenant defaults for new users');
  it('should handle concurrent updates');
});
```

### E2E tesztek (Playwright)

```typescript
test('User can add and remove favorites', async ({ page }) => {
  await page.goto('/dashboard');

  // Hover menüpont, kattintás csillagra
  await page.hover('[data-menu-item="rentals.active"]');
  await page.click('[data-favorite-toggle="rentals.active"]');

  // Ellenőrzés: megjelent a Gyorselérésben
  await expect(page.locator('[data-favorites-section]')).toContainText('Aktív bérlések');
});

test('Favorites persist after page reload', async ({ page }) => {
  // Add favorite, reload, verify still there
});

test('Favorites sync across devices', async ({ browser }) => {
  // Open two contexts, add favorite in one, verify in other
});
```

### Kockázatok és mitigáció

| Kockázat                    | Valószínűség | Hatás    | Mitigáció                                          |
| --------------------------- | ------------ | -------- | -------------------------------------------------- |
| Offline sync conflict       | Közepes      | Alacsony | Last-write-wins + audit log                        |
| Menu item törlés/átnevezés  | Alacsony     | Közepes  | Graceful degradation - törölt item nem jelenik meg |
| Teljesítmény 10+ kedvencnél | Alacsony     | Alacsony | Max 10 limit, lazy load                            |
| Tenant migration            | Alacsony     | Közepes  | Default favorites auto-apply                       |

## Alternatívák (elutasítva)

### 1. Tenant-only preferences

- **Elutasítva:** Nem elég személyre szabott, különböző szerepkörök más igényeket támasztanak

### 2. Browser-only storage (no sync)

- **Elutasítva:** Elveszne eszközváltáskor, nem enterprise-ready

### 3. Komplex preference hierarchy (user → role → tenant → global)

- **Elutasítva:** Over-engineering, a user-level + tenant-default elegendő

## Kapcsolódó dokumentumok

- **FR122:** Kedvenc menüpontok követelmény (PRD)
- **FR121:** Dashboard widget testreszabás (épít erre az architektúrára)
- **ADR-023:** Composable Frontend Strategy
- **ADR-002:** Offline-First PWA Strategy

## Következmények

### Pozitív

- 25 perc/nap/felhasználó megtakarítás navigációban
- Jobb onboarding élmény (szerepkör-specifikus alapértelmezések)
- Kompetitív paritás a versenytársakkal
- Alapot ad a FR121 dashboard testreszabáshoz

### Negatív

- +15 SP implementációs költség
- Sync komplexitás offline esetén
- Maintenance: menu struktúra változáskor frissíteni kell a mapping-et

---

**Jóváhagyva:** 2026-01-25 Party Mode Session
**Résztvevők:** Winston, John, Sally, Mary, Murat, Amelia
