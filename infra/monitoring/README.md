# KGC ERP v7.0 - Monitoring Setup

**Epic 33-7: Sentry + Health Monitoring (ADR-045)**

Ez a dokumentáció az egyszerűsített monitoring stack beállítását írja le.

## Stack Áttekintés

| Komponens         | Szolgáltatás                           | Költség             |
| ----------------- | -------------------------------------- | ------------------- |
| Error Tracking    | [Sentry.io](https://sentry.io)         | FREE (5K events/mo) |
| Uptime Monitoring | [UptimeRobot](https://uptimerobot.com) | FREE (50 monitors)  |
| Health Checks     | Beépített `/health` és `/ready`        | -                   |
| Logs              | Docker logs + Caddy logs               | -                   |

---

## 1. Sentry.io Beállítása

### 1.1 Projekt Létrehozása

1. Regisztrálj: https://sentry.io/signup/
2. Hozz létre egy új Organization-t: `kgc-erp`
3. Hozz létre két projektet:
   - `kgc-api` (Node.js / NestJS)
   - `kgc-web` (Next.js / React)

### 1.2 Backend Integráció (NestJS)

```bash
# Install Sentry SDK
pnpm add @sentry/nestjs @sentry/profiling-node
```

**apps/kgc-api/src/instrument.ts:**

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN_API,
  environment: process.env.NODE_ENV || 'development',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
});
```

**apps/kgc-api/src/main.ts (elején):**

```typescript
import './instrument'; // Must be first import!
```

### 1.3 Frontend Integráció (Next.js / Vite)

```bash
# Install Sentry SDK
pnpm add @sentry/react
```

**apps/kgc-web/src/main.tsx:**

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 1.4 Környezeti Változók

Adj hozzá a `.env.prod` fájlhoz:

```env
# Sentry Configuration
SENTRY_DSN_API=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN_WEB=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

---

## 2. UptimeRobot Beállítása

### 2.1 Monitorok Létrehozása

1. Regisztrálj: https://uptimerobot.com/
2. Hozz létre monitorokat:

| Monitor Név    | URL                        | Interval | Alert |
| -------------- | -------------------------- | -------- | ----- |
| KGC API Health | https://api.kgc.hu/health  | 5 min    | Email |
| KGC Web        | https://app.kgc.hu         | 5 min    | Email |
| Twenty CRM     | https://crm.kgc.hu/healthz | 5 min    | Email |
| Chatwoot       | https://support.kgc.hu/api | 5 min    | Email |
| Horilla HR     | https://hr.kgc.hu          | 5 min    | Email |

### 2.2 Alert Contact Beállítása

- Email: your-team@kgc.hu
- Opcionális: Slack webhook, Discord webhook

---

## 3. Health Endpoint-ok

### 3.1 KGC API

| Endpoint             | Leírás                | Válasz                                      |
| -------------------- | --------------------- | ------------------------------------------- |
| `GET /api/v1/health` | Basic health check    | `{ status: 'ok', timestamp, version }`      |
| `GET /api/v1/ready`  | DB connectivity check | `{ status: 'ready', checks: { database } }` |

**Példa válasz (`/health`):**

```json
{
  "status": "ok",
  "timestamp": "2026-01-26T12:00:00.000Z",
  "service": "kgc-api",
  "version": "7.0.0",
  "environment": "production"
}
```

**Példa válasz (`/ready`):**

```json
{
  "status": "ready",
  "timestamp": "2026-01-26T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 5
    }
  }
}
```

### 3.2 Külső Szolgáltatások

| Service    | Health Endpoint |
| ---------- | --------------- |
| Twenty CRM | `/healthz`      |
| Chatwoot   | `/api`          |
| Horilla HR | `/` (200 OK)    |

---

## 4. Log Management

### 4.1 Docker Logs

```bash
# Összes service log
docker compose logs -f

# Csak KGC API log
docker compose logs -f kgc-api

# Utolsó 100 sor
docker compose logs --tail=100 kgc-api
```

### 4.2 Caddy Access Logs

Caddy access log-ok helye: `/var/log/caddy/`

```bash
# Caddy container-ben
docker exec kgc-caddy tail -f /var/log/caddy/kgc-api.log
```

### 4.3 Log Rotation

Docker automatikusan kezeli a log rotation-t (konfiguráció: `docker-compose.yml`):

```yaml
x-logging: &default-logging
  driver: 'json-file'
  options:
    max-size: '10m'
    max-file: '3'
```

---

## 5. Alerting

### 5.1 Sentry Alerts

Sentry automatikusan küld email-t új hibáknál. Beállítható:

- Issue threshold alerts (pl. >10 hiba/óra)
- Performance alerts (pl. >2s response time)

### 5.2 UptimeRobot Alerts

- Downtime alert: azonnal
- Recovery alert: amikor helyreáll

### 5.3 Slack/Discord Integráció (Opcionális)

**Sentry Slack:**

1. Settings → Integrations → Slack
2. Válaszd ki a csatornát

**UptimeRobot Slack:**

1. My Settings → Alert Contacts → Add Alert Contact
2. Type: Slack Webhook
3. Webhook URL: `https://hooks.slack.com/services/...`

---

## 6. Troubleshooting

### Sentry nem kap event-eket

1. Ellenőrizd a DSN-t
2. Ellenőrizd a tűzfalat (outbound HTTPS szükséges)
3. Ellenőrizd a sample rate-et (ne legyen 0)

### Health check fail

1. Ellenőrizd a container státuszt: `docker compose ps`
2. Ellenőrizd a logokat: `docker compose logs kgc-api`
3. Ellenőrizd a DB kapcsolatot: `docker exec kgc-db pg_isready`

### UptimeRobot false positive

1. Növeld az interval-t 5 percről 10-re
2. Ellenőrizd a timeout beállítást (alapból 30s)
3. Adj hozzá több location-t a monitorhoz

---

## Költség Összefoglaló

| Szolgáltatás | Tier      | Havi Költség         |
| ------------ | --------- | -------------------- |
| Sentry.io    | Developer | **€0** (5K events)   |
| UptimeRobot  | Free      | **€0** (50 monitors) |
| **Összesen** | -         | **€0**               |

_Megjegyzés: Nagyobb terhelés esetén Sentry Team tier: $26/hó_

---

_Dokumentáció: Epic 33-7 (ADR-045)_
_Készítette: BMAD Method_
