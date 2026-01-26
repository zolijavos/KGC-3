/**
 * Report Exporter Service
 * Epic 27: Story 27-2 - Részletes Riportok (AC1: Export)
 *
 * Exports reports to CSV, PDF, and Excel formats.
 */

import { IReportColumn, IReportExporter, IReportResult } from '@kgc/reporting';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReportExporterService implements IReportExporter {
  private readonly logger = new Logger(ReportExporterService.name);

  /**
   * Export report to CSV format
   */
  async exportToCsv(result: IReportResult): Promise<Buffer> {
    const { columns, data } = result;

    // Build CSV header
    const header = columns.map((col: IReportColumn) => this.escapeCsvValue(col.header)).join(',');

    // Build CSV rows
    const rows = data.map((row: Record<string, unknown>) =>
      columns
        .map((col: IReportColumn) => {
          const value = row[col.field] as string | number | boolean | null | undefined;
          return this.escapeCsvValue(this.formatValue(value, col));
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Export report to PDF format
   * Uses a simple text-based PDF (no external dependencies for now)
   */
  async exportToPdf(result: IReportResult): Promise<Buffer> {
    const { reportName, columns, data, summary, generatedAt } = result;

    // Simple PDF structure (PDF 1.4)
    const objects: string[] = [];
    let objectCount = 0;

    const addObject = (content: string): number => {
      objectCount++;
      objects.push(`${objectCount} 0 obj\n${content}\nendobj\n`);
      return objectCount;
    };

    // Build page content
    const lines: string[] = [];
    lines.push(`BT`);
    lines.push(`/F1 16 Tf`);
    lines.push(`50 800 Td`);
    lines.push(`(${this.escapePdfString(reportName)}) Tj`);
    lines.push(`/F1 10 Tf`);
    lines.push(`0 -20 Td`);
    lines.push(`(Generálva: ${generatedAt.toLocaleString('hu-HU')}) Tj`);
    lines.push(`0 -30 Td`);

    // Headers
    let xPos = 0;
    for (const col of columns.slice(0, 5)) {
      // Limit columns for PDF
      lines.push(`${xPos} 0 Td`);
      lines.push(`(${this.escapePdfString(col.header)}) Tj`);
      xPos = 100;
    }
    lines.push(`-${xPos * (columns.length - 1)} -15 Td`);

    // Data rows (limit to first 50 for PDF)
    for (const row of data.slice(0, 50)) {
      xPos = 0;
      for (const col of columns.slice(0, 5)) {
        const value = this.formatValue(row[col.field], col);
        lines.push(`${xPos} 0 Td`);
        lines.push(`(${this.escapePdfString(String(value).slice(0, 20))}) Tj`);
        xPos = 100;
      }
      lines.push(`-${xPos * (columns.length - 1)} -12 Td`);
    }

    // Summary
    if (summary && Object.keys(summary).length > 0) {
      lines.push(`0 -20 Td`);
      lines.push(`/F1 12 Tf`);
      lines.push(`(Összesítés:) Tj`);
      lines.push(`/F1 10 Tf`);
      for (const [key, value] of Object.entries(summary)) {
        lines.push(`0 -15 Td`);
        lines.push(`(${this.escapePdfString(key)}: ${this.formatNumber(Number(value))}) Tj`);
      }
    }

    lines.push(`ET`);
    const content = lines.join('\n');

    // PDF objects
    addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
    addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
    addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`
    );
    addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

    // Build PDF
    const header = `%PDF-1.4\n`;
    const body = objects.join('\n');
    const xrefOffset = header.length + body.length;
    const xref = [
      `xref`,
      `0 ${objectCount + 1}`,
      `0000000000 65535 f `,
      ...objects.map((_, i) => {
        const offset = header.length + objects.slice(0, i).join('\n').length;
        return `${String(offset).padStart(10, '0')} 00000 n `;
      }),
    ].join('\n');
    const trailer = `\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(header + body + xref + trailer, 'utf-8');
  }

  /**
   * Export report to Excel format (XLSX)
   * Uses Office Open XML format
   */
  async exportToExcel(result: IReportResult): Promise<Buffer> {
    const { reportName, columns, data, summary } = result;

    // Build sheet XML
    const rows: string[] = [];

    // Header row
    rows.push(`<row r="1">`);
    columns.forEach((col: IReportColumn, i: number) => {
      const cellRef = this.getCellRef(i, 0);
      rows.push(
        `<c r="${cellRef}" t="inlineStr"><is><t>${this.escapeXml(col.header)}</t></is></c>`
      );
    });
    rows.push(`</row>`);

    // Data rows
    data.forEach((row: Record<string, unknown>, rowIndex: number) => {
      rows.push(`<row r="${rowIndex + 2}">`);
      columns.forEach((col: IReportColumn, colIndex: number) => {
        const cellRef = this.getCellRef(colIndex, rowIndex + 1);
        const value = row[col.field];

        if (typeof value === 'number') {
          rows.push(`<c r="${cellRef}" t="n"><v>${value}</v></c>`);
        } else {
          rows.push(
            `<c r="${cellRef}" t="inlineStr"><is><t>${this.escapeXml(String(value ?? ''))}</t></is></c>`
          );
        }
      });
      rows.push(`</row>`);
    });

    // Summary rows
    if (summary && Object.keys(summary).length > 0) {
      const summaryRowStart = data.length + 3;
      rows.push(
        `<row r="${summaryRowStart}"><c r="A${summaryRowStart}" t="inlineStr"><is><t>Összesítés</t></is></c></row>`
      );

      Object.entries(summary).forEach(([key, value], i) => {
        const rowNum = summaryRowStart + i + 1;
        rows.push(
          `<row r="${rowNum}">` +
            `<c r="A${rowNum}" t="inlineStr"><is><t>${this.escapeXml(key)}</t></is></c>` +
            `<c r="B${rowNum}" t="n"><v>${value}</v></c>` +
            `</row>`
        );
      });
    }

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.join('')}</sheetData>
</worksheet>`;

    // For now, return a simple XML that Excel can open
    // A full XLSX would require ZIP packaging
    this.logger.debug(`Generated Excel XML for report: ${reportName}`);

    return Buffer.from(sheetXml, 'utf-8');
  }

  private escapeCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?'); // Replace non-ASCII with ?
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatValue(
    value: string | number | boolean | null | undefined,
    column: IReportColumn
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (column.type) {
      case 'currency':
        return this.formatCurrency(Number(value));
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      case 'number':
        return this.formatNumber(Number(value));
      case 'date':
        return new Date(String(value)).toLocaleDateString('hu-HU');
      default:
        return String(value);
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('hu-HU').format(value);
  }

  private getCellRef(col: number, row: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let colRef = '';
    let colNum = col;

    while (colNum >= 0) {
      colRef = letters[colNum % 26] + colRef;
      colNum = Math.floor(colNum / 26) - 1;
    }

    return `${colRef}${row + 1}`;
  }
}
