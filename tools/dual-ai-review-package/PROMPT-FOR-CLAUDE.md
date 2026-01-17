# Dual-AI Code Review System - Setup Prompt

> **Használat**: Másold be ezt a promptot egy új Claude Code session-be, hogy létrehozza a Dual-AI Review rendszert a projektedben.

---

## PROMPT START

Szeretnék egy **Dual-AI Code Review** rendszert bevezetni ebben a projektben. Ez egy adversarial code review folyamat, ahol két AI (Claude Code + Gemini CLI) független elemzést végez, majd konszenzusra jut.

### A rendszer működése:

```
Round 1: Független review (mindkét AI külön-külön, minimum 3 issue)
    ↓
Round 2: Kereszt-elemzés (mindkét AI látja a másikat, egyetért/nem ért egyet)
    ↓
Round 3: Végső konszenzus (aláírás, implementation instructions)
```

### Amire szükségem van:

1. **Könyvtárstruktúra létrehozása:**
   ```
   implementation-artifacts/reviews/
   ├── dual-ai-review.sh       # Fő orchestrátor script
   ├── create-review.sh        # Review létrehozó helper
   ├── _TEMPLATE.md            # Review dokumentum sablon
   └── README.md               # Használati útmutató

   [prompts könyvtár - pl. _bmad/bmm/prompts/ vagy docs/prompts/]
   ├── code-review-claude.md   # Claude utasítások
   └── code-review-gemini.md   # Gemini utasítások
   ```

2. **Review dokumentum frontmatter struktúra:**
   ```yaml
   ---
   story: "story-id"
   story_file: "path/to/story.md"
   status: round-1 | round-2 | round-3 | completed
   round: 1
   max_rounds: 3
   created: "ISO-8601 timestamp"
   files_to_review:
     - "path/to/file1.ts"
     - "path/to/file2.ts"
   references:
     - "docs/development-principles.md"
   claude_done: false
   gemini_done: false
   ---
   ```

3. **Review szekciók HTML markerekkel:**
   ```markdown
   <!-- CLAUDE:ROUND:1:START -->
   [Claude review tartalma]
   <!-- CLAUDE:ROUND:1:END -->

   <!-- GEMINI:ROUND:1:START -->
   [Gemini review tartalma]
   <!-- GEMINI:ROUND:1:END -->
   ```

4. **Súlyossági szintek:**
   - `[CRITICAL]` - Biztonsági rés, adatvesztés (kötelező javítás)
   - `[HIGH]` - Súlyos bug, teljesítményprobléma (erősen ajánlott)
   - `[MEDIUM]` - Kódminőség, best practice (ajánlott)
   - `[LOW]` - Stílus, dokumentáció (opcionális)

5. **Orchestrátor script követelmények (dual-ai-review.sh):**
   - Review fájl létrehozása: `./dual-ai-review.sh -c <story-id> <fájlok...>`
   - Review futtatása: `./dual-ai-review.sh <review-file.md>`
   - Státusz lekérdezés: `./dual-ai-review.sh -s <review-file.md>`
   - Csak Claude: `./dual-ai-review.sh --claude-only <file>`
   - Csak Gemini: `./dual-ai-review.sh --gemini-only <file>`
   - **FONTOS**: Gemini CLI-t `--yolo` módban kell futtatni a fájlíráshoz!

6. **Claude prompt (code-review-claude.md) tartalma:**
   - NE módosítson kód fájlokat, csak elemzés
   - Kötelező referencia fájlok olvasása (fejlesztési elvek, CLAUDE.md)
   - Minimum 3 issue azonosítása (adversarial követelmény)
   - Pontos fájl:sorszám hivatkozások
   - Round-specifikus utasítások (R1: független, R2: kereszt-elemzés, R3: konszenzus)
   - Frontmatter frissítése minden round után

7. **Gemini prompt (code-review-gemini.md) tartalma:**
   - Használja a `replace` tool-t a review fájl módosításához
   - NE módosítson forráskód fájlokat
   - Magyar nyelvű output
   - Round-specifikus utasítások
   - Frontmatter frissítése: `gemini_done: true`

8. **Review template szekciói:**
   - Review Target (story, files, references)
   - ROUND 1 - Independent Reviews (Claude + Gemini külön)
   - ROUND 2 - Cross-Analysis (egymás review-jának elemzése)
   - ROUND 3 - Consensus (végső megállapodás)
   - FINAL CONSENSUS (összefoglaló, sign-off)
   - IMPLEMENTATION INSTRUCTIONS (fejlesztő számára utasítások)

### Projekt-specifikus információk amiket kérdezz meg:

1. Hol tároljam a review fájlokat? (default: `implementation-artifacts/reviews/`)
2. Hol tároljam a prompt fájlokat? (default: projekt gyökér vagy `_bmad/bmm/prompts/`)
3. Van-e fejlesztési elvek dokumentum amit referenciaként használjak?
4. Milyen nyelven legyenek a review-k? (magyar/angol)
5. Van-e BMAD keretrendszer a projektben?

### Elvárt végeredmény:

Hozd létre az összes fájlt a megfelelő tartalommal, majd adj egy rövid összefoglalót a használatról:
- Új review létrehozása
- Review futtatása
- Státusz ellenőrzés

---

## PROMPT END

---

## Alternatív rövid prompt (ha csak a koncepciót akarod átadni):

```
Szeretnék egy Dual-AI Code Review rendszert (Claude + Gemini) ami:
1. 3 round-os folyamat: független review → kereszt-elemzés → konszenzus
2. Markdown fájlokban tárolódik frontmatter-rel (status tracking)
3. HTML markerekkel jelölt szekciók mindkét AI-nak
4. Bash script az orchestráláshoz (Gemini --yolo módban!)
5. Minimum 3 issue / reviewer (adversarial)
6. Implementation instructions szekció a végén

Kérdezd meg a projekt-specifikus beállításokat és hozd létre a teljes rendszert.
```

---

## Tippek a használathoz:

1. **Új projektben**: Másold be a teljes promptot egy új Claude session-be
2. **Meglévő projektben**: Add hozzá a projekt kontextust (CLAUDE.md, struktúra)
3. **Testreszabás**: Módosítsd a súlyossági szinteket vagy a round számot igény szerint
4. **Nyelv**: Változtasd meg a "magyar" részt ha angol output kell
