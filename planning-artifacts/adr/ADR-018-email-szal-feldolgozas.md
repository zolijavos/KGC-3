# ADR-018: Email-Szál Feldolgozás (Számlák)

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

A Beszerzési és Pénzügyi modulokhoz szükséges automatikus számlafeldolgozás email-ből. Szállítók különböző időpontokban küldenek szállítólevelet és számlát, ezeket párosítani kell.

### Üzleti Követelmények

1. **Email provider**: Gmail / Google Workspace
2. **Automatizálás**: Hibrid (Gmail Rules + Gmail API)
3. **Email címek**: 2-3 inbox (beszerzés, pénzügy, egyéb)
4. **Számlák**: Szállítólevél vs Számla szétválaszt

ás
5. **OCR**: Papír számlák feldolgozása
6. **Threading**: Email szálak követése

## Döntések

### 1. Email Feldolgozás Platform

**Döntés:** Gmail API + Webhooks + Background worker

**Indoklás:**
- **Gmail API**: Teljes access thread-ekhez, labels, attachments
- **Webhooks (Pub/Sub)**: Real-time email érkezés értesítés
- **Background worker**: Async processing, nem blokkolja API-t

**Architektúra:**

```
Gmail Inbox
    │
    ▼
Gmail API + Pub/Sub Notification
    │
    ▼
NestJS Background Worker (Bull Queue)
    │
    ├──> Email Parser (Subject, From, Body)
    ├──> Attachment Downloader (PDF, image)
    ├──> Thread Matcher (email szál azonosítás)
    ├──> Document Classifier (Számla / Szállítólevél / Egyéb)
    │
    ▼
Database (EmailThread, Invoice, DeliveryNote)
```

**Implementáció:**

```typescript
import { google } from 'googleapis';
import { Queue } from 'bull';

// Gmail API setup
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Email processor queue
@Injectable()
export class EmailProcessorService {
  constructor(
    @InjectQueue('email-processing') private emailQueue: Queue
  ) {}

  // Gmail Pub/Sub webhook handler
  async handleGmailNotification(notification: GmailNotification): Promise<void> {
    const historyId = notification.historyId;

    // Fetch new messages since last history
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: this.lastProcessedHistoryId
    });

    for (const message of history.data.messagesAdded) {
      // Add to processing queue
      await this.emailQueue.add('process-email', {
        messageId: message.id,
        threadId: message.threadId
      });
    }

    this.lastProcessedHistoryId = historyId;
  }
}

// Queue processor
@Processor('email-processing')
export class EmailProcessor {

  @Process('process-email')
  async processEmail(job: Job<EmailJob>): Promise<void> {
    const { messageId, threadId } = job.data;

    // 1. Fetch full message
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    // 2. Parse email
    const parsed = this.parseEmail(message.data);

    // 3. Download attachments
    const attachments = await this.downloadAttachments(message.data);

    // 4. Classify document type
    const classification = await this.classifyDocument(parsed, attachments);

    // 5. Match to thread/megrendelés
    const thread = await this.matchEmailThread(threadId, parsed);

    // 6. Save to database
    if (classification.type === 'szamla') {
      await this.processInvoice(parsed, attachments, thread);
    } else if (classification.type === 'szallitolevel') {
      await this.processDeliveryNote(parsed, attachments, thread);
    }

    // 7. Notify relevant users
    await this.notifyUsers(classification, thread);
  }

  private parseEmail(message: any): ParsedEmail {
    const headers = message.payload.headers;

    return {
      from: headers.find(h => h.name === 'From').value,
      to: headers.find(h => h.name === 'To').value,
      subject: headers.find(h => h.name === 'Subject').value,
      date: new Date(headers.find(h => h.name === 'Date').value),
      body: this.extractBody(message.payload),
      threadId: message.threadId
    };
  }

  private async classifyDocument(
    parsed: ParsedEmail,
    attachments: Attachment[]
  ): Promise<DocumentClassification> {

    // Keyword-based classification
    const subject = parsed.subject.toLowerCase();
    const body = parsed.body.toLowerCase();

    if (subject.includes('számla') || subject.includes('invoice')) {
      return { type: 'szamla', confidence: 0.9 };
    }

    if (subject.includes('szállítólevél') || subject.includes('delivery')) {
      return { type: 'szallitolevel', confidence: 0.9 };
    }

    // OCR-based classification (if PDF attached)
    if (attachments.length > 0) {
      const ocrText = await this.ocrService.extractText(attachments[0].path);

      if (ocrText.includes('SZÁMLA') || ocrText.includes('Számlaszám')) {
        return { type: 'szamla', confidence: 0.85 };
      }
    }

    return { type: 'egyeb', confidence: 0.5 };
  }

  private async matchEmailThread(
    threadId: string,
    parsed: ParsedEmail
  ): Promise<EmailThread> {

    // Check if thread exists
    let thread = await this.emailThreadRepo.findOne({ where: { gmailThreadId: threadId } });

    if (!thread) {
      // New thread - try to match to Megrendelés
      const megrendelesMatch = await this.matchToMegrendeles(parsed);

      thread = await this.emailThreadRepo.save({
        gmailThreadId: threadId,
        subject: parsed.subject,
        supplier: this.extractSupplier(parsed.from),
        megrendelesId: megrendelesMatch?.id,
        messages: []
      });
    }

    // Add message to thread
    thread.messages.push({
      messageId: parsed.messageId,
      from: parsed.from,
      date: parsed.date,
      hasAttachment: parsed.attachments.length > 0
    });

    await this.emailThreadRepo.save(thread);

    return thread;
  }
}
```

**Alternatívák (elutasítva):**

- **IMAP polling**: Lassú, nem real-time
- **Outlook API**: Nem használjuk Outlookot
- **SendGrid/Mailgun**: Email küldés, nem fogadás

---

### 2. Thread Matching (Szállítólevél + Számla Párosítás)

**Döntés:** Gmail Thread ID + Subject parsing + Megrendelés szám matching

**Indoklás:**
- **Gmail Thread ID**: Automatikus, reliable
- **Subject parsing**: Megrendelésszám keresése
- **Supplier detection**: Email cím alapján

**Implementáció:**

```typescript
async matchToMegrendeles(parsed: ParsedEmail): Promise<Megrendeles | null> {
  // 1. Extract order number from subject/body
  const orderNumberRegex = /(?:megrendelés|rendelés|order)[:\s#]*([A-Z0-9-]+)/i;
  const match = parsed.subject.match(orderNumberRegex) || parsed.body.match(orderNumberRegex);

  if (match) {
    const orderNumber = match[1];
    return await this.megrendelesRepo.findOne({ where: { megrendelesSzam: orderNumber } });
  }

  // 2. Match by supplier + date range
  const supplier = await this.supplierRepo.findOne({
    where: { email: parsed.from }
  });

  if (supplier) {
    // Find recent megrendelés from this supplier (last 30 days)
    return await this.megrendelesRepo.findOne({
      where: {
        szallitoId: supplier.id,
        megrendesedatum: Between(
          subDays(new Date(), 30),
          new Date()
        ),
        statusz: Not(In(['lezarva', 'torolt']))
      },
      order: { megrendelesDatum: 'DESC' }
    });
  }

  return null;
}
```

---

### 3. Gmail Rules (Pre-filtering)

**Döntés:** Gmail filters auto-labeling + API processing

**Indoklás:**
- **Rules**: Egyszerű routing (szállító → label)
- **API**: Complex logic (threading, classification)

**Gmail Filter setup:**

```
Filter 1: Makita számlák
  From: *@makita.hu
  Has attachment: true
  Apply label: "KGC/Beszerzés/Makita"

Filter 2: Bosch számlák
  From: *@bosch.com
  Has attachment: true
  Apply label: "KGC/Beszerzés/Bosch"

Filter 3: Pénzügy inbox
  To: penzugy@kgc.hu
  Apply label: "KGC/Pénzügy"
```

**API integration:**

```typescript
async getEmailsByLabel(labelName: string): Promise<EmailMessage[]> {
  const label = await gmail.users.labels.list({ userId: 'me' });
  const labelId = label.data.labels.find(l => l.name === labelName)?.id;

  const messages = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [labelId],
    q: 'is:unread'
  });

  return messages.data.messages || [];
}
```

---

## Következmények

### Pozitív

1. ✅ **Real-time**: Pub/Sub azonnal értesít
2. ✅ **Automatic threading**: Gmail thread követés
3. ✅ **Scalable**: Background queue processing
4. ✅ **Reliable**: Gmail infrastruktúra

### Negatív

1. ⚠️ **Gmail API quota**: 250 quota units/user/second
   - **Mitigáció**: Rate limiting, batch requests

2. ⚠️ **Subject parsing**: Nem mindig reliable
   - **Mitigáció**: Manual matching UI adminoknak

---

**Referenciák**: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q13-Q15)

---

**Utolsó frissítés**: 2025. december 31.
**Készítette**: Winston (Architect Agent)
