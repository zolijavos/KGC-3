/**
 * Dashboard Data Hooks
 * Uses static data from data files - no API calls
 */

import { ALL_REVIEWS, getReviewStats } from '@/data/reviews';
import { EPICS, calculateSprintStats } from '@/data/sprint-data';
import { useMemo } from 'react';

// Re-export types for compatibility
export interface Epic {
  epic: string;
  name: string;
  status: 'DONE' | 'IN_PROGRESS' | 'TODO';
  stories: Story[];
}

export interface Story {
  id: string;
  name: string;
  status: 'DONE' | 'IN_PROGRESS' | 'TODO' | 'REVIEW';
  tasks: string[];
}

export interface DashboardStats {
  totalEpics: number;
  doneEpics: number;
  completedEpics: number;
  inProgressEpics: number;
  backlogEpics: number;
  totalStories: number;
  doneStories: number;
  completedStories: number;
  inProgressStories: number;
  pendingStories: number;
  progressPercent: number;
}

export interface TestStats {
  totalPassing: number;
  totalFailing: number;
  totalTests: number;
  passRate: number;
  coverage: number;
  unitTests: number;
  integrationTests: number;
  e2eTests: number;
  byEpic: EpicTestStats[];
}

export interface EpicTestStats {
  epic: string;
  name: string;
  passing: number;
  total: number;
  files: { name: string; tests: number }[];
}

export interface ReviewStats {
  totalReviews: number;
  totalIssues: number;
  fixedIssues: number;
  openIssues: number;
  fixRate: number;
  consensusRate: number;
  reviews: Review[];
  severityDistribution: { level: string; count: number }[];
  claudeStats: { totalIssues: number; uniqueFindings: number };
  geminiStats: { totalIssues: number; uniqueFindings: number };
}

export interface Review {
  id: string;
  storyId: string;
  story: string;
  epic: string;
  issuesFound: number;
  issuesFixed: number;
  claudeIssues: number;
  geminiIssues: number;
  severityCounts: { critical: number; major: number; minor: number; suggestion: number };
  issues: ReviewIssue[];
}

export interface ReviewIssue {
  id: number | string;
  severity: string;
  title: string;
  description: string;
  file: string;
  line?: number | undefined;
  reviewer: string;
  fixed: boolean;
  status?: string;
}

// Transform static EPICS to hook format
function getStaticEpics(): Epic[] {
  return EPICS.map(e => ({
    epic: e.epic,
    name: e.name,
    status: e.status === 'done' ? 'DONE' : e.status === 'in-progress' ? 'IN_PROGRESS' : 'TODO',
    stories: e.stories.map(s => ({
      id: s.id,
      name: s.name,
      status:
        s.status === 'done'
          ? 'DONE'
          : s.status === 'in-progress'
            ? 'IN_PROGRESS'
            : s.status === 'review'
              ? 'REVIEW'
              : 'TODO',
      tasks: s.tasks || [],
    })),
  }));
}

function getStaticStats(): DashboardStats {
  const stats = calculateSprintStats();
  return {
    totalEpics: stats.totalEpics,
    doneEpics: stats.completedEpics,
    completedEpics: stats.completedEpics,
    inProgressEpics: stats.inProgressEpics,
    backlogEpics: stats.backlogEpics,
    totalStories: stats.totalStories,
    doneStories: stats.completedStories,
    completedStories: stats.completedStories,
    inProgressStories: stats.inProgressStories,
    pendingStories: stats.backlogStories,
    progressPercent: stats.completionRate,
  };
}

// Sprint data hook - uses static data directly (no API)
export function useSprintData() {
  const data = useMemo(
    () => ({
      epics: getStaticEpics(),
      stats: getStaticStats(),
      lastUpdated: new Date().toISOString(),
      source: 'static' as const,
    }),
    []
  );

  return {
    data,
    isLoading: false,
    error: null,
    refetch: () => {
      /* Static data, nothing to refetch */
    },
  };
}

// Test stats - static only
export function useTestStats() {
  const staticTestStats: TestStats = {
    totalPassing: 587,
    totalFailing: 0,
    totalTests: 587,
    passRate: 100,
    coverage: 87.5,
    unitTests: 572,
    integrationTests: 12,
    e2eTests: 3,
    byEpic: [
      { epic: '1', name: 'Authentication', passing: 95, total: 95, files: [] },
      { epic: '2', name: 'User Management', passing: 135, total: 135, files: [] },
      { epic: '17', name: 'Work Orders', passing: 137, total: 137, files: [] },
    ],
  };

  return {
    data: staticTestStats,
    isLoading: false,
    error: null,
  };
}

// Review stats - static data
export function useReviewStats() {
  const transformedData = useMemo(() => {
    const stats = getReviewStats();
    return {
      totalReviews: stats.totalReviews,
      totalIssues: stats.totalIssues,
      fixedIssues: stats.fixed,
      openIssues: stats.open,
      fixRate: stats.totalIssues > 0 ? Math.round((stats.fixed / stats.totalIssues) * 100) : 0,
      consensusRate: 85,
      reviews: ALL_REVIEWS.map(r => ({
        id: r.storyId,
        storyId: r.storyId,
        story: r.storyName,
        epic: r.epicId,
        issuesFound: r.issues.length,
        issuesFixed: r.issues.filter(i => i.status === 'fixed').length,
        claudeIssues: r.issues.filter(i => i.reviewer === 'Claude' || i.reviewer === 'Both').length,
        geminiIssues: r.issues.filter(i => i.reviewer === 'Gemini' || i.reviewer === 'Both').length,
        severityCounts: {
          critical: r.issues.filter(i => i.severity === 'critical').length,
          major: r.issues.filter(i => i.severity === 'high').length,
          minor: r.issues.filter(i => i.severity === 'medium').length,
          suggestion: r.issues.filter(i => i.severity === 'low').length,
        },
        issues: r.issues.map((i, idx) => ({
          id: idx + 1,
          severity: i.severity === 'high' ? 'major' : i.severity,
          title: i.title,
          description: i.description,
          file: i.file,
          line: i.line,
          reviewer: i.reviewer,
          fixed: i.status === 'fixed',
        })),
      })),
      severityDistribution: [
        { level: 'critical', count: stats.critical },
        { level: 'major', count: stats.high },
        { level: 'minor', count: stats.medium },
        { level: 'suggestion', count: stats.low },
      ],
      claudeStats: { totalIssues: stats.claudeIssues, uniqueFindings: stats.claudeIssues },
      geminiStats: { totalIssues: stats.geminiIssues, uniqueFindings: stats.geminiIssues },
    } as ReviewStats;
  }, []);

  return {
    data: transformedData,
    isLoading: false,
    error: null,
  };
}

// Helper hooks
export function useEpics(): Epic[] {
  const { data } = useSprintData();
  return data.epics;
}

export function useStats(): DashboardStats {
  const { data } = useSprintData();
  return data.stats;
}

export function useActiveStories() {
  const epics = useEpics();
  const active: { id: string; name: string; epic: string }[] = [];

  epics.forEach(epic => {
    epic.stories.forEach(story => {
      if (story.status === 'IN_PROGRESS' || story.status === 'REVIEW') {
        active.push({
          id: story.id,
          name: story.name,
          epic: epic.epic,
        });
      }
    });
  });

  return active;
}

export function useCompletedEpics() {
  const epics = useEpics();
  return epics.filter(e => e.status === 'DONE').slice(-6);
}

export function useInProgressEpics() {
  const epics = useEpics();
  return epics.filter(e => e.status === 'IN_PROGRESS');
}

// Refresh function (placeholder - reloads page for now)
export function useRefreshAll() {
  return {
    refresh: () => {
      console.log('[Dashboard] Refreshing page...');
      window.location.reload();
    },
    isRefreshing: false,
  };
}

// Sprint velocity (static)
export const SPRINT_VELOCITY = [
  { sprint: 'Sprint 1', planned: 11, completed: 11, epics: 'Epic 1-2' },
  { sprint: 'Sprint 2', planned: 17, completed: 17, epics: 'Epic 3-5' },
  { sprint: 'Sprint 3', planned: 16, completed: 16, epics: 'Epic 6-8' },
  { sprint: 'Sprint 4', planned: 16, completed: 16, epics: 'Epic 9-11' },
  { sprint: 'Sprint 5', planned: 12, completed: 12, epics: 'Epic 12-13' },
  { sprint: 'Sprint 6', planned: 16, completed: 16, epics: 'Epic 14-16' },
  { sprint: 'Sprint 7', planned: 15, completed: 15, epics: 'Epic 17-19' },
  { sprint: 'Sprint 8', planned: 6, completed: 6, epics: 'Epic 20-21' },
];

export const CURRENT_BURNDOWN = [
  { day: 'Day 1', remaining: 7, ideal: 7 },
  { day: 'Day 2', remaining: 7, ideal: 6 },
  { day: 'Day 3', remaining: 4, ideal: 5 },
  { day: 'Day 4', remaining: 4, ideal: 4 },
  { day: 'Day 5', remaining: 4, ideal: 3 },
];

export function useSprintVelocity() {
  return SPRINT_VELOCITY;
}

export function useBurndownData() {
  return CURRENT_BURNDOWN;
}
