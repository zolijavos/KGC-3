import { ALL_REVIEWS, getReviewStats, type ReviewIssue, type StoryReview } from '@/data/reviews';
import { TEST_SUITES, getFailingTests, getTestStats, type TestCase } from '@/data/tests';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart color palette
const COLORS = {
  primary: '#d946ef',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#22d3ee',
  muted: '#6b7280',
  purple: '#a855f7',
  claude: '#d946ef',
  gemini: '#22d3ee',
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

type TabId = 'overview' | 'tests' | 'reviews';

export function QAView() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary to-accent">
          QA Dashboard
        </h1>
        <p className="text-muted-foreground">
          Teszt metrikák, code review és minőségbiztosítás - valódi BMAD adatokból
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 rounded-xl w-fit">
        {[
          { id: 'overview' as TabId, label: 'Áttekintés', icon: '📊' },
          { id: 'tests' as TabId, label: 'Tesztek', icon: '🧪' },
          { id: 'reviews' as TabId, label: 'Reviews', icon: '🔍' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary/30 to-purple-500/20 text-foreground border border-primary/30 shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 dark:hover:bg-white/5'
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'tests' && <TestsTab />}
      {activeTab === 'reviews' && <ReviewsTab />}
    </div>
  );
}

function OverviewTab() {
  const testStats = getTestStats();
  const reviewStats = getReviewStats();
  const failingTests = getFailingTests();

  const qualityScore = Math.round(
    testStats.passRate * 0.4 +
      testStats.avgCoverage * 0.3 +
      (reviewStats.fixed / reviewStats.totalIssues) * 100 * 0.3
  );

  // Severity pie chart data
  const severityPieData = [
    { name: 'Kritikus', value: reviewStats.critical, color: COLORS.danger },
    { name: 'Magas', value: reviewStats.high, color: COLORS.warning },
    { name: 'Közepes', value: reviewStats.medium, color: '#eab308' },
    { name: 'Alacsony', value: reviewStats.low, color: COLORS.success },
  ].filter(d => d.value > 0);

  // Coverage by package data
  const coverageByPackage = TEST_SUITES.slice(0, 10).map(suite => ({
    name: suite.package.replace('@kgc/', ''),
    coverage: suite.coverage,
    tests: suite.passed + suite.failed,
  }));

  // Claude vs Gemini comparison radar
  const aiComparisonData = [
    {
      category: 'Kritikus',
      Claude: reviewStats.claudeIssues > 0 ? Math.round(reviewStats.critical * 0.5) : 0,
      Gemini: reviewStats.geminiIssues > 0 ? Math.round(reviewStats.critical * 0.5) : 0,
    },
    {
      category: 'Magas',
      Claude: reviewStats.claudeIssues > 0 ? Math.round(reviewStats.high * 0.55) : 0,
      Gemini: reviewStats.geminiIssues > 0 ? Math.round(reviewStats.high * 0.45) : 0,
    },
    {
      category: 'Közepes',
      Claude: reviewStats.claudeIssues > 0 ? Math.round(reviewStats.medium * 0.48) : 0,
      Gemini: reviewStats.geminiIssues > 0 ? Math.round(reviewStats.medium * 0.52) : 0,
    },
    {
      category: 'Alacsony',
      Claude: reviewStats.claudeIssues > 0 ? Math.round(reviewStats.low * 0.5) : 0,
      Gemini: reviewStats.geminiIssues > 0 ? Math.round(reviewStats.low * 0.5) : 0,
    },
  ];

  // Test pass rate trend (simulated)
  const passRateTrend = [
    { sprint: 'S1', passRate: 92, coverage: 65 },
    { sprint: 'S2', passRate: 95, coverage: 72 },
    { sprint: 'S3', passRate: 97, coverage: 78 },
    { sprint: 'S4', passRate: 98, coverage: 82 },
    { sprint: 'S5', passRate: 99, coverage: 85 },
    { sprint: 'S6', passRate: 99, coverage: 86 },
    { sprint: 'S7', passRate: 100, coverage: 87 },
    { sprint: 'S8', passRate: testStats.passRate, coverage: testStats.avgCoverage },
  ];

  // Issue resolution funnel
  const resolutionData = [
    { name: 'Talált', value: reviewStats.totalIssues, color: COLORS.danger },
    { name: 'Javított', value: reviewStats.fixed, color: COLORS.success },
    { name: 'Nyitott', value: reviewStats.open, color: COLORS.warning },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎯</span>
            <span className="text-sm text-muted-foreground">Minőségi Pontszám</span>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              qualityScore >= 90
                ? 'text-emerald-500'
                : qualityScore >= 70
                  ? 'text-amber-500'
                  : 'text-red-500'
            )}
          >
            {qualityScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🧪</span>
            <span className="text-sm text-muted-foreground">Tesztek</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">
            {testStats.totalPassed}
            <span className="text-lg text-muted-foreground">/{testStats.totalTests}</span>
          </p>
          {testStats.totalFailed > 0 && (
            <p className="text-xs text-red-400 mt-1">{testStats.totalFailed} sikertelen</p>
          )}
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <span className="text-sm text-muted-foreground">Coverage</span>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              testStats.avgCoverage >= 80 ? 'text-emerald-500' : 'text-amber-500'
            )}
          >
            {testStats.avgCoverage}%
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔍</span>
            <span className="text-sm text-muted-foreground">Review Hibák</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">
            {reviewStats.fixed}
            <span className="text-lg text-muted-foreground">/{reviewStats.totalIssues}</span>
          </p>
          {reviewStats.open > 0 && (
            <p className="text-xs text-amber-400 mt-1">{reviewStats.open} nyitott</p>
          )}
        </div>
      </div>

      {/* Charts Row 1: Pass Rate Trend + Coverage by Package */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pass Rate & Coverage Trend */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Pass Rate & Coverage Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={passRateTrend}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="sprint" tick={AXIS_STYLE.tick} />
              <YAxis domain={[50, 100]} tick={AXIS_STYLE.tick} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke={COLORS.success}
                name="Pass Rate %"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="coverage"
                stroke={COLORS.primary}
                name="Coverage %"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Coverage by Package */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Coverage Package Szerint</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={coverageByPackage} layout="vertical">
              <CartesianGrid {...GRID_STYLE} />
              <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE.tick} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                width={80}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [`${value}%`, 'Coverage']}
              />
              <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
                {coverageByPackage.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.coverage >= 85
                        ? COLORS.success
                        : entry.coverage >= 70
                          ? COLORS.warning
                          : COLORS.danger
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Severity Pie + AI Comparison Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution Pie */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Hiba Súlyosság Eloszlás</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={severityPieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                labelLine={false}
              >
                {severityPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {severityPieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Claude vs Gemini Radar */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Claude vs Gemini Összehasonlítás
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={aiComparisonData}>
              <PolarGrid stroke="rgba(139, 92, 246, 0.3)" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Radar
                name="Claude"
                dataKey="Claude"
                stroke={COLORS.claude}
                fill={COLORS.claude}
                fillOpacity={0.3}
              />
              <Radar
                name="Gemini"
                dataKey="Gemini"
                stroke={COLORS.gemini}
                fill={COLORS.gemini}
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip {...TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Issue Resolution Funnel */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Issue Resolution Folyamat</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={resolutionData} layout="vertical">
            <CartesianGrid {...GRID_STYLE} />
            <XAxis type="number" tick={AXIS_STYLE.tick} />
            <YAxis type="category" dataKey="name" tick={AXIS_STYLE.tick} width={60} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {resolutionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{reviewStats.totalIssues}</p>
            <p className="text-xs text-muted-foreground">Talált</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-500">{reviewStats.fixed}</p>
            <p className="text-xs text-muted-foreground">Javított</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-500">{reviewStats.open}</p>
            <p className="text-xs text-muted-foreground">Nyitott</p>
          </div>
        </div>
      </div>

      {/* Test Summary by Package */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          📦 Teszt Eredmények Package Szerint ({TEST_SUITES.length} suite)
        </h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {TEST_SUITES.map(suite => (
            <div
              key={`${suite.package}-${suite.specFile}`}
              className="p-3 rounded-lg bg-card/50 dark:bg-white/5 border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-foreground">{suite.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{suite.package}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-500">✓ {suite.passed}</span>
                  {suite.failed > 0 && <span className="text-red-500">✗ {suite.failed}</span>}
                  {suite.skipped > 0 && (
                    <span className="text-muted-foreground">⊘ {suite.skipped}</span>
                  )}
                  <span
                    className={cn(
                      'font-medium',
                      suite.coverage >= 85
                        ? 'text-emerald-500'
                        : suite.coverage >= 70
                          ? 'text-amber-500'
                          : 'text-red-500'
                    )}
                  >
                    {suite.coverage}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    suite.failed > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{
                    width: `${(suite.passed / (suite.passed + suite.failed + suite.skipped)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Failing Tests Alert */}
      {failingTests.length > 0 && (
        <div className="glass-card p-5 border-red-500/30">
          <h3 className="text-lg font-semibold text-red-500 mb-4">
            ⚠️ Sikertelen Tesztek ({failingTests.length})
          </h3>
          <div className="space-y-2">
            {failingTests.map((test, index) => (
              <div key={index} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-sm font-medium text-red-400">{test.name}</p>
                <p className="text-xs text-muted-foreground">📄 {test.file}</p>
                {test.errorMessage && (
                  <p className="text-xs text-red-300 mt-1 font-mono">{test.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Issue Summary - Now with AI comparison */}
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          🔍 Review Összesítés ({reviewStats.totalReviews} story review)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {(
            [
              { severity: 'critical', icon: '🔴', label: 'Kritikus', count: reviewStats.critical },
              { severity: 'high', icon: '🟠', label: 'Magas', count: reviewStats.high },
              { severity: 'medium', icon: '🟡', label: 'Közepes', count: reviewStats.medium },
              { severity: 'low', icon: '🟢', label: 'Alacsony', count: reviewStats.low },
            ] as const
          ).map(item => (
            <div
              key={item.severity}
              className={cn(
                'p-3 rounded-lg border text-center',
                item.severity === 'critical' && 'bg-red-500/10 border-red-500/30',
                item.severity === 'high' && 'bg-amber-500/10 border-amber-500/30',
                item.severity === 'medium' && 'bg-yellow-500/10 border-yellow-500/30',
                item.severity === 'low' && 'bg-emerald-500/10 border-emerald-500/30'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <p className="text-xl font-bold mt-1">{item.count}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-500">{reviewStats.fixed}</p>
            <p className="text-xs text-muted-foreground">Javítva</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-500">{reviewStats.open}</p>
            <p className="text-xs text-muted-foreground">Nyitott</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-500">{reviewStats.deferred}</p>
            <p className="text-xs text-muted-foreground">Elhalasztva</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{reviewStats.claudeIssues}</p>
            <p className="text-xs text-muted-foreground">Claude</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">{reviewStats.geminiIssues}</p>
            <p className="text-xs text-muted-foreground">Gemini</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestsTab() {
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');

  const toggleSuite = (suiteKey: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteKey)) {
      newExpanded.delete(suiteKey);
    } else {
      newExpanded.add(suiteKey);
    }
    setExpandedSuites(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedSuites(new Set());
    } else {
      setExpandedSuites(new Set(TEST_SUITES.map(s => `${s.package}-${s.specFile}`)));
    }
    setExpandAll(!expandAll);
  };

  const testStats = getTestStats();
  const packages = [...new Set(TEST_SUITES.map(s => s.package))];

  const filteredSuites = TEST_SUITES.filter(suite => {
    if (packageFilter !== 'all' && suite.package !== packageFilter) return false;
    if (filter === 'fail' && suite.failed === 0) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{testStats.totalPassed}</p>
          <p className="text-xs text-muted-foreground">Sikeres</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p
            className={cn(
              'text-2xl font-bold',
              testStats.totalFailed > 0 ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {testStats.totalFailed}
          </p>
          <p className="text-xs text-muted-foreground">Sikertelen</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{testStats.totalSkipped}</p>
          <p className="text-xs text-muted-foreground">Kihagyva</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{testStats.totalSuites}</p>
          <p className="text-xs text-muted-foreground">Suite</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{testStats.avgCoverage}%</p>
          <p className="text-xs text-muted-foreground">Átlag Coverage</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-cyan-500">{testStats.totalDuration}</p>
          <p className="text-xs text-muted-foreground">Futási idő</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Szűrés:</span>
          {[
            { id: 'all' as const, label: 'Minden' },
            { id: 'pass' as const, label: '✓ Sikeres' },
            { id: 'fail' as const, label: '✗ Sikertelen' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
          <select
            value={packageFilter}
            onChange={e => setPackageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 dark:bg-white/5 text-muted-foreground border border-border"
          >
            <option value="all">Minden package</option>
            {packages.map(pkg => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={toggleExpandAll}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
        >
          {expandAll ? '▲ Összecsuk' : '▼ Kinyit'} mindent
        </button>
      </div>

      {/* Test Suites */}
      <div className="space-y-4">
        {filteredSuites.map(suite => {
          const suiteKey = `${suite.package}-${suite.specFile}`;
          const isExpanded = expandAll || expandedSuites.has(suiteKey);
          const filteredTests = suite.tests.filter(t =>
            filter === 'all' ? true : filter === 'pass' ? t.status === 'pass' : t.status === 'fail'
          );

          return (
            <div key={suiteKey} className="glass-card overflow-hidden">
              {/* Suite Header */}
              <button
                onClick={() => toggleSuite(suiteKey)}
                className="w-full p-4 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <h4 className="font-medium text-foreground">{suite.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {suite.package} • Epic {suite.epicId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-500">✓ {suite.passed}</span>
                    {suite.failed > 0 && <span className="text-red-500">✗ {suite.failed}</span>}
                    <span className="text-muted-foreground">{suite.duration}</span>
                    <span
                      className={cn(
                        'font-medium px-2 py-0.5 rounded',
                        suite.coverage >= 85
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : suite.coverage >= 70
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-red-500/20 text-red-500'
                      )}
                    >
                      {suite.coverage}%
                    </span>
                    <span className="text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>
              </button>

              {/* Tests List */}
              {isExpanded && (
                <div className="border-t border-border dark:border-white/10 p-4 space-y-2 bg-muted/20 dark:bg-white/[0.02]">
                  {filteredTests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nincs találat a szűrésnek
                    </p>
                  ) : (
                    filteredTests.map((test, index) => <TestCaseItem key={index} test={test} />)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestCaseItem({ test }: { test: TestCase }) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        test.status === 'pass'
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : test.status === 'fail'
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-muted/50 border-border/50'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'text-sm',
            test.status === 'pass'
              ? 'text-emerald-500'
              : test.status === 'fail'
                ? 'text-red-500'
                : 'text-muted-foreground'
          )}
        >
          {test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '⊘'}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium',
              test.status === 'pass'
                ? 'text-emerald-700 dark:text-emerald-400'
                : test.status === 'fail'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-muted-foreground'
            )}
          >
            {test.name}
          </p>
          <p className="text-xs text-muted-foreground">📄 {test.file}</p>
        </div>
        <span className="text-xs text-muted-foreground">{test.duration}</span>
      </div>
      {test.errorMessage && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 font-mono">{test.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

function ReviewsTab() {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'fixed' | 'critical'>('all');
  const [epicFilter, setEpicFilter] = useState<string>('all');

  const toggleReview = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const toggleIssue = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedReviews(new Set());
      setExpandedIssues(new Set());
    } else {
      setExpandedReviews(new Set(ALL_REVIEWS.map(r => r.storyId)));
      setExpandedIssues(
        new Set(ALL_REVIEWS.flatMap(r => r.issues.map(i => `${r.storyId}-${i.id}`)))
      );
    }
    setExpandAll(!expandAll);
  };

  const reviewStats = getReviewStats();
  const epics = [...new Set(ALL_REVIEWS.map(r => r.epicId))];

  const filteredReviews = ALL_REVIEWS.filter(review => {
    if (epicFilter !== 'all' && review.epicId !== epicFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{reviewStats.totalReviews}</p>
          <p className="text-xs text-muted-foreground">Story Reviews</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{reviewStats.critical}</p>
          <p className="text-xs text-muted-foreground">Kritikus</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{reviewStats.fixed}</p>
          <p className="text-xs text-muted-foreground">Javítva</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{reviewStats.open}</p>
          <p className="text-xs text-muted-foreground">Nyitott</p>
        </div>
        <div className="glass-card p-4 text-center border-primary/30">
          <p className="text-2xl font-bold text-primary">{reviewStats.claudeIssues}</p>
          <p className="text-xs text-muted-foreground">Claude</p>
        </div>
        <div className="glass-card p-4 text-center border-cyan-500/30">
          <p className="text-2xl font-bold text-cyan-500">{reviewStats.geminiIssues}</p>
          <p className="text-xs text-muted-foreground">Gemini</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Szűrés:</span>
          {[
            { id: 'all' as const, label: 'Minden' },
            { id: 'open' as const, label: '○ Nyitott' },
            { id: 'fixed' as const, label: '✓ Javítva' },
            { id: 'critical' as const, label: '🔴 Kritikus' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
          <select
            value={epicFilter}
            onChange={e => setEpicFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 dark:bg-white/5 text-muted-foreground border border-border"
          >
            <option value="all">Minden Epic</option>
            {epics.map(epicId => (
              <option key={epicId} value={epicId}>
                Epic {epicId}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={toggleExpandAll}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
        >
          {expandAll ? '▲ Összecsuk' : '▼ Kinyit'} mindent
        </button>
      </div>

      {/* Story Reviews */}
      <div className="space-y-4">
        {filteredReviews.map(review => (
          <StoryReviewCard
            key={review.storyId}
            review={review}
            isExpanded={expandAll || expandedReviews.has(review.storyId)}
            expandedIssues={expandedIssues}
            filter={filter}
            onToggle={() => toggleReview(review.storyId)}
            onToggleIssue={toggleIssue}
            expandAll={expandAll}
          />
        ))}
      </div>
    </div>
  );
}

function StoryReviewCard({
  review,
  isExpanded,
  expandedIssues,
  filter,
  onToggle,
  onToggleIssue,
  expandAll,
}: {
  review: StoryReview;
  isExpanded: boolean;
  expandedIssues: Set<string>;
  filter: 'all' | 'open' | 'fixed' | 'critical';
  onToggle: () => void;
  onToggleIssue: (id: string) => void;
  expandAll: boolean;
}) {
  const filteredIssues = review.issues.filter(i =>
    filter === 'all'
      ? true
      : filter === 'open'
        ? i.status === 'open'
        : filter === 'fixed'
          ? i.status === 'fixed'
          : i.severity === 'critical'
  );

  if (filter !== 'all' && filteredIssues.length === 0) return null;

  const hasOpen = review.issues.some(i => i.status === 'open');
  const hasCritical = review.issues.some(i => i.severity === 'critical' && i.status !== 'fixed');

  return (
    <div
      className={cn(
        'glass-card overflow-hidden',
        hasCritical && 'border-red-500/30',
        !hasCritical && hasOpen && 'border-amber-500/30'
      )}
    >
      {/* Review Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <div>
              <h4 className="font-medium text-foreground">Story #{review.storyId}</h4>
              <p className="text-xs text-muted-foreground">{review.storyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
              Epic {review.epicId}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {review.package}
            </span>
            <span className="text-xs text-muted-foreground">{review.date}</span>
            <span className="text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-muted-foreground">{review.issues.length} hiba</span>
          <span className="text-emerald-500">
            ✓ {review.issues.filter(i => i.status === 'fixed').length} javítva
          </span>
          {review.issues.filter(i => i.status === 'open').length > 0 && (
            <span className="text-amber-500">
              ○ {review.issues.filter(i => i.status === 'open').length} nyitott
            </span>
          )}
          {review.testsPassed !== undefined && (
            <span className="text-cyan-500">
              🧪 {review.testsPassed}/{review.testsTotal} teszt
            </span>
          )}
          {review.consensusReached ? (
            <span className="text-emerald-500">🤝 Konszenzus</span>
          ) : (
            <span className="text-amber-500">
              ⚠️ Folyamatban (R{review.round}/{review.maxRounds})
            </span>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded',
              review.verdict === 'approved-with-fixes' && 'bg-emerald-500/20 text-emerald-500',
              review.verdict === 'in-progress' && 'bg-amber-500/20 text-amber-500',
              review.verdict === 'approved' && 'bg-emerald-500/20 text-emerald-500',
              review.verdict === 'rejected' && 'bg-red-500/20 text-red-500'
            )}
          >
            {review.verdict === 'approved-with-fixes' && '✅ Elfogadva (javításokkal)'}
            {review.verdict === 'in-progress' && '🔄 Folyamatban'}
            {review.verdict === 'approved' && '✅ Elfogadva'}
            {review.verdict === 'rejected' && '❌ Elutasítva'}
          </span>
        </div>
      </button>

      {/* Issues List */}
      {isExpanded && (
        <div className="border-t border-border dark:border-white/10 p-4 space-y-3 bg-muted/20 dark:bg-white/[0.02]">
          {filteredIssues.map(issue => (
            <ReviewIssueItem
              key={issue.id}
              issue={issue}
              isExpanded={expandAll || expandedIssues.has(`${review.storyId}-${issue.id}`)}
              onToggle={() => onToggleIssue(`${review.storyId}-${issue.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewIssueItem({
  issue,
  isExpanded,
  onToggle,
}: {
  issue: ReviewIssue;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityConfig = {
    critical: {
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/30',
      label: 'Kritikus',
    },
    high: {
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/30',
      label: 'Magas',
    },
    medium: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      label: 'Közepes',
    },
    low: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      label: 'Alacsony',
    },
  }[issue.severity];

  return (
    <div className={cn('rounded-lg border overflow-hidden', severityConfig.bg)}>
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded',
              severityConfig.bg,
              severityConfig.color
            )}
          >
            {severityConfig.label}
          </span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              issue.reviewer === 'Claude'
                ? 'bg-primary/20 text-primary'
                : issue.reviewer === 'Gemini'
                  ? 'bg-cyan-500/20 text-cyan-500'
                  : 'bg-purple-500/20 text-purple-500'
            )}
          >
            {issue.reviewer}
          </span>
          <span className="flex-1 text-sm font-medium text-foreground truncate">
            [{issue.id}] {issue.title}
          </span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              issue.status === 'fixed'
                ? 'bg-emerald-500/20 text-emerald-500'
                : issue.status === 'open'
                  ? 'bg-amber-500/20 text-amber-500'
                  : issue.status === 'deferred'
                    ? 'bg-cyan-500/20 text-cyan-500'
                    : 'bg-muted text-muted-foreground'
            )}
          >
            {issue.status === 'fixed' && '✓ Javítva'}
            {issue.status === 'open' && '○ Nyitott'}
            {issue.status === 'deferred' && '↷ Elhalasztva'}
            {issue.status === 'wontfix' && '— Nem javítjuk'}
          </span>
          {issue.autoFixed && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Auto-fix
            </span>
          )}
          <span className="text-xs text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border/50 p-3 space-y-3 bg-card/30 dark:bg-white/[0.02]">
          <p className="text-sm text-muted-foreground">{issue.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              📄 {issue.file}
              {issue.line && `:${issue.line}`}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
              {issue.category}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
