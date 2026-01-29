/**
 * Tasks Page - Kanban board for task management
 * Epic 12: Feladatlista Widget
 */

import {
  PRIORITY_LABELS,
  TaskStatus,
  TaskType,
  TYPE_LABELS,
  type Task,
  type TaskPriority,
} from '@/api/tasks';
import { Card } from '@/components/ui';
import { useTaskMutations, useTasks, useTaskStats } from '@/hooks/use-tasks';
import { useMemo, useState } from 'react';

// ============================================
// CONFIGURATION
// ============================================

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  [TaskStatus.OPEN]: {
    label: 'Nyitott',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'Folyamatban',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  [TaskStatus.COMPLETED]: {
    label: 'Kész',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  [TaskStatus.CANCELLED]: {
    label: 'Megszakítva',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  0: { label: 'Alacsony', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  1: { label: 'Közepes', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  2: { label: 'Magas', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

// Kanban columns - only showing active statuses
const KANBAN_STATUSES: TaskStatus[] = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return { text: '-', isOverdue: false };

  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: `${Math.abs(days)} napja lejárt`, isOverdue: true };
  if (days === 0) return { text: 'Ma', isOverdue: false };
  if (days === 1) return { text: 'Holnap', isOverdue: false };
  return { text: date.toLocaleDateString('hu-HU'), isOverdue: false };
};

// ============================================
// COMPONENTS
// ============================================

interface TaskCardProps {
  task: Task;
  onDragStart: (task: Task) => void;
  onSelect: (task: Task) => void;
}

function TaskCard({ task, onDragStart, onSelect }: TaskCardProps) {
  const dueInfo = formatDate(task.dueDate);
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[1];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onSelect(task)}
      className="kgc-card-bg cursor-pointer rounded-lg border border-gray-200 p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700"
    >
      {/* Priority & Type */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}
        >
          {priorityConfig.label}
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          {TYPE_LABELS[task.type]}
        </span>
      </div>

      {/* Title */}
      <h4 className="mb-1 font-medium text-gray-900 dark:text-white">{task.title}</h4>
      {task.description && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Assigned users count */}
        <div className="flex items-center gap-2">
          {task.assignedToIds.length > 0 ? (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-xs font-medium text-white">
                {task.assignedToIds.length}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">felelős</span>
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Nincs felelős</span>
          )}
        </div>

        {/* Due date */}
        <span
          className={`text-xs ${dueInfo.isOverdue ? 'font-medium text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {dueInfo.text}
        </span>
      </div>

      {/* Quantity info for shopping tasks */}
      {task.type === TaskType.SHOPPING && task.quantity && (
        <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          Mennyiség: {task.quantity} {task.unit ?? 'db'}
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (status: TaskStatus) => void;
  onTaskDragStart: (task: Task) => void;
  onTaskSelect: (task: Task) => void;
}

function KanbanColumn({
  status,
  tasks,
  onDragOver,
  onDrop,
  onTaskDragStart,
  onTaskSelect,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDrop(status)}
      className="flex min-h-[500px] w-80 flex-shrink-0 flex-col rounded-lg bg-gray-50 dark:bg-gray-800/50"
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${config.bgColor}`} />
          <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onTaskDragStart}
            onSelect={onTaskSelect}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Nincs feladat
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export function TasksPage() {
  // API hooks
  const [filters, setFilters] = useState<{
    type?: TaskType;
    search?: string;
    assignedToId?: string;
  }>({});

  const { tasks, isLoading, error, refetch } = useTasks(filters);
  const { stats } = useTaskStats();
  const mutations = useTaskMutations();

  // Local state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TaskType | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: TaskType.TODO as TaskType,
    priority: 1 as TaskPriority,
    dueDate: '',
    quantity: '',
    unit: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: TaskType.TODO,
      priority: 1,
      dueDate: '',
      quantity: '',
      unit: '',
    });
  };

  // Filter tasks locally for instant feedback
  const filteredTasks = useMemo(() => {
    const safeTasks = tasks ?? [];
    return safeTasks.filter(task => {
      if (filterType !== 'ALL' && task.type !== filterType) return false;
      if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [tasks, filterType, filterPriority, searchQuery]);

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => t.status === status);

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      try {
        // Use current user ID - in real app this would come from auth context
        const userId = 'current-user-id';
        await mutations.changeStatus(draggedTask.id, status, userId);
        void refetch();
      } catch (err) {
        console.error('Failed to change task status:', err);
      }
    }
    setDraggedTask(null);
  };

  // Create task handler
  const handleCreateTask = async () => {
    if (!formData.title.trim()) return;

    try {
      await mutations.create({
        locationId: 'default-location', // In real app, get from context
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        quantity: formData.quantity ? parseInt(formData.quantity, 10) : undefined,
        unit: formData.unit || undefined,
      });
      setShowNewTaskModal(false);
      resetForm();
      void refetch();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Status change in modal
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const userId = 'current-user-id';
      await mutations.changeStatus(taskId, newStatus, userId);
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
      void refetch();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  // Calculate stats
  const displayStats = useMemo(() => {
    if (stats) {
      return {
        open: stats.byStatus[TaskStatus.OPEN] ?? 0,
        inProgress: stats.byStatus[TaskStatus.IN_PROGRESS] ?? 0,
        completed: stats.byStatus[TaskStatus.COMPLETED] ?? 0,
        total: Object.values(stats.byStatus).reduce((a, b) => a + b, 0),
      };
    }
    return {
      open: filteredTasks.filter(t => t.status === TaskStatus.OPEN).length,
      inProgress: filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      total: filteredTasks.length,
    };
  }, [stats, filteredTasks]);

  return (
    <div className="kgc-bg min-h-screen">
      {/* Header */}
      <header className="kgc-card-bg border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto flex max-w-full items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feladatok</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kanban tábla és feladatkezelés
            </p>
          </div>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Új feladat
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Keresés..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as TaskType | 'ALL')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="ALL">Minden típus</option>
            {Object.values(TaskType).map(type => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority === 'ALL' ? 'ALL' : String(filterPriority)}
            onChange={e => {
              const val = e.target.value;
              setFilterPriority(val === 'ALL' ? 'ALL' : (parseInt(val, 10) as TaskPriority));
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="ALL">Minden prioritás</option>
            {([0, 1, 2] as TaskPriority[]).map(priority => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                {displayStats.total}
              </span>{' '}
              feladat
            </span>
            <span className="text-orange-600">
              <span className="font-medium">
                {filteredTasks.filter(t => t.priority === 2).length}
              </span>{' '}
              magas prioritás
            </span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center text-gray-500 dark:text-gray-400">Feladatok betöltése...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6">
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
            <div className="text-center text-red-600 dark:text-red-400">Hiba: {error}</div>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && !error && (
        <div className="overflow-x-auto p-6">
          <div className="flex gap-6">
            {KANBAN_STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getTasksByStatus(status)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onTaskDragStart={handleDragStart}
                onTaskSelect={setSelectedTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="kgc-card-bg max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[selectedTask.status].bgColor} ${STATUS_CONFIG[selectedTask.status].color}`}
                  >
                    {STATUS_CONFIG[selectedTask.status].label}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[selectedTask.priority]?.bgColor ?? ''} ${PRIORITY_CONFIG[selectedTask.priority]?.color ?? ''}`}
                  >
                    {PRIORITY_CONFIG[selectedTask.priority]?.label ?? 'Közepes'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedTask.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {selectedTask.description && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Leírás
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTask.description}</p>
                </div>
              )}

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus
                  </h3>
                  <span className="text-gray-900 dark:text-white">
                    {TYPE_LABELS[selectedTask.type]}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Határidő
                  </h3>
                  <p
                    className={`${formatDate(selectedTask.dueDate).isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                  >
                    {selectedTask.dueDate
                      ? new Date(selectedTask.dueDate).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedTask.type === TaskType.SHOPPING && selectedTask.quantity && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mennyiség
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {selectedTask.quantity} {selectedTask.unit ?? 'db'}
                  </p>
                </div>
              )}

              {/* Quick status change */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Státusz módosítása
                </h3>
                <div className="flex gap-2">
                  {KANBAN_STATUSES.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedTask.id, status)}
                      disabled={mutations.isLoading}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        selectedTask.status === status
                          ? `${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color}`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="kgc-card-bg w-full max-w-lg rounded-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Új feladat</h2>
              <button
                onClick={() => {
                  setShowNewTaskModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cím
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="Feladat címe..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Leírás
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="Feladat leírása..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as TaskType })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.values(TaskType).map(type => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioritás
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value, 10) as TaskPriority,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {([0, 1, 2] as TaskPriority[]).map(priority => (
                      <option key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Határidő
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Quantity fields for shopping tasks */}
              {formData.type === TaskType.SHOPPING && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mennyiség
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Egység
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      placeholder="db"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowNewTaskModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Mégse
              </button>
              <button
                onClick={handleCreateTask}
                disabled={mutations.isLoading || !formData.title.trim()}
                className="rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90 disabled:opacity-50"
              >
                Létrehozás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
