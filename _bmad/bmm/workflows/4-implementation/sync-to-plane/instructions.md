# Sync to Plane Workflow - Végrehajtási Utasítások

<critical>A workflow végrehajtási engine: {project-root}/_bmad/core/tasks/workflow.xml</critical>
<critical>YAML config betöltve: {project-root}/_bmad/bmm/workflows/4-implementation/sync-to-plane/workflow.yaml</critical>

## Cél

BMAD fejlesztési artifactok (epic, story, task) automatikus szinkronizálása a Plane projektmenedzsment eszközbe.

## Előfeltételek

- Plane instance fut és elérhető
- `PLANE_API_KEY` environment variable beállítva
- `sprint-status.yaml` létezik és aktuális
- Epic fájlok elérhetők (`epic-*.md` vagy `epics/`)

---

<workflow>

<step n="1" goal="Konfiguráció validálás és API kapcsolat ellenőrzése">
<action>Kommunikálj {communication_language} nyelven {user_name}-mal</action>

<action>Ellenőrizd a környezeti változókat:</action>

```bash
# Kötelező változók
PLANE_API_URL="${PLANE_API_URL:-http://localhost:8000}"
PLANE_API_KEY="${PLANE_API_KEY}"  # Kötelező!
PLANE_WORKSPACE="${PLANE_WORKSPACE:-kgc-erp}"
PLANE_PROJECT="${PLANE_PROJECT:-kgc-erp-dev}"
```

<action>Ha PLANE_API_KEY hiányzik:</action>
- Hibaüzenet: "PLANE_API_KEY environment variable nincs beállítva. Állítsd be: export PLANE_API_KEY=plane_api_xxxxx"
- Workflow leáll

<action>Teszteld az API kapcsolatot:</action>

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-Key: $PLANE_API_KEY" \
  "$PLANE_API_URL/api/v1/workspaces/$PLANE_WORKSPACE/"
```

- Ha 200 → Folytatás
- Ha 401 → "Hibás API kulcs"
- Ha 404 → "Workspace nem található: $PLANE_WORKSPACE"
- Ha egyéb → "API hiba: {status_code}"

<action>Jelentsd a kapcsolat státuszát:</action>

"Plane API kapcsolat OK
- URL: {plane_api_url}
- Workspace: {plane_workspace}
- Project: {plane_project}"
</step>

<step n="2" goal="Plane projekt előkészítése (States, Labels)">
<action>Töltsd be a meglévő sync state-et (ha van):</action>

```
.plane-sync-state.json
```

<action>Kérdezd le a Plane projekt States-eit:</action>

```
GET /api/v1/workspaces/{ws}/projects/{p}/states/
```

<action>Hozd létre a hiányzó BMAD státuszokat:</action>

| BMAD Status | Plane State | Color |
|-------------|-------------|-------|
| Backlog | Backlog | #a3a3a3 |
| Todo | Todo | #3b82f6 |
| In Progress | In Progress | #eab308 |
| In Review | In Review | #a855f7 |
| Done | Done | #22c55e |
| Cancelled | Cancelled | #ef4444 |

<action>Kérdezd le és hozd létre a Labels-eket:</action>

Alap címkék:
- type:feature (kék)
- type:bugfix (piros)
- type:refactor (narancssárga)
- type:test (zöld)

<action>Mentsd el a state és label ID-kat a sync state-be</action>
</step>

<step n="3" goal="Epic → Module szinkronizáció">
<action>Keresd meg az epic fájlokat:</action>

1. Próbáld: `{planning_artifacts}/epics.md` (egész fájl)
2. Ha nincs: `{planning_artifacts}/epics/index.md` (sharded)
3. Ha sharded: olvasd be az összes epic-*.md fájlt

<action>Minden epic-hez:</action>

1. **Generálj external_id-t**: `bmad-epic-{epic_number}`
2. **Számolj checksum-ot**: SHA256(epic tartalom)
3. **Keress létező Module-t**:
   ```
   GET /api/v1/.../modules/?external_id=bmad-epic-{n}
   ```

4. **Ha nem létezik**:
   ```
   POST /api/v1/.../modules/
   {
     "name": "Epic {n}: {title}",
     "description": "{epic leírás}",
     "external_id": "bmad-epic-{n}",
     "external_source": "bmad"
   }
   ```
   - Mentsd: `epic-{n} → plane-module-id`

5. **Ha létezik és checksum különbözik**:
   ```
   PATCH /api/v1/.../modules/{id}/
   ```
   - Frissítsd a mapping-et

6. **Ha létezik és checksum egyezik**:
   - Skip (változatlan)

<action>Jelentsd az eredményt:</action>

"Epic → Module szinkronizáció:
- Létrehozva: X
- Frissítve: Y
- Kihagyva: Z"
</step>

<step n="4" goal="Story → Work Item szinkronizáció">
<action>Olvasd be a sprint-status.yaml-t:</action>

```yaml
development_status:
  epic-1: in-progress
  1-1-user-authentication: done
  1-2-account-management: in-progress
  ...
```

<action>Minden story-hoz (nem epic, nem retrospective):</action>

1. **Generálj external_id-t**: `bmad-story-{story_key}`
2. **Olvasd be a story fájlt** (ha létezik):
   ```
   {story_location}/{story_key}.md
   ```
3. **Számolj checksum-ot**: SHA256(story tartalom + status)

4. **Keress létező Work Item-et**:
   ```
   GET /api/v1/.../work-items/?external_id=bmad-story-{key}
   ```

5. **Generáld a payload-ot**:
   ```json
   {
     "name": "{story title}",
     "description": "{acceptance criteria markdown}",
     "state": "{state_id from mapping}",
     "priority": "{priority or medium}",
     "module": "{module_id from epic mapping}",
     "labels": ["{epic_label_id}", "{type_label_id}"],
     "external_id": "bmad-story-{key}",
     "external_source": "bmad"
   }
   ```

6. **Ha nem létezik → POST**
7. **Ha létezik és változott → PATCH**
8. **Ha létezik és változatlan → Skip**

<action>Mentsd el a mapping-eket</action>
</step>

<step n="5" goal="Cycle (Sprint) szinkronizáció">
<action>Ellenőrizd az aktív Cycle-t:</action>

```
GET /api/v1/.../cycles/?is_active=true
```

<action>Ha nincs aktív Cycle:</action>

```
POST /api/v1/.../cycles/
{
  "name": "Sprint {date}",
  "start_date": "{today}",
  "end_date": "{today + 14 days}",
  "external_id": "bmad-sprint-{date}",
  "external_source": "bmad"
}
```

<action>Add hozzá az in-progress story-kat a Cycle-hoz:</action>

```
POST /api/v1/.../cycles/{cycle_id}/cycle-issues/
{
  "issues": ["{issue_id_1}", "{issue_id_2}", ...]
}
```

<action>Csak az in-progress és review státuszú story-k kerülnek a Cycle-ba</action>
</step>

<step n="6" goal="Sync log és state mentése">
<action>Generáld a sync log-ot ({planning_artifacts}/plane-sync-log.md):</action>

```markdown
# Plane Sync Log

**Dátum:** {timestamp}
**Workspace:** {workspace}
**Project:** {project}

## Összefoglaló

| Entitás | Létrehozva | Frissítve | Kihagyva | Hiba |
|---------|------------|-----------|----------|------|
| Modules | X | Y | Z | 0 |
| Work Items | X | Y | Z | 0 |
| Cycle | X | Y | Z | 0 |

## Részletek

### Modules (Epics)
- epic-1 → module-uuid-1 (létrehozva)
- epic-2 → module-uuid-2 (frissítve)

### Work Items (Stories)
- 1-1-user-auth → issue-uuid-1 (létrehozva)
- 1-2-account → issue-uuid-2 (kihagyva - változatlan)

### Hibák
(nincs)
```

<action>Frissítsd a .plane-sync-state.json-t</action>

<action>Jelenítsd meg az összefoglalót {user_name}-nak:</action>

"✅ Plane szinkronizáció sikeres!

📊 Összefoglaló:
- Modules: X létrehozva, Y frissítve, Z kihagyva
- Work Items: X létrehozva, Y frissítve, Z kihagyva
- Cycle: {active_cycle_name}

📁 Sync log: {planning_artifacts}/plane-sync-log.md
🔗 Plane URL: {plane_url}/workspaces/{ws}/projects/{p}/"
</step>

</workflow>

---

## Hibaelés

### Rate Limiting

Ha `429 Too Many Requests`:
1. Várakozz X-RateLimit-Reset-ig
2. Retry exponential backoff-fal
3. Max 3 retry, utána skip + log

### API Hibák

| Kód | Jelentés | Akció |
|-----|----------|-------|
| 400 | Bad Request | Log hiba, skip elem |
| 401 | Unauthorized | Állj le, API kulcs hiba |
| 404 | Not Found | Log warning, skip |
| 500 | Server Error | Retry 3x, aztán skip |

### Checksum Kalkuláció

```typescript
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256')
    .update(content.trim())
    .digest('hex')
    .substring(0, 16);  // Rövidített hash
}
```

---

## MCP Alternatíva

Ha a Plane MCP Server elérhető, használd azt a REST API helyett:

```
MCP Tools:
- list_modules / create_module / update_module
- list_work_items / create_work_item / update_work_item
- list_cycles / create_cycle / add_to_cycle
- list_states / create_state
- list_labels / create_label
```

Előny: Automatikus hibakezelés, rate limiting
