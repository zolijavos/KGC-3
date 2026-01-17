# Dual-AI Code Review - Teljes Prompt

> Másold be ezt a promptot egy Claude Code session-be a rendszer teljes létrehozásához.

---

Implementálj egy **Dual-AI Adversarial Code Review** rendszert ebben a projektben.

## Specifikáció

### Folyamat
```
Round 1: Független review (Claude + Gemini külön, min. 3 issue/AI)
Round 2: Kereszt-elemzés (egymás review-jának értékelése)
Round 3: Konszenzus (végső lista, mindkét AI sign-off)
```

### Könyvtárak
```
implementation-artifacts/reviews/     # Review dokumentumok
├── dual-ai-review.sh                # Orchestrátor
├── create-review.sh                 # Helper
├── _TEMPLATE.md                     # Sablon
├── README.md                        # Docs
└── epic-N/                          # Epic könyvtárak
    └── story-id-review.md

_bmad/bmm/prompts/                   # (vagy docs/prompts/)
├── code-review-claude.md
└── code-review-gemini.md
```

### Review YAML Frontmatter
```yaml
---
story: "story-id"
story_file: "path/to/story.md"
status: round-1 | round-2 | round-3 | completed
round: 1
max_rounds: 3
created: "2024-01-01T00:00:00Z"
files_to_review:
  - "src/file1.ts"
references:
  - "docs/principles.md"
claude_done: false
gemini_done: false
---
```

### HTML Markerek (round szekciók)
```markdown
<!-- CLAUDE:ROUND:1:START -->
**Status:** KÉSZ
### Megállapítások
#### 1. **[HIGH]** Issue neve
- **Fájl:** `file.ts:42`
- **Probléma:** Leírás
- **Javaslat:** Javítás
<!-- CLAUDE:ROUND:1:END -->

<!-- GEMINI:ROUND:1:START -->
...
<!-- GEMINI:ROUND:1:END -->
```

### Súlyosság
- `[CRITICAL]` - Security, adatvesztés → kötelező
- `[HIGH]` - Súlyos bug → erősen ajánlott
- `[MEDIUM]` - Kódminőség → ajánlott
- `[LOW]` - Dokumentáció → opcionális

### dual-ai-review.sh Script

```bash
#!/usr/bin/env bash
# Parancsok:
# -c story-id files...  → Új review létrehozása
# file.md               → Review futtatása
# -s file.md            → Státusz
# --claude-only file    → Csak Claude
# --gemini-only file    → Csak Gemini
# --dry-run             → Teszt

# FONTOS: Gemini CLI-t --yolo módban futtatni!
gemini --yolo "prompt..."
```

Funkciók:
1. Frontmatter parsing (yq/awk)
2. Round kezelés (advance_round)
3. Claude futtatás (claude -p "prompt")
4. Gemini futtatás (gemini --yolo "prompt")
5. Status fájl írás (.status, .claude.log, .gemini.log)

### Claude Prompt (code-review-claude.md)

```markdown
# Claude Code Review Instructions

## KRITIKUS: NINCS KÓD MÓDOSÍTÁS!
- NE használd az Edit/Write tool-t
- CSAK olvasás és elemzés

## Kötelező olvasmány
1. docs/development-principles.md
2. CLAUDE.md

## Round 1 - Független Review
- NE olvasd Gemini szekcióját
- Minimum 3 issue (BMAD adversarial)
- Pontos fájl:sorszám hivatkozás

## Round 2 - Kereszt-elemzés
- Olvasd Gemini Round 1-et
- Válasz: EGYETÉRTEK / NEM ÉRTEK EGYET / KIEGÉSZÍTEM

## Round 3 - Konszenzus
- Végső lista
- Sign-off

## Frontmatter frissítés minden round után
claude_done: true
```

### Gemini Prompt (code-review-gemini.md)

```markdown
# Gemini Code Review Utasítások

## KRITIKUS: NINCS KÓD MÓDOSÍTÁS!
- NE módosíts forráskódot
- DE: A review fájlt MÓDOSÍTANOD KELL a `replace` tool-lal!

## Kötelező olvasmány
1. docs/development-principles.md
2. CLAUDE.md

## Round 1 - Független Review
- NE olvasd Claude szekcióját
- Minimum 3 issue
- Magyar nyelv

## Módosítás
Használd: replace tool
- Cseréld a GEMINI:ROUND:N markert
- Frissítsd: gemini_done: true
```

### Template Szekciók

1. **Review Target** - story, files, references
2. **ROUND 1** - Independent Reviews (Claude + Gemini)
3. **ROUND 2** - Cross-Analysis
4. **ROUND 3** - Consensus
5. **FINAL CONSENSUS** - Status: AGREED, Agreed Issues, Sign-off
6. **IMPLEMENTATION INSTRUCTIONS** - Agent, feladatok, acceptance criteria

---

## Teendők

1. Hozd létre a könyvtárstruktúrát
2. Írd meg a dual-ai-review.sh scriptet (teljes funkcionalitás)
3. Írd meg a create-review.sh helper scriptet
4. Készítsd el a _TEMPLATE.md sablont
5. Készítsd el a Claude promptot
6. Készítsd el a Gemini promptot
7. Írj README.md dokumentációt
8. Állítsd be a jogosultságokat (chmod +x *.sh)

## Kérdések

Mielőtt elkezded, kérdezd meg:
1. Prompt fájlok helye? (default: `_bmad/bmm/prompts/`)
2. Van fejlesztési elvek dokumentum?
3. Nyelv? (magyar/angol)
4. Projekt neve a promptokban?

---

Kezd el a létrehozást!
