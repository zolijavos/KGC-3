# ADR-040: Feladatlista Widget Architektúra

**Státusz:** JAVASOLVA
**Dátum:** 2026-01-05
**Döntéshozók:** Architect Agent, PM
**Kapcsolódó ADR-ek:** ADR-001 (Multi-tenancy), ADR-002 (Offline Strategy), ADR-006 (Audit Trail)

---

## Kontextus

A KGC ERP rendszerhez új "Feladatlista Widget" funkciót tervezünk. Ez egy egységes, dashboard-ra integrált felület, amely 3 különböző feladat típust kezel:

1. **Bevásárlólista** - Közös beszerzési tételek (irodaszer, takarítószer, stb.)
2. **Feladat (To-Do)** - Operatív teendők hozzárendelése dolgozókhoz
3. **Személyes jegyzet** - Privát jegyzetek (csak a létrehozó látja)

### Üzleti Követelmények

| Követelmény | Leírás | Prioritás |
|-------------|--------|-----------|
| **Multi-tenant izoláció** | Franchise-ok nem látják egymás adatait | KRITIKUS |
| **Offline-first PWA** | Működjön internet nélkül, szinkronizáljon vissza | MAGAS |
| **Helyszín hozzárendelés** | Dropdown: Bolt, Raktár, Szerviz (konfigurálható) | MAGAS |
| **Felelős hozzárendelés** | Multi-select, több személy egy feladathoz | MAGAS |
| **Státusz követés** | Nyitott → Folyamatban → Kész | MAGAS |
| **Audit trail** | Ki, mikor, mit módosított | MAGAS |
| **Mobilbarát design** | PC + Telefon (responsive) | MAGAS |

### Meglévő Architektúra Kontextus

- **Stack:** NestJS + PostgreSQL + PWA (tervezett)
- **Multi-tenancy:** Single DB + tenant_id + RLS (ADR-001)
- **Offline:** Service Worker + IndexedDB + Last-Write-Wins (ADR-002)
- **Audit minta:** BÉRLÉS_AUDIT_LOG (ADR-006)
- **Helyszín struktúra:** locations tábla (ADR-021)

---

## Döntési Kérdések

1. **Adatmodell:** Polimorf tábla (1 tábla) vs. Különálló táblák (3 tábla)?
2. **Felelős hozzárendelés:** Junction tábla vs. JSONB tömb?
3. **Offline konfliktus:** LWW vs. mezőszintű merge?
4. **Privát jegyzet izoláció:** RLS policy vs. application-level?

---

## Vizsgált Opciók

### 1. Adatmodell Stratégia

#### Opció A: Polimorf Tábla (Javasolt)

**Leírás:** Egyetlen `task_item` tábla, `item_type` enum oszloppal.

```sql
CREATE TYPE task_item_type AS ENUM ('shopping', 'todo', 'note');

CREATE TABLE task_item (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    item_type task_item_type NOT NULL,
    -- közös mezők
    title VARCHAR(255) NOT NULL,
    description TEXT,
    -- stb.
);
```

**Előnyök:**
- Egyszerű lekérdezés (1 tábla)
- Könnyű dashboard aggregáció
- Kevesebb migráció

**Hátrányok:**
- Nullable mezők (nem minden típushoz kell minden mező)
- Kisebb bonyolultság a validációban

---

#### Opció B: Különálló Táblák

**Leírás:** 3 külön tábla: `shopping_list_item`, `todo_item`, `note_item`.

**Előnyök:**
- Tiszta séma (nincs nullable)
- Típus-specifikus indexek

**Hátrányok:**
- 3x annyi migráció
- Dashboard UNION lekérdezés
- Nehezebb bővítés

---

#### Döntés: **Opció A - Polimorf Tábla**

**Indoklás:**
- A 3 típus hasonló adatszerkezetű (cím, leírás, státusz, felelős)
- Dashboard widget egy helyen mutat mindent
- Jövőbeni típus bővítés egyszerű (enum + nullable mezők)
- ADR-006 audit trail minta jól illeszkedik

---

### 2. Felelős Hozzárendelés

#### Opció A: Junction Tábla (Javasolt)

```sql
CREATE TABLE task_item_assignee (
    task_item_id UUID REFERENCES task_item(id),
    user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (task_item_id, user_id)
);
```

**Előnyök:**
- Relációs integritás (FK constraint)
- Ki rendelte hozzá, mikor (audit)
- Hatékony JOIN lekérdezés

**Hátrányok:**
- Extra tábla
- Több INSERT művelet

---

#### Opció B: JSONB Tömb

```sql
ALTER TABLE task_item ADD COLUMN assignees JSONB DEFAULT '[]';
-- Példa: [{"user_id": "...", "assigned_at": "..."}]
```

**Előnyök:**
- Egyszerű séma
- Gyors írás

**Hátrányok:**
- Nincs FK constraint
- Nehezebb "ki van hozzárendelve X-hez" lekérdezés
- JSONB index szükséges

---

#### Döntés: **Opció A - Junction Tábla**

**Indoklás:**
- RBAC integráció (ki láthat kit)
- Audit trail (ki rendelte hozzá)
- Query hatékonyság (index a user_id-n)

---

### 3. Offline Konfliktus Kezelés

#### Döntés: **Last-Write-Wins (LWW) + Audit Log**

**Indoklás:** (ADR-002 mintájára)
- Egyszerű implementáció
- A feladatlista nem kritikus üzleti adat (nem számla, nem bérlés)
- Konfliktusok ritkák (egy feladatot általában 1 ember szerkeszt)

**Különleges eset - Felelős hozzárendelés:**
```javascript
// Merge stratégia: UNION (mindkét változat felelőseit megtartjuk)
function mergeAssignees(local, server) {
    const merged = new Set([...local.assignees, ...server.assignees]);
    return Array.from(merged);
}
```

**Konfliktus napló:**
```sql
-- Feladatlista konfliktusok is a conflict_log táblába (ADR-002)
INSERT INTO conflict_log (entity_type, entity_id, ...)
VALUES ('task_item', :task_item_id, ...);
```

---

### 4. Privát Jegyzet Izoláció

#### Döntés: **RLS Policy + Application-level**

```sql
-- Személyes jegyzet: csak a létrehozó láthatja
CREATE POLICY note_owner_only ON task_item
    FOR ALL
    USING (
        item_type != 'note' OR created_by = current_setting('app.current_user_id')::UUID
    );
```

**Védelem rétegei:**
1. **RLS (adatbázis szint):** Automatikus szűrés
2. **Application (API szint):** Extra validáció a service-ben
3. **Frontend:** UI nem is mutat más jegyzetét

---

## Részletes Adatmodell (ERD)

### Fő Entitások

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KGC FELADATLISTA ERD                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────────┐
                                    │       tenant         │
                                    ├──────────────────────┤
                                    │ id: UUID (PK)        │
                                    │ name: VARCHAR        │
                                    │ type: ENUM           │
                                    └──────────┬───────────┘
                                               │
                                               │ 1:N
                                               ▼
┌──────────────────────┐           ┌──────────────────────────────────────────┐
│   task_location      │           │              task_item                    │
├──────────────────────┤           ├──────────────────────────────────────────┤
│ id: UUID (PK)        │◄──────────│ id: UUID (PK)                            │
│ tenant_id: UUID (FK) │   N:1     │ tenant_id: UUID (FK)                     │
│ name: VARCHAR(100)   │           │ item_type: ENUM (shopping/todo/note)     │
│ location_type: ENUM  │           │ title: VARCHAR(255)                       │
│   (bolt/raktar/      │           │ description: TEXT                         │
│    szerviz/egyeb)    │           │ status: ENUM (open/in_progress/done)     │
│ sort_order: INT      │           │ priority: ENUM (low/medium/high/urgent)  │
│ is_active: BOOLEAN   │           │ due_date: DATE                            │
│ created_at: TIMESTAMPTZ          │ location_id: UUID (FK) ──────────────────┘
│ updated_at: TIMESTAMPTZ          │ quantity: VARCHAR(50) [shopping only]     │
└──────────────────────┘           │ is_private: BOOLEAN [note only, default false]
                                   │                                            │
                                   │ created_by: UUID (FK) ─────────┐          │
                                   │ created_at: TIMESTAMPTZ         │          │
                                   │ updated_at: TIMESTAMPTZ         │          │
                                   │ completed_at: TIMESTAMPTZ       │          │
                                   │ completed_by: UUID (FK) ────────┤          │
                                   │                                 │          │
                                   │ -- Soft delete / Archive        │          │
                                   │ is_archived: BOOLEAN            │          │
                                   │ archived_at: TIMESTAMPTZ        │          │
                                   │                                 │          │
                                   │ -- Offline sync                 │          │
                                   │ sync_version: BIGINT            │          │
                                   │ last_synced_at: TIMESTAMPTZ     │          │
                                   └─────────────────┬───────────────┘          │
                                                     │                          │
                                                     │ 1:N                      │
                                                     ▼                          │
                                   ┌──────────────────────────────────────────┐ │
                                   │         task_item_assignee               │ │
                                   ├──────────────────────────────────────────┤ │
                                   │ task_item_id: UUID (PK, FK)              │ │
                                   │ user_id: UUID (PK, FK) ──────────────────┼─┤
                                   │ assigned_at: TIMESTAMPTZ                 │ │
                                   │ assigned_by: UUID (FK) ──────────────────┘ │
                                   │ notified: BOOLEAN                          │
                                   └──────────────────────────────────────────┘ │
                                                                                │
                                                                                │
                                                     ┌──────────────────────────┘
                                                     │
                                                     ▼
                                   ┌──────────────────────────────────────────┐
                                   │                users                      │
                                   ├──────────────────────────────────────────┤
                                   │ id: UUID (PK)                            │
                                   │ tenant_id: UUID (FK)                     │
                                   │ name: VARCHAR                             │
                                   │ email: VARCHAR                            │
                                   │ role: ENUM                                │
                                   │ ...                                       │
                                   └──────────────────────────────────────────┘


                                   ┌──────────────────────────────────────────┐
                                   │         task_item_audit_log               │
                                   ├──────────────────────────────────────────┤
                                   │ id: UUID (PK)                            │
                                   │ tenant_id: UUID (FK)                     │
                                   │ task_item_id: UUID (FK)                  │
                                   │ event_type: ENUM                          │
                                   │   (created/updated/status_changed/        │
                                   │    assigned/unassigned/archived)          │
                                   │ event_timestamp: TIMESTAMPTZ              │
                                   │ user_id: UUID (FK)                        │
                                   │ old_value: JSONB                          │
                                   │ new_value: JSONB                          │
                                   │ ip_address: VARCHAR(45)                   │
                                   │ device_info: VARCHAR(200)                 │
                                   └──────────────────────────────────────────┘
```

---

## SQL Implementáció

### 1. Enum Típusok

```sql
-- Feladat típusok
CREATE TYPE task_item_type AS ENUM ('shopping', 'todo', 'note');

-- Státusz
CREATE TYPE task_item_status AS ENUM ('open', 'in_progress', 'done');

-- Prioritás
CREATE TYPE task_item_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Helyszín típus
CREATE TYPE task_location_type AS ENUM ('bolt', 'raktar', 'szerviz', 'egyeb');

-- Audit esemény típus
CREATE TYPE task_audit_event AS ENUM (
    'created', 'updated', 'status_changed',
    'assigned', 'unassigned', 'archived', 'restored'
);
```

### 2. Helyszín Tábla

```sql
CREATE TABLE kgc.task_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kgc.tenant(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location_type task_location_type NOT NULL DEFAULT 'egyeb',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_task_location_name_tenant
        UNIQUE (tenant_id, name)
);

CREATE INDEX idx_task_location_tenant ON kgc.task_location(tenant_id);
CREATE INDEX idx_task_location_active ON kgc.task_location(tenant_id, is_active);

-- RLS
ALTER TABLE kgc.task_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_task_location ON kgc.task_location
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 3. Fő Feladatlista Tábla

```sql
CREATE TABLE kgc.task_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kgc.tenant(id) ON DELETE CASCADE,

    -- Típus és tartalom
    item_type task_item_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Státusz és prioritás
    status task_item_status NOT NULL DEFAULT 'open',
    priority task_item_priority DEFAULT 'medium',
    due_date DATE,

    -- Helyszín (opcionális)
    location_id UUID REFERENCES kgc.task_location(id) ON DELETE SET NULL,

    -- Típus-specifikus mezők
    quantity VARCHAR(50),           -- shopping típusnál: "10 csomag"
    is_private BOOLEAN DEFAULT FALSE,  -- note típusnál: privát jegyzet

    -- Audit mezők
    created_by UUID NOT NULL REFERENCES kgc.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES kgc.users(id),

    -- Soft delete / Archive
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,

    -- Offline szinkronizáció
    sync_version BIGINT DEFAULT 1,
    last_synced_at TIMESTAMPTZ,

    -- Constraint: quantity csak shopping-nál
    CONSTRAINT chk_quantity_shopping
        CHECK (item_type = 'shopping' OR quantity IS NULL),

    -- Constraint: is_private csak note-nál releváns
    CONSTRAINT chk_private_note
        CHECK (item_type = 'note' OR is_private = FALSE)
);

-- Indexek
CREATE INDEX idx_task_item_tenant ON kgc.task_item(tenant_id);
CREATE INDEX idx_task_item_type ON kgc.task_item(tenant_id, item_type);
CREATE INDEX idx_task_item_status ON kgc.task_item(tenant_id, status);
CREATE INDEX idx_task_item_active ON kgc.task_item(tenant_id, is_archived, status);
CREATE INDEX idx_task_item_location ON kgc.task_item(location_id);
CREATE INDEX idx_task_item_due_date ON kgc.task_item(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_task_item_created_by ON kgc.task_item(created_by);
CREATE INDEX idx_task_item_sync ON kgc.task_item(tenant_id, sync_version);

-- RLS Policy - Tenant izoláció + Privát jegyzet védelem
ALTER TABLE kgc.task_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_task_item ON kgc.task_item
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            item_type != 'note'
            OR is_private = FALSE
            OR created_by = current_setting('app.current_user_id')::UUID
        )
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
    );
```

### 4. Felelős Hozzárendelés (Junction Tábla)

```sql
CREATE TABLE kgc.task_item_assignee (
    task_item_id UUID NOT NULL REFERENCES kgc.task_item(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES kgc.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID NOT NULL REFERENCES kgc.users(id),
    notified BOOLEAN DEFAULT FALSE,  -- értesítés elküldve?

    PRIMARY KEY (task_item_id, user_id)
);

CREATE INDEX idx_task_assignee_user ON kgc.task_item_assignee(user_id);
CREATE INDEX idx_task_assignee_item ON kgc.task_item_assignee(task_item_id);

-- RLS (task_item-en keresztül érvényesül)
ALTER TABLE kgc.task_item_assignee ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_assignee_access ON kgc.task_item_assignee
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM kgc.task_item ti
            WHERE ti.id = task_item_id
            AND ti.tenant_id = current_setting('app.current_tenant_id')::UUID
        )
    );
```

### 5. Audit Log

```sql
CREATE TABLE kgc.task_item_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kgc.tenant(id),
    task_item_id UUID NOT NULL REFERENCES kgc.task_item(id) ON DELETE CASCADE,

    event_type task_audit_event NOT NULL,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES kgc.users(id),

    -- Változás részletek
    old_value JSONB,
    new_value JSONB,

    -- Audit meta
    ip_address VARCHAR(45),
    device_info VARCHAR(200)
);

CREATE INDEX idx_task_audit_item ON kgc.task_item_audit_log(task_item_id);
CREATE INDEX idx_task_audit_timestamp ON kgc.task_item_audit_log(event_timestamp);
CREATE INDEX idx_task_audit_tenant_date ON kgc.task_item_audit_log(tenant_id, event_timestamp);

-- RLS
ALTER TABLE kgc.task_item_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_task_audit ON kgc.task_item_audit_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 6. Automatikus Audit Trigger

```sql
CREATE OR REPLACE FUNCTION kgc.task_item_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO kgc.task_item_audit_log (
            tenant_id, task_item_id, event_type, user_id, new_value
        ) VALUES (
            NEW.tenant_id, NEW.id, 'created',
            NEW.created_by,
            jsonb_build_object(
                'title', NEW.title,
                'item_type', NEW.item_type,
                'status', NEW.status
            )
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Státusz változás
        IF OLD.status != NEW.status THEN
            INSERT INTO kgc.task_item_audit_log (
                tenant_id, task_item_id, event_type, user_id, old_value, new_value
            ) VALUES (
                NEW.tenant_id, NEW.id, 'status_changed',
                COALESCE(NEW.completed_by, current_setting('app.current_user_id')::UUID),
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status)
            );
        END IF;

        -- Archiválás
        IF OLD.is_archived = FALSE AND NEW.is_archived = TRUE THEN
            INSERT INTO kgc.task_item_audit_log (
                tenant_id, task_item_id, event_type, user_id
            ) VALUES (
                NEW.tenant_id, NEW.id, 'archived',
                current_setting('app.current_user_id')::UUID
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_item_audit
    AFTER INSERT OR UPDATE ON kgc.task_item
    FOR EACH ROW
    EXECUTE FUNCTION kgc.task_item_audit_trigger();
```

---

## Offline Szinkronizáció

### IndexedDB Séma (PWA)

```javascript
// IndexedDB store-ok a Feladatlista Widget-hez
const TASK_STORES = {
    // Szinkronizált adatok
    taskItems: {
        keyPath: 'id',
        indexes: [
            'tenant_id',
            'item_type',
            'status',
            'created_by',
            'sync_version'
        ]
    },
    taskLocations: {
        keyPath: 'id',
        indexes: ['tenant_id']
    },
    taskAssignees: {
        keyPath: ['task_item_id', 'user_id'],
        indexes: ['task_item_id', 'user_id']
    },

    // Offline létrehozott/módosított rekordok
    pendingTaskSync: {
        keyPath: 'localId',
        autoIncrement: true,
        indexes: ['operation', 'createdAt', 'syncStatus']
    }
};

// Tárhely becslés
const TASK_STORAGE_ESTIMATE = {
    taskItems: '5 MB',       // ~5,000 tétel
    taskLocations: '100 KB', // ~100 helyszín
    taskAssignees: '1 MB',   // ~10,000 hozzárendelés
    pendingSync: '1 MB',     // Buffer
    total: '~7 MB'
};
```

### Konfliktus Kezelés

```typescript
// task-sync.service.ts

interface TaskConflictResolution {
    strategy: 'last_write_wins' | 'merge_assignees' | 'manual';
    winner: 'local' | 'server' | 'merged';
    mergedData?: Partial<TaskItem>;
}

class TaskSyncService {

    async resolveConflict(
        localItem: TaskItem,
        serverItem: TaskItem
    ): Promise<TaskConflictResolution> {

        // 1. Timestamp összehasonlítás
        const localTime = new Date(localItem.updated_at).getTime();
        const serverTime = new Date(serverItem.updated_at).getTime();

        // 2. Speciális eset: felelős hozzárendelés merge
        if (this.hasAssigneeConflict(localItem, serverItem)) {
            const mergedAssignees = this.mergeAssignees(
                localItem.assignees,
                serverItem.assignees
            );
            return {
                strategy: 'merge_assignees',
                winner: 'merged',
                mergedData: {
                    ...serverItem,
                    assignees: mergedAssignees,
                    updated_at: new Date().toISOString()
                }
            };
        }

        // 3. Last-Write-Wins (alapértelmezett)
        if (localTime > serverTime) {
            return { strategy: 'last_write_wins', winner: 'local' };
        } else {
            return { strategy: 'last_write_wins', winner: 'server' };
        }
    }

    private mergeAssignees(
        local: TaskAssignee[],
        server: TaskAssignee[]
    ): TaskAssignee[] {
        const merged = new Map<string, TaskAssignee>();

        // Server verzió alapján
        for (const a of server) {
            merged.set(a.user_id, a);
        }

        // Local verzió hozzáadása (ha nem létezik)
        for (const a of local) {
            if (!merged.has(a.user_id)) {
                merged.set(a.user_id, a);
            }
        }

        return Array.from(merged.values());
    }

    private hasAssigneeConflict(local: TaskItem, server: TaskItem): boolean {
        const localIds = new Set(local.assignees?.map(a => a.user_id) || []);
        const serverIds = new Set(server.assignees?.map(a => a.user_id) || []);

        // Különböznek a hozzárendelések
        return localIds.size !== serverIds.size ||
               [...localIds].some(id => !serverIds.has(id));
    }
}
```

### Service Worker Sync Event

```javascript
// service-worker.js

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-task-items') {
        event.waitUntil(syncPendingTaskItems());
    }
});

async function syncPendingTaskItems() {
    const db = await openTaskDB();
    const pending = await db.getAll('pendingTaskSync');

    for (const item of pending) {
        try {
            switch (item.operation) {
                case 'create':
                    await createTaskOnServer(item.data);
                    break;
                case 'update':
                    await updateTaskOnServer(item.id, item.data);
                    break;
                case 'delete':
                    await deleteTaskOnServer(item.id);
                    break;
            }

            // Sikeres szinkron - törlés a pending queue-ból
            await db.delete('pendingTaskSync', item.localId);

        } catch (error) {
            if (error.status === 409) {
                // Konfliktus - resolve majd retry
                const resolved = await resolveConflict(item, error.serverData);
                await db.put('pendingTaskSync', {
                    ...item,
                    data: resolved.mergedData || item.data,
                    retryCount: (item.retryCount || 0) + 1
                });
            } else {
                console.error('Task sync failed:', error);
            }
        }
    }
}
```

---

## RBAC Integráció

### Jogosultság Mátrix

| Jogosultság | OPERATOR | STORE_MANAGER | FRANCHISE_ADMIN | CENTRAL_ADMIN |
|-------------|----------|---------------|-----------------|---------------|
| **Bevásárlólista** | | | | |
| Lista megtekintése | Y | Y | Y | Y |
| Tétel hozzáadása | Y | Y | Y | Y |
| Saját tétel módosítása | Y | Y | Y | Y |
| Bármely tétel módosítása | N | Y | Y | Y |
| Tétel törlése | N | Y | Y | Y |
| **Feladat (To-Do)** | | | | |
| Feladatok megtekintése | Y | Y | Y | Y |
| Feladat létrehozása | Y | Y | Y | Y |
| Felelős hozzárendelése | N | Y | Y | Y |
| Más feladatának módosítása | N | Y | Y | Y |
| **Személyes jegyzet** | | | | |
| Saját jegyzet CRUD | Y | Y | Y | Y |
| Más jegyzetének látása | N | N | N | N* |
| **Helyszínek kezelése** | N | N | Y | Y |

*SUPER_ADMIN kivétel: minden adathoz hozzáfér

### Permission Enum

```typescript
enum TaskPermission {
    // Bevásárlólista
    SHOPPING_VIEW = 'task:shopping:view',
    SHOPPING_CREATE = 'task:shopping:create',
    SHOPPING_UPDATE_OWN = 'task:shopping:update_own',
    SHOPPING_UPDATE_ANY = 'task:shopping:update_any',
    SHOPPING_DELETE = 'task:shopping:delete',

    // To-Do
    TODO_VIEW = 'task:todo:view',
    TODO_CREATE = 'task:todo:create',
    TODO_ASSIGN = 'task:todo:assign',
    TODO_UPDATE_OWN = 'task:todo:update_own',
    TODO_UPDATE_ANY = 'task:todo:update_any',
    TODO_DELETE = 'task:todo:delete',

    // Jegyzet (csak saját)
    NOTE_CRUD_OWN = 'task:note:crud_own',

    // Admin
    LOCATION_MANAGE = 'task:location:manage',
}
```

---

## API Endpoints

### Base Path: `/api/v1/tasks`

| Metódus | Endpoint | Leírás | Auth | RBAC |
|---------|----------|--------|------|------|
| GET | `/items` | Tételek listázása (szűrőkkel) | Bearer | VIEW |
| GET | `/items/:id` | Tétel részletei | Bearer | VIEW |
| POST | `/items` | Új tétel létrehozása | Bearer | CREATE |
| PATCH | `/items/:id` | Tétel módosítása | Bearer | UPDATE |
| PATCH | `/items/:id/status` | Státusz változtatás | Bearer | UPDATE |
| DELETE | `/items/:id` | Tétel törlése (archive) | Bearer | DELETE |
| GET | `/items/:id/history` | Audit log | Bearer | VIEW |
| POST | `/items/:id/assignees` | Felelős hozzáadása | Bearer | ASSIGN |
| DELETE | `/items/:id/assignees/:userId` | Felelős eltávolítása | Bearer | ASSIGN |
| GET | `/locations` | Helyszínek listázása | Bearer | VIEW |
| POST | `/locations` | Helyszín létrehozása | Bearer | MANAGE |
| PATCH | `/locations/:id` | Helyszín módosítása | Bearer | MANAGE |

### Request/Response Példák

#### GET /items

```http
GET /api/v1/tasks/items?item_type=todo&status=open&location_id=...&assigned_to=me
Authorization: Bearer <token>
```

```json
{
    "items": [
        {
            "id": "uuid-1",
            "item_type": "todo",
            "title": "Polcok rendszerezése",
            "description": "Raktári polcok újrarendezése ABC szerint",
            "status": "open",
            "priority": "medium",
            "due_date": "2026-01-10",
            "location": {
                "id": "loc-uuid",
                "name": "Raktár",
                "location_type": "raktar"
            },
            "assignees": [
                {
                    "user_id": "user-uuid-1",
                    "name": "Péter",
                    "assigned_at": "2026-01-05T08:00:00Z"
                },
                {
                    "user_id": "user-uuid-2",
                    "name": "Kata",
                    "assigned_at": "2026-01-05T08:00:00Z"
                }
            ],
            "created_by": {
                "id": "user-uuid-3",
                "name": "Jóska"
            },
            "created_at": "2026-01-05T07:30:00Z"
        }
    ],
    "total": 1,
    "filters_applied": {
        "item_type": "todo",
        "status": "open"
    }
}
```

#### POST /items (Feladat létrehozása)

```http
POST /api/v1/tasks/items
Authorization: Bearer <token>
Content-Type: application/json

{
    "item_type": "todo",
    "title": "Polcok rendszerezése",
    "description": "Raktári polcok újrarendezése ABC szerint",
    "priority": "medium",
    "due_date": "2026-01-10",
    "location_id": "loc-uuid",
    "assignee_ids": ["user-uuid-1", "user-uuid-2"]
}
```

---

## Következmények

### Pozitív

1. **Egységes felület:** 3 típus egy widget-ben, egyszerű használat
2. **Polimorf tábla:** Könnyű bővítés új típusokkal
3. **Multi-select felelős:** Csapat feladatok támogatása
4. **Audit trail:** Teljes nyomonkövethetőség
5. **Offline-first:** PWA működik internet nélkül is
6. **Privát jegyzet:** RLS szintű védelem

### Negatív / Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Offline konfliktus | Közepes | Alacsony | LWW + merge + audit log |
| IndexedDB méret | Alacsony | Alacsony | 7MB limit, auto-archiválás |
| RLS performance | Alacsony | Közepes | Megfelelő indexek |
| RBAC komplexitás | Közepes | Alacsony | Guard middleware |

---

## Adatmegőrzési Politika

### GDPR Megfelelőség

| Adat típus | Megőrzési idő | Jogalap |
|------------|---------------|---------|
| Aktív tételek | Amíg aktív | Szerződés |
| Archivált tételek | 1 év | Jogos érdek |
| Audit log | 3 év | Jogos érdek |
| Privát jegyzetek | Törlésig | Felhasználó kérése |

### Automatikus Törlés

```sql
-- Napi CRON: 1 évnél régebbi archivált tételek végleges törlése
DELETE FROM kgc.task_item
WHERE is_archived = TRUE
  AND archived_at < NOW() - INTERVAL '1 year';

-- Napi CRON: 3 évnél régebbi audit log törlése
DELETE FROM kgc.task_item_audit_log
WHERE event_timestamp < NOW() - INTERVAL '3 years';
```

---

## Implementációs Terv

### MVP Scope (6-8 Story Point)

| Story | SP | Leírás |
|-------|-----|--------|
| Adatmodell + migráció | 1 | Táblák, enum-ok, RLS, indexek |
| Location CRUD | 0.5 | Helyszínek kezelése |
| Task CRUD API | 2 | Összes endpoint, validáció |
| Assignee API | 1 | Multi-select felelős |
| Audit trigger | 0.5 | Automatikus naplózás |
| Frontend Widget | 2 | React komponens, tabbed UI |
| Offline sync | 1 | IndexedDB + Service Worker |

### Phase 2 Bővítések

| Funkció | SP | Prioritás |
|---------|-----|-----------|
| Push notification | 1.5 | P3 |
| Ismétlődő feladatok | 1 | P3 |
| Fájl csatolás | 1.5 | P4 |
| Naptár integráció | 2 | P4 |

---

## Kapcsolódó Dokumentumok

- [ADR-001: Franchise Multi-Tenancy](./ADR-001-franchise-multitenancy.md)
- [ADR-002: Deployment és Offline Stratégia](./ADR-002-deployment-offline-strategy.md)
- [ADR-006: Bérlés Audit Trail](./ADR-006-berles-audit-trail-2025-12-08.md)
- [ADR-021: Helykövetés Hierarchia](./ADR-021-helykövetes-hierarchia.md)
- [Feature-Bevasarlolista-Widget.md](../../planning-artifacts/3-solution/features/feature-specs/Feature-Bevasarlolista-Widget.md) - Korábbi egyszerűbb specifikáció

---

## Changelog

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-05 | Kezdeti ADR - Javasolva státusz |

---

**Készítette:** Architect Agent (BMAD Method)
**Jóváhagyásra vár:** PM, Tech Lead
