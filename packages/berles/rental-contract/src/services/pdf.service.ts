import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from 'pdf-lib';
import {
  Contract,
  ContractVariables,
  PdfGenerationOptions,
} from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - PDF Service
 * Story 15-2: Szerződés PDF Generálás
 *
 * TRADICIONÁLIS fejlesztés + Snapshot testing
 * pdf-lib használata server-side PDF generáláshoz
 */

/** Default PDF options with optional fields properly typed */
interface InternalPdfOptions {
  pageSize: 'A4' | 'LETTER';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  headerLogoPath: string | undefined;
  footerText: string;
  watermark: string | undefined;
}

const DEFAULT_PDF_OPTIONS: InternalPdfOptions = {
  pageSize: 'A4',
  margins: {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50,
  },
  headerLogoPath: undefined,
  footerText: '',
  watermark: undefined,
};

/** A4 page dimensions in points (1 point = 1/72 inch) */
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  LETTER: { width: 612, height: 792 },
};

@Injectable()
export class PdfService {
  /**
   * PDF generálása renderelt template tartalomból
   */
  async generatePdf(
    renderedContent: string,
    contract: Contract,
    options: PdfGenerationOptions = {}
  ): Promise<Uint8Array> {
    const opts: InternalPdfOptions = { ...DEFAULT_PDF_OPTIONS, ...options };
    const pageSize = PAGE_SIZES[opts.pageSize];

    // noUncheckedIndexedAccess guard - validate page size exists
    if (!pageSize) {
      throw new BadRequestException(`Invalid page size: ${opts.pageSize}`);
    }

    // PDF dokumentum létrehozása
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Tartalom sorokra bontása - sanitize for standard fonts
    const sanitizedContent = this.sanitizeForPdf(renderedContent);
    const lines = this.wrapText(
      sanitizedContent,
      font,
      12,
      pageSize.width - opts.margins.left - opts.margins.right
    );

    // Oldalak létrehozása
    let currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
    let yPosition = pageSize.height - opts.margins.top;
    const lineHeight = 16;
    // contentWidth calculated above in wrapText call

    // Fejléc hozzáadása az első oldalhoz
    yPosition = this.addHeader(currentPage, boldFont, contract.contractNumber, opts, pageSize);

    // Vízjel hozzáadása ha van
    if (opts.watermark) {
      this.addWatermark(currentPage, font, opts.watermark, pageSize);
    }

    // Tartalom írása
    for (const line of lines) {
      // Új oldal szükséges?
      if (yPosition < opts.margins.bottom + 50) {
        // Lábléc az aktuális oldalra
        this.addFooter(
          currentPage,
          font,
          opts.footerText,
          pdfDoc.getPageCount(),
          opts,
          pageSize
        );

        // Új oldal
        currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
        yPosition = pageSize.height - opts.margins.top;

        if (opts.watermark) {
          this.addWatermark(currentPage, font, opts.watermark, pageSize);
        }
      }

      // Sor írása
      currentPage.drawText(line, {
        x: opts.margins.left,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= lineHeight;
    }

    // Aláírás szekció
    yPosition = this.addSignatureSection(
      currentPage,
      font,
      boldFont,
      yPosition,
      opts,
      pageSize,
      contract.variables
    );

    // Utolsó oldal láblécje
    this.addFooter(
      currentPage,
      font,
      opts.footerText,
      pdfDoc.getPageCount(),
      opts,
      pageSize
    );

    // PDF mentése
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  /**
   * PDF metaadatok beállítása
   */
  async setPdfMetadata(
    pdfBytes: Uint8Array,
    metadata: {
      title: string;
      author: string;
      subject: string;
      creator: string;
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);

    pdfDoc.setTitle(metadata.title);
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setSubject(metadata.subject);
    pdfDoc.setCreator(metadata.creator);
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    return pdfDoc.save();
  }

  /**
   * Aláírás kép beágyazása PDF-be
   */
  async embedSignatureImage(
    pdfBytes: Uint8Array,
    signatureImageBase64: string,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    if (!lastPage) {
      throw new BadRequestException('PDF has no pages');
    }

    // Base64 dekódolás
    const imageData = this.decodeBase64Image(signatureImageBase64);

    // Kép beágyazása
    let image;
    if (imageData.type === 'png') {
      image = await pdfDoc.embedPng(imageData.data);
    } else {
      image = await pdfDoc.embedJpg(imageData.data);
    }

    // Kép elhelyezése
    lastPage.drawImage(image, {
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
    });

    return pdfDoc.save();
  }

  /**
   * PDF összefűzése (pl. mellékletekkel)
   */
  async mergePdfs(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBytes of pdfBytesList) {
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return mergedPdf.save();
  }

  /**
   * PDF oldalszám lekérdezése
   */
  async getPageCount(pdfBytes: Uint8Array): Promise<number> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Magyar ékezetes karakterek cseréje ASCII megfelelőkre
   * (pdf-lib standard fontok nem támogatják az ékezeteket)
   */
  private sanitizeForPdf(text: string): string {
    const charMap: Record<string, string> = {
      'á': 'a', 'Á': 'A',
      'é': 'e', 'É': 'E',
      'í': 'i', 'Í': 'I',
      'ó': 'o', 'Ó': 'O',
      'ö': 'o', 'Ö': 'O',
      'ő': 'o', 'Ő': 'O',
      'ú': 'u', 'Ú': 'U',
      'ü': 'u', 'Ü': 'U',
      'ű': 'u', 'Ű': 'U',
    };

    return text.split('').map(char => charMap[char] ?? char).join('');
  }

  /**
   * Szöveg tördelése adott szélességre
   */
  private wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const paragraphs = text.split('\n');
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * Fejléc hozzáadása
   */
  private addHeader(
    page: PDFPage,
    boldFont: PDFFont,
    contractNumber: string,
    _opts: InternalPdfOptions,
    pageSize: { width: number; height: number }
  ): number {
    const headerY = pageSize.height - 30;

    // Szerződés szám - sanitized for standard fonts
    page.drawText(`BERLESI SZERZODES`, {
      x: pageSize.width / 2 - 80,
      y: headerY,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Szerzodesszam: ${this.sanitizeForPdf(contractNumber)}`, {
      x: pageSize.width / 2 - 60,
      y: headerY - 25,
      size: 10,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Vízszintes vonal
    page.drawLine({
      start: { x: 50, y: headerY - 40 },
      end: { x: pageSize.width - 50, y: headerY - 40 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    return headerY - 60;
  }

  /**
   * Lábléc hozzáadása
   */
  private addFooter(
    page: PDFPage,
    font: PDFFont,
    footerText: string,
    pageNumber: number,
    opts: InternalPdfOptions,
    pageSize: { width: number; height: number }
  ): void {
    const footerY = opts.margins.bottom - 20;

    // Oldalszám - sanitized
    page.drawText(`${pageNumber}. oldal`, {
      x: pageSize.width / 2 - 20,
      y: footerY,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Extra lábléc szöveg
    if (footerText) {
      page.drawText(footerText, {
        x: opts.margins.left,
        y: footerY - 12,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  /**
   * Vízjel hozzáadása
   */
  private addWatermark(
    page: PDFPage,
    font: PDFFont,
    watermark: string,
    pageSize: { width: number; height: number }
  ): void {
    page.drawText(watermark, {
      x: pageSize.width / 2 - 100,
      y: pageSize.height / 2,
      size: 60,
      font: font,
      color: rgb(0.9, 0.9, 0.9),
      rotate: degrees(-45),
      opacity: 0.3,
    });
  }

  /**
   * Aláírás szekció hozzáadása
   */
  private addSignatureSection(
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    yPosition: number,
    opts: InternalPdfOptions,
    pageSize: { width: number; height: number },
    variables: ContractVariables
  ): number {
    let y = yPosition - 40;

    // Szekció cím - sanitized for standard fonts
    page.drawText('ALAIRASOK', {
      x: opts.margins.left,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 30;

    // Két oszlop: Bérbeadó és Bérlő
    const colWidth = (pageSize.width - opts.margins.left - opts.margins.right) / 2;
    const leftCol = opts.margins.left;
    const rightCol = opts.margins.left + colWidth;

    // Bérbeadó - sanitized
    page.drawText('Berbeado:', {
      x: leftCol,
      y: y,
      size: 10,
      font: boldFont,
    });
    page.drawText(this.sanitizeForPdf(variables.companyName), {
      x: leftCol,
      y: y - 15,
      size: 10,
      font: font,
    });

    // Bérlő - sanitized
    page.drawText('Berlo:', {
      x: rightCol,
      y: y,
      size: 10,
      font: boldFont,
    });
    page.drawText(this.sanitizeForPdf(variables.partnerName), {
      x: rightCol,
      y: y - 15,
      size: 10,
      font: font,
    });

    y -= 60;

    // Aláírás vonalak
    page.drawLine({
      start: { x: leftCol, y: y },
      end: { x: leftCol + colWidth - 30, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: rightCol, y: y },
      end: { x: rightCol + colWidth - 30, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    y -= 15;

    page.drawText('(alairas, pecset)', {
      x: leftCol + 30,
      y: y,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText('(alairas)', {
      x: rightCol + 50,
      y: y,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= 30;

    // Dátum és hely - sanitized
    page.drawText(`Kelt: __________________, ${this.sanitizeForPdf(variables.currentDate)}`, {
      x: opts.margins.left,
      y: y,
      size: 10,
      font: font,
    });

    return y - 20;
  }

  /**
   * Base64 kép dekódolása
   */
  private decodeBase64Image(base64: string): { data: Uint8Array; type: 'png' | 'jpg' } {
    let data: string;
    let type: 'png' | 'jpg' = 'png';

    if (base64.startsWith('data:image/png;base64,')) {
      data = base64.replace('data:image/png;base64,', '');
      type = 'png';
    } else if (base64.startsWith('data:image/jpeg;base64,') || base64.startsWith('data:image/jpg;base64,')) {
      data = base64.replace(/data:image\/jpe?g;base64,/, '');
      type = 'jpg';
    } else {
      data = base64;
    }

    // Base64 to Uint8Array
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return { data: bytes, type };
  }
}
