# Epic 33: Infrastructure & Deployment

**Epic ID:** E-INFRA-01
**Prioritás:** P1 - Post-MVP (de szükséges a full-stack működéshez)
**Típus:** DevOps / Infrastructure
**Készítette:** BMAD Method
**Dátum:** 2026-01-18
**Frissítve:** 2026-01-26 (ADR-045 - Infrastruktúra Egyszerűsítés)

---

## ÖSSZEFOGLALÓ

Self-hosted külső rendszerek telepítése és **Docker Compose alapú** infrastruktúra kialakítása.

> **FONTOS VÁLTOZÁS (2026-01-26):** Az ADR-045 döntés értelmében a Kubernetes és komplex monitoring stack **eltávolításra került**. Helyette egyszerűbb, a csapat által karbantartható Docker Compose + Sentry megoldás kerül bevezetésre.

| Rendszer   | Típus    | Forrás                               |
| ---------- | -------- | ------------------------------------ |
| Twenty CRM | Git Fork | https://github.com/twentyhq/twenty   |
| Chatwoot   | Git Fork | https://github.com/chatwoot/chatwoot |
| Horilla HR | Git Fork | https://github.com/horlogg/horilla   |

---

## ARCHITEKTÚRA DÖNTÉS

**Lásd:** [ADR-045: Infrastruktúra Egyszerűsítés](../adr/ADR-045-infrastructure-simplification.md)

### Választott megoldás: "Boring Technology" Stack

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION SETUP                       │
├─────────────────────────────────────────────────────────┤
│  VPS (Hetzner/DigitalOcean) €30-50/hó                   │
│  ├── Docker Compose                                      │
│  │   ├── kgc-api + kgc-web + kgc-admin                  │
│  │   ├── PostgreSQL 15 + Redis 7                        │
│  │   ├── Caddy (reverse proxy + auto SSL)               │
│  │   └── Twenty CRM + Chatwoot + Horilla HR             │
│  └── Portainer (opcionális GUI)                         │
├─────────────────────────────────────────────────────────┤
│  MONITORING: Sentry.io + UptimeRobot + /health          │
│  CI/CD: GitHub Actions + SSH deploy script              │
└─────────────────────────────────────────────────────────┘
```

### Miért NEM Kubernetes?

| Szempont     | K8s         | Docker Compose |
| ------------ | ----------- | -------------- |
| Tanulási idő | 2-6 hónap   | 1-2 nap        |
| Havi költség | €200+       | €30-50         |
| Csapat tudás | Nincs       | Van            |
| Karbantartás | DevOps kell | Bárki kezeli   |

---

## STORY LISTA (7 story)

### Story 33-1: Twenty CRM Docker Setup ✅ DONE

**Leírás:** Twenty CRM self-hosted telepítése Docker-ben, PostgreSQL adatbázissal.

**Acceptance Criteria:**

- [x] Twenty CRM fork létrehozva git submodule-ként
- [x] Docker Compose konfiguráció `infra/docker/twenty-crm/`
- [x] PostgreSQL adatbázis külön container
- [x] Környezeti változók (.env.example)
- [x] Health check endpoint működik
- [x] KGC tenant-aware konfiguráció előkészítve
- [x] Dokumentáció: `infra/docker/twenty-crm/README.md`

**Státusz:** ✅ DONE (Code reviewed 2026-01-25)

---

### Story 33-2: Chatwoot Docker Setup ✅ DONE

**Leírás:** Chatwoot self-hosted telepítése Docker-ben, Redis + PostgreSQL-lel.

**Acceptance Criteria:**

- [x] Chatwoot fork létrehozva git submodule-ként
- [x] Docker Compose konfiguráció `infra/docker/chatwoot/`
- [x] PostgreSQL + Redis containers
- [x] Sidekiq worker container
- [x] Környezeti változók (.env.example)
- [x] Webhook endpoint konfiguráció KGC-hez
- [x] Dokumentáció: `infra/docker/chatwoot/README.md`

**Státusz:** ✅ DONE (Code reviewed 2026-01-25)

---

### Story 33-3: Horilla HR Docker Setup ✅ DONE

**Leírás:** Horilla HR self-hosted telepítése Docker-ben.

**Acceptance Criteria:**

- [x] Horilla fork létrehozva git submodule-ként
- [x] Docker Compose konfiguráció `infra/docker/horilla-hr/`
- [x] PostgreSQL adatbázis container
- [x] Python dependencies (requirements.txt)
- [x] Környezeti változók (.env.example)
- [x] API endpoint konfiguráció KGC employee-sync-hez
- [x] Dokumentáció: `infra/docker/horilla-hr/README.md`

**Státusz:** ✅ DONE (Code reviewed 2026-01-25)

---

### Story 33-4: Full-Stack Docker Compose ✅ DONE

**Leírás:** Teljes development stack egyetlen docker-compose.yml fájlban.

**Acceptance Criteria:**

- [x] `infra/docker/docker-compose.yml` - full stack
- [x] `infra/docker/docker-compose.dev.yml` - dev overrides
- [x] KGC API + Web + Admin containers
- [x] Twenty CRM container
- [x] Chatwoot containers (app + sidekiq)
- [x] Horilla HR container
- [x] Shared PostgreSQL VAGY külön DB-k per service
- [x] Shared Redis VAGY külön instance-ok
- [x] Traefik/Nginx reverse proxy
- [x] Network isolation (kgc-network)
- [x] Volume mounts for persistence
- [x] `make up` / `make down` parancsok

**Státusz:** ✅ DONE (2026-01-25)

---

### Story 33-5: Production Docker Compose + Caddy 🆕 MÓDOSÍTOTT

**Leírás:** Production-ready Docker Compose konfiguráció Caddy reverse proxy-val és automatikus SSL-lel.

> **ADR-045 változás:** Kubernetes manifests helyett Docker Compose + Caddy megoldás.

**Acceptance Criteria:**

- [ ] `infra/docker/docker-compose.prod.yml` - production config
- [ ] Caddy reverse proxy automatikus Let's Encrypt SSL-lel
- [ ] Production environment változók (.env.prod.example)
- [ ] Backup script (`scripts/backup.sh`) - PostgreSQL pg_dump
- [ ] Restore script (`scripts/restore.sh`)
- [ ] Health check minden service-en
- [ ] Dokumentáció: `infra/docker/PRODUCTION.md`

**Technikai részletek:**

```yaml
# Caddy konfiguráció példa
app.kgc.hu {
reverse_proxy kgc-web:3000
}
api.kgc.hu {
reverse_proxy kgc-api:4000
}
crm.kgc.hu {
reverse_proxy twenty-crm:3001
}
```

**Story Point:** 5 (csökkentve 13-ról)

---

### Story 33-6: Egyszerű CI/CD Pipeline 🆕 MÓDOSÍTOTT

**Leírás:** GitHub Actions alapú CI/CD pipeline egyszerű SSH deployment-tel.

> **ADR-045 változás:** Komplex K8s deployment helyett egyszerű SSH + rsync megoldás.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` - lint, test, typecheck, build
- [ ] `.github/workflows/deploy.yml` - SSH deploy to production
- [ ] Docker image build (opcionális GHCR push)
- [ ] `scripts/deploy.sh` - rsync + docker compose restart
- [ ] `scripts/rollback.sh` - előző verzióra visszaállás
- [ ] Environment secrets management (GitHub Secrets)
- [ ] Slack/Discord notification (opcionális)
- [ ] Dokumentáció: `.github/DEPLOYMENT.md`

**CI Pipeline:**

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    - pnpm lint
  test:
    - pnpm test
  typecheck:
    - pnpm typecheck
  build:
    - pnpm build
```

**Deploy script (egyszerűsített):**

```bash
#!/bin/bash
# scripts/deploy.sh
rsync -avz --delete ./dist/ user@server:/app/
ssh user@server "cd /app && docker compose -f docker-compose.prod.yml up -d"
```

**Story Point:** 3 (csökkentve 8-ról)

---

### Story 33-7: Sentry + Health Monitoring 🆕 MÓDOSÍTOTT

**Leírás:** Egyszerűsített monitoring Sentry.io error tracking-gel és health check endpoint-okkal.

> **ADR-045 változás:** Prometheus + Grafana + Loki stack helyett Sentry.io + UptimeRobot.

**Acceptance Criteria:**

- [ ] Sentry.io integráció KGC API-ban (@sentry/nestjs)
- [ ] Sentry.io integráció KGC Web-ben (@sentry/nextjs)
- [ ] `/health` endpoint minden service-en (200 OK ha működik)
- [ ] `/ready` endpoint (DB connection check)
- [ ] UptimeRobot konfiguráció dokumentáció
- [ ] Error alerting beállítás (Sentry → Slack/Email)
- [ ] Dokumentáció: `infra/monitoring/README.md`

**Health endpoint példa:**

```typescript
// packages/core/common/src/health/health.controller.ts
@Get('/health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}

@Get('/ready')
async ready() {
  const dbConnected = await this.prisma.$queryRaw`SELECT 1`;
  return { status: 'ready', database: !!dbConnected };
}
```

**Story Point:** 2 (csökkentve 5-ről)

---

## ELTÁVOLÍTOTT STORY-K (ADR-045)

A következő story-k **TÖRÖLVE** lettek az egyszerűsítés miatt:

| Eredeti Story                 | Indoklás                         |
| ----------------------------- | -------------------------------- |
| ~~Kubernetes manifests~~      | K8s túl komplex a csapat számára |
| ~~Prometheus scrape configs~~ | Sentry.io elegendő               |
| ~~Grafana dashboards~~        | Nem szükséges                    |
| ~~Loki log aggregation~~      | Docker logs + Sentry elegendő    |
| ~~HPA auto-scaling~~          | Manuális scaling elegendő        |
| ~~ServiceMonitor resources~~  | K8s-specifikus, nem releváns     |

---

## FÜGGŐSÉGEK

```
Epic 33 függőségei:
├── Epic 28 (Twenty CRM Integration) ✅ DONE - kód kész
├── Epic 29 (Chatwoot Integration) ✅ DONE - kód kész
├── Epic 30 (Horilla HR Integration) ✅ DONE - kód kész
└── KGC API + Web alapok ✅ DONE
```

## STORY SORREND

```
33-1 (Twenty)  ──┐
33-2 (Chatwoot) ─┼──► 33-4 (Full Stack) ──► 33-5 (Prod Compose) ──► 33-6 (CI/CD)
33-3 (Horilla) ──┘           ✅                    │                      │
      ✅                                           ▼                      ▼
                                            33-7 (Sentry)          (parallel)
```

Az első 4 story KÉSZ. A 33-5, 33-6, 33-7 párhuzamosan futtatható.

---

## TECHNIKAI DÖNTÉSEK (Frissítve ADR-045)

| Kérdés            | Eredeti Döntés       | Új Döntés (ADR-045)         |
| ----------------- | -------------------- | --------------------------- |
| Orchestration     | Kubernetes           | **Docker Compose**          |
| Reverse Proxy     | Traefik (K8s)        | **Caddy** (auto SSL)        |
| Monitoring        | Prometheus + Grafana | **Sentry.io + UptimeRobot** |
| CI/CD Deploy      | K8s manifests apply  | **SSH + rsync**             |
| Auto-scaling      | HPA                  | **Manuális (vertical)**     |
| Secret Management | K8s Sealed Secrets   | **GitHub Secrets + .env**   |

---

## BECSÜLT STORY PONTOK (Frissítve)

| Story             | Eredeti SP | Új SP  | Megtakarítás |
| ----------------- | ---------- | ------ | ------------ |
| 33-1 Twenty CRM   | 5          | 5      | -            |
| 33-2 Chatwoot     | 5          | 5      | -            |
| 33-3 Horilla HR   | 5          | 5      | -            |
| 33-4 Full Stack   | 8          | 8      | -            |
| 33-5 Prod Compose | ~~13~~     | **5**  | -8           |
| 33-6 CI/CD        | ~~8~~      | **3**  | -5           |
| 33-7 Monitoring   | ~~5~~      | **2**  | -3           |
| **ÖSSZESEN**      | ~~49~~     | **33** | **-16 SP**   |

---

## HIVATKOZÁSOK

- **ADR-045:** [Infrastruktúra Egyszerűsítés](../adr/ADR-045-infrastructure-simplification.md)
- **Boring Technology:** https://boringtechnology.club/
- **YAGNI Principle:** https://martinfowler.com/bliki/Yagni.html

---

_Készítette: BMAD Method - Infrastructure Epic_
_Frissítve: 2026-01-26 - ADR-045 döntés alapján_
