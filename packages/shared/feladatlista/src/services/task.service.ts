import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskListResult,
  TaskStatistics,
  TaskHistoryEntry,
  DuplicateCheckResult,
  TaskPermissionContext,
} from '../interfaces/task.interface';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ChangeTaskStatusDto,
  TaskFilterDto,
  AssignTaskDto,
  validateCreateTask,
  validateUpdateTask,
  validateChangeStatus,
  validateTaskFilter,
  validateAssignTask,
} from '../dto/task.dto';

/**
 * TaskService - Epic 12: Task List Widget
 * Implements all task management functionality:
 * - Story 12.1: Shopping list items
 * - Story 12.2: To-do tasks with assignees
 * - Story 12.3: Status lifecycle
 * - Story 12.4: Personal notes
 * - Story 12.5: Manager access
 */
@Injectable()
export class TaskService {
  // In-memory storage for testing (replace with Prisma in production)
  private tasks: Map<string, Task> = new Map();
  private history: TaskHistoryEntry[] = [];

  /**
   * Generate UUID using crypto for security
   * Falls back to Math.random only in test environments without crypto
   */
  private generateId(): string {
    // Use crypto.randomUUID if available (Node 19+, modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: use crypto.getRandomValues for better entropy
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Set version (4) and variant (RFC 4122)
      bytes[6] = (bytes[6]! & 0x0f) | 0x40;
      bytes[8] = (bytes[8]! & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    // Last resort fallback for testing only - NOT cryptographically secure
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Create a new task - Stories 12.1, 12.2, 12.4
   */
  async create(
    input: CreateTaskDto,
    context: TaskPermissionContext,
    skipValidation = false
  ): Promise<Task> {
    // Note: skipValidation should only be true if input is already validated at controller level
    const validated = skipValidation ? input : validateCreateTask(input);

    // Check for duplicates - Story 12.1
    const duplicateCheck = await this.checkForDuplicates(
      validated.title,
      validated.type,
      context.tenantId,
      context.locationId
    );

    if (duplicateCheck.isDuplicate) {
      throw new ConflictException({
        message: 'Similar task already exists',
        similarTasks: duplicateCheck.similarTasks,
      });
    }

    // Personal notes validation - Story 12.4
    if (validated.type === TaskType.NOTE && validated.isPersonal) {
      if (validated.assigneeIds && validated.assigneeIds.length > 0) {
        throw new ConflictException('Personal notes cannot have assignees');
      }
    }

    const now = new Date();
    const task: Task = {
      id: this.generateId(),
      tenantId: context.tenantId,
      locationId: context.locationId,
      type: validated.type,
      status: TaskStatus.OPEN,
      title: validated.title,
      description: validated.description,
      priority: validated.priority || TaskPriority.MEDIUM,
      quantity: validated.quantity || (validated.type === TaskType.SHOPPING ? 1 : undefined),
      targetLocation: validated.targetLocation,
      createdBy: context.userId,
      assigneeIds: validated.assigneeIds || [],
      isPersonal: validated.isPersonal || false,
      dueDate: validated.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);

    // Record history
    this.recordHistory(task.id, 'CREATED', undefined, JSON.stringify(task), context.userId);

    return task;
  }

  /**
   * Update an existing task
   */
  async update(
    taskId: string,
    input: UpdateTaskDto,
    context: TaskPermissionContext
  ): Promise<Task> {
    const task = await this.findById(taskId, context);
    const validated = validateUpdateTask(input);

    // Permission check
    this.checkUpdatePermission(task, context);

    const previousValue = JSON.stringify(task);

    // Apply updates
    if (validated.title !== undefined) task.title = validated.title;
    if (validated.description !== undefined) task.description = validated.description || undefined;
    if (validated.priority !== undefined) task.priority = validated.priority;
    if (validated.quantity !== undefined) task.quantity = validated.quantity || undefined;
    if (validated.targetLocation !== undefined) task.targetLocation = validated.targetLocation || undefined;
    if (validated.assigneeIds !== undefined) task.assigneeIds = validated.assigneeIds;
    if (validated.dueDate !== undefined) task.dueDate = validated.dueDate || undefined;
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);
    this.recordHistory(taskId, 'UPDATED', previousValue, JSON.stringify(task), context.userId);

    return task;
  }

  /**
   * Change task status - Story 12.3
   */
  async changeStatus(
    input: ChangeTaskStatusDto,
    context: TaskPermissionContext
  ): Promise<Task> {
    const validated = validateChangeStatus(input);
    const task = await this.findById(validated.taskId, context);

    // Permission check
    this.checkUpdatePermission(task, context);

    // Validate status transition
    this.validateStatusTransition(task.status, validated.newStatus);

    const previousStatus = task.status;
    task.status = validated.newStatus;
    task.updatedAt = new Date();

    // Track completion - Story 12.3
    if (validated.newStatus === TaskStatus.DONE) {
      task.completedAt = new Date();
      task.completedBy = context.userId;
    }

    this.tasks.set(task.id, task);
    this.recordHistory(
      task.id,
      'STATUS_CHANGED',
      previousStatus,
      validated.newStatus,
      context.userId
    );

    return task;
  }

  /**
   * Complete a task (shortcut for changing to DONE) - Story 12.3
   */
  async complete(taskId: string, context: TaskPermissionContext): Promise<Task> {
    return this.changeStatus(
      { taskId, newStatus: TaskStatus.DONE },
      context
    );
  }

  /**
   * Assign task to users - Story 12.2
   */
  async assign(input: AssignTaskDto, context: TaskPermissionContext): Promise<Task> {
    const validated = validateAssignTask(input);
    const task = await this.findById(validated.taskId, context);

    // Cannot assign personal notes
    if (task.isPersonal) {
      throw new ConflictException('Cannot assign personal tasks');
    }

    // Permission check - only creator or manager can assign
    if (task.createdBy !== context.userId && !context.isManager) {
      throw new ForbiddenException('Only task creator or manager can assign');
    }

    const previousAssignees = [...task.assigneeIds];
    task.assigneeIds = validated.assigneeIds;
    task.updatedAt = new Date();

    this.tasks.set(task.id, task);
    this.recordHistory(
      task.id,
      'ASSIGNED',
      JSON.stringify(previousAssignees),
      JSON.stringify(validated.assigneeIds),
      context.userId
    );

    // TODO: Send notifications if notifyAssignees is true
    // This would integrate with @kgc/chat for notifications

    return task;
  }

  /**
   * Find task by ID with access control
   */
  async findById(taskId: string, context: TaskPermissionContext): Promise<Task> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Tenant isolation
    if (task.tenantId !== context.tenantId) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Location check (unless manager with canViewAll)
    if (task.locationId !== context.locationId && !context.canViewAll) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // Personal task access - Story 12.4
    if (task.isPersonal && task.createdBy !== context.userId) {
      // Even managers cannot see personal tasks - Story 12.5
      throw new ForbiddenException('Cannot access personal tasks of other users');
    }

    return task;
  }

  /**
   * List tasks with filtering - Story 12.5
   * Optimized: Single-pass filtering for better performance with large datasets
   */
  async findMany(
    filter: TaskFilterDto,
    context: TaskPermissionContext
  ): Promise<TaskListResult> {
    const validated = validateTaskFilter(filter);
    const searchLower = validated.search?.toLowerCase();

    // Single-pass filter for performance optimization
    // Instead of multiple .filter() calls (O(n) each), we do one O(n) pass
    const tasks = Array.from(this.tasks.values()).filter((t) => {
      // Tenant isolation (required)
      if (t.tenantId !== context.tenantId) return false;

      // Location filter (unless manager with canViewAll)
      if (!context.canViewAll && t.locationId !== context.locationId) return false;

      // Personal task filter - Story 12.4 & 12.5
      // IMPORTANT: Even managers cannot see others' personal tasks (privacy requirement)
      if (t.isPersonal) {
        if (!validated.includePersonal) return false; // Exclude all personal tasks
        if (t.createdBy !== context.userId) return false; // Only own personal tasks
      }

      // Type filter
      if (validated.type && t.type !== validated.type) return false;

      // Status filter
      if (validated.status && t.status !== validated.status) return false;

      // Assignee filter
      if (validated.assigneeId && !t.assigneeIds.includes(validated.assigneeId)) return false;

      // Creator filter
      if (validated.createdBy && t.createdBy !== validated.createdBy) return false;

      // Priority filter
      if (validated.priority && t.priority !== validated.priority) return false;

      // Due date range filters
      if (validated.dueDateFrom && (!t.dueDate || t.dueDate < validated.dueDateFrom)) return false;
      if (validated.dueDateTo && (!t.dueDate || t.dueDate > validated.dueDateTo)) return false;

      // Search filter (title and description)
      if (searchLower) {
        const titleMatch = t.title.toLowerCase().includes(searchLower);
        const descMatch = t.description?.toLowerCase().includes(searchLower) ?? false;
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });

    // Sort by creation date (newest first)
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const total = tasks.length;
    const page = validated.page ?? 1;
    const pageSize = validated.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);

    return {
      tasks: paginatedTasks,
      total,
      page,
      pageSize,
      hasMore: startIndex + pageSize < total,
    };
  }

  /**
   * Get task statistics - Story 12.5
   */
  async getStatistics(context: TaskPermissionContext): Promise<TaskStatistics> {
    let tasks = Array.from(this.tasks.values());

    // Tenant and location filter
    tasks = tasks.filter((t) => t.tenantId === context.tenantId);
    if (!context.canViewAll) {
      tasks = tasks.filter((t) => t.locationId === context.locationId);
    }

    // Exclude others' personal tasks
    tasks = tasks.filter((t) => !t.isPersonal || t.createdBy === context.userId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats: TaskStatistics = {
      totalTasks: tasks.length,
      byStatus: {
        [TaskStatus.OPEN]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.DONE]: 0,
        [TaskStatus.ARCHIVED]: 0,
      },
      byType: {
        [TaskType.SHOPPING]: 0,
        [TaskType.TODO]: 0,
        [TaskType.NOTE]: 0,
      },
      byPriority: {
        [TaskPriority.LOW]: 0,
        [TaskPriority.MEDIUM]: 0,
        [TaskPriority.HIGH]: 0,
        [TaskPriority.URGENT]: 0,
      },
      overdueTasks: 0,
      completedToday: 0,
      assignedToMe: 0,
    };

    for (const task of tasks) {
      stats.byStatus[task.status]++;
      stats.byType[task.type]++;
      stats.byPriority[task.priority]++;

      if (task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE) {
        stats.overdueTasks++;
      }

      if (task.completedAt && task.completedAt >= todayStart) {
        stats.completedToday++;
      }

      if (task.assigneeIds.includes(context.userId)) {
        stats.assignedToMe++;
      }
    }

    return stats;
  }

  /**
   * Delete task (soft delete - archive)
   * @param taskId - The UUID of the task to delete
   * @param context - Permission context of the requesting user
   * @throws {NotFoundException} If task does not exist or user lacks access
   * @throws {ForbiddenException} If user is not the creator or manager
   */
  async delete(taskId: string, context: TaskPermissionContext): Promise<void> {
    const task = await this.findById(taskId, context);

    // Only creator or manager can delete
    if (task.createdBy !== context.userId && !context.canManageAll) {
      throw new ForbiddenException('Only task creator or manager can delete');
    }

    task.status = TaskStatus.ARCHIVED;
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);

    this.recordHistory(taskId, 'ARCHIVED', undefined, undefined, context.userId);
  }

  /**
   * Get task history entries for a specific task
   * @param taskId - The UUID of the task
   * @param context - Permission context of the requesting user
   * @returns Array of history entries sorted by date (newest first)
   * @throws {NotFoundException} If task does not exist or user lacks access
   * @throws {ForbiddenException} If accessing another user's personal task
   */
  async getHistory(taskId: string, context: TaskPermissionContext): Promise<TaskHistoryEntry[]> {
    // Verify access
    await this.findById(taskId, context);

    return this.history
      .filter((h) => h.taskId === taskId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Check for duplicate tasks - Story 12.1
   * Uses exact match and Levenshtein similarity (>95%) for detection
   * @param title - The title to check for duplicates
   * @param type - The task type (duplicates only checked within same type)
   * @param tenantId - Tenant scope for the check
   * @param locationId - Location scope for the check
   * @returns DuplicateCheckResult with isDuplicate flag and similar tasks array
   */
  async checkForDuplicates(
    title: string,
    type: TaskType,
    tenantId: string,
    locationId: string
  ): Promise<DuplicateCheckResult> {
    const titleLower = title.toLowerCase().trim();
    const tasks = Array.from(this.tasks.values());

    const similarTasks = tasks.filter(
      (t) =>
        t.tenantId === tenantId &&
        t.locationId === locationId &&
        t.type === type &&
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.ARCHIVED &&
        (t.title.toLowerCase().trim() === titleLower ||
          this.calculateSimilarity(t.title, title) > 0.95)
    );

    const result: DuplicateCheckResult = {
      isDuplicate: similarTasks.length > 0,
      similarTasks: similarTasks.slice(0, 3),
    };
    if (similarTasks.length > 0) {
      result.message = `Found ${similarTasks.length} similar task(s)`;
    }
    return result;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longerLength - editDistance) / longerLength;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = new Array(s2.length + 1).fill(0);
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          const prevCost = costs[j - 1];
          const currCost = costs[j];
          // With noUncheckedIndexedAccess, these could be undefined
          let newValue = prevCost ?? 0;
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), currCost ?? 0) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length] ?? 0;
  }

  /**
   * Validate status transition - Story 12.3
   */
  private validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.OPEN]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.ARCHIVED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.OPEN, TaskStatus.DONE, TaskStatus.ARCHIVED],
      [TaskStatus.DONE]: [TaskStatus.OPEN, TaskStatus.ARCHIVED],
      [TaskStatus.ARCHIVED]: [], // Cannot transition from archived
    };

    // Record<TaskStatus, ...> guarantees all enum values have entries
    // but noUncheckedIndexedAccess still requires null check
    const allowedTransitions = validTransitions[from];
    if (!allowedTransitions || !allowedTransitions.includes(to)) {
      throw new ConflictException(
        `Invalid status transition: ${from} -> ${to}`
      );
    }
  }

  /**
   * Check update permission
   */
  private checkUpdatePermission(task: Task, context: TaskPermissionContext): void {
    const isCreator = task.createdBy === context.userId;
    const isAssignee = task.assigneeIds.includes(context.userId);
    const isManager = context.isManager || context.canManageAll;

    if (!isCreator && !isAssignee && !isManager) {
      throw new ForbiddenException('No permission to update this task');
    }
  }

  /**
   * Record history entry
   */
  private recordHistory(
    taskId: string,
    action: TaskHistoryEntry['action'],
    previousValue: string | undefined,
    newValue: string | undefined,
    performedBy: string
  ): void {
    this.history.push({
      id: this.generateId(),
      taskId,
      action,
      previousValue,
      newValue,
      performedBy,
      performedAt: new Date(),
    });
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.tasks.clear();
    this.history = [];
  }
}
