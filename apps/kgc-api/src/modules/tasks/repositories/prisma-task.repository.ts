/**
 * Prisma Task Repository
 * Implements Task CRUD for PostgreSQL persistence
 * Epic 12: Story 12-1: Bevásárlólista Tétel CRUD
 * ADR-040: Feladatlista Widget Architektúra
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Task as PrismaTask,
  TaskStatus as PrismaTaskStatus,
  TaskType as PrismaTaskType,
} from '@prisma/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskType = 'SHOPPING' | 'TODO' | 'NOTE' | 'MESSAGE';
export type TaskPriority = 0 | 1 | 2; // 0=normal, 1=high, 2=urgent

export interface Task {
  id: string;
  tenantId: string;
  locationId: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds: string[];
  isPrivate: boolean;
  dueDate?: Date;
  priority: TaskPriority;
  completedAt?: Date;
  completedBy?: string;
  worksheetId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface CreateTaskInput {
  tenantId: string;
  locationId: string;
  type: TaskType;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  isPrivate?: boolean;
  dueDate?: Date;
  priority?: TaskPriority;
  worksheetId?: string;
  createdBy: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  dueDate?: Date;
  priority?: TaskPriority;
}

export interface TaskQuery {
  tenantId: string;
  type?: TaskType | TaskType[];
  status?: TaskStatus | TaskStatus[];
  locationId?: string;
  assignedToId?: string;
  createdBy?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  isPrivate?: boolean;
  includeDeleted?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskQueryResult {
  tasks: Task[];
  total: number;
  offset: number;
  limit: number;
}

export interface ITaskRepository {
  findById(id: string, tenantId?: string): Promise<Task | null>;
  query(params: TaskQuery): Promise<TaskQueryResult>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, tenantId: string, data: UpdateTaskInput): Promise<Task>;
  updateStatus(id: string, tenantId: string, status: TaskStatus, userId: string): Promise<Task>;
  complete(id: string, tenantId: string, userId: string): Promise<Task>;
  softDelete(id: string, tenantId: string): Promise<void>;
  clear(): void;
}

// ============================================
// REPOSITORY IMPLEMENTATION
// ============================================

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // CLEAR (testing only)
  // ============================================

  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toDomain(task: PrismaTask): Task {
    // Parse assignedToIds from JSON
    let assignedToIds: string[] = [];
    if (task.assignedToIds) {
      try {
        const parsed = task.assignedToIds as unknown;
        if (Array.isArray(parsed)) {
          assignedToIds = parsed.filter((id): id is string => typeof id === 'string');
        }
      } catch {
        assignedToIds = [];
      }
    }

    const result: Task = {
      id: task.id,
      tenantId: task.tenantId,
      locationId: task.locationId,
      type: task.type as TaskType,
      status: task.status as TaskStatus,
      title: task.title,
      assignedToIds,
      isPrivate: task.isPrivate,
      priority: task.priority as TaskPriority,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isDeleted: task.isDeleted,
    };

    // Conditionally add optional properties (exactOptionalPropertyTypes)
    if (task.description) result.description = task.description;
    if (task.quantity !== null) result.quantity = task.quantity;
    if (task.unit) result.unit = task.unit;
    if (task.dueDate) result.dueDate = task.dueDate;
    if (task.completedAt) result.completedAt = task.completedAt;
    if (task.completedBy) result.completedBy = task.completedBy;
    if (task.worksheetId) result.worksheetId = task.worksheetId;
    if (task.deletedAt) result.deletedAt = task.deletedAt;

    return result;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findById(id: string, tenantId?: string): Promise<Task | null> {
    const where: Prisma.TaskWhereInput = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const task = await this.prisma.task.findFirst({ where });
    return task ? this.toDomain(task) : null;
  }

  async query(params: TaskQuery): Promise<TaskQueryResult> {
    const where: Prisma.TaskWhereInput = {
      tenantId: params.tenantId,
    };

    // Status filter
    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status as PrismaTaskStatus[] };
      } else {
        where.status = params.status as PrismaTaskStatus;
      }
    }

    // Type filter
    if (params.type) {
      if (Array.isArray(params.type)) {
        where.type = { in: params.type as PrismaTaskType[] };
      } else {
        where.type = params.type as PrismaTaskType;
      }
    }

    // Location filter
    if (params.locationId) {
      where.locationId = params.locationId;
    }

    // Created by filter
    if (params.createdBy) {
      where.createdBy = params.createdBy;
    }

    // Private filter
    if (params.isPrivate !== undefined) {
      where.isPrivate = params.isPrivate;
    }

    // Include deleted filter
    if (!params.includeDeleted) {
      where.isDeleted = false;
    }

    // Due date range
    if (params.dueDateFrom || params.dueDateTo) {
      where.dueDate = {};
      if (params.dueDateFrom) {
        where.dueDate.gte = params.dueDateFrom;
      }
      if (params.dueDateTo) {
        where.dueDate.lte = params.dueDateTo;
      }
    }

    // Assigned to filter (JSON array contains)
    if (params.assignedToId) {
      where.assignedToIds = {
        array_contains: [params.assignedToId],
      };
    }

    // Search
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderByField = params.sortBy ?? 'createdAt';
    const orderByDir = params.sortOrder ?? 'desc';
    const orderBy: Prisma.TaskOrderByWithRelationInput = { [orderByField]: orderByDir };

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      tasks: tasks.map(t => this.toDomain(t)),
      total,
      offset,
      limit,
    };
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(input: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        tenantId: input.tenantId,
        locationId: input.locationId,
        type: input.type as PrismaTaskType,
        status: 'OPEN',
        title: input.title,
        description: input.description ?? null,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        assignedToIds: input.assignedToIds ?? [],
        isPrivate: input.isPrivate ?? false,
        dueDate: input.dueDate ?? null,
        priority: input.priority ?? 0,
        worksheetId: input.worksheetId ?? null,
        createdBy: input.createdBy,
      },
    });

    return this.toDomain(task);
  }

  async update(id: string, tenantId: string, data: UpdateTaskInput): Promise<Task> {
    // Verify task exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const updateData: Prisma.TaskUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.assignedToIds !== undefined) updateData.assignedToIds = data.assignedToIds;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.priority !== undefined) updateData.priority = data.priority;

    await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    return (await this.findById(id, tenantId))!;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: TaskStatus,
    userId: string
  ): Promise<Task> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const updateData: Prisma.TaskUpdateManyMutationInput = {
      status: status as PrismaTaskStatus,
      updatedAt: new Date(),
    };

    // If completing, set completed info
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.completedBy = userId;
    }

    await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    return (await this.findById(id, tenantId))!;
  }

  async complete(id: string, tenantId: string, userId: string): Promise<Task> {
    return this.updateStatus(id, tenantId, 'COMPLETED', userId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  // ============================================
  // SPECIALIZED QUERIES
  // ============================================

  /**
   * Get shopping list items for a location
   */
  async getShoppingList(
    tenantId: string,
    locationId: string,
    options?: { status?: TaskStatus }
  ): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {
      tenantId,
      locationId,
      type: 'SHOPPING',
      isDeleted: false,
    };

    if (options?.status) {
      where.status = options.status as PrismaTaskStatus;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return tasks.map(t => this.toDomain(t));
  }

  /**
   * Get tasks assigned to a user
   */
  async getAssignedTasks(
    tenantId: string,
    userId: string,
    options?: { status?: TaskStatus; type?: TaskType }
  ): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {
      tenantId,
      isDeleted: false,
      assignedToIds: {
        array_contains: [userId],
      },
    };

    if (options?.status) {
      where.status = options.status as PrismaTaskStatus;
    }
    if (options?.type) {
      where.type = options.type as PrismaTaskType;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    return tasks.map(t => this.toDomain(t));
  }

  /**
   * Get user's private notes
   */
  async getPrivateNotes(tenantId: string, userId: string): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId,
        type: 'NOTE',
        isPrivate: true,
        createdBy: userId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map(t => this.toDomain(t));
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(tenantId: string): Promise<Task[]> {
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueDate: { lt: now },
        isDeleted: false,
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks.map(t => this.toDomain(t));
  }

  /**
   * Count tasks by status for dashboard
   */
  async countByStatus(tenantId: string, locationId?: string): Promise<Record<TaskStatus, number>> {
    const where: Prisma.TaskWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const counts = await this.prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const result: Record<TaskStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    for (const { status, _count } of counts) {
      result[status as TaskStatus] = _count.status;
    }

    return result;
  }

  /**
   * Count tasks by type
   */
  async countByType(tenantId: string): Promise<Record<TaskType, number>> {
    const counts = await this.prisma.task.groupBy({
      by: ['type'],
      where: { tenantId, isDeleted: false },
      _count: { type: true },
    });

    const result: Record<TaskType, number> = {
      SHOPPING: 0,
      TODO: 0,
      NOTE: 0,
      MESSAGE: 0,
    };

    for (const { type, _count } of counts) {
      result[type as TaskType] = _count.type;
    }

    return result;
  }

  /**
   * Assign users to a task
   */
  async assignUsers(id: string, tenantId: string, userIds: string[]): Promise<Task> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    // Merge existing assignees with new ones
    const mergedIds = [...new Set([...existing.assignedToIds, ...userIds])];

    await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: {
        assignedToIds: mergedIds,
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }

  /**
   * Remove users from a task
   */
  async unassignUsers(id: string, tenantId: string, userIds: string[]): Promise<Task> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const removeSet = new Set(userIds);
    const remainingIds = existing.assignedToIds.filter(uid => !removeSet.has(uid));

    await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: {
        assignedToIds: remainingIds,
        updatedAt: new Date(),
      },
    });

    return (await this.findById(id, tenantId))!;
  }
}
