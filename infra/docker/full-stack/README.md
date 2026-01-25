# KGC ERP v7.0 - Full Stack Docker Setup

Epic 33-4: Unified Docker Compose configuration for complete KGC ERP stack.

## Services

| Service          | Port      | Description                 |
| ---------------- | --------- | --------------------------- |
| **KGC Core**     |           |                             |
| kgc-api          | 3000      | NestJS Backend API          |
| kgc-web          | 80        | Vite + React PWA Frontend   |
| kgc-db           | 5432      | PostgreSQL (KGC Database)   |
| kgc-redis        | 6379      | Redis Cache                 |
| kgc-minio        | 9000/9001 | MinIO S3-compatible Storage |
| **Twenty CRM**   |           |                             |
| twenty-server    | 3001      | Twenty CRM Application      |
| twenty-worker    | -         | Background Jobs             |
| twenty-db        | 5433      | PostgreSQL (Twenty)         |
| twenty-redis     | 6380      | Redis Cache (Twenty)        |
| **Chatwoot**     |           |                             |
| chatwoot-rails   | 3002      | Chatwoot Customer Support   |
| chatwoot-sidekiq | -         | Background Jobs             |
| chatwoot-db      | 5435      | PostgreSQL with pgvector    |
| chatwoot-redis   | 6381      | Redis Cache (Chatwoot)      |
| **Horilla HR**   |           |                             |
| horilla-app      | 3003      | Horilla HR Django App       |
| horilla-db       | 5434      | PostgreSQL (Horilla)        |

## Quick Start

### 1. Setup Environment

```bash
cd infra/docker/full-stack

# Copy and configure environment
cp .env.example .env

# Edit .env with your values (required fields marked with ?)
nano .env
```

### 2. Start All Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### 3. Access Services

- **KGC Web**: http://localhost
- **KGC API**: http://localhost:3000
- **Twenty CRM**: http://localhost:3001
- **Chatwoot**: http://localhost:3002
- **Horilla HR**: http://localhost:3003
- **MinIO Console**: http://localhost:9001

## Selective Deployment

You can start only specific service groups using profiles:

```bash
# KGC Core only (API + Web + DB + Redis + MinIO)
docker compose up -d kgc-api kgc-web kgc-db kgc-redis kgc-minio

# KGC Core + Twenty CRM
docker compose up -d kgc-api kgc-web kgc-db kgc-redis kgc-minio \
  twenty-server twenty-worker twenty-db twenty-redis

# All services except Horilla
docker compose up -d --scale horilla-app=0 --scale horilla-db=0
```

## Database Migrations

### KGC Database

```bash
# Run Prisma migrations
docker compose exec kgc-api npx prisma migrate deploy

# Generate Prisma client
docker compose exec kgc-api npx prisma generate

# Open Prisma Studio
docker compose exec kgc-api npx prisma studio
```

### Other Databases

Twenty, Chatwoot, and Horilla handle their own migrations on startup.

## Backup & Restore

### Backup All Databases

```bash
# Create backup directory
mkdir -p ./backups

# Backup KGC database
docker compose exec -T kgc-db pg_dump -U kgc kgc_erp > ./backups/kgc-$(date +%Y%m%d).sql

# Backup Twenty database
docker compose exec -T twenty-db pg_dump -U twenty twenty > ./backups/twenty-$(date +%Y%m%d).sql

# Backup Chatwoot database
docker compose exec -T chatwoot-db pg_dump -U chatwoot chatwoot_production > ./backups/chatwoot-$(date +%Y%m%d).sql

# Backup Horilla database
docker compose exec -T horilla-db pg_dump -U horilla horilla > ./backups/horilla-$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore KGC database
cat ./backups/kgc-YYYYMMDD.sql | docker compose exec -T kgc-db psql -U kgc kgc_erp
```

## Troubleshooting

### Check Service Health

```bash
# View all service statuses
docker compose ps

# Check specific service logs
docker compose logs -f kgc-api
docker compose logs -f kgc-web

# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost/health
```

### Restart Services

```bash
# Restart specific service
docker compose restart kgc-api

# Restart all services
docker compose restart

# Full recreation
docker compose down && docker compose up -d
```

### Clear Data (Development Only!)

```bash
# Stop services and remove volumes
docker compose down -v

# This will DELETE all data!
```

## Resource Requirements

Minimum recommended resources:

| Component      | RAM       | CPU         |
| -------------- | --------- | ----------- |
| KGC Core (all) | 2.5GB     | 2 cores     |
| Twenty CRM     | 1.5GB     | 1.5 cores   |
| Chatwoot       | 2GB       | 1.5 cores   |
| Horilla HR     | 1.5GB     | 1 core      |
| **Total**      | **7.5GB** | **6 cores** |

For production, double the RAM and add load balancing.

## Security Notes

1. **Change all default passwords** in `.env`
2. **Never expose database ports** to the internet
3. **Use HTTPS** in production (add reverse proxy)
4. **Backup regularly** to external storage
5. **Monitor logs** for suspicious activity

## Production Deployment

For production, use:

- Kubernetes manifests: `../../../infra/k8s/` (Epic 33-5)
- CI/CD pipelines: `.github/workflows/` (Epic 33-6)
- Monitoring stack: Prometheus + Grafana (Epic 33-7)
