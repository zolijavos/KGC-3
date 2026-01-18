# Story 33.3: Horilla HR Docker Setup

Status: review

## Story

As a **DevOps mérnök**,
I want **a Horilla HR self-hosted Docker környezetet felállítani**,
so that **a KGC ERP rendszer integrálhassa a HR funkciókat és szinkronizálhassa a dolgozó adatokat**.

## Acceptance Criteria

1. **AC1:** Horilla Docker image használata (hivatalos)
   - Image: horilla/horilla:latest
   - Verzió: latest stable

2. **AC2:** Docker Compose konfiguráció `infra/docker/horilla-hr/`
   - `docker-compose.yml` - Horilla HR services
   - Services: horilla-app, horilla-db (postgres)
   - Health checks
   - Restart policy: unless-stopped

3. **AC3:** PostgreSQL adatbázis külön container
   - Image: postgres:16-alpine
   - Volume persistence: `horilla-db-data`
   - Port: 5434 (ne ütközzön KGC/Twenty DB-vel)

4. **AC4:** Környezeti változók (.env.example)
   - Minden szükséges env var dokumentálva
   - Django settings
   - KGC integráció változók előkészítve

5. **AC5:** API endpoint konfiguráció KGC-hez
   - REST API elérhető
   - Authentication konfiguráció
   - CORS beállítások

6. **AC6:** Dokumentáció: `infra/docker/horilla-hr/README.md`
   - Telepítési útmutató
   - Konfigurációs opciók
   - Troubleshooting szekció

## Tasks / Subtasks

- [x] **Task 1: Docker Compose Fájlok** (AC: #1, #2, #3)
  - [x] `infra/docker/horilla-hr/docker-compose.yml` létrehozása
  - [x] Horilla app service konfiguráció (port 3003)
  - [x] PostgreSQL service (postgres:16-alpine, port 5434)
  - [x] Volume definíciók (horilla-db-data, horilla-static, horilla-media)
  - [x] Network konfiguráció (kgc-network)
  - [x] Health check minden service-hez

- [x] **Task 2: Environment Konfiguráció** (AC: #4)
  - [x] `.env.example` létrehozása
  - [x] Django settings (SECRET_KEY, DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS)
  - [x] Database konfiguráció (DATABASE_URL, DB_* változók)
  - [x] KGC integráció env vars placeholder (KGC_API_URL, KGC_API_KEY)

- [x] **Task 3: KGC Integráció Előkészítés** (AC: #5)
  - [x] API authentication konfiguráció (env placeholder)
  - [x] CORS settings KGC frontend-hez (CSRF_TRUSTED_ORIGINS)
  - [x] Network konfiguráció (kgc-network, host.docker.internal)

- [x] **Task 4: Dokumentáció** (AC: #6)
  - [x] `README.md` létrehozása
  - [x] Quick Start szekció
  - [x] Konfigurációs referencia
  - [x] Troubleshooting guide (6 probléma + megoldás)
  - [x] KGC integráció leírás

- [ ] **Task 5: Tesztelés** (AC: #1-6) - MANUÁLIS VALIDÁCIÓ SZÜKSÉGES
  - [ ] `docker compose up -d` sikeres
  - [ ] Horilla UI elérhető (http://localhost:3003)
  - [ ] Admin login működik (admin/admin)

## Dev Notes

### Horilla HR Technical Info

**Stack:**
- Python 3.10 + Django
- PostgreSQL 16
- Gunicorn WSGI server
- Default port: 8000 (mapped to 3003)

**Official Docker Image:** `horilla/horilla:latest`

**Default Admin:** username: `admin`, password: `admin`

### IHorillaApiClient Interface (KGC Integration)

```typescript
interface IHorillaApiClient {
  getEmployees(filter?: { department?: string; status?: string }): Promise<IHorillaEmployee[]>;
  getEmployeeById(id: string): Promise<IHorillaEmployee | null>;
  updateEmployee(id: string, data: Partial<IHorillaEmployee>): Promise<IHorillaEmployee>;
}
```

### Port Allokáció (KGC Projekt)

| Service | Port | Megjegyzés |
|---------|------|------------|
| KGC API | 3000 | NestJS backend |
| Twenty CRM | 3001 | CRM |
| Chatwoot | 3002 | Support |
| **Horilla HR** | **3003** | HR (ez a story) |
| KGC Web | 5173 | Vite dev server |
| PostgreSQL (KGC) | 5432 | Fő adatbázis |
| PostgreSQL (Twenty) | 5433 | Twenty DB |
| **PostgreSQL (Horilla)** | **5434** | Horilla DB |

### References

- [Source: planning-artifacts/epics/epic-33-infrastructure-deployment.md#Story-33-3]
- [Source: packages/integration/horilla-hr/src/services/employee-sync.service.ts]
- [External: https://hub.docker.com/r/horilla/horilla]
- [External: https://github.com/horilla-opensource/horilla]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Docker compose config validation: Unable to run locally (Docker not installed in dev environment)
- Horilla official Docker docs: Limited detail, used Docker Hub info + community resources

### Completion Notes List

1. **Task 1 COMPLETE:** Docker Compose létrehozva 2 service-szel:
   - `horilla-app`: Django app Gunicorn-nal (port 3003)
   - `horilla-db`: PostgreSQL 16 (port 5434)
   - Health check mindkét service-hez
   - 3 named volume: db-data, static, media

2. **Task 2 COMPLETE:** Environment konfiguráció:
   - `.env.example` teljes dokumentációval
   - Django-specifikus beállítások (SECRET_KEY, DEBUG, CSRF)
   - KGC integráció placeholder-ek

3. **Task 3 COMPLETE:** KGC integráció előkészítve:
   - kgc-network hálózat
   - CSRF_TRUSTED_ORIGINS konfiguráció
   - API token auth dokumentálva

4. **Task 4 COMPLETE:** README.md dokumentáció:
   - Quick Start guide
   - Django manage.py parancsok
   - Troubleshooting szekció (6 gyakori probléma)
   - Backup/restore instrukciók
   - Default admin credentials figyelmeztetés

5. **Task 5 PENDING:** Manuális tesztelés Docker környezetben szükséges

### File List

**Created:**
- `infra/docker/horilla-hr/docker-compose.yml` - Fő Docker Compose konfiguráció
- `infra/docker/horilla-hr/.env.example` - Environment változók template
- `infra/docker/horilla-hr/README.md` - Dokumentáció

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-18 | Story implementáció - Task 1-4 complete, Task 5 pending manual test | Claude Opus 4.5 |
