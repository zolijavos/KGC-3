# Horilla HR - Docker Setup

KGC ERP integrációhoz készített Horilla HR self-hosted környezet.

## Quick Start

### 1. Környezeti változók beállítása

```bash
# .env fájl létrehozása
cp .env.example .env

# Django SECRET_KEY generálása
# Opció 1: Python-nal
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Opció 2: OpenSSL-lel
openssl rand -base64 50

# Másold be a generált kulcsot a .env fájlba
```

### 2. Indítás

```bash
# Szolgáltatások indítása
docker compose up -d

# Logok követése (első indításnál ajánlott)
docker compose logs -f

# Státusz ellenőrzése
docker compose ps
```

### 3. Elérés

- **Horilla HR UI:** http://localhost:3003
- **Admin Login:** username: `admin`, password: `admin`

**FONTOS:** Az első bejelentkezés után azonnal változtasd meg az admin jelszót!

## Port Allokáció

| Service | Belső Port | Külső Port | Megjegyzés |
|---------|------------|------------|------------|
| Horilla App | 8000 | 3003 | HR UI + API |
| PostgreSQL | 5432 | 5434 | Horilla adatbázis |

**Megjegyzés:** A portok úgy vannak beállítva, hogy ne ütközzenek a többi KGC szolgáltatással:
- KGC API: 3000
- Twenty CRM: 3001
- Chatwoot: 3002
- **Horilla HR: 3003**
- KGC PostgreSQL: 5432
- Twenty PostgreSQL: 5433
- **Horilla PostgreSQL: 5434**

## Szolgáltatások

### horilla-app
Django alapú HR alkalmazás Gunicorn WSGI szerverrel.

**Funkciók:**
- Employee management
- Leave management
- Payroll
- Attendance tracking
- Recruitment
- Performance management

### horilla-db
PostgreSQL 16 adatbázis kizárólag Horilla HR adatoknak.

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
docker compose logs -f horilla-app

# Shell a container-ben
docker compose exec horilla-app bash

# Django manage.py parancsok
docker compose exec horilla-app python manage.py createsuperuser
docker compose exec horilla-app python manage.py collectstatic

# Adatbázis hozzáférés
docker compose exec horilla-db psql -U horilla -d horilla
```

## Konfiguráció

### Kötelező változók

| Változó | Leírás | Generálás |
|---------|--------|-----------|
| `DJANGO_SECRET_KEY` | Django titkosítási kulcs | `openssl rand -base64 50` |

### Opcionális változók

| Változó | Alapértelmezett | Leírás |
|---------|-----------------|--------|
| `HORILLA_PORT` | 3003 | Horilla app port |
| `HORILLA_DB_PORT` | 5434 | PostgreSQL port |
| `DJANGO_DEBUG` | False | Debug mód (production: False!) |
| `SITE_URL` | http://localhost:3003 | Publikus URL |

### Email konfiguráció

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
```

## KGC Integráció

### API Hozzáférés

Horilla REST API-t biztosít dolgozó adatok szinkronizálásához:

```bash
# Példa API hívás (authentication token szükséges)
curl http://localhost:3003/api/employee/employees/ \
  -H "Authorization: Token YOUR_API_TOKEN"
```

### API Token Generálás

1. Jelentkezz be admin felhasználóval: http://localhost:3003
2. Django Admin: http://localhost:3003/admin/
3. Hozz létre API token-t az authtoken app-ban

### Employee Sync (KGC → Horilla)

A KGC `@kgc/horilla-hr` package biztosítja a szinkronizációt:

```typescript
// packages/integration/horilla-hr/src/services/employee-sync.service.ts
interface IHorillaApiClient {
  getEmployees(filter?: { department?: string; status?: string }): Promise<IHorillaEmployee[]>;
  getEmployeeById(id: string): Promise<IHorillaEmployee | null>;
  updateEmployee(id: string, data: Partial<IHorillaEmployee>): Promise<IHorillaEmployee>;
}
```

## Troubleshooting

### Container nem indul

```bash
# Ellenőrizd a logokat
docker compose logs horilla-app

# Gyakori okok:
# - DJANGO_SECRET_KEY nincs beállítva
# - Port foglalt (változtasd meg a .env-ben)
# - Adatbázis még nem kész (várj a health check-re)
```

### "staticfiles not found" hiba

```bash
# Collect static files manuálisan
docker compose exec horilla-app python manage.py collectstatic --noinput
```

### Adatbázis migrációs hiba

```bash
# Migrációk futtatása
docker compose exec horilla-app python manage.py migrate

# Ha szükséges, új migrációk létrehozása
docker compose exec horilla-app python manage.py makemigrations
```

### Admin jelszó reset

```bash
# Új superuser létrehozása
docker compose exec horilla-app python manage.py createsuperuser

# Vagy jelszó változtatás
docker compose exec horilla-app python manage.py changepassword admin
```

### Health check sikertelen

```bash
# Ellenőrizd manuálisan
curl http://localhost:3003/

# Első indításnál várj 2 percet (start_period: 120s)
# A Django alkalmazás és migrációk időt vesznek igénybe

# Ellenőrizd a logokat
docker compose logs horilla-app | tail -100
```

### CSRF hiba

Ha "CSRF verification failed" hibaüzenetet kapsz:

```env
# .env fájlban add hozzá a domain-t
CSRF_TRUSTED_ORIGINS=http://localhost:3003,http://your-domain.com
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
```

## Adatok Biztonsági Mentése

### Adatbázis backup

```bash
# Backup készítése
docker compose exec horilla-db pg_dump -U horilla horilla > backup_$(date +%Y%m%d).sql

# Visszaállítás
cat backup_20260118.sql | docker compose exec -T horilla-db psql -U horilla horilla
```

### Media fájlok backup

```bash
# Media volume backup
docker run --rm -v kgc-horilla-media:/data -v $(pwd):/backup alpine tar czf /backup/horilla-media-backup.tar.gz /data
```

## Verziófrissítés

```bash
# Legújabb image letöltése
docker compose pull

# Újraindítás
docker compose down
docker compose up -d

# Migrációk futtatása (fontos frissítés után!)
docker compose exec horilla-app python manage.py migrate

# Static files frissítése
docker compose exec horilla-app python manage.py collectstatic --noinput
```

## Erőforrás Igény

| Komponens | Min RAM | Ajánlott RAM | CPU |
|-----------|---------|--------------|-----|
| horilla-app | 512MB | 1GB | 0.5 |
| horilla-db | 256MB | 512MB | 0.25 |
| **Összesen** | ~768MB | ~1.5GB | ~0.75 |

## Kapcsolódó Dokumentáció

- [Horilla Official Docs](https://docs.horilla.com)
- [Horilla GitHub](https://github.com/horilla-opensource/horilla)
- [Docker Hub](https://hub.docker.com/r/horilla/horilla)
- [KGC ERP Architecture](../../../planning-artifacts/architecture.md)
- [Epic 33: Infrastructure](../../../planning-artifacts/epics/epic-33-infrastructure-deployment.md)
- [Horilla HR Integration Package](../../../packages/integration/horilla-hr/)

## Alapértelmezett Felhasználó

| Mező | Érték |
|------|-------|
| Username | admin |
| Password | admin |

**⚠️ FONTOS:** Azonnal változtasd meg a jelszót az első bejelentkezés után!
