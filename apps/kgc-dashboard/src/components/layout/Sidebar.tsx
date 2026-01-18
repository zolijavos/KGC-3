import { useRefreshAll, useSprintData } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { ViewId } from '@/types/dashboard';

interface NavItem {
  id: ViewId;
  name: string;
  icon: string;
  description: string;
}

const VIEWS: NavItem[] = [
  { id: 'executive', name: 'Executive', icon: '👔', description: 'Vezetői áttekintés és KPI-k' },
  { id: 'developer', name: 'Developer', icon: '🔧', description: 'Sprint és story részletek' },
  { id: 'qa', name: 'QA', icon: '🔬', description: 'Teszt és minőségi metrikák' },
  {
    id: 'statistics',
    name: 'Statisztikak',
    icon: '📊',
    description: 'Reszletes analitika es chartok',
  },
];

const UTILITIES: NavItem[] = [
  { id: 'knowledge', name: 'Tudásbázis', icon: '📚', description: 'Dokumentáció és ADR-ek' },
  { id: 'downloads', name: 'Letöltések', icon: '📥', description: 'Exportok és riportok' },
  { id: 'changelog', name: 'Újdonságok', icon: '📰', description: 'Verziók és változások' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, currentView, setCurrentView, darkMode, toggleDarkMode } =
    useDashboardStore();

  const handleNavClick = (id: ViewId) => {
    setCurrentView(id);
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-20 transition-all duration-300',
        'bg-gradient-to-b from-[hsl(262,48%,12%)] via-[hsl(262,45%,10%)] to-[hsl(262,50%,8%)]',
        'border-r border-primary-500/10',
        sidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Ambient glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative p-4 border-b border-white/5">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-purple-500 to-cyan-500" />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-transparent opacity-50" />
            <span className="relative text-white text-xl">🏢</span>
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-white to-cyan-300">
                MyForgeOS
              </h1>
              <p className="text-xs text-primary-300/60">KGC ERP Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 space-y-1 overflow-y-auto">
        {!sidebarCollapsed && (
          <p className="text-xs text-primary-400/50 uppercase tracking-wider mb-3 px-2 font-medium">
            Nézetek
          </p>
        )}

        {VIEWS.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              'sidebar-item w-full group relative',
              currentView === item.id ? 'active' : 'text-white/60 hover:text-white'
            )}
            title={sidebarCollapsed ? item.name : undefined}
          >
            <span className="text-xl relative z-10">{item.icon}</span>
            {!sidebarCollapsed && <span className="relative z-10">{item.name}</span>}
            {/* Hover glow */}
            {currentView !== item.id && (
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-primary-500/10 to-transparent" />
            )}
          </button>
        ))}

        <div className="border-t border-white/5 my-4" />

        {!sidebarCollapsed && (
          <p className="text-xs text-primary-400/50 uppercase tracking-wider mb-3 px-2 font-medium">
            Segédletek
          </p>
        )}

        {UTILITIES.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              'sidebar-item w-full group relative',
              currentView === item.id ? 'active' : 'text-white/60 hover:text-white'
            )}
            title={sidebarCollapsed ? item.name : undefined}
          >
            <span className="text-xl relative z-10">{item.icon}</span>
            {!sidebarCollapsed && <span className="relative z-10">{item.name}</span>}
            {currentView !== item.id && (
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-cyan-500/10 to-transparent" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/5 space-y-1">
        <RefreshButton collapsed={sidebarCollapsed} />
        <button
          onClick={toggleDarkMode}
          className="sidebar-item w-full text-white/60 hover:text-white group relative"
          title={sidebarCollapsed ? 'Téma váltás' : undefined}
        >
          <span className="text-xl relative z-10">{darkMode ? '☀️' : '🌙'}</span>
          {!sidebarCollapsed && (
            <span className="relative z-10">{darkMode ? 'Világos mód' : 'Sötét mód'}</span>
          )}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-yellow-500/10 to-transparent" />
        </button>
        <button
          onClick={toggleSidebar}
          className="sidebar-item w-full text-white/60 hover:text-white group relative"
        >
          <span className="text-xl relative z-10">{sidebarCollapsed ? '→' : '←'}</span>
          {!sidebarCollapsed && <span className="relative z-10">Összecsukás</span>}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-white/5 to-transparent" />
        </button>
      </div>
    </aside>
  );
}

function RefreshButton({ collapsed }: { collapsed: boolean }) {
  const { refresh, isRefreshing } = useRefreshAll();
  const { data } = useSprintData();

  return (
    <button
      onClick={refresh}
      disabled={isRefreshing}
      className="sidebar-item w-full text-white/60 hover:text-white group relative"
      title={collapsed ? 'Adatok frissítése' : undefined}
    >
      <span
        className={cn('text-xl relative z-10 transition-transform', isRefreshing && 'animate-spin')}
      >
        🔄
      </span>
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between relative z-10">
          <span>{isRefreshing ? 'Frissítés...' : 'Frissítés'}</span>
          {data?.lastUpdated && (
            <span className="text-xs text-primary-400/50">
              {new Date(data.lastUpdated).toLocaleDateString('hu-HU')}
            </span>
          )}
        </div>
      )}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-emerald-500/10 to-transparent" />
    </button>
  );
}

export function MobileSidebar() {
  const { mobileMenuOpen, setMobileMenuOpen, currentView, setCurrentView } = useDashboardStore();

  const handleNavClick = (id: ViewId) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
  };

  if (!mobileMenuOpen) return null;

  return (
    <>
      {/* Overlay with blur */}
      <div
        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-72 z-40 overflow-y-auto bg-gradient-to-b from-[hsl(262,48%,12%)] via-[hsl(262,45%,10%)] to-[hsl(262,50%,8%)] border-r border-primary-500/30">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-40 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-purple-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-transparent opacity-50" />
              <span className="relative text-white text-xl">🏢</span>
            </div>
            <div>
              <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-white to-cyan-300">
                MyForgeOS
              </h1>
              <p className="text-xs text-primary-300/60">KGC ERP Dashboard</p>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="text-xs text-primary-400/50 uppercase tracking-wider mb-3 px-4 font-medium">
              Nézetek
            </p>
            {VIEWS.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'sidebar-item w-full',
                  currentView === item.id ? 'active' : 'text-white/60 hover:text-white'
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}

            <div className="border-t border-white/5 my-4" />

            <p className="text-xs text-primary-400/50 uppercase tracking-wider mb-3 px-4 font-medium">
              Segédletek
            </p>
            {UTILITIES.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'sidebar-item w-full',
                  currentView === item.id ? 'active' : 'text-white/60 hover:text-white'
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
