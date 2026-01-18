import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { Epic, Review, Story } from '@/types/dashboard';

export function Drawer() {
  const { drawer, closeDrawer } = useDashboardStore();

  if (!drawer.isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-card z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {drawer.type === 'epic' && 'Epic Részletek'}
            {drawer.type === 'story' && 'Story Részletek'}
            {drawer.type === 'review' && 'Review Részletek'}
          </h2>
          <button
            onClick={closeDrawer}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {drawer.type === 'epic' && drawer.data && <EpicDetail epic={drawer.data as Epic} />}
          {drawer.type === 'story' && drawer.data && <StoryDetail story={drawer.data as Story} />}
          {drawer.type === 'review' && drawer.data && (
            <ReviewDetail review={drawer.data as Review} />
          )}
        </div>
      </aside>
    </>
  );
}

function EpicDetail({ epic }: { epic: Epic }) {
  const doneStories = epic.stories.filter(s => s.status === 'DONE').length;
  const inProgressStories = epic.stories.filter(s => s.status === 'IN_PROGRESS').length;
  const progress =
    epic.stories.length > 0 ? Math.round((doneStories / epic.stories.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📦</span>
          <div>
            <h3 className="text-xl font-bold text-foreground">Epic #{epic.epic}</h3>
            <p className="text-muted-foreground">{epic.name}</p>
          </div>
        </div>
        <StatusBadge status={epic.status} />
      </div>

      {/* Progress */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Haladás</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{doneStories} kész</span>
          <span>{inProgressStories} folyamatban</span>
          <span>{epic.stories.length - doneStories - inProgressStories} hátra</span>
        </div>
      </div>

      {/* Stories */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Stories ({epic.stories.length})
        </h4>
        <div className="space-y-2">
          {epic.stories.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryDetail({ story }: { story: Story }) {
  const tasks = story.tasks ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📄</span>
          <div>
            <h3 className="text-xl font-bold text-foreground">Story #{story.id}</h3>
            <p className="text-muted-foreground">{story.name}</p>
          </div>
        </div>
        <StatusBadge status={story.status} />
      </div>

      {/* Tasks - now displayed as simple list of task names */}
      {tasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Feladatok ({tasks.length})</h4>
          <div className="space-y-2">
            {tasks.map((taskName, index) => (
              <div key={index} className="p-3 rounded-lg border bg-muted border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📋</span>
                  <span className="text-sm text-foreground">{taskName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <span className="text-3xl mb-2 block">📋</span>
          <p>Nincsenek részfeladatok</p>
        </div>
      )}
    </div>
  );
}

function ReviewDetail({ review }: { review: Review }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🔍</span>
          <div>
            <h3 className="text-xl font-bold text-foreground">Story #{review.storyId}</h3>
            <p className="text-muted-foreground">{review.story}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Talált hibák" value={review.issuesFound} />
        <StatCard label="Javítva" value={review.issuesFixed} color="success" />
        <StatCard label="Claude" value={review.claudeIssues} />
        <StatCard label="Gemini" value={review.geminiIssues} />
      </div>

      {/* Severity */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Súlyosság</h4>
        <div className="flex gap-2 flex-wrap">
          {(review.severityCounts.critical ?? 0) > 0 && (
            <SeverityBadge level="critical" count={review.severityCounts.critical ?? 0} />
          )}
          {(review.severityCounts.major ?? 0) > 0 && (
            <SeverityBadge level="major" count={review.severityCounts.major ?? 0} />
          )}
          {(review.severityCounts.minor ?? 0) > 0 && (
            <SeverityBadge level="minor" count={review.severityCounts.minor ?? 0} />
          )}
          {(review.severityCounts.suggestion ?? 0) > 0 && (
            <SeverityBadge level="suggestion" count={review.severityCounts.suggestion ?? 0} />
          )}
        </div>
      </div>

      {/* Issues */}
      {review.issues.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Hibák ({review.issues.length})
          </h4>
          <div className="space-y-3">
            {review.issues.map(issue => (
              <div
                key={issue.id}
                className={cn(
                  'p-3 rounded-lg border',
                  issue.fixed
                    ? 'bg-success-500/10 border-success-500/20'
                    : 'bg-danger-500/10 border-danger-500/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                    {issue.file && (
                      <p className="text-xs text-primary-400 mt-1">
                        {issue.file}:{issue.line}
                      </p>
                    )}
                  </div>
                  <span className="text-sm">{issue.fixed ? '✅' : '⚠️'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <SeverityBadge level={issue.severity} small />
                  <span className="text-xs text-muted-foreground">by {issue.reviewer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }: { story: Story }) {
  const { openDrawer } = useDashboardStore();

  return (
    <button
      onClick={() => openDrawer('story', story)}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        story.status === 'DONE'
          ? 'bg-success-500/10 border-success-500/20 hover:bg-success-500/20'
          : story.status === 'IN_PROGRESS'
            ? 'bg-warning-500/10 border-warning-500/20 hover:bg-warning-500/20'
            : 'bg-muted border-border hover:bg-muted/80'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {story.status === 'DONE' ? '✅' : story.status === 'IN_PROGRESS' ? '🔄' : '⏳'}
          </span>
          <span className="text-sm text-foreground">{story.id}</span>
        </div>
        <span className="text-xs text-muted-foreground">→</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 truncate">{story.name}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    DONE: { bg: 'bg-success-500/20', text: 'text-success-400', label: 'Kész' },
    IN_PROGRESS: { bg: 'bg-warning-500/20', text: 'text-warning-400', label: 'Folyamatban' },
    TODO: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Tervezett' },
    BACKLOG: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Backlog' },
  }[status] ?? { bg: 'bg-muted', text: 'text-muted-foreground', label: status };

  return (
    <span
      className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', config.bg, config.text)}
    >
      {config.label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'success' }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-xl font-bold',
          color === 'success' ? 'text-success-400' : 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SeverityBadge({
  level,
  count,
  small,
}: {
  level: string;
  count?: number;
  small?: boolean;
}) {
  const config = {
    critical: { bg: 'bg-danger-500/20', text: 'text-danger-400' },
    major: { bg: 'bg-warning-500/20', text: 'text-warning-400' },
    minor: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
    suggestion: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }[level] ?? { bg: 'bg-muted', text: 'text-muted-foreground' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium',
        config.bg,
        config.text,
        small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}
    >
      {level}
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}
