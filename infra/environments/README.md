# KGC ERP - Multi-Environment Setup

Több KGC környezet kezelése egy VPS szerveren (dev/tst/uat).

## Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                    VPS #1 (Hostinger)                           │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │      DEV        │ │      TST        │ │      UAT        │   │
│  │  Ports: 30xx    │ │  Ports: 31xx    │ │  Ports: 32xx    │   │
│  │  DB: 5432       │ │  DB: 5433       │ │  DB: 5434       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Nginx (80/443)                        │   │
│  │  dev.kgc.hu → :3000    tst.kgc.hu → :3100               │   │
│  │  dev-crm.kgc.hu → :3001  tst-crm.kgc.hu → :3101         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Port Allokáció

| Szolgáltatás | DEV | TST | UAT | PRD |
|--------------|-----|-----|-----|-----|
| KGC API | 3000 | 3100 | 3200 | 3000 |
| Twenty CRM | 3001 | 3101 | 3201 | 3001 |
| Chatwoot | 3002 | 3102 | 3202 | 3002 |
| Horilla HR | 3003 | 3103 | 3203 | 3003 |
| PostgreSQL (KGC) | 5432 | 5433 | 5434 | 5432 |
| Redis | 6379 | 6380 | 6381 | 6379 |

## Domain Struktúra

| Környezet | KGC App | CRM | Support |
|-----------|---------|-----|---------|
| DEV | dev.kgc.hu | dev-crm.kgc.hu | - |
| TST | tst.kgc.hu | tst-crm.kgc.hu | - |
| UAT | uat.kgc.hu | uat-crm.kgc.hu | uat-support.kgc.hu |
| PRD | app.kgc.hu | crm.kgc.hu | support.kgc.hu |

## Quick Start

### 1. Előfeltételek

```bash
# Docker telepítése
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Nginx telepítése
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Environment Variables

```bash
# Hozd létre a .env fájlt
cp .env.example .env

# Generálj titkokat minden környezethez
echo "JWT_SECRET_DEV=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET_TST=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET_UAT=$(openssl rand -base64 32)" >> .env
echo "TWENTY_SECRET_DEV=$(openssl rand -base64 32)" >> .env
echo "TWENTY_SECRET_TST=$(openssl rand -base64 32)" >> .env
echo "TWENTY_SECRET_UAT=$(openssl rand -base64 32)" >> .env
echo "CHATWOOT_SECRET_UAT=$(openssl rand -base64 32)" >> .env
```

### 3. Környezetek Indítása

```bash
# Script futtathatóvá tétele
chmod +x manage.sh

# DEV indítása
./manage.sh dev up

# TST indítása
./manage.sh tst up

# UAT indítása
./manage.sh uat up

# Minden környezet
./manage.sh all up
```

### 4. Nginx Konfiguráció

```bash
# Nginx config másolása
sudo cp ../nginx/kgc-multi-env.conf /etc/nginx/sites-available/kgc

# Aktiválás
sudo ln -s /etc/nginx/sites-available/kgc /etc/nginx/sites-enabled/

# Teszt és újratöltés
sudo nginx -t && sudo systemctl reload nginx
```

### 5. SSL Tanúsítványok

```bash
# Certbot automatikus SSL
sudo certbot --nginx \
  -d dev.kgc.hu -d dev-crm.kgc.hu \
  -d tst.kgc.hu -d tst-crm.kgc.hu \
  -d uat.kgc.hu -d uat-crm.kgc.hu -d uat-support.kgc.hu
```

## Management Script

```bash
# Környezet indítása
./manage.sh dev up
./manage.sh tst up
./manage.sh uat up

# Környezet leállítása
./manage.sh dev down

# Logok megtekintése
./manage.sh dev logs

# Státusz
./manage.sh all status

# Újraindítás
./manage.sh uat restart
```

## DNS Beállítás

Hostinger DNS panelen add hozzá (A rekordok):

| Név | Típus | Cél |
|-----|-------|-----|
| dev | A | VPS_IP |
| dev-crm | A | VPS_IP |
| tst | A | VPS_IP |
| tst-crm | A | VPS_IP |
| uat | A | VPS_IP |
| uat-crm | A | VPS_IP |
| uat-support | A | VPS_IP |

## Erőforrás Igény

| Környezet | RAM | CPU | Disk |
|-----------|-----|-----|------|
| DEV | ~2GB | 1 core | 10GB |
| TST | ~2GB | 1 core | 10GB |
| UAT | ~3GB | 1.5 core | 15GB |
| **Összesen** | **~7GB** | **3.5 core** | **35GB** |

**Ajánlott VPS:** 8GB RAM, 4 vCPU, 80GB SSD

## Backup

```bash
# DEV DB backup
docker exec kgc-dev-db pg_dump -U kgc kgc_dev > backup_dev_$(date +%Y%m%d).sql

# TST DB backup
docker exec kgc-tst-db pg_dump -U kgc kgc_tst > backup_tst_$(date +%Y%m%d).sql

# UAT DB backup
docker exec kgc-uat-db pg_dump -U kgc kgc_uat > backup_uat_$(date +%Y%m%d).sql
```

## Troubleshooting

### Container nem indul

```bash
# Logok ellenőrzése
./manage.sh dev logs

# Részletes státusz
docker compose -f docker-compose.dev.yml ps -a
```

### Port conflict

```bash
# Ki használja a portot?
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000

# Leállítás
docker stop $(docker ps -q --filter "publish=3000")
```

### Memória probléma

```bash
# Container memória használat
docker stats --no-stream

# Swap hozzáadása (ha nincs elég RAM)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```
