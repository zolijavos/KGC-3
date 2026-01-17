# Dual-AI Review - Gyors Telepítési Útmutató

## 1. Előfeltételek

```bash
# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Gemini CLI
npm install -g @google/gemini-cli
# vagy: pip install gemini-cli
```

## 2. Telepítés

```bash
# Másold a package-et a projektedbe
cp -r dual-ai-review-package /path/to/project/tools/

# Futtasd a telepítőt
cd /path/to/project
./tools/dual-ai-review-package/install.sh .
```

## 3. Első Review

```bash
cd implementation-artifacts/reviews

# Review létrehozása
./dual-ai-review.sh -c my-feature src/services/*.ts

# Review futtatása
./dual-ai-review.sh epic-1/my-feature-review.md
```

## 4. Parancsok

| Parancs | Leírás |
|---------|--------|
| `-c ID files` | Új review |
| `-s file` | Státusz |
| `--claude-only` | Csak Claude |
| `--gemini-only` | Csak Gemini |

## 5. Folyamat

```
Round 1 → Round 2 → Round 3 → Implementation
(független)  (kereszt)  (konszenzus)  (utasítások)
```

## Hibaelhárítás

**Gemini nem ír fájlt?**
→ A script automatikusan `--yolo` módban fut

**Claude timeout?**
→ `CLAUDE_TIMEOUT=300 ./dual-ai-review.sh ...`

## Részletes dokumentáció

Lásd: [README.md](README.md)
