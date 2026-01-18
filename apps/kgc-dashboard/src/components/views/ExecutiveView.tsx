import {
  useActiveStories,
  useEpics,
  useReviewStats,
  useStats,
  useTestStats,
} from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';

export function ExecutiveView() {
  const stats = useStats();
  const epics = useEpics();
  const activeStories = useActiveStories();
  const testStats = useTestStats();
  const reviewStats = useReviewStats();

  const doneEpics = epics.filter(e => e.status === 'DONE');
  const inProgressEpics = epics.filter(e => e.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon="📦"
          label="Epics"
          value={stats.completedEpics}
          total={stats.totalEpics}
          color="primary"
        />
        <KPICard
          icon="📄"
          label="Stories"
          value={stats.completedStories}
          total={stats.totalStories}
          color="success"
        />
        <KPICard
          icon="✅"
          label="Tesztek"
          value={testStats.data?.totalPassing ?? 0}
          total={testStats.data?.totalTests ?? 0}
          color="info"
        />
        <KPICard
          icon="🔍"
          label="Fix Rate"
          value={reviewStats.data?.fixRate ?? 0}
          suffix="%"
          color="warning"
        />
      </div>

      {/* Progress Overview */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary mb-4">
          Projekt Haladás
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Összes haladás</span>
              <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {stats.progressPercent}%
              </span>
            </div>
            <div className="progress-mystic">
              <div className="progress-fill" style={{ width: `${stats.progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {doneEpics.length}
              </p>
              <p className="text-xs text-muted-foreground">Kész Epic</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-2xl font-bold text-primary">{inProgressEpics.length}</p>
              <p className="text-xs text-muted-foreground">Folyamatban</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10">
              <p className="text-2xl font-bold text-muted-foreground">
                {stats.totalEpics - doneEpics.length - inProgressEpics.length}
              </p>
              <p className="text-xs text-muted-foreground">Backlog</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Work */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary mb-4">
            Aktív Munka ({activeStories.length})
          </h3>
          {activeStories.length > 0 ? (
            <div className="space-y-3">
              {activeStories.slice(0, 5).map(story => (
                <div
                  key={story.id}
                  className="p-3 bg-primary/10 border border-primary/20 rounded-lg hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{story.id}</span>
                    <span className="text-xs text-primary px-2 py-0.5 rounded-full bg-primary/20">
                      Epic {story.epic}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate group-hover:text-foreground/70 transition-colors">
                    {story.name}
                  </p>
                </div>
              ))}
              {activeStories.length > 5 && (
                <p className="text-xs text-muted-foreground/70 text-center">
                  +{activeStories.length - 5} további
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-3xl mb-2 block">🎉</span>
              <p>Minden story kész!</p>
            </div>
          )}
        </div>

        {/* Recently Completed */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-emerald-500 mb-4">
            Utoljára Befejezett Epics
          </h3>
          <div className="space-y-3">
            {doneEpics
              .slice(-5)
              .reverse()
              .map(epic => (
                <div
                  key={epic.epic}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Epic #{epic.epic}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Kész
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate group-hover:text-foreground/70 transition-colors">
                    {epic.name}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {epic.stories.length} story
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Test & Review Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Test Summary */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-cyan-500 mb-4">
            Teszt Összefoglaló
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-xl font-bold text-cyan-600 dark:text-cyan-300">
                {testStats.data?.unitTests ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Unit</p>
            </div>
            <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-300">
                {testStats.data?.integrationTests ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Integration</p>
            </div>
            <div className="text-center p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
              <p className="text-xl font-bold text-pink-600 dark:text-pink-300">
                {testStats.data?.e2eTests ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">E2E</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10">
            <span className="text-sm text-muted-foreground">Pass Rate</span>
            <span
              className={cn(
                'text-lg font-bold',
                (testStats.data?.passRate ?? 0) >= 90
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {testStats.data?.passRate ?? 0}%
            </span>
          </div>
        </div>

        {/* Review Summary */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-purple-500 mb-4">
            Code Review
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 rounded-lg">
              <p className="text-xl font-bold text-foreground">
                {reviewStats.data?.totalIssues ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Összes hiba</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {reviewStats.data?.fixedIssues ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Javítva</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm p-2 rounded bg-primary/10 border border-primary/20">
              <span className="text-foreground/70">Claude</span>
              <span className="text-primary font-medium">
                {reviewStats.data?.claudeStats?.totalIssues ?? 0} hiba
              </span>
            </div>
            <div className="flex justify-between text-sm p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-foreground/70">Gemini</span>
              <span className="text-cyan-600 dark:text-cyan-300 font-medium">
                {reviewStats.data?.geminiStats?.totalIssues ?? 0} hiba
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  total,
  suffix,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  total?: number;
  suffix?: string;
  color: 'primary' | 'success' | 'warning' | 'info';
}) {
  const colorClasses = {
    primary: {
      bg: 'from-primary/20 via-primary/10 to-transparent',
      border: 'border-primary/30',
      glow: 'shadow-primary/20',
      text: 'text-primary',
    },
    success: {
      bg: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-300',
    },
    warning: {
      bg: 'from-amber-500/20 via-amber-500/10 to-transparent',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20',
      text: 'text-amber-600 dark:text-amber-300',
    },
    info: {
      bg: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      text: 'text-cyan-600 dark:text-cyan-300',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border bg-gradient-to-br overflow-hidden group',
        'backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]',
        colors.bg,
        colors.border,
        `hover:shadow-lg hover:${colors.glow}`
      )}
    >
      {/* Subtle glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 dark:from-white/5 to-transparent" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-2xl font-bold', colors.text)}>{value}</span>
          {total !== undefined && (
            <span className="text-sm text-muted-foreground/70">/ {total}</span>
          )}
          {suffix && <span className="text-sm text-muted-foreground/70">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
