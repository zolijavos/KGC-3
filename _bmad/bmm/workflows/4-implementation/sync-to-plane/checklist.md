# Sync to Plane Workflow - Validációs Checklist

## Pre-flight Checklist

### Konfiguráció
- [ ] `PLANE_API_KEY` environment variable beállítva
- [ ] `PLANE_API_URL` helyes (default: http://localhost:8000)
- [ ] `PLANE_WORKSPACE` létezik
- [ ] `PLANE_PROJECT` létezik
- [ ] API kapcsolat tesztelve (200 OK)

### BMAD Artifactok
- [ ] `sprint-status.yaml` létezik és aktuális
- [ ] Epic fájlok elérhetők (`epic-*.md` vagy `epics/`)
- [ ] Story fájlok elérhetők (opcionális)

---

## Sync Validáció

### Step 2: Plane Setup
- [ ] Minden BMAD státusz létezik Plane-ben (6 db)
- [ ] Alap címkék létrehozva (type:feature, type:bugfix, stb.)
- [ ] State és Label ID-k mentve a sync state-be

### Step 3: Epic → Module
- [ ] Minden epic-nek van Module párja
- [ ] Module nevek helyesek: "Epic {n}: {title}"
- [ ] External ID-k beállítva: `bmad-epic-{n}`
- [ ] Checksum-ok mentve

### Step 4: Story → Work Item
- [ ] Minden story-nak van Work Item párja (ami létezik fájlként)
- [ ] Státuszok helyesen mapping-elve
- [ ] Priority beállítva (default: medium)
- [ ] Module hozzárendelés helyes (epic alapján)
- [ ] Labels hozzáadva (epic label + type label)
- [ ] External ID-k beállítva: `bmad-story-{key}`

### Step 5: Cycle
- [ ] Aktív Cycle létezik vagy létrehozva
- [ ] In-progress és review story-k hozzáadva a Cycle-hoz

### Step 6: Cleanup
- [ ] Sync log generálva
- [ ] `.plane-sync-state.json` frissítve
- [ ] Összefoglaló megjelenítve

---

## Post-sync Ellenőrzés

### Plane UI-ban
- [ ] Modules megjelennek a projekt alatt
- [ ] Work Items helyesen csoportosítva Module-ok szerint
- [ ] Státuszok helyesek a Kanban nézetben
- [ ] Labels láthatók
- [ ] Cycle tartalmazza az aktív story-kat

### Konzisztencia
- [ ] BMAD és Plane story count egyezik
- [ ] Státuszok szinkronban
- [ ] Nincsenek duplikátumok (external_id alapján)

---

## Hiba Checklist

### Ha sync sikertelen
- [ ] Ellenőrizd a Plane API státuszt
- [ ] Ellenőrizd a rate limiting-et (60/perc)
- [ ] Nézd meg a sync log-ot hibákért
- [ ] Ellenőrizd az API kulcs érvényességét

### Ha adatok hiányoznak
- [ ] Ellenőrizd az epic fájlokat
- [ ] Ellenőrizd a sprint-status.yaml formátumát
- [ ] Ellenőrizd a story fájlok elérési útját

### Ha duplikátumok keletkeznek
- [ ] Ellenőrizd a `.plane-sync-state.json` integritását
- [ ] Töröld a duplikátumokat Plane-ből manuálisan
- [ ] Futtasd újra a sync-et

---

## Rollback Terv

Ha a sync hibás adatokat hozott létre:

1. **Plane UI-ban**: Töröld a hibás Module-okat és Work Item-eket
2. **Sync state reset**: Töröld a `.plane-sync-state.json` fájlt
3. **Újra sync**: Futtasd le a workflow-t újra

**Fontos**: A Plane-ben lévő manuális módosítások (amik nem BMAD-ból jöttek) NEM szinkronizálódnak vissza!
