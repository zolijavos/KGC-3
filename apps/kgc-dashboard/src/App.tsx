import { Drawer, Header, MobileSidebar, Sidebar } from '@/components/layout';
import {
  ChangelogView,
  DeveloperView,
  DownloadsView,
  ExecutiveView,
  KnowledgeView,
  QAView,
  StatisticsView,
} from '@/components/views';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboard-store';

export default function App() {
  const { currentView, sidebarCollapsed, darkMode } = useDashboardStore();

  // Apply dark mode to document element
  if (typeof document !== 'undefined') {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      <MobileSidebar />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main
        className={cn(
          'pt-20 pb-6 px-4 lg:px-6 transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        <div className="max-w-7xl mx-auto">
          {currentView === 'executive' && <ExecutiveView />}
          {currentView === 'developer' && <DeveloperView />}
          {currentView === 'qa' && <QAView />}
          {currentView === 'statistics' && <StatisticsView />}
          {currentView === 'knowledge' && <KnowledgeView />}
          {currentView === 'downloads' && <DownloadsView />}
          {currentView === 'changelog' && <ChangelogView />}
        </div>
      </main>

      {/* Drawer */}
      <Drawer />
    </div>
  );
}
