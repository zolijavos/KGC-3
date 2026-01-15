# KGC ERP UI Style Guide v1.0

**Projekt:** KGC ERP v7.0
**Datum:** 2026-01-04
**Statusz:** Jovahagyva
**Frissitve:** Vegleges szinpaletta es Lucide ikonok

---

## 1. Design Alapelvek

| Elv | Leiras |
|-----|--------|
| **Egyszeruseg** | Minimal design, keves vizualis zaj |
| **Hatekonysag** | Gyors rendereles, optimalizalt komponensek |
| **Konzisztencia** | Azonos mintak minden modulban |
| **Accessibility** | WCAG 2.1 AA megfelelosseg |
| **Szogletesseg** | 4px border-radius, nem kerekitett |
| **Ikonok** | Lucide - NO emoji |

---

## 2. Szinpaletta

### 2.1 Primary Colors (Visszafogott Narancs - KGC Brand)

| Token | HEX | Hasznalat |
|-------|-----|-----------|
| `--primary` | `#BF4400` | Fo akcio gombok, kiemelések |
| `--primary-hover` | `#D45500` | Hover allapot |
| `--primary-pressed` | `#993700` | Active/pressed allapot |
| `--primary-muted` | `#BF440015` | Halvany hatter, badge |

### 2.2 Secondary Colors (Mely Kek)

| Token | HEX | Hasznalat |
|-------|-----|-----------|
| `--secondary` | `#1565A8` | Masodlagos gombok, linkek |
| `--secondary-hover` | `#1976B8` | Hover allapot |

### 2.3 Semantic Colors (Visszafogott)

| Token | HEX | Hasznalat |
|-------|-----|-----------|
| `--success` | `#276749` | Sikeres, "Aktiv" statusz |
| `--warning` | `#B7791F` | Figyelem, "Lejaro" statusz |
| `--danger` | `#9B2C2C` | Hiba, "Kesedelmes" statusz |
| `--info` | `#2B6CB0` | Info, "Szervizben" statusz |

### 2.4 Neutrals - Light Mode

| Token | HEX | Hasznalat |
|-------|-----|-----------|
| `--background` | `#EAECEF` | Oldal hatter |
| `--surface` | `#F8F9FA` | Kartya hatter |
| `--surface-elevated` | `#FFFFFF` | Modal, dropdown |
| `--border` | `#D0D4D9` | Szegelyek |
| `--text-primary` | `#1A1F26` | Fo szoveg |
| `--text-secondary` | `#4A5568` | Masodlagos szoveg |
| `--text-muted` | `#718096` | Halvany szoveg |

### 2.5 Neutrals - Dark Mode

| Token | HEX | Hasznalat |
|-------|-----|-----------|
| `--background` | `#0D1117` | Oldal hatter |
| `--surface` | `#161B22` | Kartya hatter |
| `--surface-elevated` | `#1C2128` | Modal, dropdown |
| `--border` | `#30363D` | Szegelyek |
| `--text-primary` | `#E6EDF3` | Fo szoveg |
| `--text-secondary` | `#8B949E` | Masodlagos szoveg |
| `--text-muted` | `#6E7681` | Halvany szoveg |
| `--primary` | `#D45500` | Primary (vilagosabb dark-ban) |

### 2.6 CSS Variables Implementacio

```css
:root {
  /* Primary */
  --primary: #BF4400;
  --primary-hover: #D45500;
  --primary-pressed: #993700;
  --primary-muted: #BF440015;

  /* Secondary */
  --secondary: #1565A8;
  --secondary-hover: #1976B8;

  /* Semantic */
  --success: #276749;
  --warning: #B7791F;
  --danger: #9B2C2C;
  --info: #2B6CB0;

  /* Neutrals */
  --background: #EAECEF;
  --surface: #F8F9FA;
  --surface-elevated: #FFFFFF;
  --border: #D0D4D9;
  --text-primary: #1A1F26;
  --text-secondary: #4A5568;
  --text-muted: #718096;
}

[data-theme="dark"] {
  --background: #0D1117;
  --surface: #161B22;
  --surface-elevated: #1C2128;
  --border: #30363D;
  --text-primary: #E6EDF3;
  --text-secondary: #8B949E;
  --text-muted: #6E7681;
  --primary: #D45500;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #0D1117;
    --surface: #161B22;
    --surface-elevated: #1C2128;
    --border: #30363D;
    --text-primary: #E6EDF3;
    --text-secondary: #8B949E;
    --text-muted: #6E7681;
    --primary: #D45500;
  }
}
```

---

## 3. Tipografia

### 3.1 Font Family

| Tipus | Font | Fallback | Hasznalat |
|-------|------|----------|-----------|
| **Primary** | Inter | system-ui, sans-serif | UI szovegek |
| **Monospace** | JetBrains Mono | ui-monospace | ID-k, kodok |

### 3.2 Type Scale

| Elem | Meret | Line Height | Weight | Hasznalat |
|------|-------|-------------|--------|-----------|
| **H1** | 28px | 1.2 | 700 | Oldal cimek |
| **H2** | 22px | 1.3 | 600 | Szekcio cimek |
| **H3** | 18px | 1.4 | 600 | Kartya cimek |
| **Body** | 16px | 1.5 | 400 | Fo szoveg |
| **Small** | 14px | 1.5 | 400 | Masodlagos |
| **Caption** | 12px | 1.4 | 400 | Cimkek, meta |

### 3.3 Magyar Szam Formatum

```javascript
// Penz
new Intl.NumberFormat('hu-HU', {
  style: 'currency',
  currency: 'HUF',
  maximumFractionDigits: 0
}).format(50000); // "50 000 Ft"

// Datum
new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}).format(date); // "2026. jan. 04."
```

---

## 4. Ikonok - Lucide

### 4.1 Konfiguracio

| Tulajdonsag | Ertek |
|-------------|-------|
| **Konyvtar** | `lucide-react` |
| **Default meret** | 20px (small) / 24px (normal) |
| **Stroke width** | 2px |
| **Szin** | `currentColor` |

### 4.2 KGC Ikonok

```tsx
import {
  // Navigacio
  Home,           // Dashboard
  Package,        // Keszlet
  Wrench,         // Szerviz
  Users,          // Partnerek
  Wallet,         // Penztar
  FileText,       // Szamlak
  Calculator,     // Arajanlat
  Truck,          // Szallitas

  // Berles
  Clock,          // Berlesi ido
  Calendar,       // Datum
  Repeat,         // Hosszabbitas
  RotateCcw,      // Visszavetel

  // Akciok
  Plus,           // Uj elem
  Search,         // Kereses
  Filter,         // Szures
  Download,       // Letoltes
  Upload,         // Feltoltes
  Scan,           // Vonalkod
  Printer,        // Nyomtatas

  // Statusz
  CheckCircle,    // Sikeres
  AlertTriangle,  // Figyelem
  XCircle,        // Hiba
  Info,           // Info

  // UI
  ChevronDown,    // Dropdown
  ChevronRight,   // Nav
  MoreHorizontal, // Menu
  Settings,       // Beallitasok
  LogOut,         // Kijelentkezes
  Sun,            // Light mode
  Moon,           // Dark mode
} from 'lucide-react';
```

### 4.3 Hasznalat

```tsx
// Gombban
<Button>
  <Plus size={20} />
  Uj berles
</Button>

// Onallo
<Wrench size={24} className="text-primary" />

// Badge
<Badge variant="success">
  <CheckCircle size={14} />
  Aktiv
</Badge>
```

---

## 5. Gombok (3D Stilus)

### 5.1 Altalanos

| Tulajdonsag | Ertek |
|-------------|-------|
| **Border radius** | 4px (szogletes) |
| **Font weight** | 600 |
| **Transition** | 150ms ease-out |
| **Gap** | 8px (ikon + szoveg) |
| **3D effekt** | 4px also arnyek + gradient |

### 5.2 3D Effekt Magyarazat

```
NORMAL ALLAPOT:
┌──────────────────┐  ← Vilagosabb felso el
│     MENTES       │  ← Fo szin
├──────────────────┤
█████████████████████  ← 4px sotetebb also arnyek

HOVER ALLAPOT:
┌──────────────────┐
│     MENTES       │  ← Vilagosabb hover szin
├──────────────────┤
█████████████████████  ← 4px arnyek megmarad

PRESSED/ACTIVE ALLAPOT:
┌──────────────────┐
│     MENTES       │  ← Sotetebb pressed szin
├──────────────────┤
███                    ← 2px arnyek (lenyomott hatas)
  ↓ translateY(2px)    ← Gomb lemozdul
```

### 5.3 Meretek

| Meret | Height | Padding | Font | Hasznalat |
|-------|--------|---------|------|-----------|
| **Small** | 36px | 8px 16px | 14px | Toolbar |
| **Medium** | 48px | 12px 24px | 16px | Default |
| **Large** | 60px | 16px 32px | 18px | Touch, CTA |

### 5.4 3D Szin Variaciok

| Variacio | Fo szin | Also arnyek | Hover | Pressed |
|----------|---------|-------------|-------|---------|
| **Primary** | `#BF4400` | `#8A3200` | `#D45500` | `#993700` |
| **Secondary** | `#1565A8` | `#0E4A7A` | `#1976B8` | `#115590` |
| **Success** | `#276749` | `#1A4A33` | `#2F7A56` | `#1F5A3D` |
| **Danger** | `#9B2C2C` | `#6B1F1F` | `#B33333` | `#832525` |

### 5.5 CSS Implementacio

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  position: relative;

  /* 3D Transition */
  transition: all 150ms ease-out;
  transform: translateY(0);
}

.btn-md {
  height: 48px;
  padding: 12px 24px;
  font-size: 16px;
}

/* PRIMARY 3D */
.btn-primary {
  background: linear-gradient(180deg, #D45500 0%, #BF4400 100%);
  color: white;
  border: none;
  box-shadow:
    0 4px 0 #8A3200,           /* 3D also arnyek */
    0 6px 8px rgba(0,0,0,0.15); /* Soft shadow */
}

.btn-primary:hover {
  background: linear-gradient(180deg, #E66000 0%, #D45500 100%);
  box-shadow:
    0 4px 0 #8A3200,
    0 8px 12px rgba(0,0,0,0.2);
}

.btn-primary:active {
  background: linear-gradient(180deg, #BF4400 0%, #993700 100%);
  box-shadow:
    0 2px 0 #8A3200,           /* Kisebb arnyek */
    0 3px 6px rgba(0,0,0,0.15);
  transform: translateY(2px);   /* Lenyomas effekt */
}

.btn-primary:disabled {
  background: #D0D4D9;
  color: #718096;
  box-shadow: 0 4px 0 #A0A4A9;
  cursor: not-allowed;
}

/* SECONDARY 3D */
.btn-secondary {
  background: linear-gradient(180deg, #1976B8 0%, #1565A8 100%);
  color: white;
  border: none;
  box-shadow:
    0 4px 0 #0E4A7A,
    0 6px 8px rgba(0,0,0,0.15);
}

.btn-secondary:active {
  box-shadow: 0 2px 0 #0E4A7A;
  transform: translateY(2px);
}

/* DANGER 3D */
.btn-danger {
  background: linear-gradient(180deg, #B33333 0%, #9B2C2C 100%);
  color: white;
  border: none;
  box-shadow:
    0 4px 0 #6B1F1F,
    0 6px 8px rgba(0,0,0,0.15);
}

.btn-danger:active {
  box-shadow: 0 2px 0 #6B1F1F;
  transform: translateY(2px);
}

/* OUTLINE (nem 3D) */
.btn-outline {
  background: transparent;
  color: #BF4400;
  border: 2px solid #BF4400;
  box-shadow: none;
}

.btn-outline:hover {
  background: #BF440010;
}

/* GHOST (nem 3D) */
.btn-ghost {
  background: transparent;
  color: #4A5568;
  border: none;
  box-shadow: none;
}
```

### 5.6 Tailwind CSS Implementacio

```tsx
// Primary 3D Button
<button className="
  inline-flex items-center gap-2
  px-6 py-3
  bg-gradient-to-b from-[#D45500] to-[#BF4400]
  text-white font-semibold
  rounded
  shadow-[0_4px_0_#8A3200,0_6px_8px_rgba(0,0,0,0.15)]
  hover:from-[#E66000] hover:to-[#D45500]
  active:shadow-[0_2px_0_#8A3200]
  active:translate-y-[2px]
  transition-all duration-150
">
  <Plus size={20} />
  Uj berles
</button>
```

---

## 6. Input Mezok

| Tulajdonsag | Ertek |
|-------------|-------|
| **Height** | 44px |
| **Border radius** | 4px |
| **Border** | 2px solid `#D0D4D9` |
| **Padding** | 12px 16px |
| **Font size** | 16px |

### Allapotok

| Allapot | Border | Hatter |
|---------|--------|--------|
| **Default** | `#D0D4D9` | `#FFFFFF` |
| **Focused** | `#BF4400` | `#FFFFFF` |
| **Error** | `#9B2C2C` | `#FFFFFF` |
| **Disabled** | `#D0D4D9` | `#F8F9FA` |

---

## 7. Kartyak

| Tulajdonsag | Light | Dark |
|-------------|-------|------|
| **Background** | `#F8F9FA` | `#1C2128` |
| **Border** | 1px `#D0D4D9` | 1px `#30363D` |
| **Border radius** | 4px | 4px |
| **Padding** | 16px | 16px |
| **Shadow** | none | none |

### Statusz Csik (4px top)

| Statusz | Szin |
|---------|------|
| **Aktiv** | `#276749` |
| **Figyelem** | `#B7791F` |
| **Kritikus** | `#9B2C2C` |
| **Info** | `#2B6CB0` |

---

## 8. Badges

| Tulajdonsag | Ertek |
|-------------|-------|
| **Height** | 24-28px |
| **Border radius** | 4px |
| **Padding** | 4px 12px |
| **Font size** | 12px |
| **Font weight** | 500 |

### Variaciok

| Tipus | Hatter | Szoveg |
|-------|--------|--------|
| **Success** | `#27674920` | `#276749` |
| **Warning** | `#B7791F20` | `#B7791F` |
| **Danger** | `#9B2C2C20` | `#9B2C2C` |
| **Info** | `#2B6CB020` | `#2B6CB0` |
| **Neutral** | `#4A556820` | `#4A5568` |

---

## 9. Tablazatok

| Elem | Light | Dark |
|------|-------|------|
| **Header** | `#EAECEF` | `#161B22` |
| **Row odd** | `#FFFFFF` | `#1C2128` |
| **Row even** | `#F8F9FA` | `#161B22` |
| **Row hover** | `#BF440010` | `#D4550020` |
| **Border** | `#D0D4D9` | `#30363D` |

### Sor Magassag

| Tipus | Height |
|-------|--------|
| **Compact** | 40px |
| **Default** | 48px |
| **Comfortable** | 56px |

---

## 10. Spacing (4px alap)

| Token | Ertek | Hasznalat |
|-------|-------|-----------|
| `space-1` | 4px | Ikon-szoveg |
| `space-2` | 8px | Elemek kozott |
| `space-3` | 12px | Kartya padding (tight) |
| `space-4` | 16px | Kartya padding (default) |
| `space-6` | 24px | Szekciokon belul |
| `space-8` | 32px | Szekcio kozott |
| `space-12` | 48px | Page padding |

---

## 11. Accessibility

### Kontraszt

| Elem | Minimum | KGC |
|------|---------|-----|
| **Szoveg** | 4.5:1 | 7:1+ |
| **UI elemek** | 3:1 | 3:1+ |

### Focus

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Touch Target

| Minimum | KGC |
|---------|-----|
| 44x44px | 48px (default), 60px (touch) |

---

## 12. Excalidraw Referencia Fajlok

| Fajl | Tartalom |
|------|----------|
| `docs/wireframes/design-system/color-palette-comparison.excalidraw` | Szinpaletta |
| `docs/wireframes/design-system/button-styles.excalidraw` | Gomb stilusok |
| `docs/wireframes/design-system/ui-components.excalidraw` | Komponensek |
| `docs/wireframes/design-system/light-dark-mode-comparison.excalidraw` | Light/Dark |
| `docs/wireframes/design-system/icon-library-comparison.excalidraw` | Ikon osszehasonlitas |

---

## 13. Tech Stack

| Kategoria | Technologia |
|-----------|-------------|
| **UI Framework** | React |
| **Styling** | Tailwind CSS |
| **Components** | shadcn/ui |
| **Icons** | Lucide React |
| **Fonts** | Inter, JetBrains Mono |

---

## Changelog

| Verzio | Datum | Valtozas |
|--------|-------|----------|
| 1.0 | 2026-01-04 | Elso kiadas - visszafogott szinpaletta, Lucide ikonok, szogletes gombok |
