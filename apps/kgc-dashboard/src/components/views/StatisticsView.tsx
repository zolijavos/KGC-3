import { useReviewStats, useSprintData, useTestStats } from '@/hooks/use-dashboard-data';
import type { DashboardStats, Epic, ReviewStats, TestStats } from '@/types/dashboard';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// AI Mystic Color Palette
const COLORS = {
  primary: '#d946ef', // Magenta
  secondary: '#8b5cf6', // Purple
  accent: '#06b6d4', // Cyan
  success: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  info: '#22d3ee', // Cyan light
  muted: '#6b7280', // Gray
  purple: '#a855f7', // Violet
  pink: '#ec4899', // Pink
};

// Chart tooltip styling
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(260, 45%, 10%)',
    border: '1px solid rgba(217, 70, 239, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  labelStyle: { color: '#f3f4f6' },
  itemStyle: { color: '#d8b4fe' },
};

// Chart grid styling
const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'rgba(139, 92, 246, 0.2)',
};

const AXIS_STYLE = {
  tick: { fill: '#9ca3af', fontSize: 12 },
  axisLine: { stroke: 'rgba(139, 92, 246, 0.3)' },
};

export function StatisticsView() {
  const { data: sprintData } = useSprintData();
  const { data: testStats } = useTestStats();
  const { data: reviewStats } = useReviewStats();

  const epics = sprintData?.epics ?? [];
  const stats = sprintData?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary to-accent">
          Statisztikak
        </h1>
        <p className="text-muted-foreground">Reszletes projekt metrikak es analitika</p>
      </div>

      {/* Sprint Progress Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Sprint Haladas
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SprintBurndownChart epics={epics} />
          <VelocityChart />
        </div>
      </section>

      {/* Epic Overview Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Epic Attekintes
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EpicStatusPieChart stats={stats} />
          <StoryDistributionChart epics={epics} />
        </div>
        <EpicTimelineChart epics={epics} />
      </section>

      {/* Test Metrics Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Teszt Metrikak
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TestTypePieChart testStats={testStats} />
          <TestCoverageChart testStats={testStats} />
        </div>
      </section>

      {/* Code Review Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Code Review Analitika
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeverityDistributionChart reviewStats={reviewStats} />
          <ReviewerComparisonChart reviewStats={reviewStats} />
        </div>
        <FixRateTrendChart reviewStats={reviewStats} />
      </section>

      {/* Team Performance Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Csapat Teljesitmeny
        </h2>
        <TeamPerformanceStats stats={stats} epics={epics} />
      </section>

      {/* Project Health Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary border-b border-primary-500/20 pb-2">
          Projekt Egeszseg
        </h2>
        <ProjectHealthIndicators stats={stats} testStats={testStats} reviewStats={reviewStats} />
      </section>
    </div>
  );
}

// Sprint Burndown Chart
function SprintBurndownChart({ epics }: { epics: Epic[] }) {
  const totalStories = epics.reduce((acc: number, e: Epic) => acc + e.stories.length, 0);
  const completedStories = epics.reduce(
    (acc: number, e: Epic) => acc + e.stories.filter(s => s.status === 'DONE').length,
    0
  );

  const burndownData = [
    { sprint: 'Sprint 1', remaining: totalStories, ideal: totalStories },
    {
      sprint: 'Sprint 2',
      remaining: Math.round(totalStories * 0.85),
      ideal: Math.round(totalStories * 0.875),
    },
    {
      sprint: 'Sprint 3',
      remaining: Math.round(totalStories * 0.7),
      ideal: Math.round(totalStories * 0.75),
    },
    {
      sprint: 'Sprint 4',
      remaining: Math.round(totalStories * 0.55),
      ideal: Math.round(totalStories * 0.625),
    },
    {
      sprint: 'Sprint 5',
      remaining: Math.round(totalStories * 0.4),
      ideal: Math.round(totalStories * 0.5),
    },
    {
      sprint: 'Sprint 6',
      remaining: Math.round(totalStories * 0.25),
      ideal: Math.round(totalStories * 0.375),
    },
    {
      sprint: 'Sprint 7',
      remaining: Math.round(totalStories * 0.12),
      ideal: Math.round(totalStories * 0.25),
    },
    {
      sprint: 'Sprint 8',
      remaining: totalStories - completedStories,
      ideal: Math.round(totalStories * 0.125),
    },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Burndown Chart</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={burndownData}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="sprint" tick={AXIS_STYLE.tick} />
          <YAxis tick={AXIS_STYLE.tick} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend />
          <Area
            type="monotone"
            dataKey="ideal"
            stroke={COLORS.muted}
            fill={COLORS.muted}
            fillOpacity={0.2}
            name="Idealis"
          />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.3}
            name="Tenyleges"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Velocity Chart
function VelocityChart() {
  const velocityData = [
    { sprint: 'Sprint 1', stories: 18 },
    { sprint: 'Sprint 2', stories: 22 },
    { sprint: 'Sprint 3', stories: 20 },
    { sprint: 'Sprint 4', stories: 19 },
    { sprint: 'Sprint 5', stories: 17 },
    { sprint: 'Sprint 6', stories: 16 },
    { sprint: 'Sprint 7', stories: 15 },
    { sprint: 'Sprint 8', stories: 9 },
  ];

  const avgVelocity = Math.round(
    velocityData.reduce((a, b) => a + b.stories, 0) / velocityData.length
  );

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">Sprint Velocity</h3>
        <span className="text-xs text-muted-foreground">Atlag: {avgVelocity} story/sprint</span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={velocityData}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="sprint" tick={AXIS_STYLE.tick} />
          <YAxis tick={AXIS_STYLE.tick} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="stories" fill={COLORS.primary} name="Stories" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Epic Status Pie Chart
function EpicStatusPieChart({ stats }: { stats: DashboardStats | undefined }) {
  const pieData = [
    { name: 'Kesz', value: stats?.doneEpics ?? 0, color: COLORS.success },
    { name: 'Folyamatban', value: stats?.inProgressEpics ?? 0, color: COLORS.warning },
    { name: 'Backlog', value: stats?.backlogEpics ?? 0, color: COLORS.muted },
  ].filter(d => d.value > 0);

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Epic Statusz Eloszlas</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
            labelLine={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {pieData.map(entry => (
          <div key={entry.name} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Story Distribution by Epic
function StoryDistributionChart({ epics }: { epics: Epic[] }) {
  const storyData = epics
    .map((epic: Epic) => ({
      name: `E${epic.epic}`,
      done: epic.stories.filter(s => s.status === 'DONE').length,
      inProgress: epic.stories.filter(s => s.status === 'IN_PROGRESS').length,
      todo: epic.stories.filter(s => s.status === 'TODO').length,
    }))
    .slice(0, 15);

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Story Eloszlas Epic-enkent</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={storyData} layout="horizontal">
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis tick={AXIS_STYLE.tick} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="done" stackId="a" fill={COLORS.success} name="Kesz" />
          <Bar dataKey="inProgress" stackId="a" fill={COLORS.warning} name="Folyamatban" />
          <Bar dataKey="todo" stackId="a" fill={COLORS.muted} name="Hatra" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Epic Timeline Chart
function EpicTimelineChart({ epics }: { epics: Epic[] }) {
  const completedEpics = epics.filter((e: Epic) => e.status === 'DONE');
  const timelineData = completedEpics.map((epic: Epic, index: number) => ({
    name: epic.name.substring(0, 15) + (epic.name.length > 15 ? '...' : ''),
    epic: `Epic ${epic.epic}`,
    stories: epic.stories.length,
    order: index + 1,
  }));

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Epic Befejezesi Timeline ({completedEpics.length} kesz)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={timelineData}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="order" tick={AXIS_STYLE.tick} />
          <YAxis tick={AXIS_STYLE.tick} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Line
            type="monotone"
            dataKey="stories"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ fill: COLORS.primary, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Test Type Pie Chart
function TestTypePieChart({ testStats }: { testStats: TestStats | undefined }) {
  const testData = [
    { name: 'Unit', value: testStats?.unitTests ?? 0, color: COLORS.primary },
    { name: 'Integration', value: testStats?.integrationTests ?? 0, color: COLORS.info },
    { name: 'E2E', value: testStats?.e2eTests ?? 0, color: COLORS.purple },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Teszt Tipus Eloszlas</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={testData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
          >
            {testData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {testData.map(entry => (
          <div key={entry.name} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Test Coverage Chart
function TestCoverageChart({ testStats }: { testStats: TestStats | undefined }) {
  const coverageData = [
    { sprint: 'S1', coverage: 65, passRate: 92 },
    { sprint: 'S2', coverage: 72, passRate: 95 },
    { sprint: 'S3', coverage: 78, passRate: 97 },
    { sprint: 'S4', coverage: 82, passRate: 98 },
    { sprint: 'S5', coverage: 85, passRate: 99 },
    { sprint: 'S6', coverage: 86, passRate: 99 },
    { sprint: 'S7', coverage: 87, passRate: 100 },
    { sprint: 'S8', coverage: testStats?.coverage ?? 87.5, passRate: testStats?.passRate ?? 100 },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Coverage & Pass Rate Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={coverageData}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="sprint" tick={AXIS_STYLE.tick} />
          <YAxis tick={AXIS_STYLE.tick} domain={[50, 100]} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend />
          <Line
            type="monotone"
            dataKey="coverage"
            stroke={COLORS.primary}
            name="Coverage %"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke={COLORS.success}
            name="Pass Rate %"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Severity Distribution Chart
function SeverityDistributionChart({ reviewStats }: { reviewStats: ReviewStats | undefined }) {
  const severityData =
    reviewStats?.severityDistribution?.map(item => ({
      name: item.level.charAt(0).toUpperCase() + item.level.slice(1),
      value: item.count,
      color:
        item.level === 'critical'
          ? COLORS.danger
          : item.level === 'major'
            ? COLORS.warning
            : item.level === 'minor'
              ? COLORS.info
              : COLORS.muted,
    })) ?? [];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Hiba Sulyossag Eloszlas</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={severityData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
          >
            {severityData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Reviewer Comparison Chart
function ReviewerComparisonChart({ reviewStats }: { reviewStats: ReviewStats | undefined }) {
  const comparisonData = [
    {
      name: 'Claude',
      issues: reviewStats?.claudeStats?.totalIssues ?? 0,
      unique: reviewStats?.claudeStats?.uniqueFindings ?? 0,
    },
    {
      name: 'Gemini',
      issues: reviewStats?.geminiStats?.totalIssues ?? 0,
      unique: reviewStats?.geminiStats?.uniqueFindings ?? 0,
    },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Claude vs Gemini Osszehasonlitas
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={comparisonData} layout="vertical">
          <CartesianGrid {...GRID_STYLE} />
          <XAxis type="number" tick={AXIS_STYLE.tick} />
          <YAxis type="category" dataKey="name" tick={AXIS_STYLE.tick} width={60} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="issues" fill={COLORS.primary} name="Osszes hiba" radius={[0, 4, 4, 0]} />
          <Bar dataKey="unique" fill={COLORS.success} name="Egyedi talalt" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Fix Rate Trend Chart
function FixRateTrendChart({ reviewStats }: { reviewStats: ReviewStats | undefined }) {
  const fixRateData = [
    { review: 'Story 1.1', found: 5, fixed: 5 },
    { review: 'Story 1.2', found: 3, fixed: 3 },
    { review: 'Story 2.1', found: 7, fixed: 6 },
    { review: 'Story 17.1', found: 8, fixed: 6 },
  ];

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">Fix Rate Trend</h3>
        <span className="text-xs text-success-400">
          Atlagos fix rate: {reviewStats?.fixRate ?? 87}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={fixRateData}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="review" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis tick={AXIS_STYLE.tick} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="found" fill={COLORS.danger} name="Talalt" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fixed" fill={COLORS.success} name="Javitva" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Team Performance Stats
function TeamPerformanceStats({
  stats,
  epics,
}: {
  stats: DashboardStats | undefined;
  epics: Epic[];
}) {
  const totalStories = stats?.totalStories ?? 0;
  const completedStories = stats?.doneStories ?? 0;
  const avgStoriesPerEpic = epics.length > 0 ? Math.round(totalStories / epics.length) : 0;
  const completionRate = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

  const metrics = [
    { label: 'Osszes Story', value: totalStories, icon: '📋' },
    { label: 'Befejezett Story', value: completedStories, icon: '✅' },
    { label: 'Befejezesi Rata', value: `${completionRate}%`, icon: '📈' },
    { label: 'Atlag Story/Epic', value: avgStoriesPerEpic, icon: '📦' },
    { label: 'Aktiv Story', value: stats?.inProgressStories ?? 0, icon: '🔄' },
    { label: 'Hatra levo', value: stats?.pendingStories ?? 0, icon: '⏳' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map(metric => (
        <div key={metric.label} className="glass-card p-4 text-center">
          <span className="text-2xl mb-2 block">{metric.icon}</span>
          <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}

// Project Health Indicators
function ProjectHealthIndicators({
  stats,
  testStats,
  reviewStats,
}: {
  stats: DashboardStats | undefined;
  testStats: TestStats | undefined;
  reviewStats: ReviewStats | undefined;
}) {
  const healthMetrics = [
    {
      label: 'Projekt Haladas',
      value: stats?.progressPercent ?? 0,
      status:
        (stats?.progressPercent ?? 0) >= 80
          ? 'good'
          : (stats?.progressPercent ?? 0) >= 50
            ? 'warning'
            : 'danger',
      icon: '🎯',
    },
    {
      label: 'Teszt Coverage',
      value: testStats?.coverage ?? 0,
      status:
        (testStats?.coverage ?? 0) >= 80
          ? 'good'
          : (testStats?.coverage ?? 0) >= 60
            ? 'warning'
            : 'danger',
      icon: '🧪',
    },
    {
      label: 'Pass Rate',
      value: testStats?.passRate ?? 0,
      status:
        (testStats?.passRate ?? 0) >= 95
          ? 'good'
          : (testStats?.passRate ?? 0) >= 80
            ? 'warning'
            : 'danger',
      icon: '✓',
    },
    {
      label: 'Fix Rate',
      value: reviewStats?.fixRate ?? 0,
      status:
        (reviewStats?.fixRate ?? 0) >= 80
          ? 'good'
          : (reviewStats?.fixRate ?? 0) >= 60
            ? 'warning'
            : 'danger',
      icon: '🔧',
    },
    {
      label: 'Consensus Rate',
      value: reviewStats?.consensusRate ?? 0,
      status:
        (reviewStats?.consensusRate ?? 0) >= 70
          ? 'good'
          : (reviewStats?.consensusRate ?? 0) >= 50
            ? 'warning'
            : 'danger',
      icon: '🤝',
    },
    {
      label: 'Open Issues',
      value: reviewStats?.openIssues ?? 0,
      status:
        (reviewStats?.openIssues ?? 0) <= 5
          ? 'good'
          : (reviewStats?.openIssues ?? 0) <= 10
            ? 'warning'
            : 'danger',
      icon: '⚠️',
      isCount: true,
    },
  ];

  const statusColors = {
    good: 'bg-success-500/20 border-success-500/30 text-success-400',
    warning: 'bg-warning-500/20 border-warning-500/30 text-warning-400',
    danger: 'bg-danger-500/20 border-danger-500/30 text-danger-400',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {healthMetrics.map(metric => (
        <div
          key={metric.label}
          className={`rounded-xl p-4 text-center border ${statusColors[metric.status as keyof typeof statusColors]}`}
        >
          <span className="text-2xl mb-2 block">{metric.icon}</span>
          <p className="text-2xl font-bold">{metric.isCount ? metric.value : `${metric.value}%`}</p>
          <p className="text-xs opacity-80">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
