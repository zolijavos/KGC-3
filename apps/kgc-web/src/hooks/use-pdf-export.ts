import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCallback, useState } from 'react';

/**
 * Column definition for PDF table export
 */
export interface PdfColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Options for PDF export
 */
export interface UsePdfExportOptions {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  columns: PdfColumn[];
  filename?: string;
}

/**
 * Result of the usePdfExport hook
 */
export interface UsePdfExportResult {
  exportToPdf: (options: UsePdfExportOptions) => Promise<void>;
  isExporting: boolean;
}

/**
 * Format a value for display in PDF
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('hu-HU');
  }
  if (typeof value === 'boolean') {
    return value ? 'Igen' : 'Nem';
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('hu-HU');
  }
  return String(value);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Format current date for display
 */
function formatDate(): string {
  return new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Custom hook for exporting data to PDF
 *
 * Features:
 * - KGC company header
 * - Configurable title and subtitle
 * - Data table with columns
 * - Page numbers in footer
 * - Hungarian character support (UTF-8)
 *
 * @example
 * ```tsx
 * const { exportToPdf, isExporting } = usePdfExport();
 *
 * const handleExport = async () => {
 *   await exportToPdf({
 *     title: 'Bérlési riport',
 *     subtitle: '2024. január',
 *     data: rentals,
 *     columns: [
 *       { key: 'equipment', header: 'Gép', align: 'left' },
 *       { key: 'rentals', header: 'Bérlések', align: 'right' },
 *     ],
 *     filename: 'berlesek-2024-01',
 *   });
 * };
 * ```
 */
export function usePdfExport(): UsePdfExportResult {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPdf = useCallback(
    async (options: UsePdfExportOptions): Promise<void> => {
      const { title, subtitle, data, columns, filename } = options;

      if (isExporting) {
        return;
      }

      setIsExporting(true);

      try {
        // Create new PDF document (A4 size)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // --- Header ---
        // Company name
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('KGC - Kisgepcentrum', margin, 20);

        // Date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(), pageWidth - margin, 20, { align: 'right' });

        // Horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, 25, pageWidth - margin, 25);

        // --- Title ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, 35);

        // Subtitle (optional)
        let tableStartY = 45;
        if (subtitle) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(subtitle, margin, 42);
          doc.setTextColor(0, 0, 0);
          tableStartY = 50;
        }

        // --- Data Table ---
        const headers = columns.map(col => col.header);
        const body = data.map(row => columns.map(col => formatValue(getNestedValue(row, col.key))));

        // Column styles for alignment
        const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};
        columns.forEach((col, index) => {
          if (col.align) {
            columnStyles[index] = { halign: col.align };
          }
        });

        autoTable(doc, {
          startY: tableStartY,
          head: [headers],
          body: body,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            font: 'helvetica',
          },
          headStyles: {
            fillColor: [59, 130, 246], // Blue header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          columnStyles,
          didDrawPage: () => {
            // --- Footer with page numbers ---
            const pageNumber = doc.getCurrentPageInfo().pageNumber;
            const totalPages = doc.getNumberOfPages();

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(128, 128, 128);

            // Page number
            doc.text(`${pageNumber}. oldal / ${totalPages}`, pageWidth / 2, pageHeight - 10, {
              align: 'center',
            });

            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

            // Reset text color
            doc.setTextColor(0, 0, 0);
          },
        });

        // Generate filename
        const safeFilename = filename
          ? filename.replace(/[^a-zA-Z0-9_-]/g, '_')
          : `kgc-riport-${new Date().toISOString().slice(0, 10)}`;

        // Save the PDF
        doc.save(`${safeFilename}.pdf`);
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  return {
    exportToPdf,
    isExporting,
  };
}
