/**
 * In-Memory Worksheet Repository
 * Epic 25: Equipment-Service Integration
 *
 * Development implementation - replace with Prisma for production
 */

import { IWorksheet, IWorksheetRepository, WorksheetStatus } from '@kgc/bergep-szerviz';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryWorksheetRepository implements IWorksheetRepository {
  private worksheets: Map<string, IWorksheet> = new Map();
  private worksheetCounter: Map<string, number> = new Map();

  async create(data: Partial<IWorksheet>): Promise<IWorksheet> {
    const now = new Date();
    const id = randomUUID();
    const worksheet: IWorksheet = {
      id,
      tenantId: data.tenantId ?? '',
      worksheetNumber: data.worksheetNumber ?? '',
      status: data.status ?? WorksheetStatus.DRAFT,
      isWarranty: data.isWarranty ?? false,
      createdAt: now,
      updatedAt: now,
      ...(data.equipmentId && { equipmentId: data.equipmentId }),
    };
    this.worksheets.set(id, worksheet);
    return worksheet;
  }

  async findById(id: string): Promise<IWorksheet | null> {
    return this.worksheets.get(id) ?? null;
  }

  async getNextNumber(tenantId: string): Promise<string> {
    const currentCount = this.worksheetCounter.get(tenantId) ?? 0;
    const nextCount = currentCount + 1;
    this.worksheetCounter.set(tenantId, nextCount);
    const year = new Date().getFullYear();
    return `ML-${year}-${String(nextCount).padStart(4, '0')}`;
  }

  async update(id: string, data: Partial<IWorksheet>): Promise<IWorksheet> {
    const existing = this.worksheets.get(id);
    if (!existing) {
      throw new Error('Worksheet not found');
    }

    const updated: IWorksheet = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.worksheets.set(id, updated);
    return updated;
  }
}
