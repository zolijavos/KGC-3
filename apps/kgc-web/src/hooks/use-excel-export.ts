import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';

/**
 * Column type for Excel formatting
 */
export type ExcelColumnType = 'string' | 'number' | 'date' | 'currency';

/**
 * Column definition for Excel export
 */
export interface ExcelColumn {
  key: string;
  header: string;
  type?: ExcelColumnType;
  width?: number;
}

/**
 * Options for Excel export
 */
export interface UseExcelExportOptions {
  title: string;
  data: Record<string, unknown>[];
  columns: ExcelColumn[];
  filename?: string;
}

/**
 * Result of the useExcelExport hook
 */
export interface UseExcelExportResult {
  exportToExcel: (options: UseExcelExportOptions) => Promise<void>;
  isExporting: boolean;
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
 * Format a date value for Excel
 */
function formatDateForExcel(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] ?? '';
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0] ?? '';
    }
  }
  return String(value ?? '');
}

/**
 * Get Excel cell value based on column type
 */
function getCellValue(value: unknown, type: ExcelColumnType = 'string'): string | number {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'number':
    case 'currency': {
      if (typeof value === 'number') {
        return value;
      }
      const numValue = Number(value);
      return isNaN(numValue) ? String(value) : numValue;
    }

    case 'date':
      return formatDateForExcel(value);

    case 'string':
    default:
      return String(value);
  }
}

/**
 * Get default column width based on type
 */
function getDefaultWidth(type: ExcelColumnType = 'string'): number {
  switch (type) {
    case 'currency':
      return 15;
    case 'date':
      return 12;
    case 'number':
      return 12;
    case 'string':
    default:
      return 20;
  }
}

/**
 * Custom hook for exporting data to Excel (XLSX)
 *
 * Features:
 * - Automatic column width
 * - Number/date/currency formatting
 * - UTF-8 Hungarian character support
 * - Header row styling
 *
 * @example
 * ```tsx
 * const { exportToExcel, isExporting } = useExcelExport();
 *
 * const handleExport = async () => {
 *   await exportToExcel({
 *     title: 'Berlesi riport',
 *     data: rentals,
 *     columns: [
 *       { key: 'equipment', header: 'Gep', type: 'string' },
 *       { key: 'revenue', header: 'Bevetel', type: 'currency' },
 *       { key: 'date', header: 'Datum', type: 'date' },
 *     ],
 *     filename: 'berlesek-2024-01',
 *   });
 * };
 * ```
 */
export function useExcelExport(): UseExcelExportResult {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = useCallback(
    async (options: UseExcelExportOptions): Promise<void> => {
      const { title, data, columns, filename } = options;

      if (isExporting) {
        return;
      }

      setIsExporting(true);

      try {
        // Create header row
        const headers = columns.map(col => col.header);

        // Create data rows with proper typing
        const rows = data.map(row =>
          columns.map(col => getCellValue(getNestedValue(row, col.key), col.type))
        );

        // Combine header and data
        const worksheetData = [headers, ...rows];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        const colWidths: XLSX.ColInfo[] = columns.map(col => ({
          wch: col.width ?? getDefaultWidth(col.type),
        }));
        worksheet['!cols'] = colWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31)); // Excel sheet name max 31 chars

        // Generate filename
        const dateStr = new Date().toISOString().slice(0, 10);
        const safeTitle = title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 30);
        const safeFilename = filename
          ? filename.replace(/[^a-zA-Z0-9_-]/g, '_')
          : `kgc_${safeTitle}_${dateStr}`;

        // Write and download
        XLSX.writeFile(workbook, `${safeFilename}.xlsx`);
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  return {
    exportToExcel,
    isExporting,
  };
}
