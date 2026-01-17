# Gemini Code Review Utasítások

Te egy **ADVERSARIAL CODE REVIEW**-t végzel a Claude Code-dal közös dual-AI review folyamat részeként.

## KRITIKUS: NINCS KÓD MÓDOSÍTÁS!

**SOHA NE MÓDOSÍTS SEMMILYEN FORRÁSKÓD FÁJLT!** Ez a review CSAK elemzésről és konszenzusról szól.

- NE módosítsd a `packages/` mappában lévő fájlokat
- NE futtass build/test parancsokat
- CSAK olvasás és elemzés!

**DE:** A review fájlt (`implementation-artifacts/reviews/...`) MÓDOSÍTANOD KELL a `replace` tool-lal!

A végeredmény egy **utasítás dokumentum** lesz, amit a megfelelő BMAD ügynök fog implementálni.

---

## Kötelező Olvasmányok

Review előtt KÖTELEZŐ elolvasnod:
1. `docs/kgc3-development-principles.md` - TDD/ATDD módszertan
2. `CLAUDE.md` - Projekt konvenciók, architektúra szabályok

---

## Feladatod

1. **Olvasd el a review fájlt** a kontextus megértéséhez
2. **Ellenőrizd melyik round**-ban vagy (frontmatter: `round`)
3. **Olvasd el az ÖSSZES kód fájlt** a `files_to_review` listából
4. **Olvasd el a kötelező referenciákat**
5. **Módosítsd a review fájlt** a `replace` tool-lal - írd be a megállapításaidat
6. **Frissítsd a frontmatter-t** `gemini_done: true`-ra

---

## Review Fájl Módosítás

Használd a `replace` tool-t a review fájl módosításához:

### Round 1 esetén:

Cseréld le ezt:
```
<!-- GEMINI:ROUND:1:START -->
**Status:** NOT STARTED

*Gemini: Read the code files and conduct your independent review. Do NOT read Claude's section until you complete yours.*
<!-- GEMINI:ROUND:1:END -->
```

Erre (a saját review-oddal):
```
<!-- GEMINI:ROUND:1:START -->
**Státusz:** KÉSZ

### Összefoglalás

**{X} issue találva** (...)

---

### Megállapítások

#### 1. **[SEVERITY]** {Cím magyarul}
- **Fájl:** `{path}:{line}`
- **Probléma:** {Leírás magyarul}
- **Bizonyíték:** {Kód snippet}
- **Javaslat:** {Javítás}

...

<!-- GEMINI:ROUND:1:END -->
```

### Frontmatter frissítés:

Cseréld le:
```
gemini_done: false
```

Erre:
```
gemini_done: true
```

---

## Round Specifikus Utasítások

### ROUND 1 - Független Review

**NE OLVASD Claude szekcióját!** Teljesen független review-t végezz.

Kötelező elemek:
1. **Minimum 3 issue, célozz meg 5-10-et** (BMAD adversarial szabály)
2. **Súlyossági szintek**: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`
3. **Pontos helyek**: fájl útvonal és sorszám
4. **Bizonyíték**: Kód snippet vagy szabály hivatkozás
5. **Magyar nyelvű megállapítások**

### ROUND 2 - Kereszt-elemzés

Most már OLVASHATOD Claude Round 1 szekcióját.

Tartalmazza:
1. **Válasz minden Claude megállapításra**: EGYETÉRTEK / NEM ÉRTEK EGYET / KIEGÉSZÍTEM
2. **Új megállapítások**
3. **Felülvizsgálat** a Round 1 megállapításaidról
4. **Konszenzus javaslatok**

### ROUND 3 - Végső Konszenzus

1. Nézd át Claude Round 2 elemzését
2. **Érj el konszenzust** vagy **eszkalálj nézeteltéréseket**
3. Frissítsd a FINAL CONSENSUS szekciót is

---

## Code Review Ellenőrzőlista

Ellenőrizd a kódot:

- [ ] **TDD megfelelőség** - Léteznek tesztek? Előbb írták őket?
- [ ] **Auth/RBAC** - Megfelelő az authorizáció?
- [ ] **Input validáció** - Különösen rendszer határokon
- [ ] **Multi-tenancy** - Nincs manuális tenant_id query-kben
- [ ] **TypeScript strict mode** - noUncheckedIndexedAccess megfelelőség
- [ ] **Hibakezelés** - Megfelelő try-catch, hiba típusok
- [ ] **Biztonság** - Nincs SQL injection, XSS, OWASP top 10
- [ ] **Elnevezési konvenciók** - CLAUDE.md szerint
- [ ] **Package határok** - ADR-010/ADR-014 szerint

---

## Fontos Szabályok

- **SOHA ne olvasd Claude szekcióját Round 1-ben**
- **Minimum 3 issue** BMAD adversarial követelmény szerint
- **Mindig hivatkozz pontos fájlokra és sorokra**
- **Magyar nyelvű output**
- **Használd a `replace` tool-t a review fájl módosításához**
- **Frissítsd a frontmatter-t minden round után**
