# KGC ERP v7.0 - Deployment Guide

Telepítési útmutató a KGC ERP rendszerhez.

## Tartalomjegyzék

1. [Előfeltételek](#előfeltételek)
2. [Gyors indítás (Development)](#gyors-indítás-development)
3. [Staging környezet](#staging-környezet)
4. [Production környezet](#production-környezet)
5. [Adatbázis migrációk](#adatbázis-migrációk)
6. [Hibaelhárítás](#hibaelhárítás)

---

## Előfeltételek

### Szoftver követelmények

| Szoftver       | Verzió    | Leírás                              |
| -------------- | --------- | ----------------------------------- |
| Node.js        | >= 20.0.0 | JavaScript runtime                  |
| pnpm           | >= 9.0.0  | Package manager                     |
| Docker         | >= 24.0.0 | Container runtime                   |
| Docker Compose | >= 2.20.0 | Multi-container orchestration       |
| PostgreSQL     | 16        | Adatbázis (Docker-ben)              |
| Redis          | 7         | Cache és session store (Docker-ben) |

### Rendszer követelmények

| Környezet   | CPU    | RAM   | Tárhely |
| ----------- | ------ | ----- | ------- |
| Development | 4 core | 8 GB  | 20 GB   |
| Staging     | 4 core | 16 GB | 50 GB   |
| Production  | 8 core | 32 GB | 100 GB  |

---

## Gyors indítás (Development)

### 1. Repository klónozás

```bash
git clone https://github.com/kisgepcentrum/kgc-erp.git
cd kgc-erp
```

### 2. Függőségek telepítése

```bash
pnpm install
```

### 3. Környezeti változók

```bash
cp .env.example .env
# Szerkeszd a .env fájlt
```

### 4. Adatbázis indítása

```bash
# Csak adatbázis és Redis
docker compose -f infra/docker/full-stack/docker-compose.yml up -d kgc-db kgc-redis
```

### 5. Migrációk futtatása

```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Fejlesztői szerver indítása

```bash
pnpm dev
```

Az alkalmazás elérhető:

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Swagger docs: http://localhost:3000/api/docs

---

## Staging környezet

### staging.kgc.local beállítása

#### 1. DNS konfiguráció

Lokális staging esetén add hozzá a `/etc/hosts` fájlhoz:

```
127.0.0.1 staging.kgc.local
127.0.0.1 api.staging.kgc.local
127.0.0.1 crm.staging.kgc.local
127.0.0.1 support.staging.kgc.local
127.0.0.1 hr.staging.kgc.local
```

#### 2. Környezeti változók

```bash
cd infra/docker/full-stack
cp .env.staging.example .env.staging
# Szerkeszd a .env.staging fájlt - változtasd meg a jelszavakat!
```

#### 3. Staging indítása

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up -d
```

#### 4. Elérhetőségek

| Szolgáltatás  | URL                               |
| ------------- | --------------------------------- |
| Frontend      | https://staging.kgc.local         |
| API           | https://api.staging.kgc.local     |
| Twenty CRM    | https://crm.staging.kgc.local     |
| Chatwoot      | https://support.staging.kgc.local |
| Horilla HR    | https://hr.staging.kgc.local      |
| MinIO Console | http://localhost:9001             |

#### 5. Leállítás

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging down
```

---

## Production környezet

### 1. Szerver előkészítés

```bash
# UFW tűzfal
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Production konfiguráció

```bash
cd infra/docker/full-stack
cp .env.staging.example .env.prod
# Szerkeszd: erős jelszavak, production URL-ek
```

### 3. Caddyfile testreszabása

Szerkeszd a `Caddyfile` fájlt a valódi domain nevekkel.

### 4. Production indítása

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 5. SSL tanúsítványok

A Caddy automatikusan beszerzi a Let's Encrypt tanúsítványokat. Ellenőrzés:

```bash
docker logs kgc-caddy
```

---

## Adatbázis migrációk

### Migráció futtatása

```bash
# Development
pnpm db:migrate

# Docker konténerben
docker exec kgc-api pnpm db:migrate
```

### Prisma Studio (Adatbázis böngésző)

```bash
pnpm db:studio
```

### Új migráció létrehozása

```bash
# Schema módosítás után
pnpm db:generate
pnpm db:migrate --name add_new_feature
```

---

## Hibaelhárítás

### Docker konténerek ellenőrzése

```bash
docker compose ps
docker compose logs -f kgc-api
docker compose logs -f kgc-db
```

### Adatbázis kapcsolat teszt

```bash
docker exec kgc-db pg_isready -U kgc -d kgc_erp
```

### Redis kapcsolat teszt

```bash
docker exec kgc-redis redis-cli ping
```

### Gyakori problémák

#### Port foglalt

```bash
# Ellenőrzés
lsof -i :3000

# Megoldás: állítsd le a folyamatot vagy változtasd a portot
```

#### Memória hiba

```bash
# Docker erőforrás limit növelése
docker system prune -a
```

#### SSL problémák staging-en

A staging környezet self-signed tanúsítványt használ. Böngészőben fogadd el a tanúsítványt.

---

## Hasznos parancsok

```bash
# Összes szolgáltatás állapota
docker compose ps

# Logok követése
docker compose logs -f

# Újraindítás
docker compose restart kgc-api

# Teljes újraépítés
docker compose down
docker compose build --no-cache
docker compose up -d

# Köteteken tárolt adatok törlése
docker compose down -v
```

---

## Kapcsolódó dokumentumok

- [CLAUDE.md](../CLAUDE.md) - Fejlesztői útmutató
- [Architecture](../planning-artifacts/architecture.md) - Architektúra dokumentáció
- [ADR-045: Infrastructure Simplification](../planning-artifacts/adr/ADR-045-infrastructure-simplification.md)

---

**Utolsó frissítés:** 2026-01-26
