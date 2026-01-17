# Dual-AI Code Review Package

**Adversarial Code Review rendszer Claude Code + Gemini CLI használatával**

Ez a csomag lehetővé teszi, hogy bármely projektben bevezess egy kétlépcsős, AI-alapú kód review folyamatot, ahol két különböző AI (Claude és Gemini) független elemzést végez, majd konszenzusra jut.

## Előfeltételek

### Kötelező

1. **Claude Code CLI** (Anthropic)
   ```bash
   npm install -g @anthropic-ai/claude-code
   # vagy
   brew install claude-code
   ```

2. **Gemini CLI** (Google)
   ```bash
   npm install -g @anthropic-ai/gemini-cli
   # vagy
   pip install gemini-cli
   ```

3. **Bash 4.0+**
   ```bash
   bash --version
   ```

### Ajánlott

- Git repository (a review fájlok verziókövetéséhez)
- BMAD keretrendszer (opcionális, de ajánlott workflow integrációhoz)

## Telepítés

### Gyors telepítés

```bash
# Klónozd vagy másold a package-et a projektedbe
cp -r dual-ai-review-package /path/to/your/project/tools/

# Futtasd a telepítőt
cd /path/to/your/project
./tools/dual-ai-review-package/install.sh
```

### Manuális telepítés

1. **Hozd létre a könyvtárstruktúrát:**
   ```bash
   mkdir -p implementation-artifacts/reviews
   mkdir -p _bmad/bmm/prompts  # vagy tetszőleges prompt könyvtár
   ```

2. **Másold a fájlokat:**
   ```bash
   cp scripts/dual-ai-review.sh implementation-artifacts/reviews/
   cp scripts/create-review.sh implementation-artifacts/reviews/
   cp templates/_TEMPLATE.md implementation-artifacts/reviews/
   cp templates/README.md implementation-artifacts/reviews/
   cp prompts/code-review-claude.md _bmad/bmm/prompts/
   cp prompts/code-review-gemini.md _bmad/bmm/prompts/
   ```

3. **Állítsd be a jogosultságokat:**
   ```bash
   chmod +x implementation-artifacts/reviews/*.sh
   ```

4. **Konfiguráld a projekt-specifikus útvonalakat** a `dual-ai-review.sh`-ban.

## Konfiguráció

### Alapbeállítások

Szerkeszd a `dual-ai-review.sh` fájlt:

```bash
# Projekt gyökér (automatikusan detektálja a git root-ot)
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Prompt fájlok elérési útjai
CLAUDE_PROMPT_FILE="$PROJECT_ROOT/_bmad/bmm/prompts/code-review-claude.md"
GEMINI_PROMPT_FILE="$PROJECT_ROOT/_bmad/bmm/prompts/code-review-gemini.md"

# Review könyvtár
REVIEWS_DIR="$PROJECT_ROOT/implementation-artifacts/reviews"
```

### Fejlesztési elvek integrálása

A hatékony review-hoz ajánlott létrehozni egy `docs/development-principles.md` fájlt, amely tartalmazza:

- TDD/ATDD módszertan leírása
- Kódolási konvenciók
- Architektúra szabályok
- Biztonsági követelmények

## Használat

### 1. Review létrehozása

```bash
cd implementation-artifacts/reviews

# Új review létrehozása
./dual-ai-review.sh -c <story-id> <fájlok...>

# Példa
./dual-ai-review.sh -c user-auth packages/auth/src/*.ts
```

### 2. Review futtatása

```bash
# Teljes automatikus review (mindkét AI)
./dual-ai-review.sh epic-1/user-auth-review.md

# Csak Claude
./dual-ai-review.sh --claude-only epic-1/user-auth-review.md

# Csak Gemini (--yolo mode szükséges a fájlíráshoz!)
./dual-ai-review.sh --gemini-only epic-1/user-auth-review.md

# Státusz ellenőrzés
./dual-ai-review.sh -s epic-1/user-auth-review.md
```

### 3. Review folyamat

```
Round 1: Független review (Claude + Gemini párhuzamosan)
    ↓
Round 2: Kereszt-elemzés (mindkét AI látja a másikat)
    ↓
Round 3: Konszenzus (véglegesítés, aláírás)
    ↓
Implementation Instructions (fejlesztő számára)
```

## Review Fájl Struktúra

```yaml
---
story: "story-id"
story_file: "path/to/story.md"
status: round-1 | round-2 | round-3 | completed
round: 1
max_rounds: 3
files_to_review:
  - "packages/module/src/file1.ts"
  - "packages/module/src/file2.ts"
references:
  - "docs/development-principles.md"
claude_done: false
gemini_done: false
---
```

## Súlyossági Szintek

| Szint | Leírás | Művelet |
|-------|--------|---------|
| **CRITICAL** | Biztonsági rés, adatvesztés | Kötelező javítás |
| **HIGH** | Súlyos bug, teljesítményprobléma | Erősen ajánlott |
| **MEDIUM** | Kódminőség, best practice | Ajánlott |
| **LOW** | Stílus, dokumentáció | Opcionális |

## Testreszabás

### Prompt testreszabása

Szerkeszd a `prompts/code-review-*.md` fájlokat:

```markdown
# Code Review Instructions

## Projekt-specifikus szabályok
- [Add hozzá a saját szabályaidat]

## Ellenőrzőlista
- [ ] TDD megfelelőség
- [ ] Biztonsági szempontok
- [ ] [Saját szempontok]
```

### Template testreszabása

Szerkeszd a `templates/_TEMPLATE.md` fájlt a saját igényeid szerint.

## Hibakeresés

### Gemini nem tud fájlt írni

**Megoldás:** Használd a `--yolo` flaget:
```bash
gemini --yolo "prompt..."
```

A script automatikusan ezt használja.

### Claude timeout

**Megoldás:** Növeld a timeout értéket:
```bash
CLAUDE_TIMEOUT=300 ./dual-ai-review.sh ...
```

### MCP Server hiba

**Megoldás:** A `--yolo` mode megkerüli az MCP szervert, így ez nem szükséges.

## BMAD Integráció (opcionális)

Ha BMAD keretrendszert használsz:

```bash
# Workflow-ból
/bmad:bmm:workflows:code-review <story-id>

# Agent-ből
/bmad:bmm:agents:dev
# majd másold be az implementation instructions-t
```

## Licensz

MIT License - szabadon használható és módosítható.

## Készítők

- Claude Code (Anthropic) + Gemini CLI (Google) Dual-AI Review System
- Fejlesztve: KGC ERP projekt keretében
