# Story 48-4: Excel Export Funkció

**Status:** done
**Epic:** Epic 48 - Bérlési Dashboard & Export
**Package:** `apps/kgc-web/`
**Estimated SP:** 1

---

## Story

**As a** Könyvelő,
**I want** Excel formátumban exportálni a riportokat,
**So that** további elemzést végezhessek.

---

## Scope

### IN SCOPE

1. **useExcelExport hook** - Riport Excel generálás
2. **XLSX formátum** - Standard Excel kompatibilis
3. **Formázás** - Számok, dátumok helyesen
4. **Export Excel gomb** - Minden riport oldalon

### OUT OF SCOPE

- PDF export (→ Story 48-3)
- Több munkalap támogatás (későbbi bővítés)

---

## Acceptance Criteria

### AC1: Riport Exportálása Excel-be

**Given** bármely riport oldalon vagyok
**When** rákattintok az "Export Excel" gombra
**Then** letöltődik a riport XLSX formátumban:

- Fájlnév: `kgc_[riport_nev]_[datum].xlsx`
- Riport neve és dátuma a fájlnévben

### AC2: Excel Formázás

**Given** exportálok egy riportot Excel-be
**When** megnyitom az Excel fájlt
**Then** a következő formázás látható:

- Oszlopok megfelelően formázottak
- Számok számként jelennek meg (nem szövegként)
- Dátumok dátumként jelennek meg
- Pénznem oszlopok Ft formátumban

### AC3: Export Gomb Elhelyezés

**Given** riport oldal
**When** betölt az oldal
**Then** az "Export Excel" gomb látható:

- "Export PDF" mellett
- FileSpreadsheet ikon + "Excel" felirat
- Letöltés közben spinner

---

## Tasks / Subtasks

- [ ] **Task 1: Excel Library Integráció**
  - [ ] 1.1: xlsx vagy exceljs telepítés
  - [ ] 1.2: Típus definíciók

- [ ] **Task 2: useExcelExport Hook**
  - [ ] 2.1: Hook létrehozása
  - [ ] 2.2: Paraméterek: title, data, columns
  - [ ] 2.3: Loading state kezelés

- [ ] **Task 3: Oszlop Formázás**
  - [ ] 3.1: Szám formátum
  - [ ] 3.2: Dátum formátum
  - [ ] 3.3: Pénznem formátum (Ft)

- [ ] **Task 4: Export Button Komponens**
  - [ ] 4.1: `ExportExcelButton.tsx` komponens
  - [ ] 4.2: FileSpreadsheet ikon + felirat
  - [ ] 4.3: Loading spinner

- [ ] **Task 5: Integráció Riport Oldalakkal**
  - [ ] 5.1: Bérlési riport oldal
  - [ ] 5.2: Kintlévőségek oldal
  - [ ] 5.3: ÁFA összesítő oldal

- [ ] **Task 6: Tesztelés**
  - [ ] 6.1: Unit tesztek
  - [ ] 6.2: Excel output ellenőrzés

---

## Technical Notes

### useExcelExport Hook Interface

```typescript
interface UseExcelExportOptions {
  title: string;
  data: Record<string, unknown>[];
  columns: {
    key: string;
    header: string;
    type?: 'string' | 'number' | 'date' | 'currency';
    width?: number;
  }[];
  filename?: string;
}

const useExcelExport = () => {
  const exportToExcel = async (options: UseExcelExportOptions) => Promise<void>;
  const isExporting: boolean;
  return { exportToExcel, isExporting };
};
```

### Oszlop Típus Mapping

| Típus    | Excel Formátum | Példa      |
| -------- | -------------- | ---------- |
| string   | General        | "Fúró-001" |
| number   | Number         | 42         |
| date     | Date           | 2026-02-11 |
| currency | #,##0 Ft       | 125 000 Ft |

---

## Dependencies

- Story 48-3: PDF Export (közös button layout)
- Story 48-2: Bérlési Riport Oldal

---

## Definition of Done

- [ ] Minden AC teljesítve
- [ ] Excel generálás működik
- [ ] Számok és dátumok helyesen formázva
- [ ] Export gomb minden riport oldalon
- [ ] Unit tesztek (min. 80% coverage)
- [ ] Code review PASS

---

## Changelog

| Verzió | Dátum      | Változás         |
| ------ | ---------- | ---------------- |
| 1.0    | 2026-02-11 | Story létrehozva |

---

**Készítette:** BMAD Sprint Planning (SM Agent)
