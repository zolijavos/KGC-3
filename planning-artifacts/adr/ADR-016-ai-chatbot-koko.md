# ADR-016: AI Chatbot (Koko) Architektúra

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

A KGC ERP rendszer fejlesztése során felmerült az igény egy többcsatornás AI chatbot (kód név: "Koko") implementálására, amely önállóan tanuló asszisztenst biztosít az ügyfélszolgálati folyamatokhoz.

### Üzleti Követelmények

1. **Multi-channel támogatás**: Discord, Email, Web interface
2. **Teljes tudásbázis**: Bérlés, Szerviz, Pénzügy, Termékinformációk
3. **Önálló tanulás**: Admin jóváhagyásos learning loop
4. **Multi-language**: Magyar + Angol támogatás
5. **Integráció**: Chatwoot support rendszerrel eszkaláció esetén

### Technikai Korlátok

- Managed service preferált (minimális ops teher)
- Költséghatékony megoldás
- Gyors válaszidő (< 2 másodperc)
- Skálázható (100+ egyidejű user)

## Döntések

### 1. AI Platform Választás

**Döntés:** Google Gemini Flash API

**Indoklás:**
- **Managed service**: Nincs model hosting, training infrastructure overhead
- **Költséghatékony**: Gemini Flash optimalizált ár/teljesítmény arány
- **Gyors válaszidő**: < 1 másodperc átlagos latency
- **Multi-modal**: Később image recognition kiterjesztés lehetséges
- **Ökoszisztéma konzisztencia**: KGC rendszer már használ Google szolgáltatásokat (Gmail, Cloud Storage)
- **Magyar nyelv támogatás**: Natív magyar language model

**Implementáció:**

```typescript
// Gemini Flash API client inicializálás
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,  // Kreatív, de kontrollált
    maxOutputTokens: 500,
    topP: 0.9
  }
});

// Intent detection + response generation
async function processUserQuery(
  query: string,
  language: 'hu' | 'en',
  context: ConversationContext
): Promise<KokoResponse> {
  const prompt = buildPrompt(query, language, context);
  const result = await model.generateContent(prompt);
  return parseResponse(result.response.text());
}
```

**Alternatívák (elutasítva):**

- **OpenAI GPT-4**: Drágább, külső US provider, GDPR kérdések
- **Saját hosted model (LLaMA)**: Túl nagy ops teher, infrastruktúra költség
- **Azure OpenAI**: Vendor lock-in, kevésbé költséghatékony

---

### 2. Architektúra Pattern

**Döntés:** Hibrid architektúra (Managed AI + Saját tudásbázis + Admin approval loop)

**Indoklás:**
- **Control**: Tudásbázis KGC-specifikus, nem publikus AI knowledge
- **Biztonság**: Admin jóváhagyás biztosítja a válaszok minőségét
- **Tanulás**: Folyamatos improvement user feedback alapján
- **Offline fallback**: Cached responses ha API nem elérhető

**Architektúra diagram (koncepcionális):**

```
┌─────────────────────────────────────────────────────────────┐
│                     KOKO CHATBOT RENDSZER                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Discord    │      │    Email     │      │     Web      │
│   Webhook    │──────│   Gateway    │──────│   Interface  │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Koko Router     │
                    │  (NestJS Service) │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐   ┌─────────▼────────┐   ┌───────▼──────┐
│ Intent        │   │  Gemini Flash    │   │  Knowledge   │
│ Classifier    │   │  API Client      │   │  Base (DB)   │
└───────┬───────┘   └─────────┬────────┘   └───────┬──────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Response Builder │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐   ┌─────────▼────────┐   ┌───────▼──────┐
│  Confidence   │   │   Admin Queue    │   │   Chatwoot   │
│  > 80%        │   │   (Manual        │   │  Escalation  │
│  AUTO SEND    │   │   Approval)      │   │  (Human)     │
└───────────────┘   └──────────────────┘   └──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Learning Loop    │
                    │  (Approved → KB)  │
                    └───────────────────┘
```

**Implementáció flow:**

```typescript
// Main conversation handler
async function handleUserMessage(
  message: string,
  channel: 'discord' | 'email' | 'web',
  userId: string,
  language: 'hu' | 'en'
): Promise<void> {

  // 1. Intent classification
  const intent = await classifyIntent(message, language);

  // 2. Knowledge Base keresés
  const kbResults = await searchKnowledgeBase(intent, language);

  // 3. Gemini Flash query építés
  const prompt = buildContextualPrompt({
    userMessage: message,
    intent: intent,
    kbContext: kbResults,
    language: language
  });

  // 4. AI válasz generálás
  const aiResponse = await model.generateContent(prompt);
  const confidence = calculateConfidence(aiResponse);

  // 5. Döntési logika
  if (confidence > 0.8) {
    // AUTO SEND - magas bizalom
    await sendResponse(channel, userId, aiResponse.text);
    await logInteraction(userId, message, aiResponse, 'auto_approved');

  } else if (confidence > 0.5) {
    // MANUAL APPROVAL - közepes bizalom
    await queueForApproval({
      userId,
      message,
      aiResponse,
      confidence,
      channel
    });
    await sendResponse(channel, userId,
      'Köszönöm a kérdést! Kollégáim hamarosan válaszolnak.');

  } else {
    // ESCALATE - alacsony bizalom
    await escalateToChatwoot(channel, userId, message);
    await logInteraction(userId, message, null, 'escalated');
  }
}

// Admin approval workflow
async function processApproval(
  interactionId: string,
  approved: boolean,
  adminId: string,
  editedResponse?: string
): Promise<void> {
  const interaction = await getInteraction(interactionId);

  if (approved) {
    // Küldés usernek
    await sendResponse(
      interaction.channel,
      interaction.userId,
      editedResponse || interaction.aiResponse
    );

    // Tudásbázis frissítés
    await updateKnowledgeBase({
      question: interaction.message,
      answer: editedResponse || interaction.aiResponse,
      intent: interaction.intent,
      language: interaction.language,
      approvedBy: adminId
    });

    await logInteraction(interaction.userId, interaction.message,
      editedResponse || interaction.aiResponse, 'manual_approved');

  } else {
    // Elutasítás - eszkaláció
    await escalateToChatwoot(
      interaction.channel,
      interaction.userId,
      interaction.message
    );
    await logInteraction(interaction.userId, interaction.message,
      null, 'rejected_escalated');
  }
}
```

**Alternatívák (elutasítva):**

- **Teljes AI automata (no approval)**: Túl kockázatos, hibás válaszok
- **Csak tudásbázis (no AI)**: Túl merev, nem skálázható
- **Rule-based chatbot**: Nem tanuló, korlátozott scope

---

### 3. Tudásbázis Struktúra

**Döntés:** Strukturált PostgreSQL + Vector Embeddings (pgvector)

**Indoklás:**
- **Relational adatok**: FAQ, kategóriák, approval workflow
- **Semantic search**: Vector embeddings intent matching-hez
- **Egy adatbázis**: Nem kell külön vector DB (Pinecone, Weaviate)
- **Költséghatékony**: Ingyenes, már használjuk PostgreSQL-t

**Implementáció:**

```sql
-- Knowledge Base táblák

-- Kategóriák
CREATE TABLE kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES kb_categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tudásbázis bejegyzések
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES kb_categories(id) NOT NULL,
  language CHAR(2) NOT NULL, -- 'hu', 'en'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  intent VARCHAR(100),
  confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
  embedding VECTOR(768), -- Gemini embedding dimension
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Interakciók log (learning)
CREATE TABLE kb_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'discord', 'email', 'web'
  language CHAR(2) NOT NULL,
  question TEXT NOT NULL,
  ai_response TEXT,
  confidence DECIMAL(3,2),
  status VARCHAR(20) NOT NULL, -- 'auto_approved', 'manual_approved', 'rejected', 'escalated'
  approved_by UUID REFERENCES users(id),
  kb_article_id UUID REFERENCES kb_articles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic search index
CREATE INDEX ON kb_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Semantic search implementáció:**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Embedding generálás Gemini-vel
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// Tudásbázis keresés vector similarity alapján
async function searchKnowledgeBase(
  query: string,
  language: 'hu' | 'en',
  limit: number = 5
): Promise<KBArticle[]> {

  // Query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Vector similarity search (cosine similarity)
  const results = await db.query(`
    SELECT
      id,
      question,
      answer,
      intent,
      confidence_threshold,
      1 - (embedding <=> $1::vector) AS similarity
    FROM kb_articles
    WHERE language = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `, [JSON.stringify(queryEmbedding), language, limit]);

  return results.rows;
}
```

**Alternatívák (elutasítva):**

- **Pinecone/Weaviate**: Extra költség, külön infrastruktúra
- **Elasticsearch**: Túl komplex, nincs vector search natívan
- **Flat JSON file**: Nem skálázható, nincs semantic search

---

### 4. Multi-Language Stratégia

**Döntés:** Language detection + Dual knowledge base (Magyar + Angol)

**Indoklás:**
- **User experience**: Automatikus nyelv detektálás
- **Tudásbázis duplikáció**: Minden bejegyzés magyarul ÉS angolul
- **Prompt engineering**: Nyelvspecifikus promptok
- **Fallback**: Ha egy nyelven nincs válasz, próbálja a másikat

**Implementáció:**

```typescript
// Nyelv detektálás (Gemini beépített)
async function detectLanguage(text: string): Promise<'hu' | 'en'> {
  // Heuristic: magyar karakterek (ő, ű, stb.)
  if (/[áéíóöőúüű]/i.test(text)) return 'hu';

  // Gemini API language detection
  const prompt = `Detect the language of this text. Reply ONLY with 'hu' or 'en'.\nText: "${text}"`;
  const result = await model.generateContent(prompt);
  const lang = result.response.text().trim().toLowerCase();

  return lang === 'hu' ? 'hu' : 'en';
}

// Dual-language response
async function getResponseInLanguage(
  query: string,
  detectedLang: 'hu' | 'en'
): Promise<string> {

  let kbResults = await searchKnowledgeBase(query, detectedLang);

  // Fallback másik nyelvre ha nincs találat
  if (kbResults.length === 0) {
    const fallbackLang = detectedLang === 'hu' ? 'en' : 'hu';
    kbResults = await searchKnowledgeBase(query, fallbackLang);

    if (kbResults.length > 0) {
      // Translate response back to detected language
      return await translateResponse(kbResults[0].answer, fallbackLang, detectedLang);
    }
  }

  // Gemini prompt nyelvspecifikus
  const systemPrompt = detectedLang === 'hu'
    ? 'Te a KGC ügyfélszolgálati asszisztense vagy. Válaszolj magyarul, udvariasan és szakszerűen.'
    : 'You are KGC customer service assistant. Answer in English, politely and professionally.';

  const prompt = `${systemPrompt}\n\nQuestion: ${query}\n\nContext: ${JSON.stringify(kbResults)}`;
  const result = await model.generateContent(prompt);

  return result.response.text();
}
```

**Alternatívák (elutasítva):**

- **Csak magyar**: Nem skálázható, nemzetközi ügyfelek kizárása
- **Automatikus fordítás minden esetben**: Minőségi problémák, kontextus vesztés
- **Manuális nyelvválasztás**: Rossz UX

---

### 5. Admin Approval Workflow

**Döntés:** Single-level approval (Admin user)

**Indoklás:**
- **Egyszerűség**: 1 approval elég a KGC méretéhez
- **Gyorsaság**: Nincs multi-stage bottleneck
- **Felelősség**: Egyértelmű decision maker
- **Skálázhatóság**: Később bővíthető multi-level-re

**Implementáció:**

```typescript
// Admin dashboard API endpoint
@Controller('admin/koko')
export class KokoAdminController {

  @Get('pending-approvals')
  @Roles('admin')
  async getPendingApprovals(
    @Query('language') language?: 'hu' | 'en',
    @Query('limit') limit: number = 20
  ): Promise<PendingApproval[]> {

    return await this.kokoService.getPendingApprovals({
      status: 'pending_approval',
      language: language,
      limit: limit,
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post('approve/:interactionId')
  @Roles('admin')
  async approveResponse(
    @Param('interactionId') interactionId: string,
    @Body() body: { editedResponse?: string },
    @CurrentUser() admin: User
  ): Promise<void> {

    await this.kokoService.processApproval(
      interactionId,
      true, // approved
      admin.id,
      body.editedResponse
    );
  }

  @Post('reject/:interactionId')
  @Roles('admin')
  async rejectResponse(
    @Param('interactionId') interactionId: string,
    @CurrentUser() admin: User
  ): Promise<void> {

    await this.kokoService.processApproval(
      interactionId,
      false, // rejected
      admin.id
    );
  }
}
```

**Alternatívák (elutasítva):**

- **Multi-level approval**: Túl lassú, overkill a KGC-hez
- **Automatikus jóváhagyás minden esetben**: Kockázatos
- **Crowdsourced approval**: Komplex, minőségi problémák

---

## Következmények

### Pozitív

1. ✅ **Managed service**: Minimális ops overhead
2. ✅ **Költséghatékony**: Gemini Flash kedvező pricing
3. ✅ **Gyors implementáció**: Kevés infrastruktúra setup
4. ✅ **Skálázható**: Google infrastruktúra
5. ✅ **Tanulás**: Folyamatos KB improvement
6. ✅ **Multi-language**: Magyar + Angol natív támogatás
7. ✅ **Integráció**: Egyszerű Chatwoot eszkálá

ció

### Negatív / Kockázatok

1. ⚠️ **Vendor lock-in**: Google Gemini API függőség
   - **Mitigáció**: Abstraction layer, könnyen cserélhető provider

2. ⚠️ **API költség**: Token-based pricing, nagy forgalom drága lehet
   - **Mitigáció**: Caching, rate limiting, confidence threshold optimalizálás

3. ⚠️ **Latency**: Külső API hívás 500ms-1s késleltetés
   - **Mitigáció**: Async processing, response streaming

4. ⚠️ **GDPR**: User adatok Gemini API-ba kerülnek
   - **Mitigáció**: Adatvédelmi egyeztetés, user consent, data masking

5. ⚠️ **Hallucináció**: AI hamis információkat adhat
   - **Mitigáció**: Admin approval, confidence threshold, KB validáció

---

## Implementációs Timeline

**Fázis 1 (MVP - 2 hét):**
- Gemini Flash API integráció
- Alapvető intent classification
- PostgreSQL KB táblák
- Web channel (egyszerű chat interface)
- Admin approval dashboard

**Fázis 2 (3-4 hét):**
- Discord bot integráció
- Email gateway
- Vector embeddings (pgvector)
- Semantic search
- Multi-language support

**Fázis 3 (5-6 hét):**
- Learning loop automatizálás
- Chatwoot eszkálálás
- Analytics dashboard
- Performance optimalizálás

---

## Referenciák

- Mary Analyst jelentés: `docs/analysis/Kerdes-Valaszok-2025-12-30.md`
- Követelmény elemzés: `docs/analysis/Transcript-Kovetelmeny-Elemzes-2025-12-30.md`
- Google Gemini docs: https://ai.google.dev/gemini-api/docs
- pgvector: https://github.com/pgvector/pgvector

---

**Utolsó frissítés**: 2025. december 31.
**Készítette**: Winston (Architect Agent)
**Jóváhagyta**: Javo!
