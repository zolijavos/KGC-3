# ADR-019: OCR Megoldás Számlákhoz

## Státusz

**ELF

OGADVA** - 2025. december 31.

## Kontextus

Papíralapú számlák feldolgozása szükséges, amelyeket szkennelve vagy fotózva kapunk. Az OCR automatikusan kinyeri a számla adatokat.

### Üzleti Követelmények

1. **OCR accuracy**: > 95% pontosság számla adatoknál
2. **Supported formats**: PDF, JPG, PNG
3. **Extracted fields**: Számlaszám, dátum, összeg, ÁFA, szállító
4. **Language**: Magyar + Angol számlák
5. **Integration**: Email-ből vagy manual upload

## Döntések

### 1. OCR Platform

**Döntés:** Google Cloud Vision API (Document AI)

**Indoklás:**
- **Managed service**: Nincs model training
- **Invoice parser**: Beépített számla template
- **Magyar támogatás**: Natív magyar OCR
- **Ökoszisztéma**: Konzisztens Google stack-kel
- **Pricing**: Kedvező (első 1000 page/hónap ingyenes)

**Implementáció:**

```typescript
import vision from '@google-cloud/vision';

@Injectable()
export class OCRService {
  private client: vision.ImageAnnotatorClient;

  constructor() {
    this.client = new vision.ImageAnnotatorClient();
  }

  async extractInvoiceData(
    file: Buffer | string
  ): Promise<InvoiceOCRResult> {

    // Document Text Detection
    const [result] = await this.client.documentTextDetection(file);
    const fullText = result.fullTextAnnotation.text;

    // Parse with regex patterns
    const parsed = this.parseInvoiceFields(fullText);

    // Confidence scoring
    const confidence = this.calculateConfidence(parsed);

    return {
      rawText: fullText,
      szamlaszam: parsed.szamlaszam,
      datum: parsed.datum,
      teljesitesiDatum: parsed.teljesitesiDatum,
      bruttoOsszeg: parsed.bruttoOsszeg,
      nettoOsszeg: parsed.nettoOsszeg,
      afa: parsed.afa,
      szallito: parsed.szallito,
      confidence: confidence,
      requiresManualReview: confidence < 0.9
    };
  }

  private parseInvoiceFields(text: string): Partial<Invoice> {
    const result: Partial<Invoice> = {};

    // Számlaszám pattern (több variáció)
    const szamlaszamPatterns = [
      /számlaszám[:\s]+([A-Z0-9\-\/]+)/i,
      /invoice\s+number[:\s]+([A-Z0-9\-\/]+)/i,
      /számla\s+sz\.[:\s]+([A-Z0-9\-\/]+)/i
    ];

    for (const pattern of szamlaszamPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.szamlaszam = match[1].trim();
        break;
      }
    }

    // Dátum pattern
    const datumPattern = /(\d{4}[-\.]\d{2}[-\.]\d{2})|(\d{2}[-\.]\d{2}[-\.]\d{4})/g;
    const dates = text.match(datumPattern);
    if (dates && dates.length > 0) {
      result.datum = this.parseDate(dates[0]);
      result.teljesitesiDatum = dates.length > 1 ? this.parseDate(dates[1]) : result.datum;
    }

    // Összeg pattern
    const osszegPattern = /(?:bruttó|összesen|total)[:\s]*([\d\s]+(?:[.,]\d{2})?)\s*(?:Ft|HUF)?/i;
    const osszegMatch = text.match(osszegPattern);
    if (osszegMatch) {
      result.bruttoOsszeg = this.parseAmount(osszegMatch[1]);
    }

    // ÁFA pattern
    const afaPattern = /(?:áfa|vat)[:\s]*([\d\s]+(?:[.,]\d{2})?)/i;
    const afaMatch = text.match(afaPattern);
    if (afaMatch) {
      result.afa = this.parseAmount(afaMatch[1]);
      result.nettoOsszeg = result.bruttoOsszeg - result.afa;
    }

    return result;
  }

  private calculateConfidence(parsed: Partial<Invoice>): number {
    let score = 0;
    const weights = {
      szamlaszam: 0.3,
      datum: 0.2,
      bruttoOsszeg: 0.3,
      afa: 0.1,
      szallito: 0.1
    };

    if (parsed.szamlaszam) score += weights.szamlaszam;
    if (parsed.datum) score += weights.datum;
    if (parsed.bruttoOsszeg) score += weights.bruttoOsszeg;
    if (parsed.afa) score += weights.afa;
    if (parsed.szallito) score += weights.szallito;

    return score;
  }
}
```

**Alternatívák (elutasítva):**

- **Tesseract (open-source)**: Alacsonyabb accuracy (~85%)
- **AWS Textract**: Drágább, kevésbé jó magyar támogatás
- **Azure Form Recognizer**: Vendor lock-in, költség

---

### 2. Manual Review Workflow

**Döntés:** Admin approval ha confidence < 90%

**Implementáció:**

```typescript
async processScannedInvoice(
  file: Express.Multer.File,
  uploadedBy: string
): Promise<Invoice> {

  // OCR processing
  const ocrResult = await this.ocrService.extractInvoiceData(file.buffer);

  if (ocrResult.confidence >= 0.9) {
    // Auto-approve
    return await this.invoiceRepo.save({
      ...ocrResult,
      status: 'auto_approved',
      processedBy: 'ocr_auto'
    });
  } else {
    // Manual review required
    return await this.invoiceRepo.save({
      ...ocrResult,
      status: 'pending_review',
      requiresManualReview: true,
      uploadedBy: uploadedBy
    });
  }
}
```

---

## Következmények

**Pozitív:**
- ✅ Gyors feldolgozás (< 5 sec/számla)
- ✅ Magas accuracy (> 95%)
- ✅ Managed service

**Negatív:**
- ⚠️ API költség (~$1.50 / 1000 page után)
  - **Mitigáció**: Cache, batch processing

---

**Referenciák**: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q19)

---

**Készítette**: Winston (Architect Agent)
