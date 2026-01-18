import type {
  DeveloperTab,
  Epic,
  EpicFilter,
  EpicTestStats,
  QATab,
  Review,
  ReviewFilter,
  Story,
  StoryFilter,
  ViewId,
} from '@/types/dashboard';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  // Theme
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Navigation
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  developerTab: DeveloperTab;
  setDeveloperTab: (tab: DeveloperTab) => void;
  qaTab: QATab;
  setQATab: (tab: QATab) => void;

  // Filters
  epicFilter: EpicFilter;
  setEpicFilter: (filter: Partial<EpicFilter>) => void;
  storyFilter: StoryFilter;
  setStoryFilter: (filter: Partial<StoryFilter>) => void;
  reviewFilter: ReviewFilter;
  setReviewFilter: (filter: Partial<ReviewFilter>) => void;

  // Drawer
  drawer: {
    isOpen: boolean;
    type: 'epic' | 'story' | 'review' | 'test' | null;
    data: Epic | Story | Review | EpicTestStats | null;
  };
  openDrawer: (
    type: 'epic' | 'story' | 'review' | 'test',
    data: Epic | Story | Review | EpicTestStats
  ) => void;
  closeDrawer: () => void;

  // Mobile
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    set => ({
      // Theme
      darkMode: false,
      setDarkMode: dark => set({ darkMode: dark }),
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Navigation
      currentView: 'executive',
      setCurrentView: view => set({ currentView: view }),
      developerTab: 'summary',
      setDeveloperTab: tab => set({ developerTab: tab }),
      qaTab: 'summary',
      setQATab: tab => set({ qaTab: tab }),

      // Filters
      epicFilter: { search: '', status: '' },
      setEpicFilter: filter => set(state => ({ epicFilter: { ...state.epicFilter, ...filter } })),
      storyFilter: { search: '', status: '', epic: '' },
      setStoryFilter: filter =>
        set(state => ({ storyFilter: { ...state.storyFilter, ...filter } })),
      reviewFilter: { search: '', reviewer: '', severity: '' },
      setReviewFilter: filter =>
        set(state => ({ reviewFilter: { ...state.reviewFilter, ...filter } })),

      // Drawer
      drawer: {
        isOpen: false,
        type: null,
        data: null,
      },
      openDrawer: (type, data) =>
        set({
          drawer: { isOpen: true, type, data },
        }),
      closeDrawer: () =>
        set({
          drawer: { isOpen: false, type: null, data: null },
        }),

      // Mobile
      mobileMenuOpen: false,
      setMobileMenuOpen: open => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'kgc-dashboard-storage',
      partialize: state => ({
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
