# ADR-045: Infrastruktúra Egyszerűsítés - Docker Compose a Kubernetes helyett

**Státusz:** Elfogadva
**Dátum:** 2026-01-26
**Döntéshozók:** Javo!, Winston (Architect), John (PM), Amelia (Dev)
**Kontextus:** Epic 33 Infrastructure - Story 33-5, 33-6, 33-7 felülvizsgálata

---

## Összefoglaló

**Döntés:** A KGC ERP v7.0 production infrastruktúráját **Docker Compose + egyszerű CI/CD** megoldással valósítjuk meg a korábban tervezett Kubernetes + Prometheus/Grafana stack helyett.

---

## Kontextus és Probléma

Az eredeti Epic 33 az alábbi technológiákat tervezte:

- **33-5:** Kubernetes manifests (production)
- **33-6:** Komplex CI/CD pipeline (GitHub Actions + K8s deployment)
- **33-7:** Prometheus + Grafana + Loki monitoring stack

### Problémák az eredeti tervvel:

1. **Csapat kompetencia:** A fejlesztői csapat nem rendelkezik Kubernetes és DevOps specialista tudással
2. **Tanulási görbe:** K8s elsajátítása 2-6 hónap, míg Docker Compose 1-2 nap
3. **Túlméretezett megoldás:** Egy kis-közepes franchise ERP-hez (< 50 lokáció, < 1000 concurrent user) a K8s overkill
4. **Költség:** K8s cluster ~€200+/hó vs VPS ~€30-50/hó
5. **Komplexitás:** K8s = 50+ YAML fájl vs Docker Compose = 2-3 fájl
6. **Karbantartás:** K8s folyamatos DevOps figyelmet igényel

---

## Döntés

### Elfogadott megoldás: "Boring Technology" Stack

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION SETUP                       │
├─────────────────────────────────────────────────────────┤
│  Hetzner/DigitalOcean VPS (€20-40/hó)                   │
│  ├── Docker Compose                                      │
│  │   ├── kgc-api (NestJS)                               │
│  │   ├── kgc-web (Next.js)                              │
│  │   ├── PostgreSQL 15                                   │
│  │   ├── Redis 7 (cache + session)                      │
│  │   ├── Caddy (reverse proxy + auto SSL)               │
│  │   ├── Twenty CRM                                      │
│  │   ├── Chatwoot (app + sidekiq)                       │
│  │   └── Horilla HR                                      │
│  │                                                       │
│  └── Portainer (opcionális management GUI)              │
├─────────────────────────────────────────────────────────┤
│  MONITORING (egyszerűsített)                             │
│  ├── Sentry.io (error tracking) - FREE tier             │
│  ├── /health endpoint minden service-en                 │
│  └── UptimeRobot (uptime monitoring) - FREE             │
├─────────────────────────────────────────────────────────┤
│  CI/CD (egyszerűsített)                                  │
│  ├── GitHub Actions (lint + test + build)               │
│  └── SSH deploy script (rsync + docker compose up)      │
└─────────────────────────────────────────────────────────┘
```

---

## Módosított Story-k (Epic 33)

### Törölt Story-k:

- ~~33-5: Kubernetes Manifests~~ → **TÖRÖLVE**
- ~~33-7: Prometheus/Grafana/Loki stack~~ → **TÖRÖLVE**

### Módosított Story-k:

| Eredeti              | Új                             | Változás                     |
| -------------------- | ------------------------------ | ---------------------------- |
| 33-5 K8s manifests   | 33-5 Production Docker Compose | K8s → Docker Compose + Caddy |
| 33-6 Komplex CI/CD   | 33-6 Egyszerű CI/CD            | K8s deploy → SSH + rsync     |
| 33-7 Full monitoring | 33-7 Sentry + Health checks    | Prometheus stack → Sentry.io |

### Új Story-k tartalma:

**33-5: Production Docker Compose**

- `infra/docker/docker-compose.prod.yml`
- Caddy reverse proxy auto SSL-lel
- Production environment variables
- Backup script (pg_dump)
- Dokumentáció

**33-6: Egyszerű CI/CD Pipeline**

- `.github/workflows/ci.yml` (lint, test, typecheck, build)
- `.github/workflows/deploy.yml` (SSH + rsync + restart)
- Egyszerű rollback script
- Slack/Discord notification (opcionális)

**33-7: Sentry + Health Monitoring**

- Sentry.io integráció minden service-ben
- `/health` és `/ready` endpoint-ok
- UptimeRobot konfiguráció
- Egyszerű alerting

---

## Előnyök

| Szempont          | Kubernetes   | Docker Compose  |
| ----------------- | ------------ | --------------- |
| Tanulási idő      | 2-6 hónap    | 1-2 nap         |
| Havi költség      | €200+        | €30-50          |
| YAML fájlok száma | 50+          | 3-5             |
| DevOps szükséglet | Dedikált     | Nincs           |
| Hibaelhárítás     | Komplex      | Egyszerű        |
| Skálázhatóság     | Auto-scaling | Manuális (elég) |

---

## Hátrányok és Kockázatok

| Kockázat                | Mitigáció                                                   |
| ----------------------- | ----------------------------------------------------------- |
| Nincs auto-scaling      | Vertical scaling (nagyobb VPS) vagy load balancer később    |
| Single point of failure | Napi backup + disaster recovery dokumentáció                |
| Manuális deployment     | CI/CD automatizálja, rollback script készül                 |
| Ha nő a terhelés        | Migráció K8s-re később lehetséges, de valószínűleg nem kell |

---

## Migráció K8s-re (Ha Később Szükséges)

Ha a rendszer kinövi a Docker Compose megoldást (>1000 concurrent user, >100 franchise), akkor:

1. **Managed K8s szolgáltatások:** DigitalOcean K8s, Hetzner K8s (egyszerűbb)
2. **Railway/Render:** Platform-as-a-Service (még egyszerűbb)
3. **Fly.io:** Container orchestration K8s komplexitás nélkül

**Becsült migrációs idő:** 1-2 hét (ha szükséges)

---

## YAGNI Elv

> "You Aren't Gonna Need It"

A Kubernetes és komplex monitoring stack jelenleg **spekulatív komplexitás**. Nincs bizonyíték arra, hogy a KGC ERP valaha is szükségét látja ezeknek a technológiáknak. A "Boring Technology" megközelítés:

- Működik
- Érthető a csapat számára
- Karbantartható
- Olcsó
- Elegendő a jelenlegi és belátható jövőbeli igényekre

---

## Story Point Változás

| Story        | Eredeti SP | Új SP  | Megtakarítás |
| ------------ | ---------- | ------ | ------------ |
| 33-5         | 13         | 5      | -8           |
| 33-6         | 8          | 3      | -5           |
| 33-7         | 5          | 2      | -3           |
| **Összesen** | **26**     | **10** | **-16 SP**   |

---

## Következtetés

A döntés a **pragmatizmus** és a **csapat képességeinek** figyelembevételével született. Egy működő, karbantartható rendszer többet ér, mint egy túlkomplikált infrastruktúra, amit senki nem ért.

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry

---

## Hivatkozások

- [Boring Technology Club](https://boringtechnology.club/)
- [YAGNI Principle](https://martinfowler.com/bliki/Yagni.html)
- [Choose Boring Technology](https://mcfunley.com/choose-boring-technology)

---

_Készítette: BMAD Party Mode - Winston (Architect), John (PM), Amelia (Dev)_
_Jóváhagyta: Javo!_
