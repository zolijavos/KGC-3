# ADR-003: White Label Stratégia

## Státusz

**ELFOGADVA** - 2025. december 2.

## Kontextus

A KGC ERP rendszert nem csak saját használatra és franchise partnereknek fejlesztjük, hanem **értékesíteni is szeretnénk** más bérleti/szerviz cégeknek. Ez White Label (fehér címkés) terméket jelent, ahol:

- Az ügyfél saját brandinggel használhatja
- Saját szerverén futtathatja
- Licenc alapján fizet érte

## Döntések

### 1. Termék Csomagok

**Döntés:** Három szintű termék kínálat

| Csomag | Célcsoport | Funkciók | Ár Modell |
|--------|------------|----------|-----------|
| **Basic** | Kis bérbeadók | Bérlés, Értékesítés, 1 bolt, 3 user | Egyszeri díj |
| **Pro** | Közepes cégek | + Szerviz, Multi-bolt, Offline PWA, 10 user | Éves előfizetés |
| **Enterprise** | Nagy cégek | + Franchise, API, Korlátlan user, Támogatás | Egyedi árazás |

#### Funkció Mátrix

| Funkció | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Ügyfélkezelés | ✅ | ✅ | ✅ |
| Bérlés modul | ✅ | ✅ | ✅ |
| Értékesítés | ✅ | ✅ | ✅ |
| Készletkezelés | ✅ | ✅ | ✅ |
| Szerviz modul | ❌ | ✅ | ✅ |
| Multi-bolt | ❌ | ✅ (max 5) | ✅ (korlátlan) |
| Offline PWA | ❌ | ✅ | ✅ |
| Riportok | Alap | Haladó | Teljes |
| Felhasználók | 3 | 10 | Korlátlan |
| Franchise támogatás | ❌ | ❌ | ✅ |
| API hozzáférés | ❌ | ❌ | ✅ |
| Prioritás támogatás | ❌ | Email | 24/7 |
| White Label branding | ❌ | ✅ | ✅ |
| On-premise telepítés | ❌ | ✅ | ✅ |
| **8. rész funkciók** 🆕 | | | |
| Holding struktúra | ❌ | ❌ | ✅ |
| Részletfizetés | ❌ | ✅ | ✅ |
| Garanciális javítás (norma) | ❌ | ✅ | ✅ |
| Online foglalás (webshop) | ❌ | ❌ | ✅ |
| Országos készlet szinkron | ❌ | ❌ | ✅ |

---

### 2. Theming Rendszer

**Döntés:** Konfiguráció alapú dinamikus theming

#### 2.1 Branding Konfiguráció

```json
// config/branding.json
{
  "app": {
    "name": "GépBérlet Pro",
    "shortName": "GépBérlet",
    "description": "Professzionális bérlés-kezelő rendszer",
    "version": "1.0.0"
  },
  "brand": {
    "logo": {
      "light": "/assets/logo-light.svg",
      "dark": "/assets/logo-dark.svg",
      "favicon": "/assets/favicon.ico",
      "size": {
        "header": { "width": 140, "height": 40 },
        "login": { "width": 200, "height": 60 }
      }
    },
    "colors": {
      "primary": "#1976d2",
      "secondary": "#424242",
      "accent": "#ff9800",
      "success": "#4caf50",
      "warning": "#ff9800",
      "error": "#f44336",
      "background": "#fafafa",
      "surface": "#ffffff"
    },
    "typography": {
      "fontFamily": "'Roboto', sans-serif",
      "headingFont": "'Roboto', sans-serif"
    }
  },
  "contact": {
    "company": "Példa Kft.",
    "email": "info@gepberlet.hu",
    "phone": "+36 1 234 5678",
    "website": "https://gepberlet.hu",
    "address": "1234 Budapest, Példa utca 1."
  },
  "legal": {
    "privacyUrl": "/legal/privacy",
    "termsUrl": "/legal/terms",
    "copyrightYear": 2025
  },
  "features": {
    "showPoweredBy": false,
    "customFooter": true,
    "customLogin": true
  }
}
```

#### 2.2 CSS Változók Generálása

```javascript
// services/theming.service.js

class ThemingService {
  constructor(brandingConfig) {
    this.config = brandingConfig;
  }

  generateCSSVariables() {
    const { colors } = this.config.brand;
    return `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-error: ${colors.error};
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};

        --font-family: ${this.config.brand.typography.fontFamily};
        --font-heading: ${this.config.brand.typography.headingFont};
      }
    `;
  }

  getAppTitle() {
    return this.config.app.name;
  }

  getLogo(variant = 'light') {
    return this.config.brand.logo[variant];
  }
}
```

#### 2.3 PWA Manifest Generálása

```javascript
// Dinamikus manifest.json generálás branding alapján
function generateManifest(branding) {
  return {
    name: branding.app.name,
    short_name: branding.app.shortName,
    description: branding.app.description,
    start_url: "/",
    display: "standalone",
    background_color: branding.brand.colors.background,
    theme_color: branding.brand.colors.primary,
    icons: [
      {
        src: branding.brand.logo.favicon,
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: branding.brand.logo.favicon,
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
```

---

### 3. Licenc Rendszer

**Döntés:** Hibrid licenc modell (online validálás + offline grace period)

#### 3.1 Licenc Struktúra

```json
// license.json (telepítéskor generálva)
{
  "licenseKey": "KGC-PRO-2025-XXXX-XXXX-XXXX",
  "type": "pro",
  "customer": {
    "id": "cust_abc123",
    "name": "Példa Kft.",
    "email": "admin@pelda.hu"
  },
  "limits": {
    "users": 10,
    "stores": 5,
    "features": ["rental", "sales", "service", "offline", "reports_advanced", "installment", "warranty_norma"]
  },
  "validity": {
    "activatedAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2026-01-01T00:00:00Z",
    "gracePeriodDays": 30
  },
  "signature": "base64_encoded_signature..."
}
```

#### 3.2 Licenc Validáció Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   LICENC VALIDÁCIÓ FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   App Indítás                                               │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐                                           │
│   │ license.json│                                           │
│   │ beolvasás   │                                           │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────┐     Nem ─────────┐                       │
│   │ Aláírás     │                  ▼                       │
│   │ érvényes?   │────────► ┌─────────────┐                 │
│   └──────┬──────┘          │   HIBA:     │                 │
│          │ Igen            │ Érvénytelen │                 │
│          ▼                 │   licenc    │                 │
│   ┌─────────────┐          └─────────────┘                 │
│   │ Lejárt?     │                                          │
│   └──────┬──────┘                                          │
│          │                                                  │
│     ┌────┴────┐                                            │
│     ▼         ▼                                            │
│   Nem      Igen                                            │
│     │         │                                            │
│     │         ▼                                            │
│     │   ┌─────────────┐                                    │
│     │   │Grace period │                                    │
│     │   │aktív?       │                                    │
│     │   └──────┬──────┘                                    │
│     │          │                                           │
│     │     ┌────┴────┐                                      │
│     │     ▼         ▼                                      │
│     │   Igen       Nem                                     │
│     │     │         │                                      │
│     │     │         ▼                                      │
│     │     │   ┌─────────────┐                              │
│     │     │   │ READONLY    │                              │
│     │     │   │ MÓD         │                              │
│     │     │   │ (csak olvas)│                              │
│     │     │   └─────────────┘                              │
│     │     │                                                │
│     └──┬──┘                                                │
│        │                                                   │
│        ▼                                                   │
│   ┌─────────────┐                                          │
│   │ Online      │                                          │
│   │ check?      │ (havonta 1x)                             │
│   └──────┬──────┘                                          │
│          │                                                 │
│     ┌────┴────┐                                            │
│     ▼         ▼                                            │
│  Sikeres   Sikertelen                                      │
│     │         │                                            │
│     │         ▼                                            │
│     │   ┌─────────────┐                                    │
│     │   │ Offline     │                                    │
│     │   │ mód (30 nap)│                                    │
│     │   └─────────────┘                                    │
│     │         │                                            │
│     └────┬────┘                                            │
│          ▼                                                 │
│   ┌─────────────┐                                          │
│   │   NORMÁL    │                                          │
│   │   MŰKÖDÉS   │                                          │
│   └─────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3 Licenc Szerver API

```javascript
// License Server Endpoints

// Aktiválás
POST /api/license/activate
{
  "licenseKey": "KGC-PRO-2025-XXXX-XXXX-XXXX",
  "machineId": "unique-machine-fingerprint",
  "customerEmail": "admin@example.com"
}

// Validálás (havi check)
POST /api/license/validate
{
  "licenseKey": "KGC-PRO-2025-XXXX-XXXX-XXXX",
  "machineId": "unique-machine-fingerprint",
  "currentVersion": "1.2.3"
}

// Response
{
  "valid": true,
  "expiresAt": "2026-01-01T00:00:00Z",
  "features": ["rental", "sales", "service", "offline"],
  "latestVersion": "1.2.5",
  "updateUrl": "https://releases.kgc-erp.com/v1.2.5"
}
```

#### 3.4 Feature Flags Implementáció

```javascript
// services/license.service.js

class LicenseService {
  constructor(license) {
    this.license = license;
    this.features = new Set(license.limits.features);
  }

  hasFeature(feature) {
    return this.features.has(feature);
  }

  canAddUser() {
    const currentUsers = await this.getUserCount();
    return currentUsers < this.license.limits.users;
  }

  canAddStore() {
    const currentStores = await this.getStoreCount();
    return currentStores < this.license.limits.stores;
  }

  getEnabledModules() {
    const modules = ['customers', 'inventory']; // Mindig elérhető

    if (this.hasFeature('rental')) modules.push('rental');
    if (this.hasFeature('sales')) modules.push('sales');
    if (this.hasFeature('service')) modules.push('service');
    if (this.hasFeature('franchise')) modules.push('franchise');
    if (this.hasFeature('reports_advanced')) modules.push('advanced_reports');
    // 8. rész funkciók
    if (this.hasFeature('holding')) modules.push('holding');
    if (this.hasFeature('installment')) modules.push('installment');
    if (this.hasFeature('warranty_norma')) modules.push('warranty_norma');
    if (this.hasFeature('online_reservation')) modules.push('online_reservation');
    if (this.hasFeature('inventory_sync')) modules.push('inventory_sync');

    return modules;
  }
}

// Használat komponensekben
function ServiceModule() {
  const license = useLicense();

  if (!license.hasFeature('service')) {
    return <UpgradePrompt feature="service" />;
  }

  return <ServiceDashboard />;
}
```

---

### 4. Telepítő Csomag

**Döntés:** Docker alapú egyszerű telepítő

#### 4.1 Telepítő Struktúra

```
kgc-erp-installer/
├── install.sh                 # Linux/Mac telepítő script
├── install.ps1                # Windows PowerShell script
├── docker-compose.yml         # Docker konfiguráció
├── .env.example              # Környezeti változók minta
├── config/
│   ├── branding.json         # Alapértelmezett branding
│   └── nginx.conf            # Webszerver konfig
├── docs/
│   ├── INSTALL.md            # Telepítési útmutató
│   ├── ADMIN.md              # Adminisztrációs útmutató
│   └── TROUBLESHOOT.md       # Hibaelhárítás
└── LICENSE.md                # Licenc feltételek
```

#### 4.2 Telepítő Script

```bash
#!/bin/bash
# install.sh - KGC ERP White Label Telepítő

echo "╔═══════════════════════════════════════════╗"
echo "║     KGC ERP - White Label Telepítő        ║"
echo "║           Verzió: 1.0.0                   ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Előfeltételek ellenőrzése
check_requirements() {
    echo "🔍 Előfeltételek ellenőrzése..."

    command -v docker >/dev/null 2>&1 || {
        echo "❌ Docker nem található. Telepítsd: https://docker.com"
        exit 1
    }

    command -v docker-compose >/dev/null 2>&1 || {
        echo "❌ Docker Compose nem található."
        exit 1
    }

    echo "✅ Docker és Docker Compose telepítve"
}

# Licenc aktiválás
activate_license() {
    echo ""
    echo "🔑 Licenc Aktiválás"
    read -p "Licenc kulcs: " LICENSE_KEY
    read -p "Email cím: " EMAIL

    # Online aktiválás
    RESPONSE=$(curl -s -X POST https://license.kgc-erp.com/api/activate \
        -H "Content-Type: application/json" \
        -d "{\"licenseKey\": \"$LICENSE_KEY\", \"email\": \"$EMAIL\"}")

    if echo "$RESPONSE" | grep -q '"valid":true'; then
        echo "$RESPONSE" > config/license.json
        echo "✅ Licenc sikeresen aktiválva!"
    else
        echo "❌ Licenc aktiválás sikertelen. Ellenőrizd a kulcsot."
        exit 1
    fi
}

# Branding beállítás
setup_branding() {
    echo ""
    echo "🎨 Branding Beállítás"
    read -p "Alkalmazás neve [KGC ERP]: " APP_NAME
    APP_NAME=${APP_NAME:-"KGC ERP"}

    read -p "Cég neve: " COMPANY_NAME
    read -p "Email cím: " CONTACT_EMAIL

    # branding.json generálás
    cat > config/branding.json << EOF
{
  "app": {
    "name": "$APP_NAME",
    "shortName": "$APP_NAME"
  },
  "contact": {
    "company": "$COMPANY_NAME",
    "email": "$CONTACT_EMAIL"
  },
  "brand": {
    "colors": {
      "primary": "#1976d2",
      "secondary": "#424242"
    }
  }
}
EOF
    echo "✅ Branding konfigurálva"
}

# Docker indítás
start_services() {
    echo ""
    echo "🚀 Szolgáltatások Indítása..."

    docker-compose up -d

    echo ""
    echo "✅ KGC ERP sikeresen telepítve!"
    echo ""
    echo "📍 Elérhetőség: http://localhost"
    echo "👤 Admin belépés: admin@local / admin123"
    echo ""
    echo "⚠️  FONTOS: Változtasd meg az admin jelszót!"
}

# Fő folyamat
main() {
    check_requirements
    activate_license
    setup_branding
    start_services
}

main
```

---

### 5. Frissítés Mechanizmus

**Döntés:** Értesítés alapú manuális frissítés (kezdetben)

#### 5.1 Verzió Ellenőrzés

```javascript
// services/update.service.js

class UpdateService {
  async checkForUpdates() {
    const currentVersion = process.env.APP_VERSION;

    try {
      const response = await fetch(
        `https://api.kgc-erp.com/updates/check?version=${currentVersion}`
      );
      const data = await response.json();

      if (data.updateAvailable) {
        return {
          available: true,
          currentVersion,
          latestVersion: data.latestVersion,
          releaseNotes: data.releaseNotes,
          downloadUrl: data.downloadUrl,
          breaking: data.breakingChanges
        };
      }

      return { available: false };
    } catch (error) {
      // Offline - skip update check
      return { available: false, offline: true };
    }
  }
}
```

#### 5.2 Admin Értesítés

```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️  Új verzió elérhető: v1.3.0                             │
│                                                             │
│  Újdonságok:                                                │
│  • Javított offline szinkronizáció                          │
│  • Új riport típusok                                        │
│  • Hibajavítások                                            │
│                                                             │
│  [Letöltés]  [Később]  [Részletek]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Összefoglaló

| Döntés | Választás |
|--------|-----------|
| Termék csomagok | Basic / Pro / Enterprise |
| Theming | Config-alapú (branding.json) |
| Licenc típus | Online validálás + 30 nap offline grace |
| Telepítő | Docker + Shell script |
| Frissítés | Értesítés + manuális frissítés |

---

## Architektúra Hatás

A White Label hozzáadása a következőket jelenti:

```
┌─────────────────────────────────────────────────────────────┐
│                   FRISSÍTETT ARCHITEKTÚRA                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              🔐 LICENC SZERVER                       │   │
│  │         (Központi - KGC által üzemeltetett)         │   │
│  │                                                     │   │
│  │  • Licenc generálás      • Feature flags           │   │
│  │  • Aktiválás             • Verzió követés          │   │
│  │  • Validálás             • Telemetria (opt-in)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│          ┌────────────────┼────────────────┐               │
│          ▼                ▼                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Saját KGC   │  │ White Label │  │ White Label │        │
│  │ (Franchise) │  │ Ügyfél A    │  │ Ügyfél B    │        │
│  │             │  │ "GépBérlet" │  │ "RentMaster"│        │
│  │ ☁️ Felhő    │  │ 🏢 On-Prem  │  │ ☁️ Felhő    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Kapcsolódó Dokumentumok

- [ADR-001: Franchise Multi-Tenant](./ADR-001-franchise-multitenancy.md)
- [ADR-002: Deployment & Offline](./ADR-002-deployment-offline-strategy.md)

---

## Döntéshozók

- **Javo!** - Projekt tulajdonos
- **Winston** - Architect (BMAD)

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2025-12-02 | 1.0 | Kezdeti döntések rögzítése |
| 2025-12-04 | 1.1 | 8. rész funkciók hozzáadva a Feature Mátrixhoz (Holding, Részletfizetés, Garancia, Foglalás) |
