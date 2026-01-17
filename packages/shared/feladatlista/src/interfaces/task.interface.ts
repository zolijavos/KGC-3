/**
 * Task Interface - Epic 12: Task List Widget
 * Covers: FR - Bevásárlólista, To-Do, Személyes Jegyzet
 */

/**
 * Task types supported by the system
 */
export enum TaskType {
  /** Shopping list item - Story 12.1 */
  SHOPPING = 'SHOPPING',
  /** To-do task with optional assignee - Story 12.2 */
  TODO = 'TODO',
  /** Personal note (private) - Story 12.4 */
  NOTE = 'NOTE',
}

/**
 * Task status lifecycle - Story 12.3
 */
export enum TaskStatus {
  /** Task is open/pending */
  OPEN = 'OPEN',
  /** Task is being worked on */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Task is completed */
  DONE = 'DONE',
  /** Task is archived */
  ARCHIVED = 'ARCHIVED',
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Core Task entity interface
 * Note: Optional properties include `| undefined` for exactOptionalPropertyTypes compatibility
 */
export interface Task {
  id: string;
  tenantId: string;
  locationId: string;

  /** Task type determines behavior and visibility */
  type: TaskType;

  /** Current status in lifecycle */
  status: TaskStatus;

  /** Task title/description */
  title: string;

  /** Optional detailed description */
  description?: string | undefined;

  /** Priority level */
  priority: TaskPriority;

  /** For SHOPPING type: quantity needed */
  quantity?: number | undefined;

  /** For SHOPPING type: target location/store */
  targetLocation?: string | undefined;

  /** Creator user ID */
  createdBy: string;

  /** Assigned user IDs - Story 12.2 */
  assigneeIds: string[];

  /** Is this a personal/private task? - Story 12.4 */
  isPersonal: boolean;

  /** Optional due date - Story 12.2 */
  dueDate?: Date | undefined;

  /** When task was completed */
  completedAt?: Date | undefined;

  /** Who completed the task */
  completedBy?: string | undefined;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Task creation input
 */
export interface CreateTaskInput {
  type: TaskType;
  title: string;
  description?: string;
  priority?: TaskPriority;
  quantity?: number;
  targetLocation?: string;
  assigneeIds?: string[];
  isPersonal?: boolean;
  dueDate?: Date;
}

/**
 * Task update input
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  quantity?: number;
  targetLocation?: string;
  assigneeIds?: string[];
  dueDate?: Date;
}

/**
 * Task status change input - Story 12.3
 */
export interface ChangeTaskStatusInput {
  taskId: string;
  newStatus: TaskStatus;
}

/**
 * Task filter options - Story 12.5
 */
export interface TaskFilterOptions {
  /** Filter by type */
  type?: TaskType;
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by assignee */
  assigneeId?: string;
  /** Filter by creator */
  createdBy?: string;
  /** Include personal tasks (requires permission) */
  includePersonal?: boolean;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Due date range start */
  dueDateFrom?: Date;
  /** Due date range end */
  dueDateTo?: Date;
  /** Search in title/description */
  search?: string;
}

/**
 * Task list result with pagination
 */
export interface TaskListResult {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Task statistics - Story 12.5
 */
export interface TaskStatistics {
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
  overdueTasks: number;
  completedToday: number;
  assignedToMe: number;
}

/**
 * Task history entry for audit trail
 */
export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMPLETED' | 'ARCHIVED';
  previousValue?: string | undefined;
  newValue?: string | undefined;
  performedBy: string;
  performedAt: Date;
}

/**
 * Duplicate check result - Story 12.1
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarTasks: Task[];
  message?: string;
}

/**
 * User permission context for task access
 */
export interface TaskPermissionContext {
  userId: string;
  tenantId: string;
  locationId: string;
  /** Is user a manager (BOLTVEZETO+)? - Story 12.5 */
  isManager: boolean;
  /** Can view all tasks? */
  canViewAll: boolean;
  /** Can manage all tasks? */
  canManageAll: boolean;
}
