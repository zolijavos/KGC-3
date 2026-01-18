# Epic 33: Infrastructure & Deployment

**Epic ID:** E-INFRA-01
**Prioritás:** P1 - Post-MVP (de szükséges a full-stack működéshez)
**Típus:** DevOps / Infrastructure
**Készítette:** BMAD Method
**Dátum:** 2026-01-18

---

## ÖSSZEFOGLALÓ

Self-hosted külső rendszerek telepítése és Docker/K8s infrastruktúra kialakítása. Az integrációs kód (Epic 28-30) már KÉSZ, de a rendszerek még nincsenek telepítve.

| Rendszer | Típus | Forrás |
|----------|-------|--------|
| Twenty CRM | Git Fork | https://github.com/twentyhq/twenty |
| Chatwoot | Git Fork | https://github.com/chatwoot/chatwoot |
| Horilla HR | Git Fork | https://github.com/horlogg/horilla |

---

## STORY LISTA (7 story)

### Story 33-1: Twenty CRM Docker Setup

**Leírás:** Twenty CRM self-hosted telepítése Docker-ben, PostgreSQL adatbázissal.

**Acceptance Criteria:**
- [ ] Twenty CRM fork létrehozva git submodule-ként
- [ ] Docker Compose konfiguráció `infra/docker/twenty-crm/`
- [ ] PostgreSQL adatbázis külön container
- [ ] Környezeti változók (.env.example)
- [ ] Health check endpoint működik
- [ ] KGC tenant-aware konfiguráció előkészítve
- [ ] Dokumentáció: `infra/docker/twenty-crm/README.md`

**Technikai részletek:**
- Twenty CRM: Node.js + React
- DB: PostgreSQL 15+
- Port: 3001 (default)
- SSO előkészítés KGC auth-hoz

---

### Story 33-2: Chatwoot Docker Setup

**Leírás:** Chatwoot self-hosted telepítése Docker-ben, Redis + PostgreSQL-lel.

**Acceptance Criteria:**
- [ ] Chatwoot fork létrehozva git submodule-ként
- [ ] Docker Compose konfiguráció `infra/docker/chatwoot/`
- [ ] PostgreSQL + Redis containers
- [ ] Sidekiq worker container
- [ ] Környezeti változók (.env.example)
- [ ] Webhook endpoint konfiguráció KGC-hez
- [ ] Dokumentáció: `infra/docker/chatwoot/README.md`

**Technikai részletek:**
- Chatwoot: Ruby on Rails
- DB: PostgreSQL 15+
- Cache: Redis 7+
- Port: 3002 (default)

---

### Story 33-3: Horilla HR Docker Setup

**Leírás:** Horilla HR self-hosted telepítése Docker-ben.

**Acceptance Criteria:**
- [ ] Horilla fork létrehozva git submodule-ként
- [ ] Docker Compose konfiguráció `infra/docker/horilla-hr/`
- [ ] PostgreSQL adatbázis container
- [ ] Python dependencies (requirements.txt)
- [ ] Környezeti változók (.env.example)
- [ ] API endpoint konfiguráció KGC employee-sync-hez
- [ ] Dokumentáció: `infra/docker/horilla-hr/README.md`

**Technikai részletek:**
- Horilla: Django (Python)
- DB: PostgreSQL 15+
- Port: 3003 (default)

---

### Story 33-4: Full-Stack Docker Compose

**Leírás:** Teljes development stack egyetlen docker-compose.yml fájlban.

**Acceptance Criteria:**
- [ ] `infra/docker/docker-compose.yml` - full stack
- [ ] `infra/docker/docker-compose.dev.yml` - dev overrides
- [ ] KGC API + Web + Admin containers
- [ ] Twenty CRM container
- [ ] Chatwoot containers (app + sidekiq)
- [ ] Horilla HR container
- [ ] Shared PostgreSQL VAGY külön DB-k per service
- [ ] Shared Redis VAGY külön instance-ok
- [ ] Traefik/Nginx reverse proxy
- [ ] Network isolation (kgc-network)
- [ ] Volume mounts for persistence
- [ ] `make up` / `make down` parancsok

**Parancsok:**
```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

### Story 33-5: Kubernetes Manifests (Production)

**Leírás:** Production-ready K8s deployment manifests.

**Acceptance Criteria:**
- [ ] `infra/k8s/` könyvtár struktúra
- [ ] Namespace: `kgc-production`
- [ ] KGC API Deployment + Service + Ingress
- [ ] KGC Web Deployment + Service + Ingress
- [ ] Twenty CRM StatefulSet + Service
- [ ] Chatwoot Deployment + Service
- [ ] Horilla HR Deployment + Service
- [ ] PostgreSQL StatefulSet (vagy external DB config)
- [ ] Redis StatefulSet
- [ ] ConfigMaps és Secrets
- [ ] HPA (Horizontal Pod Autoscaler) KGC API-hoz
- [ ] PersistentVolumeClaims
- [ ] Ingress rules (subdomain routing)

**Ingress példa:**
```yaml
- host: app.kgc.hu      → KGC Web
- host: api.kgc.hu      → KGC API
- host: crm.kgc.hu      → Twenty CRM
- host: support.kgc.hu  → Chatwoot
- host: hr.kgc.hu       → Horilla HR
```

---

### Story 33-6: CI/CD Pipeline Setup

**Leírás:** GitHub Actions CI/CD pipeline a full stack deploymenthez.

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` - lint, test, build
- [ ] `.github/workflows/deploy-staging.yml`
- [ ] `.github/workflows/deploy-production.yml`
- [ ] Docker image build és push (GitHub Container Registry)
- [ ] Automatic K8s deployment on merge to main
- [ ] Environment secrets management
- [ ] Slack/Discord notification on deploy
- [ ] Rollback capability

---

### Story 33-7: Monitoring & Observability Stack

**Leírás:** Prometheus + Grafana + Loki monitoring stack.

**Acceptance Criteria:**
- [ ] `infra/monitoring/` könyvtár
- [ ] Prometheus konfiguráció (scrape configs)
- [ ] Grafana dashboards (KGC, Twenty, Chatwoot, Horilla)
- [ ] Loki log aggregation
- [ ] Alert rules (CPU, memory, error rate)
- [ ] Docker Compose integration
- [ ] K8s ServiceMonitor resources

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
33-2 (Chatwoot) ─┼──► 33-4 (Full Stack) ──► 33-5 (K8s) ──► 33-6 (CI/CD)
33-3 (Horilla) ──┘                                              │
                                                                ▼
                                                         33-7 (Monitoring)
```

Az első 3 story párhuzamosan futtatható.

---

## TECHNIKAI DÖNTÉSEK

| Kérdés | Döntés | Indoklás |
|--------|--------|----------|
| Shared vs Separate DB | Separate | Izolált adatok, könnyebb backup |
| Reverse Proxy | Traefik | K8s-native, automatic SSL |
| Container Registry | GHCR | GitHub integration |
| Secret Management | K8s Secrets + Sealed Secrets | GitOps kompatibilis |

---

## BECSÜLT STORY PONTOK

| Story | Komplexitás | Story Point |
|-------|-------------|-------------|
| 33-1 Twenty CRM | Medium | 5 |
| 33-2 Chatwoot | Medium | 5 |
| 33-3 Horilla HR | Medium | 5 |
| 33-4 Full Stack | Large | 8 |
| 33-5 K8s | Large | 13 |
| 33-6 CI/CD | Medium | 8 |
| 33-7 Monitoring | Medium | 5 |
| **ÖSSZESEN** | - | **49** |

---

*Készítette: BMAD Method - Infrastructure Epic*
