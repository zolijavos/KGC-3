import { useStats } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { ViewId } from '@/types/dashboard';

const VIEW_TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  executive: {
    title: 'Vezetői Áttekintés',
    subtitle: 'Projekt státusz és KPI-k egy pillanatképben',
  },
  developer: {
    title: 'Fejlesztői Nézet',
    subtitle: 'Epic és story haladás részletesen',
  },
  qa: {
    title: 'QA Nézet',
    subtitle: 'Teszt metrikák és code review eredmények',
  },
  statistics: {
    title: 'Statisztikak',
    subtitle: 'Reszletes projekt metrikak es analitika',
  },
  knowledge: {
    title: 'Tudásbázis',
    subtitle: 'Dokumentáció és ADR-ek',
  },
  downloads: {
    title: 'Letöltések',
    subtitle: 'Exportok és riportok',
  },
  changelog: {
    title: 'Újdonságok',
    subtitle: 'Verziók, változások és funkció frissítések',
  },
};

export function Header() {
  const { currentView, sidebarCollapsed, setMobileMenuOpen } = useDashboardStore();
  const stats = useStats();
  const viewInfo = VIEW_TITLES[currentView];

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-10 h-16 transition-all duration-300',
        'bg-card/90 dark:bg-[hsl(262,45%,10%)]/95',
        'backdrop-blur-xl border-b border-border dark:border-white/5',
        sidebarCollapsed ? 'lg:left-20' : 'lg:left-64',
        'left-0'
      )}
    >
      {/* Subtle gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-3 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors"
        >
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1 ml-4 lg:ml-0">
          <h1 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-primary">
            {viewInfo.title}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{viewInfo.subtitle}</p>
        </div>

        {/* Quick stats */}
        <div className="hidden md:flex items-center gap-3">
          <QuickStat label="Epics" value={stats.totalEpics} done={stats.completedEpics} />
          <QuickStat label="Stories" value={stats.totalStories} done={stats.completedStories} />
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg relative overflow-hidden group">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Glow border */}
            <div className="absolute inset-0 rounded-lg border border-primary/30" />
            <span className="relative text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {stats.progressPercent}%
            </span>
            <span className="relative text-xs text-muted-foreground">kész</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            className="p-2 rounded-lg hover:bg-primary/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all group relative"
            title="Frissítés"
          >
            <span className="text-lg">🔄</span>
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-primary/10 to-transparent" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-primary/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all group relative"
            title="Beállítások"
          >
            <span className="text-lg">⚙️</span>
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-accent/10 to-transparent" />
          </button>
        </div>
      </div>
    </header>
  );
}

function QuickStat({ label, value, done }: { label: string; value: number; done: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg relative overflow-hidden group">
      {/* Glass background */}
      <div className="absolute inset-0 bg-muted/50 dark:bg-white/5 backdrop-blur-sm" />
      <div className="absolute inset-0 border border-border dark:border-white/10 rounded-lg" />
      {/* Hover effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-primary/10 to-transparent" />
      <span className="relative text-xs text-muted-foreground">{label}:</span>
      <span className="relative text-sm font-medium text-foreground">
        {done}/{value}
      </span>
    </div>
  );
}
