/**
 * Tasks Hooks - React hooks for task data management
 * Epic 12: Feladatlista Widget
 */

import {
  assignUsersToTask,
  changeTaskStatus,
  completeTask,
  createTask,
  deleteTask,
  getAssignedTasks,
  getOverdueTasks,
  getTaskById,
  getTasks,
  getTaskStats,
  unassignUsersFromTask,
  updateTask,
  type CreateTaskInput,
  type Task,
  type TaskFilters,
  type TaskStats,
  type TaskStatus,
  type TaskType,
  type UpdateTaskInput,
} from '@/api/tasks';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseTasksResult {
  tasks: Task[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseTaskResult {
  task: Task | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseTaskStatsResult {
  stats: TaskStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseTaskMutationsResult {
  isLoading: boolean;
  create: (input: CreateTaskInput) => Promise<Task>;
  update: (id: string, input: UpdateTaskInput) => Promise<Task>;
  changeStatus: (id: string, status: TaskStatus, userId: string) => Promise<Task>;
  complete: (id: string, userId: string) => Promise<Task>;
  remove: (id: string) => Promise<void>;
  assign: (id: string, userIds: string[]) => Promise<Task>;
  unassign: (id: string, userIds: string[]) => Promise<Task>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage tasks list
 */
export function useTasks(filters: TaskFilters = {}): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTasks(filters);
      setTasks(response.items);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nem sikerült betölteni a feladatokat';
      setError(message);
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.type,
    filters.status,
    filters.locationId,
    filters.assignedToId,
    filters.createdBy,
    filters.search,
    filters.offset,
    filters.limit,
  ]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    total,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}

/**
 * Hook to fetch single task
 */
export function useTask(id: string | undefined): UseTaskResult {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!id) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getTaskById(id);
      setTask(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nem sikerült betölteni a feladatot';
      setError(message);
      console.error('Error fetching task:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchTask();
  }, [fetchTask]);

  return {
    task,
    isLoading,
    error,
    refetch: fetchTask,
  };
}

/**
 * Hook to fetch task statistics
 */
export function useTaskStats(locationId?: string): UseTaskStatsResult {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTaskStats(locationId);
      setStats(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nem sikerült betölteni a statisztikákat';
      setError(message);
      console.error('Error fetching task stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook to fetch tasks assigned to a user
 */
export function useAssignedTasks(
  userId: string | undefined,
  options?: { status?: TaskStatus; type?: TaskType }
): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getAssignedTasks(userId, options);
      setTasks(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nem sikerült betölteni a feladatokat';
      setError(message);
      console.error('Error fetching assigned tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, options?.status, options?.type]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    total: tasks.length,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}

/**
 * Hook to fetch overdue tasks
 */
export function useOverdueTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getOverdueTasks();
      setTasks(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nem sikerült betölteni a lejárt feladatokat';
      setError(message);
      console.error('Error fetching overdue tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    total: tasks.length,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}

/**
 * Hook for task mutations (create, update, delete, etc.)
 */
export function useTaskMutations(): UseTaskMutationsResult {
  const [isLoading, setIsLoading] = useState(false);

  const create = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    setIsLoading(true);
    try {
      const response = await createTask(input);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateTaskInput): Promise<Task> => {
    setIsLoading(true);
    try {
      const response = await updateTask(id, input);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeStatusFn = useCallback(
    async (id: string, status: TaskStatus, userId: string): Promise<Task> => {
      setIsLoading(true);
      try {
        const response = await changeTaskStatus(id, status, userId);
        return response.data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const completeFn = useCallback(async (id: string, userId: string): Promise<Task> => {
    setIsLoading(true);
    try {
      const response = await completeTask(id, userId);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await deleteTask(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const assign = useCallback(async (id: string, userIds: string[]): Promise<Task> => {
    setIsLoading(true);
    try {
      const response = await assignUsersToTask(id, userIds);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unassign = useCallback(async (id: string, userIds: string[]): Promise<Task> => {
    setIsLoading(true);
    try {
      const response = await unassignUsersFromTask(id, userIds);
      return response.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    create,
    update,
    changeStatus: changeStatusFn,
    complete: completeFn,
    remove,
    assign,
    unassign,
  };
}
