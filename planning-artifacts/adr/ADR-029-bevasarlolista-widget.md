# ADR-029: Feladatlista Widget (Unified Task Manager)

**Státusz:** Accepted (FRISSÍTVE 2026-01-05)
**Dátum:** 2026-01-04 (Frissítve: 2026-01-05)
**Döntéshozók:** Architect, PM, Tulajdonos
**Kapcsolódó:** Fit-Gap-Jegyzet-Modul-2026-01-04.md, ADR-001 (Franchise multitenancy), PRD v7.0, Feature-Feladatlista-Widget.md

> **FONTOS:** Ez az ADR frissítésre került 2026-01-05-én az ügyfél által megerősített követelmények alapján. A korábbi "Bevásárlólista Widget" koncepció kibővült "Feladatlista Widget"-té, 3 típussal és felelős hozzárendeléssel.

---

## Kontextus

A franchise boltokban három épületet kell párhuzamosan kezelni, és nincs központi hely ahol a dolgozók közös bevásárlólistát vagy teendőket tudnának nyilvántartani. Az ügyfél kérése egy egyszerű, mindenki által elérhető "jegyzet szerűség" ahol:

1. Fel lehet írni ami fogyóban van (WC papír, takarítószer, irodaszer stb.)
2. Jelölni lehet melyik épületben van szükség rá
3. Látható ki írta be
4. To-do listaként is használható
5. Hosszú távon: személyes jegyzetek is kellenek

### Üzleti Probléma

- **Kommunikációs rés:** 3 épület között nehéz az információáramlás
- **Feledékenység:** Nincs központi nyilvántartás a hiányzó kellékekről
- **Felelősség:** Nem látható ki mit jegyzett fel, ki intézte el
- **Hatékonyság:** Papír alapú listák elvesznek, nem szinkronizáltak

### Jelenlegi Helyzet (GAP)

| Funkció | Meglévő? | GAP |
|---------|----------|-----|
| Közös bevásárlólista | Nincs | FULL GAP |
| Helyszín jelölés | Részben (warehouse) | PARTIAL GAP |
| Ki írta be | Van (audit) | NO GAP |
| To-do lista | Nincs | FULL GAP |
| Személyes jegyzet | Nincs | FULL GAP |

---

## Döntési Kérdés

**Hogyan valósítsunk meg egy egyszerű, megosztott jegyzet/bevásárlólista funkciót a KGC ERP-ben, amely tenant-izolált, bővíthető, és minimális fejlesztési ráfordítással elkészíthető?**

---

## Döntési Tényezők

1. **Fejlesztési idő:** MVP-hez gyors megvalósítás szükséges (~5 nap)
2. **Tenant izoláció:** Franchise partnerek nem láthatják egymás listáit
3. **Egyszerűség:** Nem komplex task management, hanem egyszerű lista
4. **Bővíthetőség:** Fázis 2-ben személyes jegyzetek, kategóriák
5. **Valós idejű szinkron:** Fontos, de nem kritikus (1-2 perc késés elfogadható)

---

## Döntés

### Választott megoldás: Quick Notes Widget (Opció D a Fit-Gap elemzésből)

Egyszerű dashboard widget, amely közös bevásárlólistát és to-do listát biztosít a bolt összes dolgozója számára.

---

## 1. Adatmodell Megközelítés

**Döntés:** Egyszerű lista modell (nem komplex task management)

### Indoklás

- Az igény egy "jegyzet szerűség", nem egy Jira/Trello
- Gyors bevitel és checkbox az elsődleges use case
- Túl sok mező lassítaná a napi használatot
- Fázis 2-ben bővíthető kategóriákkal, prioritással

### Adatbázis Séma

```sql
-- Jegyzet tételek tábla
CREATE TABLE note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Tartalom
    text VARCHAR(500) NOT NULL,
    location_id UUID REFERENCES warehouses(id),  -- Épület (opcionális)

    -- Státusz
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | done | archived
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id),

    -- Audit
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('pending', 'done', 'archived'))
);

-- Indexek
CREATE INDEX idx_note_items_tenant ON note_items(tenant_id);
CREATE INDEX idx_note_items_status ON note_items(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_note_items_location ON note_items(location_id) WHERE location_id IS NOT NULL;

-- RLS (Row Level Security) engedélyezés
ALTER TABLE note_items ENABLE ROW LEVEL SECURITY;

-- Tenant izoláció policy
CREATE POLICY tenant_isolation ON note_items
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Miért NEM komplex task management?

| Task Management Funkció | Ebben a modulban? | Indoklás |
|-------------------------|-------------------|----------|
| Prioritás (high/medium/low) | Nem | Túl komplex, nem kért |
| Határidő | Nem | Bevásárlólistának nincs deadline |
| Hozzárendelés (assignee) | Nem | Bárki elvégezheti |
| Alcímkék/Projektek | Nem | Fázis 2 kategóriák |
| Függőségek | Nem | Nem releváns |
| Kommentek | Nem | Egyszerű lista |

---

## 2. Tenant Izoláció

**Döntés:** Row Level Security (RLS) mint a többi modul

### Indoklás

- Konzisztens a meglévő architektúrával (ADR-001)
- Automatikus szűrés minden query-nél
- Nincs esély "véletlenül más tenant adatát látom" hibára

### Implementáció

```typescript
// Middleware: tenant context beállítása
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenant_id;
    if (tenantId) {
      // PostgreSQL session változó beállítása RLS-hez
      this.dataSource.query(`SET app.current_tenant_id = '${tenantId}'`);
    }
    next();
  }
}

// Service: Tenant ID automatikusan szűrve RLS által
@Injectable()
export class NoteItemsService {

  async findAllActive(): Promise<NoteItem[]> {
    // RLS automatikusan szűri tenant_id alapján
    return this.noteItemsRepository.find({
      where: {
        status: 'pending',
        deleted_at: IsNull()
      },
      order: { created_at: 'DESC' }
    });
  }
}
```

### Jogosultságok

| Szerepkör | Olvasás | Létrehozás | Kész jelölés | Törlés |
|-----------|---------|------------|--------------|--------|
| OPERATOR | Saját tenant | Saját tenant | Saját tenant | Csak saját |
| STORE_MANAGER | Saját tenant | Saját tenant | Saját tenant | Bárkit |
| FRANCHISE_ADMIN | Saját tenant | Saját tenant | Saját tenant | Bárkit |
| CENTRAL_ADMIN | Nem | Nem | Nem | Nem |

> **Megjegyzés:** A központi admin nem lát bele a franchise partnerek jegyzeteibe - ez konzisztens az ADR-001 pénzügyi adatvédelmi szabályaival.

---

## 3. Valós Idejű Szinkronizáció

**Döntés:** Polling alapú frissítés (30 másodperc) + manuális refresh gomb

### Alternatívák Értékelése

| Megoldás | Előny | Hátrány | Döntés |
|----------|-------|---------|--------|
| **WebSocket** | Valós idejű | Komplex infrastruktúra, extra költség | Elutasítva |
| **Server-Sent Events** | Egyszerűbb mint WS | Még mindig extra komplexitás | Elutasítva |
| **Polling (30s)** | Egyszerű, megbízható | Nem azonnal szinkron | **Elfogadva** |
| **Manuális refresh** | Nagyon egyszerű | Rossz UX | Kiegészítésként |

### Indoklás

1. **Bevásárlólista nem kritikus valós idejű adat** - 30 másodperc késés elfogadható
2. **WebSocket infrastruktúra még nem létezik** a KGC ERP-ben
3. **Költséghatékonyság** - Polling nem igényel extra szervert
4. **Fázis 2-ben bővíthető** WebSocket-re ha igény van rá

### Implementáció

```typescript
// Frontend: React Query vagy SWR polling
const { data: noteItems, refetch } = useQuery({
  queryKey: ['noteItems'],
  queryFn: () => api.getNoteItems(),
  refetchInterval: 30000, // 30 másodperc
  refetchOnWindowFocus: true
});

// Manuális refresh gomb
<Button onClick={() => refetch()} icon={<RefreshIcon />}>
  Frissítés
</Button>

// Optimistic update: azonnal megjelenik, háttérben szinkronizál
const addItem = useMutation({
  mutationFn: (text: string) => api.createNoteItem({ text }),
  onMutate: async (text) => {
    // Optimistic: azonnal hozzáadjuk a listához
    queryClient.setQueryData(['noteItems'], old => [
      { id: 'temp', text, status: 'pending', created_by: currentUser },
      ...old
    ]);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['noteItems']);
  }
});
```

### Fázis 2 WebSocket Terv (ha szükséges)

```typescript
// Későbbi bővítés Socket.io-val
@WebSocketGateway()
export class NotesGateway {

  @SubscribeMessage('joinTenant')
  handleJoin(client: Socket, tenantId: string) {
    client.join(`tenant-${tenantId}`);
  }

  // Broadcast új tétel esetén
  notifyNewItem(tenantId: string, item: NoteItem) {
    this.server.to(`tenant-${tenantId}`).emit('newNoteItem', item);
  }
}
```

---

## 4. Történet és Archiválás Stratégia

**Döntés:** Soft delete + 30 napos automatikus archiválás

### Állapotok

```
pending (függőben)
    │
    ▼ [Kész jelölés]
  done (kész)
    │
    ▼ [30 nap után automatikusan VAGY manuális]
archived (archivált)
    │
    ▼ [90 nap után]
[Törlés - hard delete]
```

### Szabályok

| Állapot | Látható listában? | Visszaállítható? | Automatikus átmenet |
|---------|-------------------|------------------|---------------------|
| pending | Igen | - | - |
| done | Igen (áthúzva) | Igen → pending | 30 nap → archived |
| archived | Nem (archívumban) | Igen → pending | 90 nap → hard delete |

### Implementáció

```typescript
// Cron job: Automatikus archiválás
@Cron('0 2 * * *') // Minden nap 02:00-kor
async archiveOldItems() {
  const thirtyDaysAgo = subDays(new Date(), 30);

  await this.noteItemsRepository.update(
    {
      status: 'done',
      completed_at: LessThan(thirtyDaysAgo)
    },
    { status: 'archived' }
  );
}

// Cron job: Hard delete nagyon régi archívum
@Cron('0 3 * * 0') // Minden vasárnap 03:00-kor
async purgeOldArchive() {
  const ninetyDaysAgo = subDays(new Date(), 90);

  await this.noteItemsRepository.delete({
    status: 'archived',
    updated_at: LessThan(ninetyDaysAgo)
  });
}
```

### Archívum Nézet

```
┌─────────────────────────────────────────────────────────────┐
│  ARCHÍVUM (utolsó 90 nap)                    [Szűrő ▼]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  2026-01-02                                                │
│  ──────────                                                │
│  ☑ WC papír (3 csomag) - Épület 2                         │
│    Létrehozta: Kovács Anna | Elvégezte: Kiss Péter         │
│                                        [Visszaállítás]     │
│                                                             │
│  2025-12-28                                                │
│  ──────────                                                │
│  ☑ Takarítószer rendelés - Központ                        │
│    Létrehozta: Nagy István | Elvégezte: Nagy István        │
│                                        [Visszaállítás]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Jövőbeli Bővíthetőség (Fázis 2)

**Döntés:** Az adatmodell előre fel van készítve a bővítésre

### Fázis 2 Tervezett Funkciók

| Funkció | Adatmodell Változás | Becsült Fejlesztés |
|---------|--------------------|--------------------|
| Személyes jegyzetek | `is_personal` boolean + `owner_id` | 2 nap |
| Kategóriák | `category_id` FK + categories tábla | 1.5 nap |
| Prioritás | `priority` enum | 0.5 nap |
| Push értesítések | FCM/APNs integráció | 3 nap |
| WebSocket valós idő | Socket.io gateway | 2 nap |

### Előkészített Séma Bővítés (Fázis 2)

```sql
-- Személyes jegyzetek támogatása
ALTER TABLE note_items ADD COLUMN is_personal BOOLEAN DEFAULT false;
ALTER TABLE note_items ADD COLUMN owner_id UUID REFERENCES users(id);

-- RLS policy módosítás személyes jegyzetekhez
CREATE POLICY personal_notes ON note_items
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND (
            is_personal = false  -- Közös jegyzet: mindenki látja
            OR owner_id = current_setting('app.current_user_id')::uuid  -- Személyes: csak tulajdonos
        )
    );

-- Kategóriák tábla
CREATE TABLE note_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),  -- Hex szín (#FF5733)
    icon VARCHAR(50),  -- Emoji vagy ikon név
    sort_order INT DEFAULT 0,

    UNIQUE(tenant_id, name)
);

-- Alapértelmezett kategóriák
INSERT INTO note_categories (tenant_id, name, icon, sort_order) VALUES
-- Minden új tenant-nek automatikusan létrehozzuk
('{tenant_id}', 'Bevásárlás', '🛒', 1),
('{tenant_id}', 'Takarítás', '🧹', 2),
('{tenant_id}', 'Szerviz', '🔧', 3),
('{tenant_id}', 'Egyéb', '📝', 99);
```

---

## UI Wireframe

### Dashboard Widget

```
┌─────────────────────────────────────────────────────────────┐
│  📝 BOLT JEGYZETEK                         [🔄] [Archívum] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ + Új tétel hozzáadása...            [Épület ▼] [+] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  FÜGGŐBEN (3)                                              │
│  ──────────                                                │
│  ☐ WC papír rendelés (5 csomag)                           │
│    📍 Épület 2 | 👤 Kovács Anna | ⏱ 2 órája              │
│                                                             │
│  ☐ Takarítószer hiányzik                                  │
│    📍 Központ | 👤 Kiss Péter | ⏱ ma 09:15               │
│                                                             │
│  ☐ Fűnyíró szerviz emlékeztető                            │
│    📍 Épület 1 | 👤 Nagy István | ⏱ tegnap               │
│                                                             │
│  KÉSZ (2)                              [Mind elrejtése]    │
│  ──────────                                                │
│  ☑ ̶I̶r̶o̶d̶a̶s̶z̶e̶r̶ ̶b̶e̶s̶z̶e̶r̶z̶é̶s̶                                   │
│    Elvégezte: Kiss Péter | tegnap 14:30                    │
│                                                             │
│  ☑ ̶K̶á̶v̶é̶ ̶r̶e̶n̶d̶e̶l̶é̶s̶                                         │
│    Elvégezte: Kovács Anna | 2 napja                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Épület Szűrő Dropdown

```
┌──────────────────┐
│ Épület           │
├──────────────────┤
│ ○ Mind           │
│ ● Épület 1       │
│ ○ Épület 2       │
│ ○ Épület 3       │
│ ○ Központ        │
└──────────────────┘
```

---

## API Végpontok

```typescript
// REST API
@Controller('api/notes')
export class NotesController {

  @Get()
  @ApiOperation({ summary: 'Összes aktív jegyzet listázása' })
  async findAll(
    @Query('status') status?: 'pending' | 'done' | 'archived',
    @Query('location_id') locationId?: string
  ): Promise<NoteItem[]>

  @Post()
  @ApiOperation({ summary: 'Új jegyzet létrehozása' })
  async create(
    @Body() dto: CreateNoteItemDto
  ): Promise<NoteItem>

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Jegyzet késznek jelölése' })
  async markComplete(@Param('id') id: string): Promise<NoteItem>

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Kész jegyzet újranyitása' })
  async reopen(@Param('id') id: string): Promise<NoteItem>

  @Delete(':id')
  @ApiOperation({ summary: 'Jegyzet törlése (soft delete)' })
  async remove(@Param('id') id: string): Promise<void>
}

// DTO-k
class CreateNoteItemDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;
}
```

---

## Fejlesztési Becslés

| Feladat | Becsült idő |
|---------|-------------|
| Backend: Entity, Service, Controller | 1.5 nap |
| Backend: RLS policy, migrations | 0.5 nap |
| Frontend: Widget komponens | 1.5 nap |
| Frontend: Polling, optimistic update | 0.5 nap |
| Tesztelés (unit + e2e) | 1 nap |
| **Összesen** | **5 munkanap** |

---

## Következmények

### Pozitív

- **Gyors megvalósítás:** 5 nap alatt MVP kész
- **Tenant izolált:** RLS garantálja az adatelkülönítést
- **Egyszerű UX:** Nem túlbonyolított, azonnal használható
- **Bővíthető:** Séma előkészítve Fázis 2 funkciókra
- **Költséghatékony:** Nincs extra infrastruktúra (WebSocket szerver)

### Negatív

- **Nem valós idejű:** 30 másodperc késés a szinkronban
- **Korlátozott funkcionalitás:** Nincs személyes jegyzet (Fázis 2)
- **Nincs push értesítés:** Fázis 2-ben tervezett

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Polling túl lassú | Alacsony | Közepes | Csökkenthető 15s-re, Fázis 2 WebSocket |
| Túl sok tétel | Alacsony | Alacsony | Pagination + automatikus archiválás |
| RLS bug | Nagyon alacsony | Kritikus | E2E tesztek tenant izolációra |

---

## Kapcsolódó Döntések

- **ADR-001:** Franchise multitenancy - RLS minta
- **ADR-023:** Composable frontend - Widget integráció
- **Fit-Gap elemzés:** `/planning-artifacts/1-discovery/fit-gap/Fit-Gap-Jegyzet-Modul-2026-01-04.md`

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-04 | Első verzió - Accepted státusz |
| 2.0 | 2026-01-05 | **KRITIKUS FRISSÍTÉS** - Ügyfél megerősítése alapján:<br>- Átnevezés: Feladatlista Widget<br>- 3 típus (bevásárló, feladat, személyes)<br>- 4 helyszín (+ Benzines szerviz)<br>- Felelős hozzárendelés MVP-be került<br>- Duplikáció védelem<br>- Határidő mező<br>- Részletek: Feature-Feladatlista-Widget.md |
