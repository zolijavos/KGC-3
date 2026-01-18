# Twenty CRM - Docker Setup

KGC ERP integrációhoz készített Twenty CRM self-hosted környezet.

## Quick Start

### 1. Környezeti változók beállítása

```bash
# .env fájl létrehozása
cp .env.example .env

# APP_SECRET generálása
APP_SECRET=$(openssl rand -base64 32)
echo "APP_SECRET=$APP_SECRET" >> .env

# Vagy manuálisan szerkeszd a .env fájlt
```

### 2. Indítás

```bash
# Szolgáltatások indítása
docker compose up -d

# Logok követése
docker compose logs -f

# Státusz ellenőrzése
docker compose ps
```

### 3. Elérés

- **Twenty CRM UI:** http://localhost:3001
- **Health Check:** http://localhost:3001/healthz
- **GraphQL Playground:** http://localhost:3001/graphql

## Port Allokáció

| Service | Belső Port | Külső Port | Megjegyzés |
|---------|------------|------------|------------|
| Twenty Server | 3000 | 3001 | CRM UI + API |
| PostgreSQL | 5432 | 5433 | Twenty adatbázis |
| Redis | 6379 | 6380 | Cache + queue |

**Megjegyzés:** A portok úgy vannak beállítva, hogy ne ütközzenek a KGC ERP szolgáltatásokkal:
- KGC API: 3000
- KGC PostgreSQL: 5432
- KGC Redis: 6379

## Szolgáltatások

### twenty-server
Fő alkalmazás - React frontend + NestJS backend.

### twenty-worker
Háttérfeladatok feldolgozása (email, szinkronizáció, stb.).

### twenty-db
PostgreSQL 16 adatbázis kizárólag Twenty CRM adatoknak.

### twenty-redis
Redis cache és message queue.

## Parancsok

```bash
# Indítás
docker compose up -d

# Leállítás
docker compose down

# Leállítás + volume-ok törlése (ADAT VESZTÉS!)
docker compose down -v

# Újraépítés
docker compose up -d --build --force-recreate

# Logok
docker compose logs -f twenty-server

# Shell a server containerben
docker compose exec twenty-server sh

# Adatbázis hozzáférés
docker compose exec twenty-db psql -U twenty -d twenty
```

## Konfiguráció

### Kötelező változók

| Változó | Leírás | Példa |
|---------|--------|-------|
| `APP_SECRET` | Titkosítási kulcs | `openssl rand -base64 32` |

### Opcionális változók

| Változó | Alapértelmezett | Leírás |
|---------|-----------------|--------|
| `TWENTY_PORT` | 3001 | Twenty server port |
| `TWENTY_DB_PORT` | 5433 | PostgreSQL port |
| `TWENTY_REDIS_PORT` | 6380 | Redis port |
| `SERVER_URL` | http://localhost:3001 | Publikus URL |
| `STORAGE_TYPE` | local | Tároló típus (local/s3) |

### SSO Konfiguráció

Google és Microsoft OAuth támogatott. Lásd `.env.example` fájlt a részletekért.

## KGC Integráció

### API Hozzáférés

Twenty CRM REST és GraphQL API-t biztosít:

```bash
# GraphQL endpoint
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "{ currentWorkspace { displayName } }"}'

# REST API
curl http://localhost:3001/rest/companies \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### API Token Generálás

1. Nyisd meg a Twenty CRM UI-t: http://localhost:3001
2. Menj a Settings → Developers → API Keys
3. Hozz létre új API key-t
4. Használd a KGC integráció konfigurálásához

### Webhook Konfiguráció

KGC webhook-ok fogadásához:

```env
# .env fájlban
KGC_WEBHOOK_SECRET=your-webhook-secret
```

## Troubleshooting

### Container nem indul

```bash
# Ellenőrizd a logokat
docker compose logs twenty-server

# Ellenőrizd a health statuszt
docker compose ps

# Gyakori okok:
# - APP_SECRET nincs beállítva
# - Port foglalt (változtasd meg a .env-ben)
# - Nem elég memória
```

### Adatbázis kapcsolati hiba

```bash
# Ellenőrizd, hogy a DB fut-e
docker compose ps twenty-db

# Ellenőrizd a DB logokat
docker compose logs twenty-db

# Próbáld újraindítani
docker compose restart twenty-db
```

### Health check sikertelen

```bash
# Ellenőrizd manuálisan
curl http://localhost:3001/healthz

# Ha timeout, várj 60-90 másodpercet az első indítás után
# A start_period 60s-re van állítva

# Ellenőrizd a server logokat
docker compose logs twenty-server | tail -50
```

### "Permission denied" hiba

```bash
# Volume permission probléma esetén
docker compose down
docker volume rm kgc-twenty-server-data
docker compose up -d
```

### Redis kapcsolati hiba

```bash
# Ellenőrizd a Redis státuszt
docker compose exec twenty-redis redis-cli ping
# Válasz: PONG

# Ha nem válaszol
docker compose restart twenty-redis
```

## Adatok Biztonsági Mentése

### Adatbázis backup

```bash
# Backup készítése
docker compose exec twenty-db pg_dump -U twenty twenty > backup_$(date +%Y%m%d).sql

# Visszaállítás
cat backup_20260118.sql | docker compose exec -T twenty-db psql -U twenty twenty
```

### Volume backup

```bash
# Docker volume backup
docker run --rm -v kgc-twenty-db-data:/data -v $(pwd):/backup alpine tar czf /backup/twenty-db-backup.tar.gz /data
```

## Verziófrissítés

```bash
# Legújabb image letöltése
docker compose pull

# Újraindítás új verzióval
docker compose up -d

# Ellenőrizd, hogy minden működik
docker compose ps
curl http://localhost:3001/healthz
```

## Erőforrás Igény

| Komponens | Min RAM | Ajánlott RAM | CPU |
|-----------|---------|--------------|-----|
| twenty-server | 512MB | 1GB | 0.5 |
| twenty-worker | 256MB | 512MB | 0.25 |
| twenty-db | 256MB | 512MB | 0.25 |
| twenty-redis | 64MB | 256MB | 0.1 |
| **Összesen** | ~1GB | ~2.5GB | ~1 |

## Kapcsolódó Dokumentáció

- [Twenty CRM Official Docs](https://docs.twenty.com)
- [KGC ERP Architecture](../../../planning-artifacts/architecture.md)
- [Epic 33: Infrastructure](../../../planning-artifacts/epics/epic-33-infrastructure-deployment.md)
- [Twenty CRM Integration Package](../../../packages/integration/twenty-crm/)
