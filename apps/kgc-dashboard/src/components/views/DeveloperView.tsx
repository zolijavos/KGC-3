import { useEpics, useStats } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { Epic, Story } from '@/types/dashboard';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart color palette (matching StatisticsView)
const COLORS = {
  primary: '#d946ef',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#22d3ee',
  muted: '#6b7280',
  purple: '#a855f7',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(260, 45%, 10%)',
    border: '1px solid rgba(217, 70, 239, 0.3)',
    borderRadius: '8px',
  },
  labelStyle: { color: '#f3f4f6' },
};

const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'rgba(139, 92, 246, 0.2)' };
const AXIS_STYLE = { tick: { fill: '#9ca3af', fontSize: 11 } };

type TabId = 'overview' | 'epics' | 'stories';
type StatusFilter = 'all' | 'DONE' | 'IN_PROGRESS' | 'TODO';

export function DeveloperView() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const epics = useEpics();
  const stats = useStats();

  const filteredEpics =
    statusFilter === 'all' ? epics : epics.filter(e => e.status === statusFilter);

  const allStories = epics.flatMap(epic =>
    epic.stories.map(story => ({ ...story, epicId: epic.epic, epicName: epic.name }))
  );

  const filteredStories =
    statusFilter === 'all' ? allStories : allStories.filter(s => s.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: 'overview' as TabId, label: 'Áttekintés' },
          { id: 'epics' as TabId, label: 'Epics' },
          { id: 'stories' as TabId, label: 'Stories' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      {activeTab !== 'overview' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Szűrés:</span>
          {[
            { id: 'all' as StatusFilter, label: 'Mind' },
            { id: 'DONE' as StatusFilter, label: 'Kész', color: 'success' },
            { id: 'IN_PROGRESS' as StatusFilter, label: 'Folyamatban', color: 'warning' },
            { id: 'TODO' as StatusFilter, label: 'Tervezett', color: 'muted' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === filter.id
                  ? filter.color === 'success'
                    ? 'bg-success-500/20 text-success-400'
                    : filter.color === 'warning'
                      ? 'bg-warning-500/20 text-warning-400'
                      : 'bg-primary-500/20 text-primary-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} epics={epics} />}
      {activeTab === 'epics' && <EpicsTab epics={filteredEpics} />}
      {activeTab === 'stories' && <StoriesTab stories={filteredStories} />}
    </div>
  );
}

function OverviewTab({ stats, epics }: { stats: ReturnType<typeof useStats>; epics: Epic[] }) {
  const doneEpics = epics.filter(e => e.status === 'DONE').length;
  const inProgressEpics = epics.filter(e => e.status === 'IN_PROGRESS').length;
  const backlogEpics = epics.length - doneEpics - inProgressEpics;

  const doneStories = epics.reduce(
    (sum, e) => sum + e.stories.filter(s => s.status === 'DONE').length,
    0
  );
  const inProgressStories = epics.reduce(
    (sum, e) => sum + e.stories.filter(s => s.status === 'IN_PROGRESS').length,
    0
  );
  const backlogStories = stats.totalStories - doneStories - inProgressStories;

  // Story status pie data
  const storyPieData = [
    { name: 'Kész', value: doneStories, color: COLORS.success },
    { name: 'Folyamatban', value: inProgressStories, color: COLORS.warning },
    { name: 'Backlog', value: backlogStories, color: COLORS.muted },
  ].filter(d => d.value > 0);

  // Epic progress data for bar chart
  const epicProgressData = epics.slice(0, 12).map(epic => {
    const done = epic.stories.filter(s => s.status === 'DONE').length;
    const total = epic.stories.length;
    return {
      name: `E${epic.epic}`,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      done,
      total,
    };
  });

  // Velocity/completion trend (simulated based on epic order)
  const velocityData = epics
    .filter(e => e.status === 'DONE')
    .slice(-8)
    .map((epic, idx) => ({
      name: `E${epic.epic}`,
      stories: epic.stories.length,
      cumulative: epics
        .filter(e => e.status === 'DONE')
        .slice(0, idx + 1)
        .reduce((sum, e) => sum + e.stories.length, 0),
    }));

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">📦</span>
          <p className="text-3xl font-bold text-foreground mt-1">{epics.length}</p>
          <p className="text-xs text-muted-foreground">Összes Epic</p>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">📋</span>
          <p className="text-3xl font-bold text-foreground mt-1">{stats.totalStories}</p>
          <p className="text-xs text-muted-foreground">Összes Story</p>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-3xl font-bold text-success-500 mt-1">{doneStories}</p>
          <p className="text-xs text-muted-foreground">Befejezett</p>
        </div>
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">🎯</span>
          <p className="text-3xl font-bold text-primary mt-1">{stats.progressPercent}%</p>
          <p className="text-xs text-muted-foreground">Haladás</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Story Status Donut */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Story Státusz Eloszlás</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={storyPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                labelLine={false}
              >
                {storyPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {storyPieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Epic Progress Bars */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Epic Haladás (%)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={epicProgressData} layout="vertical">
              <CartesianGrid {...GRID_STYLE} />
              <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE.tick} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE.tick} width={40} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(
                  value: number,
                  _name: string,
                  props: { payload: { done: number; total: number } }
                ) => [`${value}% (${props.payload.done}/${props.payload.total})`, 'Haladás']}
              />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {epicProgressData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.progress === 100
                        ? COLORS.success
                        : entry.progress > 0
                          ? COLORS.warning
                          : COLORS.muted
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Trend */}
        {velocityData.length > 0 && (
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Befejezési Trend (Kumulatív)
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={velocityData}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="name" tick={AXIS_STYLE.tick} />
                <YAxis tick={AXIS_STYLE.tick} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.3}
                  name="Összes befejezett"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Epic/Story Stats Bars */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Epic & Story Összesítés</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Epics</span>
                <span className="text-foreground">
                  {doneEpics}/{epics.length}
                </span>
              </div>
              <StatBar label="" value={doneEpics} total={epics.length} color="success" />
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-success-400">{doneEpics} kész</span>
                <span className="text-warning-400">{inProgressEpics} aktív</span>
                <span className="text-muted-foreground">{backlogEpics} backlog</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Stories</span>
                <span className="text-foreground">
                  {doneStories}/{stats.totalStories}
                </span>
              </div>
              <StatBar label="" value={doneStories} total={stats.totalStories} color="success" />
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-success-400">{doneStories} kész</span>
                <span className="text-warning-400">{inProgressStories} aktív</span>
                <span className="text-muted-foreground">{backlogStories} backlog</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Work */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Folyamatban Lévő Epics</h4>
        {epics.filter(e => e.status === 'IN_PROGRESS').length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {epics
              .filter(e => e.status === 'IN_PROGRESS')
              .map(epic => (
                <EpicProgressCard key={epic.epic} epic={epic} />
              ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <span className="text-2xl mb-2 block">🎉</span>
            <p>Nincs folyamatban lévő epic</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EpicsTab({ epics }: { epics: Epic[] }) {
  const { openDrawer } = useDashboardStore();

  return (
    <div className="grid gap-4">
      {epics.map(epic => {
        const doneStories = epic.stories.filter(s => s.status === 'DONE').length;
        const progress =
          epic.stories.length > 0 ? Math.round((doneStories / epic.stories.length) * 100) : 0;

        return (
          <button
            key={epic.epic}
            onClick={() => openDrawer('epic', epic)}
            className={cn(
              'card text-left hover:ring-1 hover:ring-primary-500/50 transition-all',
              epic.status === 'DONE' && 'border-success-500/30',
              epic.status === 'IN_PROGRESS' && 'border-warning-500/30'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-foreground">Epic #{epic.epic}</span>
                  <StatusBadge status={epic.status} />
                </div>
                <p className="text-sm text-muted-foreground">{epic.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {doneStories}/{epic.stories.length}
                </p>
                <p className="text-xs text-muted-foreground">stories</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    epic.status === 'DONE' ? 'bg-success-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </button>
        );
      })}

      {epics.length === 0 && (
        <div className="card text-center py-12 text-muted-foreground">
          <span className="text-3xl mb-2 block">🔍</span>
          <p>Nincs találat a szűrőnek</p>
        </div>
      )}
    </div>
  );
}

function StoriesTab({ stories }: { stories: (Story & { epicId: string; epicName: string })[] }) {
  const { openDrawer } = useDashboardStore();

  return (
    <div className="space-y-2">
      {stories.map(story => (
        <button
          key={story.id}
          onClick={() => openDrawer('story', story)}
          className={cn(
            'w-full card text-left p-3 hover:ring-1 hover:ring-primary-500/50 transition-all',
            story.status === 'DONE' && 'border-success-500/30',
            story.status === 'IN_PROGRESS' && 'border-warning-500/30'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{story.id}</span>
                <StatusBadge status={story.status} small />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{story.name}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">Epic {story.epicId}</span>
          </div>
        </button>
      ))}

      {stories.length === 0 && (
        <div className="card text-center py-12 text-muted-foreground">
          <span className="text-3xl mb-2 block">🔍</span>
          <p>Nincs találat a szűrőnek</p>
        </div>
      )}
    </div>
  );
}

function EpicProgressCard({ epic }: { epic: Epic }) {
  const { openDrawer } = useDashboardStore();
  const doneStories = epic.stories.filter(s => s.status === 'DONE').length;
  const inProgressStories = epic.stories.filter(s => s.status === 'IN_PROGRESS').length;
  const progress =
    epic.stories.length > 0 ? Math.round((doneStories / epic.stories.length) * 100) : 0;

  return (
    <button
      onClick={() => openDrawer('epic', epic)}
      className="w-full p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg text-left hover:bg-warning-500/15 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Epic #{epic.epic}</span>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <p className="text-xs text-muted-foreground truncate mb-2">{epic.name}</p>
      <div className="h-1 bg-background rounded-full overflow-hidden">
        <div
          className="h-full bg-warning-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="text-success-400">{doneStories} kész</span>
        <span className="text-warning-400">{inProgressStories} aktív</span>
      </div>
    </button>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'success' | 'warning' | 'muted';
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorClass = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    muted: 'bg-muted-foreground',
  }[color];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const config = {
    DONE: { bg: 'bg-success-500/20', text: 'text-success-400', label: 'Kész' },
    IN_PROGRESS: { bg: 'bg-warning-500/20', text: 'text-warning-400', label: 'Folyamatban' },
    TODO: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Tervezett' },
    BACKLOG: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Backlog' },
  }[status] ?? { bg: 'bg-muted', text: 'text-muted-foreground', label: status };

  return (
    <span
      className={cn(
        'inline-flex rounded font-medium',
        config.bg,
        config.text,
        small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
      )}
    >
      {config.label}
    </span>
  );
}
