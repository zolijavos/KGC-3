/**
 * Tasks API Client
 * Epic 12: Feladatlista Widget
 */

import { api } from './client';

// ============================================
// ENUMS & TYPES
// ============================================

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskType {
  SHOPPING = 'SHOPPING',
  TODO = 'TODO',
  NOTE = 'NOTE',
  MESSAGE = 'MESSAGE',
}

// Priority values (0=low, 1=medium, 2=high)
export type TaskPriority = 0 | 1 | 2;

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
  dueDate?: string;
  priority: TaskPriority;
  worksheetId?: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  type?: TaskType;
  status?: TaskStatus;
  locationId?: string;
  assignedToId?: string;
  createdBy?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
}

export interface TaskStats {
  byStatus: Record<TaskStatus, number>;
  byType: Record<TaskType, number>;
}

export interface CreateTaskInput {
  locationId: string;
  type: TaskType;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  isPrivate?: boolean;
  dueDate?: string;
  priority?: TaskPriority;
  worksheetId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  assignedToIds?: string[];
  dueDate?: string;
  priority?: TaskPriority;
}

// ============================================
// LABEL MAPPINGS (Hungarian)
// ============================================

export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.OPEN]: 'Nyitott',
  [TaskStatus.IN_PROGRESS]: 'Folyamatban',
  [TaskStatus.COMPLETED]: 'Kész',
  [TaskStatus.CANCELLED]: 'Megszakítva',
};

export const TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.SHOPPING]: 'Bevásárlás',
  [TaskType.TODO]: 'Teendő',
  [TaskType.NOTE]: 'Jegyzet',
  [TaskType.MESSAGE]: 'Üzenet',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  0: 'Alacsony',
  1: 'Közepes',
  2: 'Magas',
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get tasks with filters
 */
export async function getTasks(filters: TaskFilters = {}): Promise<TaskListResponse> {
  const params = new URLSearchParams();

  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.locationId) params.append('locationId', filters.locationId);
  if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
  if (filters.createdBy) params.append('createdBy', filters.createdBy);
  if (filters.search) params.append('search', filters.search);
  if (filters.offset !== undefined) params.append('offset', String(filters.offset));
  if (filters.limit !== undefined) params.append('limit', String(filters.limit));

  const queryString = params.toString();
  const url = queryString ? `/tasks?${queryString}` : '/tasks';

  const response = await api.get<TaskListResponse>(url);
  return response;
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<{ data: Task }> {
  return api.get<{ data: Task }>(`/tasks/${id}`);
}

/**
 * Get task statistics
 */
export async function getTaskStats(locationId?: string): Promise<{ data: TaskStats }> {
  const params = locationId ? `?locationId=${locationId}` : '';
  return api.get<{ data: TaskStats }>(`/tasks/stats${params}`);
}

/**
 * Get tasks assigned to current user
 */
export async function getAssignedTasks(
  userId: string,
  options?: { status?: TaskStatus; type?: TaskType }
): Promise<{ data: Task[] }> {
  const params = new URLSearchParams();
  params.append('userId', userId);
  if (options?.status) params.append('status', options.status);
  if (options?.type) params.append('type', options.type);

  return api.get<{ data: Task[] }>(`/tasks/assigned?${params.toString()}`);
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<{ data: Task[] }> {
  return api.get<{ data: Task[] }>('/tasks/overdue');
}

/**
 * Get shopping list for a location
 */
export async function getShoppingList(
  locationId: string,
  status?: TaskStatus
): Promise<{ data: Task[] }> {
  const params = new URLSearchParams();
  params.append('locationId', locationId);
  if (status) params.append('status', status);

  return api.get<{ data: Task[] }>(`/tasks/shopping-list?${params.toString()}`);
}

/**
 * Get private notes for a user
 */
export async function getPrivateNotes(userId: string): Promise<{ data: Task[] }> {
  return api.get<{ data: Task[] }>(`/tasks/private-notes?userId=${userId}`);
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<{ data: Task }> {
  return api.post<{ data: Task }>('/tasks', input);
}

/**
 * Update a task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<{ data: Task }> {
  return api.patch<{ data: Task }>(`/tasks/${id}`, input);
}

/**
 * Change task status
 */
export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
  userId: string
): Promise<{ data: Task }> {
  return api.patch<{ data: Task }>(`/tasks/${id}/status`, { status, userId });
}

/**
 * Mark task as completed
 */
export async function completeTask(id: string, userId: string): Promise<{ data: Task }> {
  return api.patch<{ data: Task }>(`/tasks/${id}/complete`, { userId });
}

/**
 * Delete (soft delete) a task
 */
export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

/**
 * Assign users to task
 */
export async function assignUsersToTask(id: string, userIds: string[]): Promise<{ data: Task }> {
  return api.patch<{ data: Task }>(`/tasks/${id}/assign`, { userIds });
}

/**
 * Remove users from task
 */
export async function unassignUsersFromTask(
  id: string,
  userIds: string[]
): Promise<{ data: Task }> {
  return api.patch<{ data: Task }>(`/tasks/${id}/unassign`, { userIds });
}
