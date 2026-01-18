import { useState } from 'react';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate: Date;
  tags: string[];
  comments: number;
  attachments: number;
  createdAt: Date;
}

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Makita fúrókalapács javítása',
    description: 'Szénkefe csere és kenés szükséges',
    status: 'todo',
    priority: 'high',
    assignee: { id: '1', name: 'Kovács Péter' },
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    tags: ['szerviz', 'makita'],
    comments: 3,
    attachments: 1,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Készlet ellenőrzés - sarokcsiszolók',
    description: 'Havi készletleltár elvégzése',
    status: 'todo',
    priority: 'medium',
    assignee: { id: '2', name: 'Nagy Anna' },
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    tags: ['készlet', 'leltár'],
    comments: 0,
    attachments: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Új partner regisztráció - Építő Kft.',
    description: 'Szerződés és adatok rögzítése',
    status: 'in_progress',
    priority: 'medium',
    assignee: { id: '3', name: 'Szabó Gábor' },
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    tags: ['partner', 'admin'],
    comments: 5,
    attachments: 2,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    title: 'Bosch GBH visszavétel',
    description: 'Ügyfél: Molnár János - bérlés #B-2024-0089',
    status: 'in_progress',
    priority: 'high',
    assignee: { id: '1', name: 'Kovács Péter' },
    dueDate: new Date(Date.now()),
    tags: ['bérlés', 'visszavétel'],
    comments: 2,
    attachments: 0,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    title: 'NAV számla egyeztetés',
    description: 'Havi ÁFA bevallás előkészítése',
    status: 'review',
    priority: 'urgent',
    assignee: { id: '4', name: 'Kiss Éva' },
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    tags: ['pénzügy', 'nav'],
    comments: 8,
    attachments: 4,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    title: 'Webshop termék feltöltés',
    description: '15 új termék fotózása és leírása',
    status: 'review',
    priority: 'low',
    assignee: { id: '2', name: 'Nagy Anna' },
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    tags: ['marketing', 'webshop'],
    comments: 1,
    attachments: 15,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7',
    title: 'Heti riport készítés',
    description: 'Értékesítési és bérlési összesítő',
    status: 'done',
    priority: 'medium',
    assignee: { id: '4', name: 'Kiss Éva' },
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    tags: ['riport', 'pénzügy'],
    comments: 2,
    attachments: 1,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '8',
    title: 'Kärcher K5 bérlés előkészítés',
    description: 'Tisztítás és működés ellenőrzés',
    status: 'done',
    priority: 'high',
    assignee: { id: '1', name: 'Kovács Péter' },
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    tags: ['bérlés', 'előkészítés'],
    comments: 0,
    attachments: 0,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const TEAM_MEMBERS = [
  { id: '1', name: 'Kovács Péter' },
  { id: '2', name: 'Nagy Anna' },
  { id: '3', name: 'Szabó Gábor' },
  { id: '4', name: 'Kiss Éva' },
];

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo: {
    label: 'Teendő',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  in_progress: {
    label: 'Folyamatban',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  review: {
    label: 'Ellenőrzés',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  done: {
    label: 'Kész',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Alacsony', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  medium: { label: 'Közepes', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  high: {
    label: 'Magas',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  urgent: { label: 'Sürgős', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter(task => {
    if (filterAssignee !== 'all' && task.assignee.id !== filterAssignee) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter(t => t.status === status);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `${Math.abs(days)} napja lejárt`, isOverdue: true };
    if (days === 0) return { text: 'Ma', isOverdue: false };
    if (days === 1) return { text: 'Holnap', isOverdue: false };
    return { text: date.toLocaleDateString('hu-HU'), isOverdue: false };
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask) {
      setTasks(tasks.map(t => (t.id === draggedTask.id ? { ...t, status } : t)));
      setDraggedTask(null);
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const dueInfo = formatDate(task.dueDate);

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task)}
        onClick={() => setSelectedTask(task)}
        className="kgc-card-bg cursor-pointer rounded-lg border border-gray-200 p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700"
      >
        {/* Priority & Tags */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[task.priority].bgColor} ${PRIORITY_CONFIG[task.priority].color}`}
          >
            {PRIORITY_CONFIG[task.priority].label}
          </span>
          {task.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h4 className="mb-1 font-medium text-gray-900 dark:text-white">{task.title}</h4>
        <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {task.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Assignee */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-xs font-medium text-white">
              {task.assignee.name.charAt(0)}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {task.assignee.name.split(' ')[1]}
            </span>
          </div>

          {/* Due date */}
          <span
            className={`text-xs ${dueInfo.isOverdue ? 'font-medium text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {dueInfo.text}
          </span>
        </div>

        {/* Meta info */}
        {(task.comments > 0 || task.attachments > 0) && (
          <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
            {task.comments > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {task.comments}
              </span>
            )}
            {task.attachments > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                {task.attachments}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const KanbanColumn = ({ status }: { status: TaskStatus }) => {
    const columnTasks = getTasksByStatus(status);
    const config = STATUS_CONFIG[status];

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(status)}
        className="flex min-h-[500px] w-80 flex-shrink-0 flex-col rounded-lg bg-gray-50 dark:bg-gray-800/50"
      >
        {/* Column header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${config.bgColor}`} />
            <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {columnTasks.length}
            </span>
          </div>
          <button className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>

        {/* Tasks */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Nincs feladat
            </div>
          )}
        </div>
      </div>
    );
  };

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

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Minden felelős</option>
            {TEAM_MEMBERS.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Minden prioritás</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                {filteredTasks.length}
              </span>{' '}
              feladat
            </span>
            <span className="text-red-600">
              <span className="font-medium">
                {filteredTasks.filter(t => t.priority === 'urgent').length}
              </span>{' '}
              sürgős
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto p-6">
        <div className="flex gap-6">
          <KanbanColumn status="todo" />
          <KanbanColumn status="in_progress" />
          <KanbanColumn status="review" />
          <KanbanColumn status="done" />
        </div>
      </div>

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
                    className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[selectedTask.priority].bgColor} ${PRIORITY_CONFIG[selectedTask.priority].color}`}
                  >
                    {PRIORITY_CONFIG[selectedTask.priority].label}
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
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Leírás
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedTask.description}</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Felelős
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-kgc-primary text-sm font-medium text-white">
                      {selectedTask.assignee.name.charAt(0)}
                    </div>
                    <span className="text-gray-900 dark:text-white">
                      {selectedTask.assignee.name}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Határidő
                  </h3>
                  <p
                    className={`${formatDate(selectedTask.dueDate).isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                  >
                    {selectedTask.dueDate.toLocaleDateString('hu-HU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Címkék
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick status change */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Státusz módosítása
                </h3>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setTasks(tasks.map(t => (t.id === selectedTask.id ? { ...t, status } : t)));
                        setSelectedTask({ ...selectedTask, status });
                      }}
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
              <button className="rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90">
                Szerkesztés
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
                onClick={() => setShowNewTaskModal(false)}
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="Feladat leírása..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Felelős
                  </label>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    {TEAM_MEMBERS.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioritás
                  </label>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Címkék
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="Címkék vesszővel elválasztva..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Mégse
              </button>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90"
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
