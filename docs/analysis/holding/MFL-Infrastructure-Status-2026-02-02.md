# MFL Infrastruktúra Státusz Jelentés

**Dátum:** 2026-02-02
**Tesztelte:** Claude (automatizált ellenőrzés)
**Verzió:** 1.0

---

## 1. Vezetői Összefoglaló

| Metrika              | Érték |
| -------------------- | ----- |
| **Tesztelt URL-ek**  | 6     |
| **Működik**          | 3     |
| **Nem működik**      | 2     |
| **Rossz helyen fut** | 1     |

### Kritikus Problémák

| #   | Probléma                                         | Súlyosság   |
| --- | ------------------------------------------------ | ----------- |
| 1   | `ops.mflerp.com` nem elérhető (ECONNREFUSED)     | 🔴 KRITIKUS |
| 2   | `hr-demo.mflerp.com` nem elérhető (ECONNREFUSED) | 🔴 KRITIKUS |
| 3   | `myforgeos.mflerp.com` rossz appot szolgál ki    | 🟠 MAGAS    |

---

## 2. Részletes URL Teszt Eredmények

### 2.1 myforgeos.mflerp.com

| Tulajdonság            | Érték                      |
| ---------------------- | -------------------------- |
| **HTTP Státusz**       | 200 OK                     |
| **Server**             | nginx                      |
| **Várt tartalom**      | Support / Helpdesk oldal   |
| **Tényleges tartalom** | "MFOPS - Ops Dashboard"    |
| **Státusz**            | 🟠 **ROSSZ APP FUT RAJTA** |

**Probléma:** Az MFOPS monitoring dashboard fut ezen az URL-en, de support oldalnak kellene lennie.

---

### 2.2 ops.mflerp.com

| Tulajdonság            | Érték                                |
| ---------------------- | ------------------------------------ |
| **HTTP Státusz**       | ECONNREFUSED                         |
| **Várt tartalom**      | MFOPS Hostinger Monitoring Dashboard |
| **Tényleges tartalom** | Nem elérhető                         |
| **Státusz**            | 🔴 **NEM MŰKÖDIK**                   |

**Probléma:** A szerver nem fogad kapcsolatot. Vagy nincs elindítva, vagy nincs konfigurálva a domain.

**Teendő:**

1. Ellenőrizni, hogy a VPS-en fut-e a konténer
2. DNS rekord ellenőrzése
3. Reverse proxy (Caddy/nginx) konfiguráció

---

### 2.3 demo-kgc.mflerp.com

| Tulajdonság      | Érték                     |
| ---------------- | ------------------------- |
| **HTTP Státusz** | 200 OK                    |
| **Tartalom**     | "KGC ERP - Kisgépcentrum" |
| **Státusz**      | ✅ **MŰKÖDIK**            |

---

### 2.4 crm-demo.mflerp.com (Twenty CRM)

| Tulajdonság      | Érték                       |
| ---------------- | --------------------------- |
| **HTTP Státusz** | 200 OK                      |
| **Tartalom**     | Twenty CRM React app        |
| **Server URL**   | https://crm-demo.mflerp.com |
| **Státusz**      | ✅ **MŰKÖDIK**              |

---

### 2.5 hr-demo.mflerp.com (Horilla HR)

| Tulajdonság            | Érték                 |
| ---------------------- | --------------------- |
| **HTTP Státusz**       | ECONNREFUSED          |
| **Várt tartalom**      | Horilla HR Django app |
| **Tényleges tartalom** | Nem elérhető          |
| **Státusz**            | 🔴 **NEM MŰKÖDIK**    |

**Probléma:** A Horilla HR szerver nem fut vagy nincs konfigurálva.

**Teendő:**

1. Docker konténer státusz ellenőrzése
2. Port mapping ellenőrzése (8000-es port)
3. Reverse proxy konfiguráció

---

## 3. Infrastruktúra Térképe

### 3.1 Várt Konfiguráció

```
┌─────────────────────────────────────────────────────────────────┐
│                    mflerp.com SUBDOMAINS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  myforgeos.mflerp.com  ──────► Support/Helpdesk App             │
│                                (??? - nincs forráskód)          │
│                                                                 │
│  ops.mflerp.com  ────────────► MFOPS Dashboard                  │
│                                (/root/LABS/MFOPS)               │
│                                Port: 3100 (web), 3101 (api)     │
│                                                                 │
│  demo-kgc.mflerp.com  ───────► KGC ERP Demo                     │
│                                (/root/LABS/KGCERP/KGC-3)        │
│                                                                 │
│  crm-demo.mflerp.com  ───────► Twenty CRM                       │
│                                Docker: twenty-server:3000       │
│                                                                 │
│  hr-demo.mflerp.com  ────────► Horilla HR                       │
│                                Docker: horilla-app:8000         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Tényleges Állapot

```
┌─────────────────────────────────────────────────────────────────┐
│                    TÉNYLEGES ÁLLAPOT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  myforgeos.mflerp.com  ──────► MFOPS Dashboard  ❌ ROSSZ APP!   │
│                                                                 │
│  ops.mflerp.com  ────────────► ??? ECONNREFUSED ❌ NEM FUT      │
│                                                                 │
│  demo-kgc.mflerp.com  ───────► KGC ERP Demo     ✅ OK           │
│                                                                 │
│  crm-demo.mflerp.com  ───────► Twenty CRM       ✅ OK           │
│                                                                 │
│  hr-demo.mflerp.com  ────────► ??? ECONNREFUSED ❌ NEM FUT      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Projektek és Forráskódok

### 4.1 Azonosított Projektek

| Projekt          | Lokáció                    | Cél URL                | Státusz          |
| ---------------- | -------------------------- | ---------------------- | ---------------- |
| **MFOPS**        | `/root/LABS/MFOPS/`        | `ops.mflerp.com`       | Rossz helyen fut |
| **KGC ERP**      | `/root/LABS/KGCERP/KGC-3/` | `demo-kgc.mflerp.com`  | ✅ OK            |
| **Support Site** | ❓ Nem található           | `myforgeos.mflerp.com` | ❓ Hiányzik      |

### 4.2 MFOPS Projekt Részletek

```
/root/LABS/MFOPS/
├── apps/
│   ├── mfops-api/     # NestJS backend (port 3101)
│   └── mfops-web/     # React frontend (port 3100)
├── packages/
│   └── integration/hostinger/  # Hostinger API client
└── docker-compose.yml
```

**Funkciók:**

- Dashboard (VPS metrikák)
- Projects (multi-projekt kezelés)
- Alerts (riasztások, eszkaláció)
- Settings (beállítások)
- Koko AI (természetes nyelvi parancsok)

### 4.3 Hiányzó: Support Site

**Kérdés:** Hol van a MyForgeOS support site forráskódja?

Lehetőségek:

1. Chatwoot használata (KGC-3-ban konfigurálva van `support.kgc.hu`-ra)
2. Külön projekt ami nincs a LABS mappában
3. Még nem létezik

---

## 5. Szükséges Javítások

### 5.1 Prioritás 1 - Kritikus

| #   | Feladat                         | Részletek                             |
| --- | ------------------------------- | ------------------------------------- |
| 1   | **ops.mflerp.com indítása**     | MFOPS deployment a helyes URL-re      |
| 2   | **hr-demo.mflerp.com indítása** | Horilla HR Docker konténer elindítása |

### 5.2 Prioritás 2 - Magas

| #   | Feladat                             | Részletek                        |
| --- | ----------------------------------- | -------------------------------- |
| 3   | **myforgeos.mflerp.com átállítása** | Support app-ra cserélni (ha van) |
| 4   | **Support site tisztázása**         | Mi a terv? Chatwoot vagy saját?  |

### 5.3 Prioritás 3 - Normál

| #   | Feladat                              | Részletek                  |
| --- | ------------------------------------ | -------------------------- |
| 5   | **KGC-3 MyForgeOSPage.tsx javítása** | URL és label frissítése    |
| 6   | **Dokumentáció frissítése**          | Infra térkép aktualizálása |

---

## 6. Javasolt Tesztelési Terv

### 6.1 Manuális Tesztek

| #   | Teszt            | Parancs / Lépés                       |
| --- | ---------------- | ------------------------------------- |
| 1   | URL elérhetőség  | `curl -sI https://[url]`              |
| 2   | Konténer státusz | `docker ps` a VPS-en                  |
| 3   | Port listening   | `netstat -tlnp \| grep [port]`        |
| 4   | DNS rekord       | `dig [subdomain].mflerp.com`          |
| 5   | SSL tanúsítvány  | `openssl s_client -connect [url]:443` |

### 6.2 Automatizált Tesztek (Playwright)

```typescript
// e2e/infrastructure/url-health.e2e.ts
import { test, expect } from '@playwright/test';

const URLS = [
  { url: 'https://demo-kgc.mflerp.com', title: 'KGC ERP' },
  { url: 'https://crm-demo.mflerp.com', title: 'Twenty' },
  { url: 'https://ops.mflerp.com', title: 'MFOPS' },
  { url: 'https://hr-demo.mflerp.com', title: 'Horilla' },
  { url: 'https://myforgeos.mflerp.com', title: 'Support' },
];

for (const { url, title } of URLS) {
  test(`${url} is accessible and shows ${title}`, async ({ page }) => {
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(new RegExp(title, 'i'));
  });
}
```

### 6.3 API Health Check Script

```bash
#!/bin/bash
# scripts/check-mflerp-health.sh

URLS=(
  "https://demo-kgc.mflerp.com/api/health"
  "https://crm-demo.mflerp.com/healthz"
  "https://ops.mflerp.com/api/health"
  "https://hr-demo.mflerp.com/api"
)

for url in "${URLS[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 5)
  if [ "$status" == "200" ]; then
    echo "✅ $url - OK"
  else
    echo "❌ $url - FAILED ($status)"
  fi
done
```

---

## 7. Következő Lépések

### Azonnali teendők:

- [ ] VPS-en ellenőrizni a futó konténereket (`docker ps`)
- [ ] CloudPanel / reverse proxy konfiguráció áttekintése
- [ ] DNS rekordok ellenőrzése az mflerp.com domain-en
- [ ] Tisztázni: Mi a support site terve?

### Kérdések a döntéshez:

1. **Support site:** Chatwoot-ot használjátok, vagy saját app kell?
2. **ops.mflerp.com:** Mikor kell élnie? Mi a prioritás?
3. **hr-demo.mflerp.com:** Szükséges most, vagy később?

---

## 8. Kapcsolódó Dokumentumok

- [MFOPS README](/root/LABS/MFOPS/README.md)
- [KGC-3 Deployment Guide](docs/deployment-guide.md)
- [Docker Compose - Demo](infra/docker/full-stack/docker-compose.demo.yml)

---

_Dokumentum vége_
