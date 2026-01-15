# ADR-039: Plane Projektmenedzsment Integráció és BMAD Szinkronizáció

**Dátum:** 2026-01-03
**Státusz:** Jóváhagyva
**Résztvevők:** Javo!, Winston (Architect Agent)
**Kapcsolódó ADR-ek:** ADR-014 (Moduláris Architektúra), ADR-015 (CRM/Support Integráció)

---

## Összefoglaló

A KGC ERP plugin ökoszisztémájához **Plane** projektmenedzsment eszköz integrációja javasolt 4. pluginként, Git Submodule architektúrával. Különleges funkció: **BMAD → Plane szinkronizációs workflow**, amely automatikusan szinkronizálja a BMAD fejlesztési artifactokat (epic, story, task) a Plane PM eszközbe.

### Ajánlott Megközelítés

**Git Submodule Fork + MCP Server + REST API Hybrid**
- Plane: Projektmenedzsment (önálló alkalmazás, fork)
- BMAD Sync Workflow: Epic/Story → Plane Module/Work Item
- MCP Server: AI-natív integráció Claude Code-ból
- Integration Layer: REST API sync szolgáltatás

---

## Tartalomjegyzék

1. [Miért Plane?](#miért-plane)
2. [Platform Elemzés](#platform-elemzés)
3. [BMAD → Plane Mapping](#bmad--plane-mapping)
4. [Integrációs Architektúra](#integrációs-architektúra)
5. [BMAD Sync Workflow](#bmad-sync-workflow)
6. [MCP Server Integráció](#mcp-server-integráció)
7. [Implementációs Terv](#implementációs-terv)
8. [Rizikók és Mitigáció](#rizikók-és-mitigáció)
9. [Alternatívák](#alternatívák)

---

## Miért Plane?

### Döntési Mátrix

| Szempont | Plane | Jira | Linear | GitHub Projects |
|----------|-------|------|--------|-----------------|
| **Licenc** | ✅ AGPL-3.0 (Fork OK) | ❌ SaaS | ❌ SaaS | ⚠️ Limitált |
| **Self-hosting** | ✅ Docker | ❌ Cloud only | ❌ Cloud only | ⚠️ GitHub Enterprise |
| **Költség** | ✅ Ingyenes | ❌ 8-15$/user/hó | ❌ 8$/user/hó | ✅ Ingyenes |
| **API** | ✅ REST (jól dokumentált) | ✅ REST | ✅ GraphQL | ✅ GraphQL |
| **MCP Server** | ✅ Hivatalos | ❌ Nincs | ❌ Nincs | ⚠️ Közösségi |
| **BMAD kompatibilitás** | ✅ Module/Cycle mapping | ⚠️ Epic/Sprint | ⚠️ Project/Cycle | ⚠️ Project/Milestone |
| **Tech stack** | ✅ Django + React | N/A | N/A | N/A |
| **GitHub csillagok** | ✅ 37k+ | N/A | N/A | N/A |

### Ajánlás: Plane ✅

**Indokok:**
1. **Open source fork lehetőség**: AGPL-3.0 licenc
2. **Self-hosted**: Teljes adatkontroll
3. **BMAD-kompatibilis struktúra**: Module ≈ Epic, Cycle ≈ Sprint
4. **Hivatalos MCP Server**: 30+ eszköz AI integrációhoz
5. **Django + React**: Kompatibilis a meglévő stack-kel (Horilla is Django)

---

## Platform Elemzés

### Plane Technológiai Stack

| Réteg | Technológia | KGC Kompatibilitás |
|-------|-------------|-------------------|
| **Backend** | Django (Python 3.11+) | ✅ Mint Horilla HR |
| **Frontend** | React + Next.js | ✅ Mint Twenty CRM |
| **Adatbázis** | PostgreSQL | ✅ Közös infrastruktúra |
| **Cache** | Redis | ✅ Közös infrastruktúra |
| **Queue** | Celery + Redis | ✅ Background jobs |
| **Deployment** | Docker Compose | ✅ KGC is Docker |

### Plane Core Funkciók

| Funkció | Leírás | BMAD Mapping |
|---------|--------|--------------|
| **Workspace** | Szervezeti szint | KGC projekt |
| **Project** | Projekt konténer | - |
| **Module** | Funkcionális csoportosítás | **Epic** |
| **Cycle** | Sprint időszak | **Sprint** |
| **Work Item** | Feladat/Issue | **Story** |
| **Sub-issue** | Részfeladat | Story subtask |
| **State** | Workflow státusz | Story status |
| **Label** | Címke | Epic/type label |
| **View** | Szűrt nézetek | - |
| **Page** | Dokumentáció | - |

### API Képességek

```yaml
API típus: REST
Base URL: /api/v1/workspaces/{workspace_slug}/

Authentication:
  Header: X-API-Key
  Format: plane_api_<token>

Rate Limiting:
  Limit: 60 requests/minute
  Headers: X-RateLimit-Remaining, X-RateLimit-Reset

Pagination:
  Type: Cursor-based
  Format: value:offset:is_prev

Endpoints:
  Projects:
    - POST/GET/PATCH/DELETE /projects/
  Work Items:
    - POST/GET/PATCH/DELETE /projects/{id}/work-items/
    - NOTE: /issues/ deprecated (2026-03-31)
  Modules:
    - POST/GET/PATCH/DELETE /projects/{id}/modules/
    - POST /modules/{id}/module-issues/
  Cycles:
    - POST/GET/PATCH/DELETE /projects/{id}/cycles/
    - POST /cycles/{id}/cycle-issues/
  States:
    - POST/GET/PATCH/DELETE /projects/{id}/states/
  Labels:
    - POST/GET/PATCH/DELETE /projects/{id}/labels/
```

---

## BMAD → Plane Mapping

### Entitás Mapping

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BMAD → PLANE MAPPING                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BMAD Artifact              Plane Entity           Megjegyzés        │
│  ─────────────              ────────────           ──────────        │
│                                                                      │
│  project-name         →     Workspace              KGC-ERP           │
│  planning-artifacts/  →     Project                kgc-erp-dev       │
│                                                                      │
│  epic-*.md            →     Module                 Funkcionális csoport│
│  sprint-status.yaml   →     Cycle                  Sprint időszak    │
│                                                                      │
│  story-*.md           →     Work Item              User story        │
│  - title              →     name                                     │
│  - acceptance criteria →    description (MD)                         │
│  - status             →     state_id               Mapped state      │
│  - subtasks           →     Sub-issues             Beágyazott        │
│                                                                      │
│  story labels         →     Labels                 epic:X, type:Y    │
│  story priority       →     priority               urgent/high/...   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Státusz Mapping

```yaml
# BMAD Story Status → Plane State Mapping

state_mapping:
  # BMAD status → Plane state name
  backlog: "Backlog"
  drafted: "Backlog"
  ready-for-dev: "Todo"
  in-progress: "In Progress"
  review: "In Review"
  done: "Done"
  cancelled: "Cancelled"

# Plane State Colors (ajánlott)
state_colors:
  Backlog: "#gray"
  Todo: "#blue"
  In Progress: "#yellow"
  In Review: "#purple"
  Done: "#green"
  Cancelled: "#red"
```

### Label Konvenciók

```yaml
# Auto-generated labels from BMAD

epic_labels:
  format: "epic:{epic-number}"
  examples:
    - "epic:1"
    - "epic:2"
    - "epic:3"

type_labels:
  format: "type:{story-type}"
  examples:
    - "type:feature"
    - "type:bugfix"
    - "type:refactor"
    - "type:test"

priority_labels:
  format: "priority:{level}"
  examples:
    - "priority:urgent"
    - "priority:high"
    - "priority:medium"
    - "priority:low"
```

---

## Integrációs Architektúra

### Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KGC ERP + PLANE ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   BMAD Files     │  │  Claude Code     │  │      Plane               │  │
│  │                  │  │  + MCP Server    │  │      (Self-hosted)       │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────────────┤  │
│  │ epic-*.md        │  │ Plane MCP        │  │ PostgreSQL (plane DB)   │  │
│  │ story-*.md       │  │ 30+ tools        │  │ Redis                    │  │
│  │ sprint-status.yaml│  │                  │  │ Port: 8000 (API)         │  │
│  │                  │  │                  │  │ Port: 8080 (Web)         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬──────────────┘  │
│           │                     │                        │                  │
│           │                     │ MCP Protocol           │                  │
│           │                     │                        │                  │
│           └──────────┬──────────┴────────────────────────┘                  │
│                      │                                                       │
│           ┌──────────▼──────────────────────────────────────────┐           │
│           │              INTEGRATION LAYER                       │           │
│           ├─────────────────────────────────────────────────────┤           │
│           │                                                      │           │
│           │  ┌─────────────────┐    ┌─────────────────────────┐ │           │
│           │  │ BMAD Sync       │    │ @kgc/plane-sync         │ │           │
│           │  │ Workflow        │    │ TypeScript package      │ │           │
│           │  │                 │    │                         │ │           │
│           │  │ - Read epic.md  │───▶│ - PlaneAPIClient        │ │           │
│           │  │ - Read story.md │    │ - EntityMapper          │ │           │
│           │  │ - Parse YAML    │    │ - SyncService           │ │           │
│           │  │ - Call sync     │    │ - IdempotencyTracker    │ │           │
│           │  └─────────────────┘    └────────────┬────────────┘ │           │
│           │                                      │               │           │
│           └──────────────────────────────────────┼───────────────┘           │
│                                                  │                           │
│                                        REST API  │                           │
│                                                  ▼                           │
│           ┌─────────────────────────────────────────────────────┐           │
│           │                  PLANE API                           │           │
│           │  POST /api/v1/workspaces/{ws}/projects/{p}/modules/ │           │
│           │  POST /api/v1/workspaces/{ws}/projects/{p}/work-items/│          │
│           │  PATCH /api/v1/.../work-items/{id}/                  │           │
│           └─────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Docker Compose Kiegészítés

```yaml
# infra/docker/docker-compose.yml - Plane szolgáltatások

services:
  # ... existing services (postgres, redis, backend, frontend, twenty, chatwoot, horilla)

  # === PLANE (4. Plugin) ===

  plane-api:
    build:
      context: ../../plugins/plane
      dockerfile: ./apiserver/Dockerfile
    environment:
      DATABASE_URL: postgres://kgc:${DB_PASSWORD}@postgres:5432/plane
      REDIS_URL: redis://redis:6379/3
      SECRET_KEY: ${PLANE_SECRET_KEY}
      CORS_ALLOWED_ORIGINS: "http://localhost:8080,http://plane-web:3000"
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"
    networks:
      - kgc-network

  plane-web:
    build:
      context: ../../plugins/plane
      dockerfile: ./web/Dockerfile
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://plane-api:8000
      NEXT_PUBLIC_DEPLOY_URL: http://localhost:8080
    depends_on:
      - plane-api
    ports:
      - "8080:3000"
    networks:
      - kgc-network

  plane-worker:
    build:
      context: ../../plugins/plane
      dockerfile: ./apiserver/Dockerfile
    command: python manage.py rqworker
    environment:
      DATABASE_URL: postgres://kgc:${DB_PASSWORD}@postgres:5432/plane
      REDIS_URL: redis://redis:6379/3
    depends_on:
      - plane-api
      - redis
    networks:
      - kgc-network

  plane-beat:
    build:
      context: ../../plugins/plane
      dockerfile: ./apiserver/Dockerfile
    command: python manage.py rqscheduler
    environment:
      DATABASE_URL: postgres://kgc:${DB_PASSWORD}@postgres:5432/plane
      REDIS_URL: redis://redis:6379/3
    depends_on:
      - plane-api
      - redis
    networks:
      - kgc-network
```

---

## BMAD Sync Workflow

### Workflow Struktúra

```
_bmad/bmm/workflows/4-implementation/sync-to-plane/
├── workflow.yaml           # Workflow konfiguráció
├── instructions.md         # Részletes végrehajtási utasítások
├── checklist.md            # Validációs checklist
└── data/
    └── state-mapping.yaml  # BMAD → Plane státusz mapping
```

### workflow.yaml

```yaml
name: sync-to-plane
description: BMAD epic/story/task artifactok szinkronizálása Plane PM eszközbe
phase: 4-implementation
agent: sm  # Scrum Master agent

triggers:
  - manual        # /bmad:bmm:workflows:sync-to-plane
  - post-story    # story-done workflow után (opcionális)
  - scheduled     # Napi sync (opcionális)

inputs:
  required:
    - sprint-status.yaml
  optional:
    - epic-*.md
    - story-*.md

outputs:
  - plane-sync-log.md
  - .plane-sync-state.json

config:
  plane_api_url: "${PLANE_API_URL:-http://localhost:8000}"
  plane_api_key: "${PLANE_API_KEY}"
  plane_workspace: "${PLANE_WORKSPACE:-kgc-erp}"
  plane_project: "${PLANE_PROJECT:-kgc-erp-dev}"
  sync_direction: "bmad-to-plane"  # Egyirányú
  create_missing_states: true
  create_missing_labels: true
```

### instructions.md (Workflow Lépések)

```markdown
# Sync to Plane Workflow

## Step 1: Konfiguráció Validálás

1. Ellenőrizd a környezeti változókat:
   - PLANE_API_URL (kötelező)
   - PLANE_API_KEY (kötelező)
   - PLANE_WORKSPACE (kötelező)
   - PLANE_PROJECT (kötelező)

2. Teszteld az API kapcsolatot:
   ```bash
   curl -H "X-API-Key: $PLANE_API_KEY" \
        "$PLANE_API_URL/api/v1/workspaces/$PLANE_WORKSPACE/"
   ```

3. Ha sikertelen → Hibaüzenet, workflow leáll

## Step 2: Plane Projekt Előkészítés

1. Ellenőrizd/hozd létre a szükséges States-eket:
   - Backlog, Todo, In Progress, In Review, Done, Cancelled

2. Ellenőrizd/hozd létre az alap Labels-eket:
   - type:feature, type:bugfix, type:refactor, type:test

3. Mentsd el a state/label ID-kat a sync state-be

## Step 3: Epic → Module Szinkronizáció

1. Olvasd be az összes epic fájlt:
   ```
   planning-artifacts/epics/*.md
   vagy
   planning-artifacts/epics.md
   ```

2. Minden epic-hez:
   a. Keress létező Module-t `external_id` alapján
   b. Ha nem létezik:
      - POST /api/v1/.../modules/
      - Mentsd el: epic-id → plane-module-id
   c. Ha létezik és változott:
      - PATCH /api/v1/.../modules/{id}/
   d. Ha létezik és nem változott:
      - Skip (checksum egyezik)

## Step 4: Story → Work Item Szinkronizáció

1. Olvasd be a sprint-status.yaml-t a story listához

2. Minden story-hoz:
   a. Keress létező Work Item-et `external_id` alapján
   b. Generáld a payload-ot:
      ```json
      {
        "name": "Story title",
        "description": "Acceptance criteria (markdown)",
        "state": "<state_id>",
        "priority": "medium",
        "module": "<module_id>",
        "labels": ["<label_id>", ...]
      }
      ```
   c. Ha nem létezik → POST /work-items/
   d. Ha létezik és változott → PATCH /work-items/{id}/
   e. Mentsd el: story-id → plane-issue-id

## Step 5: Cycle (Sprint) Szinkronizáció

1. Ellenőrizd az aktív Cycle-t
2. Ha nincs aktív Cycle → Hozz létre újat
3. Add hozzá az in-progress story-kat a Cycle-hoz:
   - POST /cycles/{id}/cycle-issues/

## Step 6: Sync Log és Validáció

1. Generálj sync log-ot (plane-sync-log.md):
   - Létrehozott: X module, Y work item
   - Frissített: X module, Y work item
   - Kihagyott (változatlan): X module, Y work item
   - Hibák: lista

2. Frissítsd a .plane-sync-state.json-t

3. Jelenítsd meg az összefoglalót a felhasználónak
```

### Sync State JSON (Idempotency)

```json
{
  "last_sync": "2026-01-03T10:30:00Z",
  "plane_config": {
    "workspace_id": "ws-uuid-123",
    "project_id": "proj-uuid-456"
  },
  "state_ids": {
    "Backlog": "state-uuid-1",
    "Todo": "state-uuid-2",
    "In Progress": "state-uuid-3",
    "In Review": "state-uuid-4",
    "Done": "state-uuid-5",
    "Cancelled": "state-uuid-6"
  },
  "label_ids": {
    "epic:1": "label-uuid-1",
    "epic:2": "label-uuid-2",
    "type:feature": "label-uuid-10"
  },
  "mappings": {
    "modules": {
      "epic-1": {
        "plane_id": "module-uuid-1",
        "checksum": "sha256:abc123..."
      },
      "epic-2": {
        "plane_id": "module-uuid-2",
        "checksum": "sha256:def456..."
      }
    },
    "work_items": {
      "1-1-user-authentication": {
        "plane_id": "issue-uuid-1",
        "checksum": "sha256:ghi789..."
      },
      "1-2-account-management": {
        "plane_id": "issue-uuid-2",
        "checksum": "sha256:jkl012..."
      }
    },
    "cycles": {
      "sprint-1": {
        "plane_id": "cycle-uuid-1"
      }
    }
  },
  "sync_stats": {
    "total_syncs": 15,
    "last_created": 3,
    "last_updated": 5,
    "last_skipped": 7,
    "last_errors": 0
  }
}
```

---

## MCP Server Integráció

### Konfigurálás

```json
// .mcp/servers.json
{
  "servers": {
    "plane": {
      "type": "npm",
      "package": "@makeplane/plane-mcp-server",
      "config": {
        "apiUrl": "http://localhost:8000",
        "apiKey": "${PLANE_API_KEY}",
        "workspaceSlug": "kgc-erp"
      }
    }
  }
}
```

### Elérhető MCP Eszközök (30+)

| Kategória | Eszközök | BMAD Használat |
|-----------|----------|----------------|
| **Projects** | `create_project`, `list_projects`, `get_project` | Projekt setup |
| **Modules** | `create_module`, `list_modules`, `add_to_module` | Epic sync |
| **Work Items** | `create_work_item`, `list_work_items`, `update_work_item` | Story sync |
| **Cycles** | `create_cycle`, `list_cycles`, `add_to_cycle` | Sprint sync |
| **States** | `create_state`, `list_states` | Státusz setup |
| **Labels** | `create_label`, `list_labels` | Label setup |

### MCP vs REST API Előnyök

| Szempont | MCP Server | Közvetlen REST |
|----------|-----------|----------------|
| **Integráció** | ✅ Natív Claude Code-ban | ⚠️ Script szükséges |
| **Hitelesítés** | ✅ Automatikus | ⚠️ Manuális header |
| **Hibakezelés** | ✅ Beépített retry | ⚠️ Egyedi implementáció |
| **Rate limiting** | ✅ Automatikus backoff | ⚠️ Manuális |
| **Batch műveletek** | ⚠️ Egyesével | ✅ Batch endpoint (ha van) |
| **Komplex logika** | ⚠️ Limitált | ✅ Teljes kontroll |

**Ajánlás:** Hybrid megközelítés
- MCP: Ad-hoc műveletek, manuális sync
- REST (@kgc/plane-sync): Automatizált bulk sync

---

## Implementációs Terv

### Fázis 1: Infrastruktúra (1 hét)

**Feladatok:**
1. Plane fork létrehozása: `github.com/kgc/plane-fork`
2. Git submodule hozzáadása: `plugins/plane/`
3. Docker Compose kiegészítés (plane-api, plane-web, plane-worker)
4. Environment variables (.env.example)
5. Plane első indítás, admin user létrehozás

**Deliverables:**
- `.gitmodules` frissítés
- `infra/docker/docker-compose.yml` frissítés
- `plugins/plane/` submodule

### Fázis 2: API Integráció (1 hét)

**Feladatok:**
1. `@kgc/plane-sync` package létrehozása
2. PlaneAPIClient implementálása (TypeScript)
3. EntityMapper (BMAD → Plane)
4. Idempotency tracking (.plane-sync-state.json)
5. Unit tesztek

**Deliverables:**
- `packages/plane-sync/src/client.ts`
- `packages/plane-sync/src/mapper.ts`
- `packages/plane-sync/src/sync.ts`
- Jest tesztek

### Fázis 3: BMAD Workflow (1 hét)

**Feladatok:**
1. `sync-to-plane` workflow fájlok létrehozása
2. Workflow regisztrálás
3. State/Label mapping konfigurálása
4. Integráció a sprint-status.yaml olvasással
5. Sync log generálás

**Deliverables:**
- `_bmad/bmm/workflows/4-implementation/sync-to-plane/`
- Workflow dokumentáció

### Fázis 4: MCP Server (0.5 hét)

**Feladatok:**
1. MCP szerver telepítés
2. `.mcp/servers.json` konfiguráció
3. Tesztelés Claude Code-ból
4. Dokumentáció

**Deliverables:**
- `.mcp/servers.json`
- MCP használati útmutató

### Fázis 5: Tesztelés és Dokumentáció (0.5 hét)

**Feladatok:**
1. E2E teszt: Epic → Module sync
2. E2E teszt: Story → Work Item sync
3. E2E teszt: Status update sync
4. Dokumentáció véglegesítés
5. Training anyag

**Deliverables:**
- E2E tesztek
- User guide
- ADR véglegesítés

---

## Rizikók és Mitigáció

| Rizikó | Valószínűség | Hatás | Mitigáció |
|--------|--------------|-------|-----------|
| **Plane API breaking changes** | Közepes | Közepes | Verzió lock, adapter pattern |
| **Rate limiting (60/perc)** | Alacsony | Alacsony | Batch sync, exponential backoff |
| **Sync konfliktus** | Közepes | Közepes | Checksum alapú idempotency, audit log |
| **Plane downtime** | Alacsony | Alacsony | Graceful degradation, retry queue |
| **BMAD artifact parse hiba** | Alacsony | Közepes | Robust markdown parser, validation |
| **Mapping inkonzisztencia** | Közepes | Közepes | .plane-sync-state.json tracking |

---

## Alternatívák

### 1. GitHub Projects

| Szempont | Érték |
|----------|-------|
| Költség | Ingyenes |
| Integráció | GitHub native |
| Funkciók | ⚠️ Limitált (nincs Module, korlátozott customization) |
| **Ajánlás** | ❌ NEM (nem elég rugalmas) |

### 2. Jira (Cloud)

| Szempont | Érték |
|----------|-------|
| Költség | 8-15$/user/hó |
| Self-hosting | ❌ Nincs |
| Funkciók | ✅ Gazdag |
| **Ajánlás** | ❌ NEM (SaaS lock-in, drága) |

### 3. Linear

| Szempont | Érték |
|----------|-------|
| Költség | 8$/user/hó |
| Self-hosting | ❌ Nincs |
| Funkciók | ✅ Modern UX |
| **Ajánlás** | ❌ NEM (SaaS only) |

### 4. **Plane (AJÁNLOTT)** ✅

| Szempont | Érték |
|----------|-------|
| Költség | Ingyenes (self-hosted) |
| Self-hosting | ✅ Docker |
| Funkciók | ✅ Gazdag (Module, Cycle, States) |
| Fork | ✅ AGPL-3.0 |
| MCP | ✅ Hivatalos szerver |
| **Ajánlás** | ✅ IGEN |

---

## Összefoglaló

### Döntés

**Plane** hozzáadása 4. pluginként a KGC ERP ökoszisztémához:
- Git Submodule fork architektúra (mint Twenty, Chatwoot, Horilla)
- BMAD sync workflow automatikus artifact szinkronizáláshoz
- MCP Server integráció AI-natív műveletekhez

### Plugin Összehasonlítás (Frissített)

| Plugin | Funkció | Tech Stack | Licenc | Port |
|--------|---------|------------|--------|------|
| Twenty CRM | Ügyfélkapcsolat | React/Node | GPL-3.0 | 3001 |
| Chatwoot | Support/Ticket | Vue/Rails | MIT | 3002 |
| Horilla HR | HR menedzsment | Django/HTMX | LGPL-3.0 | 8001 |
| **Plane** | **Projektmenedzsment** | **React/Django** | **AGPL-3.0** | **8000/8080** |

### Következő Lépések

1. ADR jóváhagyás
2. Plane fork létrehozása (`github.com/kgc/plane-fork`)
3. Fázis 1 implementáció (infrastruktúra setup)

---

## Kapcsolódó Dokumentumok

| Dokumentum | Elérési út |
|------------|------------|
| KGC PRD | [planning-artifacts/prd.md](../../planning-artifacts/prd.md) |
| Moduláris Architektúra | [ADR-014](ADR-014-modular-architektura-vegleges.md) |
| CRM/Support Integráció | [ADR-015](ADR-015-CRM-Support-Integration-Strategy.md) |
| Plane GitHub | https://github.com/makeplane/plane |
| Plane Docs | https://docs.plane.so/ |
| Plane API Reference | https://developers.plane.so/api-reference/introduction |
| Plane MCP Server | https://github.com/makeplane/plane-mcp-server |

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2026-01-03 | 1.0 | Kezdeti dokumentum |
| 2026-01-03 | 1.1 | Jóváhagyva Javo! által |

---

**Készült:** Winston (Architect Agent)
**Dátum:** 2026-01-03
**Státusz:** Jóváhagyva (Javo! által)
