# Dual-AI Code Reviews

Ez a könyvtár tartalmazza a Dual-AI (Claude + Gemini) adversarial code review dokumentumokat.

## Gyors használat

```bash
# Új review létrehozása
./dual-ai-review.sh -c <story-id> <fájlok...>

# Review futtatása
./dual-ai-review.sh epic-1/<story-id>-review.md

# Státusz ellenőrzés
./dual-ai-review.sh -s epic-1/<story-id>-review.md
```

## Könyvtárstruktúra

```
reviews/
├── dual-ai-review.sh     # Fő orchestrátor script
├── create-review.sh      # Review létrehozó
├── _TEMPLATE.md          # Review template
├── README.md             # Ez a fájl
└── epic-1/               # Epic könyvtár
    ├── 1-1-story-review.md
    └── 1-2-story-review.md
```

## Review Folyamat

```
Round 1: Független review
├── Claude: Elemzés (min. 3 issue)
└── Gemini: Elemzés (min. 3 issue)
    ↓
Round 2: Kereszt-elemzés
├── Claude: Gemini review értékelése
└── Gemini: Claude review értékelése
    ↓
Round 3: Konszenzus
├── Végső issue lista
└── Mindkét AI sign-off
    ↓
Implementation Instructions
└── Fejlesztő számára utasítások
```

## Parancsok

| Parancs | Leírás |
|---------|--------|
| `./dual-ai-review.sh -c ID files...` | Új review létrehozása |
| `./dual-ai-review.sh file.md` | Review futtatása |
| `./dual-ai-review.sh -s file.md` | Státusz |
| `./dual-ai-review.sh --claude-only file.md` | Csak Claude |
| `./dual-ai-review.sh --gemini-only file.md` | Csak Gemini |
| `./dual-ai-review.sh --dry-run file.md` | Teszt futtatás |

## Súlyossági szintek

- **CRITICAL**: Biztonsági rés, kötelező javítás
- **HIGH**: Súlyos bug, erősen ajánlott
- **MEDIUM**: Kódminőség, ajánlott
- **LOW**: Dokumentáció, opcionális

## Output fájlok

Minden review után:
- `*-review.md` - Fő review dokumentum
- `*-review.status` - Időbélyegek
- `*-review.status.claude.log` - Claude log
- `*-review.status.gemini.log` - Gemini log
