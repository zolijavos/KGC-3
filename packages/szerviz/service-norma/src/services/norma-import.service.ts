/**
 * @kgc/service-norma - NormaImportService
 * Epic 20: Story 20-1 - Norma Tetel Import
 */

import { Injectable } from '@nestjs/common';
import {
  INormaVersion,
  INormaItem,
  INormaImportResult,
  INormaImportError,
  NormaVersionStatus,
} from '../interfaces/norma.interface';
import { ImportNormaListDto, ImportNormaListSchema } from '../dto/norma.dto';

export interface INormaVersionRepository {
  create(data: Partial<INormaVersion>): Promise<INormaVersion>;
  findById(id: string): Promise<INormaVersion | null>;
  findActiveBySupplier(tenantId: string, supplier: string): Promise<INormaVersion | null>;
  update(id: string, data: Partial<INormaVersion>): Promise<INormaVersion>;
}

export interface INormaItemRepository {
  createMany(items: Partial<INormaItem>[]): Promise<INormaItem[]>;
  findByVersionId(versionId: string): Promise<INormaItem[]>;
  findByCode(tenantId: string, versionId: string, code: string): Promise<INormaItem | null>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class NormaImportService {
  constructor(
    private readonly versionRepository: INormaVersionRepository,
    private readonly itemRepository: INormaItemRepository,
    private readonly auditService: IAuditService,
  ) {}

  async importNormaList(
    input: ImportNormaListDto,
    tenantId: string,
    userId: string,
  ): Promise<INormaImportResult> {
    const validationResult = ImportNormaListSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const errors: INormaImportError[] = [];
    const validItems: Partial<INormaItem>[] = [];

    // Track seen codes for duplicate detection
    const seenCodes = new Set<string>();

    // Validate each row
    for (let i = 0; i < validInput.items.length; i++) {
      const row = validInput.items[i];
      if (!row) continue;

      if (!row.normaCode || row.normaCode.trim() === '') {
        errors.push({
          row: i + 1,
          code: 'MISSING_CODE',
          message: 'Norma code is required',
        });
        continue;
      }

      const normalizedCode = row.normaCode.trim().toUpperCase();
      if (seenCodes.has(normalizedCode)) {
        errors.push({
          row: i + 1,
          code: 'DUPLICATE_CODE',
          message: `Duplicate norma code: ${normalizedCode}`,
        });
        continue;
      }
      seenCodes.add(normalizedCode);

      if (row.normaHours < 0) {
        errors.push({
          row: i + 1,
          code: 'INVALID_HOURS',
          message: 'Norma hours cannot be negative',
        });
        continue;
      }

      const hourlyRate = row.hourlyRate ?? validInput.defaultHourlyRate;
      const laborCost = Math.round(row.normaHours * hourlyRate);

      const itemData: Partial<INormaItem> = {
        tenantId,
        normaCode: row.normaCode.trim(),
        description: row.description.trim(),
        normaHours: row.normaHours,
        hourlyRate,
        laborCost,
      };
      if (row.category) {
        itemData.category = row.category.trim();
      }
      validItems.push(itemData);
    }

    if (validItems.length === 0) {
      throw new Error('No valid items to import');
    }

    // Archive existing active version for this supplier
    const existingActive = await this.versionRepository.findActiveBySupplier(
      tenantId,
      validInput.supplier,
    );
    if (existingActive) {
      await this.versionRepository.update(existingActive.id, {
        status: NormaVersionStatus.ARCHIVED,
        effectiveTo: new Date(),
      });
    }

    // Create new version
    const version = await this.versionRepository.create({
      tenantId,
      versionNumber: validInput.versionNumber,
      supplier: validInput.supplier,
      status: NormaVersionStatus.ACTIVE,
      effectiveFrom: validInput.effectiveFrom,
      itemCount: validItems.length,
      importedBy: userId,
      importedAt: new Date(),
    });

    // Create items with version reference
    const itemsWithVersion = validItems.map((item) => ({
      ...item,
      versionId: version.id,
    }));
    await this.itemRepository.createMany(itemsWithVersion);

    await this.auditService.log({
      action: 'norma_list_imported',
      entityType: 'norma_version',
      entityId: version.id,
      userId,
      tenantId,
      metadata: {
        supplier: validInput.supplier,
        versionNumber: validInput.versionNumber,
        importedCount: validItems.length,
        skippedCount: errors.length,
      },
    });

    return {
      versionId: version.id,
      versionNumber: version.versionNumber,
      importedCount: validItems.length,
      skippedCount: errors.length,
      errors,
    };
  }

  async parseCSV(csvContent: string): Promise<ImportNormaListDto['items']> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have header and at least one data row');
    }

    const header = lines[0]?.toLowerCase() ?? '';
    const hasCategory = header.includes('category');

    const items: ImportNormaListDto['items'] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;

      const parts = this.parseCSVLine(line);
      const code = parts[0];
      const description = parts[1];
      const hours = parts[2];

      if (!code || !description || !hours) continue;

      items.push({
        normaCode: code,
        description: description,
        normaHours: parseFloat(hours),
        hourlyRate: parts[3] ? parseFloat(parts[3]) : undefined,
        category: hasCategory ? parts[4] : undefined,
      });
    }

    return items;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }
}
