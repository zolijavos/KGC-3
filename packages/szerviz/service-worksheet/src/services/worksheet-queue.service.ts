/**
 * @kgc/service-worksheet - WorksheetQueueService
 * Story 17-7: Prioritás és várakozási lista
 *
 * TDD GREEN PHASE - Implementation to pass tests
 */

import { Injectable } from '@nestjs/common';
import { IWorksheet, WorksheetPriority, WorksheetStatus } from '../interfaces/worksheet.interface';

/**
 * Priority ranking - lower number = higher priority
 */
const PRIORITY_RANK: Record<WorksheetPriority, number> = {
  [WorksheetPriority.SURGOS]: 1,
  [WorksheetPriority.FELARAS]: 2,
  [WorksheetPriority.GARANCIALIS]: 3,
  [WorksheetPriority.FRANCHISE]: 4,
  [WorksheetPriority.NORMAL]: 5,
};

/**
 * Queued worksheet with position info
 */
export interface IQueuedWorksheet extends IWorksheet {
  position: number;
  estimatedWaitMinutes?: number;
}

/**
 * Queue filter options
 */
export interface IQueueFilterOptions {
  statuses?: WorksheetStatus[];
  assignedToId?: string;
  priority?: WorksheetPriority;
}

/**
 * Queue statistics
 */
export interface IQueueStats {
  total: number;
  byPriority: Record<WorksheetPriority, number>;
  oldestReceivedAt: Date | null;
}

/**
 * Extended worksheet repository interface
 */
export interface IWorksheetQueueRepository {
  findById(id: string): Promise<IWorksheet | null>;
  findByStatus(statuses: WorksheetStatus[], tenantId: string): Promise<IWorksheet[]>;
}

/**
 * Worksheet Queue Service - Prioritás és várakozási lista kezelés
 */
@Injectable()
export class WorksheetQueueService {
  constructor(private readonly worksheetRepository: IWorksheetQueueRepository) {}

  /**
   * Get priority rank (lower = higher priority)
   */
  getPriorityRank(priority: WorksheetPriority): number {
    return PRIORITY_RANK[priority];
  }

  /**
   * Get queue position for a specific worksheet
   */
  async getQueuePosition(worksheetId: string, tenantId: string): Promise<number> {
    const worksheet = await this.worksheetRepository.findById(worksheetId);
    if (!worksheet) {
      throw new Error('Munkalap nem talalhato');
    }
    if (worksheet.tenantId !== tenantId) {
      throw new Error('Hozzaferes megtagadva');
    }

    const queue = await this.getQueue(tenantId);
    const position = queue.findIndex(ws => ws.id === worksheetId);
    return position + 1;
  }

  /**
   * Get sorted worksheet queue
   */
  async getQueue(tenantId: string, options?: IQueueFilterOptions): Promise<IQueuedWorksheet[]> {
    const statuses = options?.statuses ?? [WorksheetStatus.FELVEVE, WorksheetStatus.VARHATO];
    const worksheets = await this.worksheetRepository.findByStatus(statuses, tenantId);

    // Filter by assignee if provided
    let filtered = worksheets;
    if (options?.assignedToId) {
      filtered = worksheets.filter(ws => ws.assignedToId === options.assignedToId);
    }

    // Filter by priority if provided
    if (options?.priority) {
      filtered = filtered.filter(ws => ws.priority === options.priority);
    }

    // Sort by priority (lower rank first), then by receivedAt (older first)
    const sorted = filtered.sort((a, b) => {
      const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    });

    // Add position to each worksheet
    return sorted.map((ws, index) => ({
      ...ws,
      position: index + 1,
    }));
  }

  /**
   * Get next worksheet to work on
   */
  async getNextWorksheet(
    tenantId: string,
    options?: IQueueFilterOptions
  ): Promise<IQueuedWorksheet | null> {
    const queue = await this.getQueue(tenantId, options);
    return queue[0] ?? null;
  }

  /**
   * Get worksheets by priority
   */
  async getWorksheetsByPriority(
    priority: WorksheetPriority,
    tenantId: string
  ): Promise<IQueuedWorksheet[]> {
    return this.getQueue(tenantId, { priority });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(tenantId: string): Promise<IQueueStats> {
    const queue = await this.getQueue(tenantId);

    // Initialize counts
    const byPriority: Record<WorksheetPriority, number> = {
      [WorksheetPriority.SURGOS]: 0,
      [WorksheetPriority.FELARAS]: 0,
      [WorksheetPriority.GARANCIALIS]: 0,
      [WorksheetPriority.FRANCHISE]: 0,
      [WorksheetPriority.NORMAL]: 0,
    };

    // Count by priority
    for (const ws of queue) {
      byPriority[ws.priority]++;
    }

    // Find oldest
    let oldestReceivedAt: Date | null = null;
    for (const ws of queue) {
      const receivedAt = new Date(ws.receivedAt);
      if (!oldestReceivedAt || receivedAt < oldestReceivedAt) {
        oldestReceivedAt = receivedAt;
      }
    }

    return {
      total: queue.length,
      byPriority,
      oldestReceivedAt,
    };
  }

  /**
   * Calculate estimated wait time based on position
   */
  calculateEstimatedWaitTime(position: number, avgMinutesPerWorksheet: number): number {
    if (position <= 0) {
      throw new Error('Pozicio pozitiv kell legyen');
    }
    // First position = 0 wait, others wait for preceding worksheets
    return (position - 1) * avgMinutesPerWorksheet;
  }
}
