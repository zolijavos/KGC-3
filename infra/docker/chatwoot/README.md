# Chatwoot - Docker Setup

KGC ERP integrációhoz készített Chatwoot self-hosted ügyfélszolgálati platform.

## Quick Start

### Előfeltételek

- Docker version 20.10.10+
- Docker Compose version v2.14.1+
- Minimum 2GB RAM

### 1. Hálózat létrehozása (ha még nem létezik)

```bash
# KGC közös hálózat létrehozása (egyszer kell futtatni)
docker network create kgc-network
```

### 2. Környezeti változók beállítása

```bash
# .env fájl létrehozása
cp .env.example .env

# SECRET_KEY_BASE generálása
SECRET_KEY=$(openssl rand -base64 32)
sed -i "s/replace_with_a_long_random_key/$SECRET_KEY/" .env

# Vagy manuálisan szerkeszd a .env fájlt
```

### 3. Adatbázis előkészítése

```bash
# Első indítás előtt: adatbázis migrációk
docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare
```

### 4. Indítás

```bash
# Szolgáltatások indítása
docker compose up -d

# Logok követése
docker compose logs -f

# Státusz ellenőrzése
docker compose ps
```

### 5. Elérés

- **Chatwoot UI:** http://localhost:3002
- **Health Check:** http://localhost:3002/api
- **API Docs:** http://localhost:3002/api/docs

Az első látogatáskor létre kell hozni egy admin accountot.

## Port Allokáció

| Service | Belső Port | Külső Port | Megjegyzés |
|---------|------------|------------|------------|
| Chatwoot Rails | 3000 | 3002 | Web UI + API |
| PostgreSQL | 5432 | 5435 | Chatwoot adatbázis |
| Redis | 6379 | 6381 | Cache + Sidekiq queue |

**Megjegyzés:** A portok úgy vannak beállítva, hogy ne ütközzenek más KGC szolgáltatásokkal:
- KGC API: 3000
- Twenty CRM: 3001
- Chatwoot: 3002
- Horilla HR: 3003

## Szolgáltatások

### chatwoot-rails
Fő alkalmazás - Ruby on Rails backend + React frontend.

### chatwoot-sidekiq
Háttérfeladatok feldolgozása (email küldés, webhook-ok, stb.).

### chatwoot-db
PostgreSQL 16 adatbázis pgvector kiterjesztéssel (AI funkciókhoz).

### chatwoot-redis
Redis cache és Sidekiq message queue.

## Parancsok

### Alapvető műveletek

```bash
# Indítás
docker compose up -d

# Leállítás
docker compose down

# Leállítás + volume-ok törlése (ADAT VESZTÉS!)
docker compose down -v

# Újraindítás
docker compose restart

# Logok
docker compose logs -f chatwoot-rails
docker compose logs -f chatwoot-sidekiq
```

### Rails Console

```bash
# Rails console (debug/admin feladatokhoz)
docker compose exec chatwoot-rails bundle exec rails c

# Adatbázis konzol
docker compose exec chatwoot-db psql -U chatwoot -d chatwoot_production
```

### Adatbázis műveletek

```bash
# Migrációk futtatása (verziófrissítés után)
docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare

# Adatbázis backup
docker compose exec chatwoot-db pg_dump -U chatwoot chatwoot_production > backup_$(date +%Y%m%d).sql

# Adatbázis visszaállítás
cat backup_20260118.sql | docker compose exec -T chatwoot-db psql -U chatwoot chatwoot_production
```

### Sidekiq műveletek

```bash
# Sidekiq státusz ellenőrzése
docker compose exec chatwoot-sidekiq bundle exec sidekiqmon processes

# Sidekiq queue-k listázása
docker compose exec chatwoot-rails bundle exec rails runner "puts Sidekiq::Queue.all.map(&:name)"
```

## Konfiguráció

### Kötelező változók

| Változó | Leírás | Példa |
|---------|--------|-------|
| `SECRET_KEY_BASE` | Titkosítási kulcs | `openssl rand -base64 32` |

### Fontos változók

| Változó | Alapértelmezett | Leírás |
|---------|-----------------|--------|
| `CHATWOOT_PORT` | 3002 | Chatwoot server port |
| `CHATWOOT_DB_PORT` | 5435 | PostgreSQL port |
| `CHATWOOT_REDIS_PORT` | 6381 | Redis port |
| `FRONTEND_URL` | http://localhost:3002 | Publikus URL |
| `DEFAULT_LOCALE` | hu | Alapértelmezett nyelv |
| `ENABLE_ACCOUNT_SIGNUP` | true | Regisztráció engedélyezése |

### Email konfiguráció

Értesítések és email channel működéséhez:

```env
MAILER_SENDER_EMAIL=Chatwoot <noreply@example.com>
SMTP_ADDRESS=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

## KGC Integráció

### API Hozzáférés

Chatwoot REST és Webhook API-t biztosít:

```bash
# API endpoint tesztelése
curl http://localhost:3002/api

# Conversation lista (API key szükséges)
curl http://localhost:3002/api/v1/accounts/{account_id}/conversations \
  -H "api_access_token: YOUR_API_KEY"
```

### API Key generálás

1. Nyisd meg a Chatwoot UI-t: http://localhost:3002
2. Menj a Settings → Profile → Access Token
3. Másold ki az API kulcsot
4. Használd a KGC integráció konfigurálásához

### Webhook konfiguráció

KGC webhook-ok fogadásához:

1. Chatwoot UI: Settings → Integrations → Webhooks
2. Add webhook URL: `http://host.docker.internal:3000/api/v1/webhooks/chatwoot`
3. Válaszd ki az event-eket (conversation_created, message_created, stb.)

### KGC-ből Chatwoot hívás

```typescript
// packages/integration/chatwoot használata
import { ChatwootModule } from '@kgc/chatwoot';

// Ticket létrehozás
const ticket = await ticketService.createTicket({
  chatwootConversationId: '123',
  subject: 'Support kérés',
  customerName: 'Kiss János',
  // ...
});
```

## Troubleshooting

### Container nem indul

```bash
# Ellenőrizd a logokat
docker compose logs chatwoot-rails

# Gyakori okok:
# - SECRET_KEY_BASE nincs beállítva
# - Port foglalt (változtasd meg a .env-ben)
# - Nem elég memória (min. 2GB)
# - Hálózat nem létezik (docker network create kgc-network)
```

### Adatbázis kapcsolati hiba

```bash
# Ellenőrizd, hogy a DB fut-e
docker compose ps chatwoot-db

# Ellenőrizd a DB logokat
docker compose logs chatwoot-db

# Próbáld meg újraindítani
docker compose restart chatwoot-db

# Ellenőrizd a kapcsolatot
docker compose exec chatwoot-db pg_isready -U chatwoot
```

### Redis kapcsolati hiba

```bash
# Redis státusz
docker compose exec chatwoot-redis redis-cli -a chatwoot_redis_pass ping
# Válasz: PONG

# Ha nem válaszol
docker compose restart chatwoot-redis
```

### Sidekiq nem dolgozik

```bash
# Sidekiq logok
docker compose logs chatwoot-sidekiq

# Sidekiq újraindítása
docker compose restart chatwoot-sidekiq

# Queue állapot
docker compose exec chatwoot-rails bundle exec rails runner "
  Sidekiq::Queue.all.each { |q| puts \"#{q.name}: #{q.size} jobs\" }
"
```

### "Migrations pending" hiba

```bash
# Migrációk futtatása
docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare

# Vagy force migration
docker compose run --rm chatwoot-rails bundle exec rails db:migrate
```

### Lassú első indulás

Az első indítás 2-3 percig tarthat, amíg:
- Adatbázis inicializálódik
- Asset precompile lefut
- Sidekiq worker elindul

A `start_period: 120s` beállítás kezeli ezt.

### Permission denied hiba

```bash
# Volume permission probléma esetén
docker compose down
docker volume rm kgc-chatwoot-storage
docker compose up -d
```

## Verziófrissítés

```bash
# 1. Backup készítése
docker compose exec chatwoot-db pg_dump -U chatwoot chatwoot_production > backup_pre_upgrade.sql

# 2. Legújabb image letöltése
docker compose pull

# 3. Szolgáltatások leállítása
docker compose down

# 4. Migrációk futtatása
docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare

# 5. Újraindítás
docker compose up -d

# 6. Ellenőrzés
docker compose ps
curl http://localhost:3002/api
```

## Erőforrás Igény

| Komponens | Min RAM | Ajánlott RAM | CPU |
|-----------|---------|--------------|-----|
| chatwoot-rails | 512MB | 1GB | 0.5 |
| chatwoot-sidekiq | 256MB | 512MB | 0.25 |
| chatwoot-db | 256MB | 512MB | 0.25 |
| chatwoot-redis | 64MB | 256MB | 0.1 |
| **Összesen** | ~1GB | ~2.5GB | ~1 |

## Community Edition vs Enterprise

Ez a konfiguráció a **Community Edition (CE)** verziót használja:
- Image: `chatwoot/chatwoot:latest-ce`
- Ingyenes, nyílt forráskódú
- Korlátlan agent és conversation

Enterprise funkciókat (SAML SSO, Audit logs, stb.) a fizetős verzió tartalmazza.

## Kapcsolódó Dokumentáció

- [Chatwoot Official Docs](https://developers.chatwoot.com)
- [Chatwoot Docker Guide](https://developers.chatwoot.com/self-hosted/deployment/docker)
- [Chatwoot API Reference](https://developers.chatwoot.com/docs/api)
- [KGC ERP Architecture](../../../planning-artifacts/architecture.md)
- [Epic 33: Infrastructure](../../../planning-artifacts/epics/epic-33-infrastructure-deployment.md)
- [Chatwoot Integration Package](../../../packages/integration/chatwoot/)
