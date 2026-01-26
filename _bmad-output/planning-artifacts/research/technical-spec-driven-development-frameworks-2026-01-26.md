---
stepsCompleted: [1, 2, 3]
inputDocuments: []
workflowType: 'research'
lastStep: 3
research_type: 'technical'
research_topic: 'Spec-Driven Development Frameworks'
research_goals: 'BMAD vs GitHub Spec Kit vs Amazon Kiro összehasonlítás'
user_name: 'Javo!'
date: '2026-01-26'
web_research_enabled: true
source_verification: true
---

# Technical Research: Spec-Driven Development Frameworks

**Dátum:** 2026-01-26
**Szerző:** Javo!
**Kutatás típusa:** Technical Research

---

## Executive Summary

A "vibe coding" problémára válaszul 2025-ben három meghatározó spec-driven development (SDD) keretrendszer jelent meg: **BMAD Method**, **GitHub Spec Kit** és **Amazon Kiro**. Mindhárom ugyanazt a problémát célozza - az AI kódolási asszisztensek megbízhatatlanságát strukturálatlan promptoknál - de radikálisan eltérő megközelítéssel.

**🆕 BMAD v6.0.0-Beta.0 (2026. január 26.)** - A mai napon megjelent beta verzió bevezeti a **Scale-Adaptive Intelligence** rendszert (0-4 szintek), amely automatikusan routing-ol a projekt komplexitása alapján - bug fix-től az enterprise megoldásokig. Ez megoldja a korábbi "sledgehammer" kritikát.

**Kulcs megállapítás:** A BMAD Method v6 a legátfogóbb és legrugalmasabb multi-agent keretrendszer:

- **21 specializált ügynök**, 50+ workflow
- **Scale-Adaptive**: Quick Flow (Level 0-1) kis taskokhoz, Full Method (Level 3-4) enterprise-hoz
- **4 modul**: BMM (core), BMB (builder), CIS (creative), Game Dev Studio
- **100% ingyenes**, open source, nincs paywall
- **32k GitHub star**, 4.2k fork, aktív közösség

A GitHub Spec Kit egy könnyű toolkit single-agent guidance-szel, míg az Amazon Kiro egy teljes integrált IDE AWS vendor lock-in-nel.

---

## 1. A Probléma: Vibe Coding és Context Engineering

### 1.1 Mi a Vibe Coding?

A "vibe coding" az a frusztráló minta, amikor homályos ötleteket adunk az AI-nak és reméljük, hogy kitalálja mit akarunk. A probléma nem az AI kódolási képességében van, hanem a kommunikációban - úgy kezeljük az AI-t mint egy mágikus keresőt ahelyett, hogy precíz utasításokat adnánk.

### 1.2 Context Engineering: A Megoldás Alapja

> "Amikor az agentic LLM rendszerek kudarcot vallanak, gyakran nem azért van, mert az alapmodell képtelen rá, hanem mert a modell nem kapta meg a jó döntéshez szükséges kontextust."
> — [Anthropic Engineering Blog](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Context Engineering definíció:** Stratégiák a token-ok (információk) optimális halmazának kurálására és fenntartására LLM inferencia során. Ez túlmutat az egyszeri utasításokon - pipeline-ok és memóriarendszerek építése, amelyek dinamikusan válogatják és összegyűjtik az adatokat több forrásból.

**Négy kulcs stratégia:**

1. **Writing** - külső memória kezelés
2. **Selecting** - releváns információ lekérése
3. **Compressing** - összegzés és vágás
4. **Isolating** - elkülönített workflow-k

**Context Rot probléma:** Az LLM teljesítmény kiszámíthatatlan romlása, ahogy a kontextus hossza nő. A modellek éles pontosság-csökkenést mutathatnak, figyelmen kívül hagyhatják a kontextus részeit, vagy hallucinálhatnak.

---

## 2. BMAD Method - Multi-Agent Orchestration

### 2.1 Áttekintés

A **BMAD (Breakthrough Method for Agile AI-Driven Development)** egy multi-agent keretrendszer, amely szoftverfejlesztési csapatot szimulál specializált AI ügynökökkel.

| Tulajdonság        | Érték                                                 |
| ------------------ | ----------------------------------------------------- |
| **Típus**          | Multi-agent orchestration framework                   |
| **Verziószám**     | **v6.0.0-Beta.0** (2026. január 26.)                  |
| **Közösség**       | 32k+ GitHub star, 4.2k fork, 103 contributor          |
| **Kompatibilitás** | Claude Code, Cursor, Windsurf, Roo Code, Gemini CLI   |
| **Telepítés**      | `npx bmad-method install` (Node.js v20+)              |
| **Dokumentáció**   | [docs.bmad-method.org](https://docs.bmad-method.org/) |

### 2.2 Kulcs Koncepciók

#### Specializált AI Ügynökök (21 db)

- **Analyst Agent** - piackutatás, koncepció validáció
- **Product Manager Agent** - PRD generálás, epic definíciók
- **Architect Agent** - technikai architektúra tervezés
- **Developer Agent** - kód implementáció
- **QA/TEA Agent** - tesztelés, minőségbiztosítás (Test Engineering Architect)
- **Scrum Master Agent** - sprint menedzsment
- **UX Designer Agent** - felhasználói élmény tervezés
- **Tech Writer Agent** - dokumentáció készítés
- - további specializált ügynökök

#### Két-Fázisú Architektúra

1. **Agentic Planning** - specializált ügynökök részletes projekt specifikációkat hoznak létre
2. **Implementation** - kód generálás a specifikációk alapján

#### Docs-as-Code Filozófia

> "A BMAD keretrendszerben a forráskód többé nem az egyetlen igazság forrása - a dokumentáció (PRD-k, architektúra tervek, user story-k) az. A kód csupán downstream derivátuma ezeknek a specifikációknak."

### 2.3 🆕 Scale-Adaptive Intelligence (0-4 Szintek)

**A v6 Beta legfontosabb újdonsága!** Automatikus routing a projekt komplexitása alapján:

| Szint   | Név        | Leírás                                  | Output                              |
| ------- | ---------- | --------------------------------------- | ----------------------------------- |
| **0-1** | Quick Flow | Bug fix, egyszerű feature, tiszta scope | Tech-spec only, 1-2 story, ~45 perc |
| **2**   | Standard   | Közepes feature, több komponens         | PRD + Tech-spec + Stories           |
| **3**   | Complex    | Multi-service, architektúra döntések    | Full planning cycle                 |
| **4**   | Enterprise | Distributed architektúra, multi-repo    | Teljes BMAD Method                  |

> "Amikor futtatod a workflow-init-et, felismeri a 'bug fix' + 'clear scope' kombinációt és Quick Flow-ra irányít. Output: fókuszált tech-spec, egyetlen story 3 acceptance criteria-val."

**Ez megoldja a "sledgehammer" problémát** - kis változtatásokhoz nem kell a teljes enterprise workflow!

### 2.4 v6 Beta Újdonságok (2026. január)

#### Architektúra

- **21 specializált ügynök** (korábban 19)
- **50+ workflow** 4 hivatalos modulban
- **Step-file architektúra** - moduláris workflow lépések
- **Document sharding** - nagy dokumentumok felosztása
- **90% token megtakarítás** a korábbi verziókhoz képest

#### Modul Ökoszisztéma

| Modul                                 | Leírás                         | Státusz        |
| ------------------------------------- | ------------------------------ | -------------- |
| **BMad Method (BMM)**                 | Core framework, 34+ workflow   | ✅ Beta        |
| **BMad Builder (BMB)**                | Custom agent/workflow készítés | ✅ Near-beta   |
| **Creative Intelligence Suite (CIS)** | Innováció, design thinking     | ✅ npm package |
| **Game Dev Studio**                   | Játékfejlesztés workflow-k     | ✅ npm package |

#### Technikai Újítások

- **bmad-help rendszer** - AI-powered guidance, context-aware routing
- **Unified Installer** - közös telepítő minden IDE-hez
- **Astro/Starlight dokumentáció** - Diataxis framework, LLM-friendly
- **260+ fájl** nyelvi támogatással (Spanish, Pirate Speak tesztelve)
- **Trimodal workflow creator** - Create/Validate/Edit módok

#### v6 Beta Stats

- 91 commit az Alpha 23 óta
- 969 fájl változott (+23,716 / -91,509 sor)
- ~67,793 sor nettó csökkentés konszolidációval
- 54 legacy v4 issue lezárva

### 2.5 BMAD Előnyök

| Előny                      | Leírás                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| **Scale-Adaptive**         | 0-4 szint: bug fix-től enterprise-ig automatikus routing                  |
| **Multi-domain**           | Szoftverfejlesztésen túl: kreatív írás, üzleti stratégia, játékfejlesztés |
| **Context isolation**      | Minden ügynök saját kontextussal dolgozik - nincs context rot             |
| **Multi-repo support**     | Komplex, több repository-s projektek kezelése                             |
| **Workflow orchestration** | YAML-alapú, strukturált task menedzsment                                  |
| **IDE-agnosztikus**        | Bármely AI kódolási eszközzel működik                                     |
| **Enterprise-ready**       | Agilis folyamatokba illeszkedik                                           |
| **100% ingyenes**          | Open source, nincs paywall vagy gated content                             |

### 2.6 BMAD Hátrányok

| Hátrány                         | Leírás                                               |
| ------------------------------- | ---------------------------------------------------- |
| **Tanulási görbe**              | Komplex rendszer, időt igényel az elsajátítás        |
| ~~**"Sledgehammer" probléma**~~ | ✅ **MEGOLDVA v6-ban** Quick Flow-val!               |
| **Setup komplexitás**           | Több konfiguráció (de unified installer egyszerűsít) |

---

## 3. GitHub Spec Kit - Lightweight Toolkit

### 3.1 Áttekintés

A **GitHub Spec Kit** egy könnyű, nyílt forráskódú toolkit, amely CLI-t, sablonokat és promptokat biztosít a spec-driven fejlesztéshez.

| Tulajdonság        | Érték                                                            |
| ------------------ | ---------------------------------------------------------------- |
| **Típus**          | CLI toolkit + templates                                          |
| **Bejelentés**     | 2025 szeptember                                                  |
| **Forrás**         | [github.com/github/spec-kit](https://github.com/github/spec-kit) |
| **Kompatibilitás** | GitHub Copilot, Claude Code, Gemini CLI, bármely AI assistant    |

### 3.2 Workflow Fázisok

```
1. Specification → 2. Plan → 3. Tasks → 4. Implement
```

**Parancsok:**

- `/specify` - követelmények definiálása
- `/plan` - implementációs terv készítése
- `/tasks` - feladatok lebontása
- `/implement` - végrehajtás

### 3.3 Kulcs Filozófia

> "A specifikáció az egyetlen igazság forrása, amely az AI ügynököket megbízható szoftver generálásához vezeti."

### 3.4 GitHub Spec Kit Előnyök

| Előny                       | Leírás                              |
| --------------------------- | ----------------------------------- |
| **Alacsony learning curve** | Egyszerű parancsok, gyors indulás   |
| **Tool-agnosztikus**        | Bármely AI asszisztenssel működik   |
| **Lightweight**             | Minimális overhead                  |
| **GitHub integráció**       | Natív GitHub ökoszisztéma támogatás |
| **Open source**             | Testreszabható, bővíthető           |

### 3.5 GitHub Spec Kit Hátrányok

| Hátrány                      | Leírás                                                |
| ---------------------------- | ----------------------------------------------------- |
| **Single-agent**             | Egy AI asszisztenst vezérel, nincs multi-agent        |
| **Lassú workflow**           | Valós tesztek szerint lassabb mint iteratív prompting |
| **Nincs context management** | Nem old meg context rot problémákat                   |
| **Korlátozott scope**        | Csak szoftverfejlesztésre                             |

### 3.6 Kritikus Vélemény

> "A valós tesztekben a Spec-Driven Development workflow lassú, nehézkes volt, és kevésbé hatékony mint az iteratív prompting."
> — [Scott Logic Blog](https://blog.scottlogic.com/2025/11/26/putting-spec-kit-through-its-paces-radical-idea-or-reinvented-waterfall.html)

---

## 4. Amazon Kiro - Full IDE Experience

### 4.1 Áttekintés

Az **Amazon Kiro** egy teljes integrált fejlesztői környezet (IDE), amely a VS Code-ra épül és natívan integrálja a spec-driven fejlesztést.

| Tulajdonság     | Érték                         |
| --------------- | ----------------------------- |
| **Típus**       | Teljes IDE (VS Code fork)     |
| **Preview**     | 2025 július 14                |
| **GA**          | 2025 november 17              |
| **Név eredete** | Japánul "きろ" = keresztút    |
| **Website**     | [kiro.dev](https://kiro.dev/) |

### 4.2 Három Specifikációs Fájl

Kiro három kritikus fájlra épít:

| Fájl                | Tartalom                                           |
| ------------------- | -------------------------------------------------- |
| **requirements.md** | User story-k, acceptance criteria (EARS formátum)  |
| **design.md**       | Technikai architektúra, komponensek, adat modellek |
| **tasks.md**        | Implementációs feladatok checklistája              |

### 4.3 Kulcs Funkciók

#### Agent Hooks

Eseményvezérelt automatizáció - fájl műveletek (létrehozás, mentés, törlés) AI akciókat triggerelnek háttérben (security scan, style check, teszt futtatás).

#### Agent Steering

Projekt-specifikus tudás markdown fájlokban (`.kiro/steering/` mappában):

- `product.md` - termék kontextus
- `tech.md` - technológiai döntések
- `structure.md` - projekt struktúra

#### Multimodal Context

Fájlok, kódbázis, dokumentáció, képek és terminál output feldolgozása MCP (Model Context Protocol) szervereken keresztül.

### 4.4 Autonomous Agent (2025 vége)

- **Persistent context** - munkamenetek között megőrzi a kontextust
- **Multi-repo awareness** - több repository kezelése egységesen
- **Feedback learning** - tanul a PR feedbackből és alkalmazza a jövőben
- **Napokig futó taskok** - komplex feladatok önálló végrehajtása

### 4.5 Kiro Előnyök

| Előny                      | Leírás                                        |
| -------------------------- | --------------------------------------------- |
| **All-in-one**             | Teljes IDE, nem kell külső tooling            |
| **VS Code kompatibilitás** | Meglévő beállítások, témák, pluginok működnek |
| **Agent Hooks**            | Automatizált háttér ellenőrzések              |
| **Enterprise support**     | IAM Identity Center, GitHub issue integráció  |
| **Model választék**        | Claude Sonnet 4.5 vagy Auto (vegyes modellek) |

### 4.6 Kiro Hátrányok

| Hátrány                    | Leírás                      |
| -------------------------- | --------------------------- |
| **Vendor lock-in**         | AWS ökoszisztémához kötött  |
| **Egyetlen workflow**      | Opinionated, nem flexibilis |
| **Overhead kis taskoknál** | "Sledgehammer" probléma     |
| **Preview státusz**        | Még nem teljesen stabil     |

### 4.7 Valós Adoption

> "A Delta Airlines 1,948%-os növekedést ért el a Q Developer adoptációban hat hónap alatt. Kiro spec-driven megközelítése a backlog grooming-ot hatékony design session-ökké alakította."
> — [AWS Case Study](https://www.elite.cloud/post/aws-kiro-explained-the-ai-agentic-ide-that-ends-vibe-coding-chaos-in-2025/)

---

## 5. Összehasonlító Mátrix

### 5.1 Architekturális Különbségek

| Szempont                  | BMAD Method v6                      | GitHub Spec Kit       | Amazon Kiro             |
| ------------------------- | ----------------------------------- | --------------------- | ----------------------- |
| **Típus**                 | Multi-agent framework               | CLI toolkit           | Full IDE                |
| **Agent modell**          | 21 specializált ügynök              | Single-agent guidance | IDE-integrált ügynökök  |
| **Context kezelés**       | Izolált per-agent                   | Nincs                 | Persistent + multimodal |
| **Workflow flexibilitás** | 50+ testreszabható + Quick Flow     | 4 fix lépés           | 1 opinionated flow      |
| **IDE függőség**          | Bármely                             | Bármely               | Saját (VS Code fork)    |
| **Skálázhatóság**         | ✅ 0-4 szint (bug fix → enterprise) | ❌ Fix workflow       | ❌ Fix workflow         |
| **Költség**               | 100% ingyenes                       | Ingyenes              | Freemium (AWS)          |
| **Modulok**               | 4 (BMM, BMB, CIS, Game Dev)         | 1                     | 1                       |

### 5.2 Használati Esetek

| Eset                          | Legjobb választás           | Miért                               |
| ----------------------------- | --------------------------- | ----------------------------------- |
| **Enterprise, agilis csapat** | BMAD (Level 3-4)            | Legteljesebb struktúra, multi-agent |
| **Solo dev, gyors start**     | BMAD Quick Flow (Level 0-1) | Scale-adaptive, 3 parancs elég      |
| **AWS ökoszisztéma**          | Kiro                        | Natív integráció                    |
| **Multi-repo projekt**        | BMAD                        | Context isolation                   |
| **Kreatív/nem-tech domain**   | BMAD + CIS                  | Multi-domain támogatás              |
| **Bug fix, kis feature**      | BMAD Quick Flow             | ✅ v6-ban már nem overkill!         |
| **Játékfejlesztés**           | BMAD + Game Dev Studio      | Specializált workflow-k             |

### 5.3 Context Engineering Képességek

| Képesség                    | BMAD v6              | Spec Kit | Kiro                    |
| --------------------------- | -------------------- | -------- | ----------------------- |
| **Context isolation**       | ✅ Per-agent         | ❌       | ✅ Steering files       |
| **Memory management**       | ✅ Document sharding | ❌       | ✅ Persistent           |
| **Multi-repo**              | ✅                   | ❌       | ✅                      |
| **Token optimization**      | ✅ 90% savings       | ❌       | ⚡ Auto model selection |
| **Context rot prevention**  | ✅                   | ❌       | ✅                      |
| **Scale-adaptive routing**  | ✅ 0-4 szint         | ❌       | ❌                      |
| **bmad-help (AI guidance)** | ✅ Context-aware     | ❌       | ❌                      |

---

## 6. BMAD Szerepe a Context Engineering Ökoszisztémában

### 6.1 Miért Kiemelkedő a BMAD?

1. **Multi-Agent Architektúra**
   - Minden ügynök saját, izolált kontextusban dolgozik
   - Nincs context rot, mert a kontextus nem halmozódik

2. **Document Sharding (v6)**
   - Nagy dokumentumok automatikus felosztása
   - Csak a releváns részletek kerülnek a kontextusba

3. **Workflow Orchestration**
   - YAML-alapú, strukturált lépések
   - Handoff pontok az ügynökök között

4. **Docs-as-Code**
   - Specifikációk az igazság forrása
   - Kód csak derivátum

### 6.2 BMAD vs Konkurencia Context Engineering Szempontból

| Aspektus                   | BMAD Megközelítés          | Konkurencia         |
| -------------------------- | -------------------------- | ------------------- |
| **Kontextus kezelés**      | Izolált ügynökönként       | Globális vagy nincs |
| **Token használat**        | Optimalizált (90% savings) | Nem optimalizált    |
| **Skálázhatóság**          | Multi-repo, enterprise     | Korlátozott         |
| **Hallucináció megelőzés** | Strukturált specifikációk  | Prompt-függő        |

---

## 7. Következtetések

### 7.1 Összegzés

| Framework    | Erősség                                      | Gyengeség                     | Ideális felhasználó                      |
| ------------ | -------------------------------------------- | ----------------------------- | ---------------------------------------- |
| **BMAD v6**  | Scale-adaptive (0-4), multi-agent, 100% free | Tanulási görbe                | **Mindenki** - bug fix-től enterprise-ig |
| **Spec Kit** | Egyszerű, lightweight                        | Korlátozott képességek, lassú | Solo dev, ha BMAD túl komplex            |
| **Kiro**     | All-in-one IDE                               | Vendor lock-in (AWS)          | AWS-centrikus csapatok                   |

### 7.2 Ajánlások (Frissítve v6 Beta alapján)

**Ha enterprise/komplex projekted van:** BMAD Method (Level 3-4) - a multi-agent architektúra és context isolation kritikus nagy projekteknél.

**Ha gyorsan akarsz indulni:** **BMAD Quick Flow (Level 0-1)** - a v6 Scale-Adaptive Intelligence automatikusan egyszerűsíti a workflow-t! 3 parancs, ~45 perc.

**Ha AWS ökoszisztémában dolgozol:** Amazon Kiro - natív integráció, de vendor lock-in.

**Ha kis változtatást/bug fix-et csinálsz:** **BMAD Quick Flow** - a v6-ban már NEM overkill! Automatikusan felismeri és egyszerűsít.

**Ha kreatív/innováció projekted van:** BMAD + Creative Intelligence Suite modul.

---

## Források

### BMAD Method

- [Hivatalos Dokumentáció](https://docs.bmad-method.org/)
- [GitHub - BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- [What is BMAD-METHOD? - Medium](https://medium.com/@visrow/what-is-bmad-method-a-simple-guide-to-the-future-of-ai-driven-development-412274f91419)
- [GMO Research Blog - BMAD Framework](https://recruit.group.gmo/engineer/jisedai/blog/the-bmad-method-a-framework-for-spec-oriented-ai-driven-development/)
- [BMAD v6 Token Savings - Medium](https://medium.com/@hieutrantrung.it/from-token-hell-to-90-savings-how-bmad-v6-revolutionized-ai-assisted-development-09c175013085)
- [BMAD v6 Intellectual Ecosystem - Benny's Mind Hack](https://bennycheung.github.io/bmad-v6-intellectual-ecosystem)

### GitHub Spec Kit

- [GitHub Blog - Spec-Driven Development](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [GitHub Spec Kit Repository](https://github.com/github/spec-kit)
- [Microsoft Developer - Spec Kit Guide](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)
- [Scott Logic - Spec Kit Review](https://blog.scottlogic.com/2025/11/26/putting-spec-kit-through-its-paces-radical-idea-or-reinvented-waterfall.html)

### Amazon Kiro

- [Kiro Official Site](https://kiro.dev/)
- [InfoQ - Kiro Announcement](https://www.infoq.com/news/2025/08/aws-kiro-spec-driven-agent/)
- [TechCrunch - Kiro Autonomous Agent](https://techcrunch.com/2025/12/02/amazon-previews-3-ai-agents-including-kiro-that-can-code-on-its-own-for-days/)
- [AWS re:Post - Kiro Guide](https://repost.aws/articles/AROjWKtr5RTjy6T2HbFJD_Mw/%F0%9F%91%BB-kiro-agentic-ai-ide-beyond-a-coding-assistant-full-stack-software-development-with-spec-driven-ai)

### Context Engineering

- [Anthropic - Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Prompting Guide - Context Engineering](https://www.promptingguide.ai/guides/context-engineering-guide)
- [FlowHunt - Context Engineering 2025](https://www.flowhunt.io/blog/context-engineering/)

### Összehasonlítások

- [Comprehensive SDD Guide - Medium](https://medium.com/@visrow/comprehensive-guide-to-spec-driven-development-kiro-github-spec-kit-and-bmad-method-5d28ff61b9b1)
- [Martin Fowler - SDD Tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [BMAD vs Spec Kit Comparison - Medium](https://medium.com/@visrow/github-spec-kit-vs-bmad-method-a-comprehensive-comparison-part-1-996956a9c653)
