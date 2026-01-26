/**
 * In-Memory Service Dispatch Repository
 * Epic 25: Equipment-Service Integration
 *
 * Development implementation - replace with Prisma for production
 */

import {
  EquipmentStatus,
  IServiceDispatch,
  IServiceDispatchRepository,
  ServiceDispatchReason,
} from '@kgc/bergep-szerviz';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryDispatchRepository implements IServiceDispatchRepository {
  private dispatches: Map<string, IServiceDispatch> = new Map();

  async create(data: Partial<IServiceDispatch>): Promise<IServiceDispatch> {
    const now = new Date();
    const id = randomUUID();
    const dispatch: IServiceDispatch = {
      id,
      tenantId: data.tenantId ?? '',
      equipmentId: data.equipmentId ?? '',
      worksheetId: data.worksheetId ?? '',
      reason: data.reason ?? ServiceDispatchReason.REPAIR,
      previousStatus: data.previousStatus ?? EquipmentStatus.AVAILABLE,
      dispatchedAt: data.dispatchedAt ?? now,
      dispatchedBy: data.dispatchedBy ?? '',
      createdAt: now,
      updatedAt: now,
      ...(data.notes && { notes: data.notes }),
    };
    this.dispatches.set(id, dispatch);
    return dispatch;
  }

  async findById(id: string): Promise<IServiceDispatch | null> {
    return this.dispatches.get(id) ?? null;
  }

  async findByEquipmentId(equipmentId: string): Promise<IServiceDispatch[]> {
    const results: IServiceDispatch[] = [];
    this.dispatches.forEach(dispatch => {
      if (dispatch.equipmentId === equipmentId) {
        results.push(dispatch);
      }
    });
    return results.sort((a, b) => b.dispatchedAt.getTime() - a.dispatchedAt.getTime());
  }

  async findActiveByEquipmentId(equipmentId: string): Promise<IServiceDispatch | null> {
    for (const dispatch of this.dispatches.values()) {
      if (dispatch.equipmentId === equipmentId && !dispatch.returnedAt) {
        return dispatch;
      }
    }
    return null;
  }

  async update(id: string, data: Partial<IServiceDispatch>): Promise<IServiceDispatch> {
    const existing = this.dispatches.get(id);
    if (!existing) {
      throw new Error('Service dispatch not found');
    }

    const updated: IServiceDispatch = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.dispatches.set(id, updated);
    return updated;
  }
}
