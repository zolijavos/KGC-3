# Dual-AI Code Review Guide

## AI Party-Mode BMAD Procedúra

Két mesterséges intelligencia (Claude + Gemini) **adversarial** kód review rendszere, amely konszenzus alapú döntéshozatalt biztosít emberi beavatkozás nélkül.

---

## Előnyök

### Miért két AI?

| Előny | Leírás |
|-------|--------|
| **Adversarial megközelítés** | Két független AI találja meg a hibákat, nem egy |
| **Nincs confirmation bias** | Az AI-ok nem ismerik egymás véleményét az 1. körben |
| **Konszenzus alapú** | Csak az elfogadott problémák kerülnek javításra |
| **Objektív értékelés** | Nincs személyes elfogultság vagy csapatdinamika |
| **Automatizálható** | Teljes folyamat futtatható script-ből |
| **Dokumentált eredmény** | Minden döntés nyomon követhető a review fájlban |

### Mit talál meg, amit egy AI nem?

- **Ellentmondó interpretációk**: Ha Claude és Gemini másképp értelmez valamit, az valószínűleg nem egyértelmű
- **Prioritási különbségek**: Az egyik CRITICAL-nak, a másik MEDIUM-nak láthat valamit → valódi súlyozás
- **Rejtett hibák**: Amit az egyik átnéz, a másik megtalálhatja
- **Pattern különbségek**: Más-más kódolási mintákat ismernek fel

---

## Folyamat

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUND 1                                         │
│                        Független Review-k                                    │
├──────────────────────────────┬──────────────────────────────────────────────┤
│           CLAUDE             │              GEMINI                           │
│    (NEM olvassa Gemini-t)    │       (NEM olvassa Claude-ot)                │
│              │               │                 │                             │
│              ▼               │                 ▼                             │
│      Független elemzés       │         Független elemzés                     │
│      Min. 3-10 issue         │         Min. 3-10 issue                       │
│              │               │                 │                             │
│              ▼               │                 ▼                             │
│      Publikálás              │         Publikálás                            │
└──────────────────────────────┴──────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUND 2                                         │
│                         Kereszt-elemzés                                      │
├──────────────────────────────┬──────────────────────────────────────────────┤
│           CLAUDE             │              GEMINI                           │
│    Olvassa Gemini R1-et      │       Olvassa Claude R1-et                   │
│              │               │                 │                             │
│              ▼               │                 ▼                             │
│   AGREE / DISAGREE / EXPAND  │      AGREE / DISAGREE / EXPAND               │
│   minden Gemini issue-ra     │      minden Claude issue-ra                  │
│              │               │                 │                             │
│              ▼               │                 ▼                             │
│    Konszenzus javaslat       │       Konszenzus javaslat                    │
└──────────────────────────────┴──────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROUND 3                                         │
│                         Végső Konszenzus                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│   Mindkét reviewer véglegesíti:                                              │
│   ✓ Elfogadott issue-k (CRITICAL / HIGH / MEDIUM / LOW)                     │
│   ✓ Nézeteltérések (ha vannak → eszkaláció)                                 │
│   ✓ Action item-ek                                                          │
│   ✓ Sign-off                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION INSTRUCTIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│   Ajánlott BMAD ügynök kiválasztása:                                        │
│   - /bmad:bmm:agents:dev       → Kód implementáció                          │
│   - /bmad:bmm:agents:architect → Architektúra változtatás                   │
│   - /bmad:bmm:agents:tea       → Teszt javítás/bővítés                      │
│                                                                              │
│   Pontos utasítások az ügynöknek a konszenzus alapján                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fontos szabályok

1. **NINCS KÓD MÓDOSÍTÁS** a review során - csak elemzés és konszenzus
2. **Minimum 3-10 issue** reviewer-enként (BMAD adversarial követelmény)
3. **Maximum 3 kör** - utána eszkaláció
4. **Frontmatter frissítés** minden kör után
5. **Development principles** referencia minden review-ban

---

## Automatizáció

### `dual-ai-review.sh` - Fő Orchestrator

```bash
# Helye: implementation-artifacts/reviews/dual-ai-review.sh

# Alap használat - teljes review futtatás
./dual-ai-review.sh epic-1/1-2-token-refresh-review.md

# Story-k listázása
./dual-ai-review.sh -l
./dual-ai-review.sh --list

# Review létrehozása és indítása egyben
./dual-ai-review.sh -c 1-3-logout packages/core/auth/src/services/*.ts

# Teljes epic review
./dual-ai-review.sh -e 1
./dual-ai-review.sh --epic 2

# Státusz ellenőrzés
./dual-ai-review.sh -s epic-1/1-2-token-refresh-review.md
./dual-ai-review.sh --status epic-1/1-2-token-refresh-review.md

# Dry-run (parancsok mutatása futtatás nélkül)
./dual-ai-review.sh --dry-run epic-1/1-2-token-refresh-review.md

# Csak egy AI futtatása (debug)
./dual-ai-review.sh --claude-only epic-1/1-2-token-refresh-review.md
./dual-ai-review.sh --gemini-only epic-1/1-2-token-refresh-review.md

# Párhuzamos futtatás
./dual-ai-review.sh --parallel epic-1/1-2-token-refresh-review.md

# Futó folyamat leállítása
./dual-ai-review.sh --stop
```

### Háttérben futtatás

```bash
# nohup használatával
nohup ./dual-ai-review.sh -e 1 > review-epic-1.log 2>&1 &

# Folyamat követése
tail -f review-epic-1.log

# Leállítás
./dual-ai-review.sh --stop
```

### Output fájlok

```
implementation-artifacts/reviews/epic-1/
├── 1-2-token-refresh-review.md           # Fő review dokumentum
├── 1-2-token-refresh-review.status       # Végrehajtási időbélyegek
├── 1-2-token-refresh-review.status.claude.log  # Claude teljes output
└── 1-2-token-refresh-review.status.gemini.log  # Gemini teljes output
```

---

## Telepítés Bármely BMAD Projektbe

### 1. Szükséges fájlok másolása

```bash
# Projekt gyökérből
mkdir -p _bmad/bmm/prompts
mkdir -p implementation-artifacts/reviews

# Prompt fájlok
cp SOURCE/_bmad/bmm/prompts/code-review-claude.md _bmad/bmm/prompts/
cp SOURCE/_bmad/bmm/prompts/code-review-gemini.md _bmad/bmm/prompts/

# Review infrastruktúra
cp SOURCE/implementation-artifacts/reviews/_TEMPLATE.md implementation-artifacts/reviews/
cp SOURCE/implementation-artifacts/reviews/create-review.sh implementation-artifacts/reviews/
cp SOURCE/implementation-artifacts/reviews/dual-ai-review.sh implementation-artifacts/reviews/
cp SOURCE/implementation-artifacts/reviews/README.md implementation-artifacts/reviews/

# Futtathatóvá tétel
chmod +x implementation-artifacts/reviews/*.sh
```

### 2. Prompt fájlok testreszabása

Szerkesztd a `_bmad/bmm/prompts/code-review-*.md` fájlokat:

```markdown
## Required Reading First

Before ANY code review, you MUST read these files:
1. `docs/YOUR-DEVELOPMENT-PRINCIPLES.md`  # <-- Projekt specifikus
2. `CLAUDE.md`                             # <-- Projekt specifikus
```

### 3. Template testreszabása

Szerkesztd a `implementation-artifacts/reviews/_TEMPLATE.md` fájlt:

```yaml
references:
  - "docs/YOUR-DEVELOPMENT-PRINCIPLES.md"  # <-- Projekt specifikus
  - "CLAUDE.md"
```

### 4. Minimum követelmények

| Követelmény | Verzió |
|-------------|--------|
| **Claude Code CLI** | Legújabb |
| **Gemini CLI** | Legújabb |
| **Bash** | 4.0+ |
| **Internet** | Stabil kapcsolat |

Telepítés:
```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Gemini CLI
# (Google dokumentáció szerint)
```

---

## Multi-LLM Tesztelés Kiterjesztése

### Jelenlegi támogatott AI-k

- **Claude** (Anthropic) - `claude --print`
- **Gemini** (Google) - `gemini`

### Új AI hozzáadása

1. Új prompt fájl létrehozása:
```bash
cp _bmad/bmm/prompts/code-review-claude.md _bmad/bmm/prompts/code-review-gpt.md
```

2. Prompt testreszabása az AI-hoz

3. Template bővítése:
```markdown
## GPT Independent Review
<!-- GPT:ROUND:1:START -->
**Status:** NOT STARTED
<!-- GPT:ROUND:1:END -->
```

4. Frontmatter bővítése:
```yaml
claude_done: false
gemini_done: false
gpt_done: false  # Új
```

5. Script bővítése (`dual-ai-review.sh`):
```bash
run_gpt() {
    local review_file="$1"
    local round="$2"
    # GPT CLI hívás
}
```

### Lehetséges kiterjesztések

| AI | CLI Tool | Státusz |
|----|----------|---------|
| Claude | `claude` | ✅ Támogatott |
| Gemini | `gemini` | ✅ Támogatott |
| GPT-4 | `gpt` | 🔄 Tervezés alatt |
| Mistral | `mistral` | 🔄 Tervezés alatt |
| Llama | `ollama` | 🔄 Tervezés alatt |

---

## BMAD Workflow Integráció

### Code Review Workflow indítása

```bash
/bmad:bmm:workflows:code-review 1-2-token-refresh
```

Ez a workflow:
1. Létrehozza a review fájlt (ha nem létezik)
2. Claude elvégzi a Round 1-et
3. Vár a Gemini-re (user indítja)
4. Folytatja a Round 2-3-at

### Teljes automatizált integráció

A `dual-ai-review.sh` script önállóan is futtatható a workflow nélkül:

```bash
# Egy lépésben: létrehozás + teljes review
./dual-ai-review.sh -c 1-2-token-refresh packages/core/auth/src/services/*.ts
```

---

## Gyakori Kérdések

### Mi történik ha bezárom a terminált?

- **Normál futtatás**: A folyamat leáll
- **nohup futtatás**: A folyamat folytatódik háttérben
- **Újraindítás**: A script a frontmatter alapján folytatja ahol abbahagyta

### Hogyan állítom le a folyamatot?

```bash
./dual-ai-review.sh --stop
```

Ez a PID fájl alapján leállítja a futó review-t.

### Mi a minimum ami kell a futtatáshoz?

1. Egy terminál
2. Internet kapcsolat
3. Claude CLI + Gemini CLI telepítve
4. Review fájl létrehozva

### Mikor használjam a dry-run módot?

- Első használat előtt, hogy lássad mi fog történni
- Debug célból
- Parancsok másolásához manuális futtatáshoz

---

## Összefoglalás

A Dual-AI Code Review rendszer:
- **Adversarial** megközelítéssel több hibát talál
- **Konszenzus alapú** döntéshozatalt biztosít
- **Automatizálható** bash script-tel
- **Bővíthető** további AI-kkal
- **Integrálható** bármely BMAD projektbe

A végeredmény mindig egy **implementációs utasítás dokumentum**, amit a megfelelő BMAD ügynök (`/bmad:bmm:agents:dev`, `/bmad:bmm:agents:architect`, vagy `/bmad:bmm:agents:tea`) hajt végre.
