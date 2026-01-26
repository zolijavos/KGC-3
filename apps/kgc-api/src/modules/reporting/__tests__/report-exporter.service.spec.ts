/**
 * Report Exporter Service Tests
 * Epic 27: Story 27-2 - Részletes Riportok (AC1: Export)
 *
 * Tests for CSV, PDF, and Excel export functionality
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ReportExporterService } from '../services/report-exporter.service';

// ============================================
// Mock Types
// ============================================

interface IReportColumn {
  field: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percent';
}

interface IReportResult {
  reportType: string;
  reportName: string;
  columns: IReportColumn[];
  data: Record<string, unknown>[];
  summary: Record<string, number>;
  generatedAt: Date;
}

// ============================================
// Test Suite
// ============================================

describe('ReportExporterService', () => {
  let service: ReportExporterService;

  const mockReportResult: IReportResult = {
    reportType: 'RENTAL_SUMMARY',
    reportName: 'Bérlés összesítő',
    columns: [
      { field: 'date', header: 'Dátum', type: 'date' },
      { field: 'rentalCount', header: 'Bérlések száma', type: 'number' },
      { field: 'totalRevenue', header: 'Bevétel', type: 'currency' },
      { field: 'avgDuration', header: 'Átlag időtartam', type: 'number' },
    ],
    data: [
      { date: '2024-01-15', rentalCount: 15, totalRevenue: 450000, avgDuration: 3.5 },
      { date: '2024-01-16', rentalCount: 22, totalRevenue: 680000, avgDuration: 2.8 },
      { date: '2024-01-17', rentalCount: 18, totalRevenue: 520000, avgDuration: 4.2 },
    ],
    summary: {
      totalRentals: 55,
      totalRevenue: 1650000,
    },
    generatedAt: new Date('2024-01-18T10:00:00Z'),
  };

  beforeEach(() => {
    service = new ReportExporterService();
  });

  // ============================================
  // CSV Export Tests
  // ============================================

  describe('exportToCsv', () => {
    it('should export report to CSV format', async () => {
      const buffer = await service.exportToCsv(mockReportResult as any);

      expect(buffer).toBeInstanceOf(Buffer);
      const csv = buffer.toString('utf-8');

      // Check header row
      expect(csv).toContain('Dátum');
      expect(csv).toContain('Bérlések száma');
      expect(csv).toContain('Bevétel');
    });

    it('should include all data rows', async () => {
      const buffer = await service.exportToCsv(mockReportResult as any);
      const csv = buffer.toString('utf-8');
      const lines = csv.split('\n');

      // Header + 3 data rows
      expect(lines).toHaveLength(4);
    });

    it('should format currency values', async () => {
      const buffer = await service.exportToCsv(mockReportResult as any);
      const csv = buffer.toString('utf-8');

      // Hungarian currency format
      expect(csv).toMatch(/\d+.*Ft/);
    });

    it('should escape CSV special characters', async () => {
      const reportWithSpecialChars: IReportResult = {
        ...mockReportResult,
        columns: [{ field: 'name', header: 'Név', type: 'string' }],
        data: [{ name: 'Teszt, értékkel' }, { name: 'Idézőjel "érték"' }],
      };

      const buffer = await service.exportToCsv(reportWithSpecialChars as any);
      const csv = buffer.toString('utf-8');

      // Values with commas should be quoted
      expect(csv).toContain('"Teszt, értékkel"');
      // Values with quotes should be escaped
      expect(csv).toContain('""');
    });

    it('should handle null and undefined values', async () => {
      const reportWithNulls: IReportResult = {
        ...mockReportResult,
        columns: [
          { field: 'name', header: 'Név', type: 'string' },
          { field: 'value', header: 'Érték', type: 'number' },
        ],
        data: [
          { name: 'Test', value: null },
          { name: undefined, value: 100 },
        ],
      };

      const buffer = await service.exportToCsv(reportWithNulls as any);
      const csv = buffer.toString('utf-8');

      // Should not throw and should handle empty values
      expect(csv).toBeDefined();
      expect(csv.split('\n')).toHaveLength(3);
    });

    it('should format date values', async () => {
      const buffer = await service.exportToCsv(mockReportResult as any);
      const csv = buffer.toString('utf-8');

      // Hungarian date format (YYYY. MM. DD. or similar)
      expect(csv).toMatch(/\d{4}/);
    });

    it('should handle empty data array', async () => {
      const emptyReport: IReportResult = {
        ...mockReportResult,
        data: [],
      };

      const buffer = await service.exportToCsv(emptyReport as any);
      const csv = buffer.toString('utf-8');
      const lines = csv.split('\n');

      // Only header row
      expect(lines).toHaveLength(1);
    });
  });

  // ============================================
  // PDF Export Tests
  // ============================================

  describe('exportToPdf', () => {
    it('should export report to PDF format', async () => {
      const buffer = await service.exportToPdf(mockReportResult as any);

      expect(buffer).toBeInstanceOf(Buffer);
      const pdf = buffer.toString('utf-8');

      // Check PDF header
      expect(pdf).toContain('%PDF-1.4');
    });

    it('should include report content in PDF stream', async () => {
      const buffer = await service.exportToPdf(mockReportResult as any);
      const pdf = buffer.toString('utf-8');

      // PDF should contain stream with text content
      expect(pdf).toContain('stream');
      expect(pdf).toContain('endstream');
      // Should contain text operators
      expect(pdf).toContain('BT'); // Begin Text
      expect(pdf).toContain('ET'); // End Text
      expect(pdf).toContain('Tj'); // Show text
    });

    it('should include summary values', async () => {
      const buffer = await service.exportToPdf(mockReportResult as any);
      const pdf = buffer.toString('utf-8');

      // Summary should contain the actual values
      expect(pdf).toContain('totalRentals');
      expect(pdf).toContain('55');
      expect(pdf).toContain('totalRevenue');
    });

    it('should include PDF trailer', async () => {
      const buffer = await service.exportToPdf(mockReportResult as any);
      const pdf = buffer.toString('utf-8');

      expect(pdf).toContain('%%EOF');
      expect(pdf).toContain('trailer');
      expect(pdf).toContain('xref');
    });

    it('should include font definition', async () => {
      const buffer = await service.exportToPdf(mockReportResult as any);
      const pdf = buffer.toString('utf-8');

      // Should define Helvetica font
      expect(pdf).toContain('/Type /Font');
      expect(pdf).toContain('/BaseFont /Helvetica');
    });

    it('should handle large datasets (limit to 50 rows)', async () => {
      const largeReport: IReportResult = {
        ...mockReportResult,
        data: Array.from({ length: 100 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          rentalCount: i + 1,
          totalRevenue: (i + 1) * 10000,
          avgDuration: 3,
        })),
      };

      const buffer = await service.exportToPdf(largeReport as any);

      expect(buffer).toBeInstanceOf(Buffer);
      // PDF should still be generated without error
    });
  });

  // ============================================
  // Excel Export Tests
  // ============================================

  describe('exportToExcel', () => {
    it('should export report to Excel XML format', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);

      expect(buffer).toBeInstanceOf(Buffer);
      const xml = buffer.toString('utf-8');

      // Check XML structure
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<worksheet');
      expect(xml).toContain('</worksheet>');
    });

    it('should include header row', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      // Header cells
      expect(xml).toContain('<row r="1">');
      expect(xml).toContain('Dátum');
    });

    it('should include data rows', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      // Data should start at row 2
      expect(xml).toContain('<row r="2">');
      expect(xml).toContain('<row r="3">');
      expect(xml).toContain('<row r="4">');
    });

    it('should format numeric values correctly', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      // Numeric cells should have t="n" type
      expect(xml).toContain('t="n"');
      expect(xml).toContain('<v>15</v>'); // rentalCount
      expect(xml).toContain('<v>450000</v>'); // totalRevenue
    });

    it('should format string values correctly', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      // String cells should use inline string format
      expect(xml).toContain('t="inlineStr"');
      expect(xml).toContain('<is><t>');
    });

    it('should include summary section', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      expect(xml).toContain('Összesítés');
      expect(xml).toContain('totalRentals');
      expect(xml).toContain('55');
    });

    it('should escape XML special characters', async () => {
      const reportWithSpecialChars: IReportResult = {
        ...mockReportResult,
        columns: [{ field: 'name', header: 'Név & Cím', type: 'string' }],
        data: [{ name: 'Test <value>' }],
      };

      const buffer = await service.exportToExcel(reportWithSpecialChars as any);
      const xml = buffer.toString('utf-8');

      // XML entities should be escaped
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
    });

    it('should generate valid cell references', async () => {
      const buffer = await service.exportToExcel(mockReportResult as any);
      const xml = buffer.toString('utf-8');

      // Check cell references (A1, B1, C1, D1 for headers)
      expect(xml).toContain('r="A1"');
      expect(xml).toContain('r="B1"');
      expect(xml).toContain('r="C1"');
      expect(xml).toContain('r="D1"');
    });

    it('should handle empty summary', async () => {
      const reportNoSummary: IReportResult = {
        ...mockReportResult,
        summary: {},
      };

      const buffer = await service.exportToExcel(reportNoSummary as any);
      const xml = buffer.toString('utf-8');

      expect(buffer).toBeInstanceOf(Buffer);
      // Should not include summary section
      expect(xml).not.toContain('Összesítés');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle report with many columns', async () => {
      const wideReport: IReportResult = {
        ...mockReportResult,
        columns: Array.from({ length: 30 }, (_, i) => ({
          field: `col${i}`,
          header: `Column ${i}`,
          type: 'string' as const,
        })),
        data: [Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`col${i}`, `value${i}`]))],
      };

      const csvBuffer = await service.exportToCsv(wideReport as any);
      const pdfBuffer = await service.exportToPdf(wideReport as any);
      const excelBuffer = await service.exportToExcel(wideReport as any);

      expect(csvBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle special numeric values', async () => {
      const specialNumbersReport: IReportResult = {
        ...mockReportResult,
        columns: [{ field: 'value', header: 'Érték', type: 'number' }],
        data: [{ value: 0 }, { value: -100 }, { value: 1000000 }, { value: 3.14159 }],
      };

      const buffer = await service.exportToCsv(specialNumbersReport as any);
      const csv = buffer.toString('utf-8');

      expect(csv).toContain('0');
      expect(csv).toContain('-100');
    });

    it('should handle percent type formatting', async () => {
      const percentReport: IReportResult = {
        ...mockReportResult,
        columns: [{ field: 'rate', header: 'Arány', type: 'percent' }],
        data: [{ rate: 75.5 }, { rate: 100 }, { rate: 0 }],
      };

      const buffer = await service.exportToCsv(percentReport as any);
      const csv = buffer.toString('utf-8');

      expect(csv).toContain('%');
    });

    it('should handle boolean values', async () => {
      const boolReport: IReportResult = {
        ...mockReportResult,
        columns: [{ field: 'active', header: 'Aktív', type: 'string' }],
        data: [{ active: true }, { active: false }],
      };

      const buffer = await service.exportToCsv(boolReport as any);
      const csv = buffer.toString('utf-8');

      expect(csv).toContain('true');
      expect(csv).toContain('false');
    });
  });
});
